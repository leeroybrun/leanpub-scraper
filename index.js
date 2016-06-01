'use strict';

const fs = require('fs');
const inquirer = require('inquirer');

const exportCsv = require('./export-csv');
const LeanpubScraper = require('./scraper');
const LeanpubScraperStatus = require('./status');

// Create instances of scraper and status
var scraper = new LeanpubScraper();
var status = new LeanpubScraperStatus();

// On start
scraper.on('start', (error) => {
	if(error) {
		console.error(error);
		process.exit(0);
	}

	let categoryName = scraper.categories.filter((cat) => { return cat.value == scraper.selectedCategory })[0].name;

	status.update({title: 'Parsing LeanPub website to export books from category "'+ categoryName +'" as CSV...', action: 'Fetching pages URLs...'});
});

// On end
scraper.on('end', (books) => {
	status.update({action: 'Saving CSV file...'});

	if(books && books.length > 0) {
		let headersArray = Object.keys(books[0]);
		let headers = {};

		for(let i = 0; i < headersArray.length; i++) {
			headers[headersArray[i]] = headersArray[i];
		}

		// Generate CSV
		let csv = exportCsv.objToCsv([].concat(headers, books));

		fs.writeFile('leanpubBooks.csv', csv, function(err) {
		    if(err) {
		        return console.error(err);
		    }

		    status.update({action: 'CSV file writen to "leanpubBooks.csv".', subaction: 'Finished!'});
		});
	} else {
		status.update({action: 'No books to export...'});
	}
});

scraper.on('pages:parsing', (url) => {
	status.update({action: 'Fetching and parsing pages to get books URLs...'});
});

scraper.on('pages:toParse', (urls) => {
	status.incNbPages(urls.length);
});

scraper.on('pages:parsed', (url) => {
	status.incNbPagesParsed(1);
});

scraper.on('pages:error', (error, url) => {
	console.error('Error with page at URL '+ url, error);
});

scraper.on('books:parsing', (url) => {
	status.update({action: 'Fetching and parsing books...'});
});

scraper.on('books:toParse', (urls) => {
	status.incNbBooks(urls.length);
});

scraper.on('books:parsed', (url, book) => {
	status.incNbBooksParsed(1);
});

scraper.on('books:error', (error, url) => {
	console.error('Error with book at URL '+ url, error);
});

// Ask the user for the category he wants to export
inquirer.prompt([{
	type: 'list',
	name: 'category',
	message: 'Which category do you want to export?',
	default: 'all',
	choices: scraper.categories
}]).then(function(answers) {
	scraper.start(answers.category);
});

