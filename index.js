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

	status.start({invert: false});
});

// On end
scraper.on('end', (books) => {
	status.stop();

	if(books && books.length > 0) {
		let headers = Object.keys(books[0]);

		// Generate CSV
		let csv = exportCsv.objToCsv(headers.concat(books));

		fs.writeFile('leanpubBooks.csv', csv, function(err) {
		    if(err) {
		        return console.error(err);
		    }

		    console.log('CSV file writen to "leanpubBooks.csv".');
		});
	} else {
		console.log('No books to export...');
	}
});

scraper.on('pages:toParse', (urls) => {
	status.incNbPages(urls.length);
});

scraper.on('pages:parsed', (url) => {
	status.incNbPagesParsed(1);
});

scraper.on('pages:error', (error, url) => {
	status.console.error('Error with page at URL '+ url, error);
});

scraper.on('books:toParse', (urls) => {
	status.incNbBooks(urls.length);
});

scraper.on('books:parsed', (url, book) => {
	status.console.log(book);
	status.incNbBooksParsed(1);
});

scraper.on('books:error', (error, url) => {
	status.console.error('Error with book at URL '+ url, error);
});

scraper.start('all');

// Ask the user for the category he wants to export
/*inquirer.prompt([{
	type: 'list',
	name: 'category',
	message: 'Which category do you want to export?',
	default: 'all',
	choices: scraper.categories
}]).then(function(answers) {
	scraper.start(answers.category);
});*/

