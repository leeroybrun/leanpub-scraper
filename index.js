'use strict';

const async = require('async');
const cheerio = require('cheerio');
const request = require('delayed-request')();
const status = require('terminal-status');
const EventEmitter = require('events');

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
	}

	start(categorySlug) {
		categorySlug = categorySlug || 'all';


	}

	parseBooksList(url, callback) {
		if(this.urlsParsed.indexOf(url) != -1) {
			process.nextTick(callback);
			return;
		}

		this.urlsParsed.push(url);

		this.request.run(url, (err, response, body) => {
			if (!error && response.statusCode == 200) {
				var $ = cheerio.load(body);

				var books = $('.book-list-item a');
				async.eachSeries(books, (item, callback) => {
					this.parseBookPage(this.baseUrl+books[i].attr('href'), callback);
				}, () => {
					return callback();
				});
			}
		});
	}

	parseBookPage(url, callback) {
		if(this.urlsParsed.indexOf(url) != -1) {
			process.nextTick(callback);
			return;
		}


	}
}