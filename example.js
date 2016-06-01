'use strict';

const async = require('async');
const cheerio = require('cheerio');
const Request = require('delayed-request')();
const EventEmitter = require('events');

const LeanpubScraper = require('./scraper');

var scraper = new LeanpubScraper();

scraper.parseBookPage('https://leanpub.com/datastyle', function(error, book) {
	if(error) {
		return console.error(error);
	}
	
	console.log(book);
});

scraper.parseBookPage('https://leanpub.com/angular2-book', function(error, book) {
	if(error) {
		return console.error(error);
	}
	
	console.log(book);
});

scraper.parseBookPage('https://leanpub.com/introinzzzserver', function(error, book) {
	if(error) {
		return console.error(error);
	}
	
	console.log(book);
});