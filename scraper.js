'use strict';

const async = require('async');
const cheerio = require('cheerio');
const Request = require('delayed-request')();
const EventEmitter = require('events');

const SELECTORS = {
	formats: '#book-metadata .book-details-list:nth-child(2) li:nth-child(1n+2)',
	title: '.book-title',
	author: '.avatar-and-name',
	subtitle: '.book-subtitle',
	smallDesc: '.book-description',
	minPrice: '.pricing span[itemprop=lowPrice] div',
	suggestedPrice: '.pricing span[itemprop=highPrice] div',
	language: '.language',
	metadata: '#book-metadata .book-details-list:nth-child(1) li',
	percentComplete: '.percent-complete',
	lastUpdate: '.last-update-timestamp',
	imageUrl: '.cover-image img'
};

function getElementText($, selector) {
	return $(selector) ? $(selector).text().trim() : '';
}

function getElementAttr($, selector, attr) {
	return ($(selector) && $(selector).attr(attr)) ? $(selector).attr(attr).trim() : '';
}

function parsePrice(str) {
	if(str.toLowerCase().indexOf('free') != -1) {
		return '0';
	}

	var re = /[+-]?\d+(\.\d+)?/g;
	var m = str.match(re);

	if(m && m.length && m.length > 0) {
		return m[0];
	} else {
		return '';
	}
}

module.exports = class LeanpubScraper extends EventEmitter {
	constructor() {
		super();

		this.baseUrl = 'https://leanpub.com';
		this.bookstoreBase = '/bookstore/earnings_in_last_7_days/';
		
		this.selectedCategory = 'all';
		this.categories = [
			{ value: 'all', name: 'All' },
			{ value: 'agile', name: 'Agile' },
			{ value: 'data_science', name: 'Data Science' },
			{ value: 'computer_programming', name: 'Computer Programming' },
			{ value: 'fiction', name: 'Fiction' },
			{ value: 'non-fiction', name: 'Non-Fiction' }
		];

		this.currentPage = 1;

		this.urlsToParse = {
			books: [],
			pages: []
		};
		this.urlsParsed  = [];

		this.books = [];

		this.request = new Request({
		    delayMin: 100,
		    delayMax: 1000
		});

		this.maxConcurrentRequests = 10;

		this.status = {};
	}

	start(categorySlug) {
		categorySlug = categorySlug || 'all';

		this.selectedCategory = categorySlug;

		let url = this.baseUrl + this.bookstoreBase + categorySlug +'/all/';

		this.emit('start');

		async.waterfall([
			// Construct list of pages URLs to parse
			(next) => {
				// Get BookStore homepage
				this.request.run(url, (error, response, body) => {
					if (!error && response.statusCode == 200) {
						let $ = cheerio.load(body);

						let re = /.*\/([1-9]+)$/;

						let last = $('.paginated .last a');
						let lastPage = 1;

						let m = [];

						if ((m = re.exec(last.attr('href'))) !== null) {
						    if (m.index === re.lastIndex) {
						        re.lastIndex++;
						    }

						    lastPage = parseInt(m[1]);
						}

						var pagesToParse = [];

						for(let i = 1; i <= lastPage; i++) {
							pagesToParse.push(url+i);
						}

						this.urlsToParse.pages = this.urlsToParse.pages.concat(pagesToParse);

						this.emit('pages:toParse', pagesToParse);

						next();
					} else {
						if(!error) {
							error = new Error('Response code was '+ response.statusCode);
						}

						return next(error);
					}
				});
			},

			// Parse each pages and construct list of books pages to parse
			(next) => {
				this.emit('pages:parsing');

				async.eachLimit(this.urlsToParse.pages, this.maxConcurrentRequests, (item, iNext) => {
					return this.parsePage(item, () => {
						iNext();
					});
				}, () => {
					next();
				});
			},

			// Parse each book page and construct list of books
			(next) => {
				this.emit('books:parsing');

				async.eachLimit(this.urlsToParse.books, this.maxConcurrentRequests, (item, iNext) => {
					return this.parseBookPage(item, () => {
						iNext();
					});
				}, () => {
					next();
				});
			}
		], () => {
			this.emit('end', this.books);
		});		
	}

	parsePage(url, callback) {
		if(this.urlsParsed.indexOf(url) != -1) {
			process.nextTick(callback);
			return;
		}

		this.urlsParsed.push(url);

		this.request.run(url, (error, response, body) => {
			if (!error && response.statusCode == 200) {
				var $ = cheerio.load(body);

				var books = $('.book-list-item .cover-image a');

				var urlsToParse = [];

				books.each((i, elem) => {
					urlsToParse.push(this.baseUrl + $(elem).attr('href').trim());
				});

				this.urlsToParse.books = this.urlsToParse.books.concat(urlsToParse);

				this.emit('pages:parsed', url);
				this.emit('books:toParse', urlsToParse);
				
				return callback(null, urlsToParse);
			} else {
				if(!error) {
					error = new Error('Response code was '+ response.statusCode);
				}

				// TODO: add page back to pages to parse? Use a may retry param to avoid infinite loops

				this.emit('pages:error', error, url);
				
				return callback(error);
			}
		});
	}

	parseBookPage(url, callback) {
		if(this.urlsParsed.indexOf(url) != -1) {
			process.nextTick(callback);
			return;
		}

		this.urlsParsed.push(url);

		this.request.run(url, (error, response, body) => {
			if (!error && response.statusCode == 200) {
				var $ = cheerio.load(body);

				var formats = getElementText($, SELECTORS.formats).toLowerCase();
				var percentComplete = getElementText($, SELECTORS.percentComplete).match(/\d+/);

				var nbReaders = '';
				var nbPages = '';
				var nbWords = '';

				var metadata = $(SELECTORS.metadata);
				metadata.each((i, elem) => {
					elem = $(elem);

					let type = $('p', elem).text().trim().toLowerCase();
					let data = $('span', elem).text().trim();

					if(type == 'readers') {
						nbReaders = data;
					} else if(type == 'pages') {
						nbPages = data;
					} else if(type == 'words') {
						nbWords = data;
					}
				});

				var book = {
					title: getElementText($, SELECTORS.title),
					author: getElementText($, SELECTORS.author),
					subtitle: getElementText($, SELECTORS.subtitle),
					smallDesc: getElementText($, SELECTORS.smallDesc),
					minPrice: parsePrice(getElementAttr($, SELECTORS.minPrice, 'data-react-props')),
					suggestedPrice: parsePrice(getElementAttr($, SELECTORS.suggestedPrice, 'data-react-props')),
					language: getElementText($, SELECTORS.language),
					formatPdf: formats.indexOf('pdf') != -1,
					formatEpub: formats.indexOf('epub') != -1,
					formatMobi: formats.indexOf('mobi') != -1,
					formatApp: formats.indexOf('app') != -1,
					nbPages: nbPages,
					nbWords: nbWords,
					nbReaders: nbReaders,
					percentComplete: (percentComplete && percentComplete.length && percentComplete.length > 0) ? percentComplete[0] : '',
					lastUpdate: getElementAttr($, SELECTORS.lastUpdate, 'datetime'),
					url: url,
					imageUrl: getElementAttr($, SELECTORS.imageUrl, 'src')
				};

				this.emit('books:parsed', url, book);

				this.books.push(book);

				return callback(null, book);
			} else {
				if(!error) {
					error = new Error('Response code was '+ response.statusCode);
				}

				// TODO: add page back to pages to parse? Use a may retry param to avoid infinite loops

				this.emit('books:error', error, url);
				
				return callback(error);
			}
		});
	}
}