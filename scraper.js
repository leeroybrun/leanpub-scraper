'use strict';

const async = require('async');
const cheerio = require('cheerio');
const request = require('delayed-request')();
const status = require('node-status');
const EventEmitter = require('events');
const fs = require('fs');
const exportCsv = require('./export-csv');

// TODO: emit events and put console display of status in index.js

class LeanpubScraper extends EventEmitter {
	constructor() {
		this.baseUrl = 'https://leanpub.com';
		this.bookstoreBase = '/bookstore/earnings_in_last_7_days/';
		
		this.categories = {
			'agile': 'Agile',
			'data_science': 'Data Science',
			'computer_programming': 'Computer Programming',
			'fiction': 'Fiction',
			'non-fiction': 'Non-Fiction',
			'all': 'All'
		};

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

		this.status = {};
	}

	start(categorySlug) {
		categorySlug = categorySlug || 'all';

		this.status.nbPages = status.addItem('nbPages', {
			color:'cyan',
			label:'pages'
		});

		this.status.nbPagesParsed = status.addItem('nbPagesParsed', {
			color:'cyan',
			label:'pages parsed'
		});

		this.status.totalPages = status.addItem('totalPages', {
			max: 100, 
			type: ['bar','percentage'],
			color: 'cyan'
		});

		this.status.nbBooks = status.addItem('nbBooks', {
			color:'cyan',
			label:'books'
		});

		this.status.nbBooksParsed = status.addItem('nbBooksParsed', {
			color:'cyan',
			label:'books parsed'
		});

		this.status.totalBooks = status.addItem('totalBooks', {
			max: 100, 
			type: ['bar','percentage'],
			color: 'cyan'
		});

		let url = this.baseUrl + this.bookstoreBase + categorySlug +'/all/';

		status.start({invert: false});

		async.waterfall([
			// Construct list of pages URLs to parse
			(next) => {
				// Get BookStore homepage
				this.request.run(url, (err, response, body) => {
					if (!error && response.statusCode == 200) {
						let $ = cheerio.load(body);

						let re = /.*\/([1-9]+)$/;

						let last = $('.paginated .last a');
						let lastPage = 1;

						if ((m = re.exec(last.attr('href'))) !== null) {
						    if (m.index === re.lastIndex) {
						        re.lastIndex++;
						    }

						    lastPage = parseInt(m[0]);
						}

						for(let i = 1; i <= lastPage; i++) {
							this.urlsToParse.pages.push(url+i);
						}

						this.status.nbPages.inc(lastPage);

						next();
					} else {
						if(!error) {
							error = new Error('Response code was '+ response.statusCode);
						}

						console.error(error);
						return next(error);
					}
				});
			},

			// Parse each pages and construct list of books pages to parse
			(next) => {
				async.eachSeries(this.urlsToParse.pages, (item, iNext) => {
					return this.parsePage(item, iNext);
				}, () => {
					next();
				});
			},

			// Parse each book page and construct list of books
			(next) => {
				async.eachSeries(this.urlsToParse.books, (item, iNext) => {
					return this.parseBookPage(item, iNext);
				}, () => {
					next();
				});
			}
		], function() {
			// Generate CSV
			let csv = exportCsv.objToCsv(this.books);

			fs.writeFile('leanpubBooks.csv', csv, function(err) {
			    if(err) {
			        return console.error(err);
			    }

			    console.log('Done!');
			});
		});		
	}

	parsePage(url, callback) {
		if(this.urlsParsed.indexOf(url) != -1) {
			process.nextTick(callback);
			return;
		}

		this.urlsParsed.push(url);
		this.status.nbPagesParsed.inc(1);
		this.status.totalPages.count((this.status.nbPagesParsed / this.status.nbPages) * 100);

		this.request.run(url, (err, response, body) => {
			if (!error && response.statusCode == 200) {
				var $ = cheerio.load(body);

				var books = $('.book-list-item a');

				for(let i = 0; i < books.length; i++) {
					this.urlsToParse.books.push(this.baseUrl+books[i].attr('href'));
				}

				this.status.nbBooks.inc(books.length);
				
				return callback();
			} else {
				if(!error) {
					error = new Error('Response code was '+ response.statusCode);
				}

				// TODO: add page back to pages to parse? Use a may retry param to avoid infinite loops

				console.error('Error with URL '+ url, error);
				
				return callback();
			}
		});
	}

	parseBookPage(url, callback) {
		if(this.urlsParsed.indexOf(url) != -1) {
			process.nextTick(callback);
			return;
		}

		this.urlsParsed.push(url);
		this.status.nbBooksParsed.inc(1);
		this.status.totalBooks.count((this.status.nbBooksParsed / this.status.nbBooks) * 100);

		this.request.run(url, (err, response, body) => {
			if (!error && response.statusCode == 200) {
				var $ = cheerio.load(body);

				var formats = $('#book-metadata .book-details-list:nth-child(2) li:nth-child(1n+2)').text().toLowerCase();

				var book = {
					title: $('.book-title').text().trim(),
					author: $('.avatar-and-name').text().trim(),
					smallDesc: $('.book-description').text().trim(),
					minPrice: $('.pricing span[itemprop=lowPrice] .price span:nth-child(2)').text().trim(),
					suggestedPrice: $('.pricing span[itemprop=highPrice] .price span:nth-child(2)').text().trim(),
					language: $('.language').text().trim(),
					formatPdf: formats.indexOf('pdf') != -1,
					formatEpub: formats.indexOf('epub') != -1,
					formatMobi: formats.indexOf('mobi') != -1,
					formatApp: formats.indexOf('app') != -1,
					nbPages: $('#book-metadata .book-details-list:nth-child(1) li:nth-child(2) span:nth-child(1)').text().trim(),
					nbReaders: $('.num-readers').text().trim(),
					percentComplete: $('.progress-bar .meter').attr('style').match(/\d+/)[0],
					url: url,
					imageUrl: $('.cover-image img').attr('src').trim()
				};

				this.books.push(book);

				return callback();
			} else {
				if(!error) {
					error = new Error('Response code was '+ response.statusCode);
				}

				// TODO: add page back to pages to parse? Use a may retry param to avoid infinite loops

				console.error('Error with URL '+ url, error);
				
				return callback();
			}
		});
	}
}

module.exports = LeanpubScraper;