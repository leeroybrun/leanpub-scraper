'use strict';

// Not compatible with inquirer.js...
const status = require('node-status');

module.exports = class LeanpubScraperStatus {
	constructor() {
		this._status = status;

		this.console = status.console();

		this.nbPages = this._status.addItem('pages', {
			color:'cyan',
			label:'pages'
		});

		this.nbPagesParsed = this._status.addItem('pages parsed', {
			color:'cyan',
			label:'pages parsed'
		});

		this.totalPages = this._status.addItem('pages', {
			max: 100, 
			type: ['bar','percentage'],
			color: 'cyan'
		});

		this.nbBooks = this._status.addItem('books', {
			color:'cyan',
			label:'books'
		});

		this.nbBooksParsed = this._status.addItem('books parsed', {
			color:'cyan',
			label:'books parsed'
		});

		this.totalBooks = this._status.addItem('books', {
			max: 100, 
			type: ['bar','percentage'],
			color: 'cyan'
		});
	}

	start(options) {
		this._status.start(options);
	}

	stop() {
		this._status.stop();
	}

	incNbPages(count) {
		this.nbPages.inc(count);
		this.updateTotalPages();
	}

	incNbPagesParsed(count) {
		this.nbPagesParsed.inc(count);
		this.updateTotalPages();
	}

	updateTotalPages() {
		let percent = (this.nbPagesParsed.val / this.nbPages.val) * 100;
		let inc = percent - this.totalPages.val;

		if(inc >= 1) {
			this.totalPages.inc(Math.floor(inc));
		}
	}

	incNbBooks(count) {
		this.nbBooks.inc(count);
		this.updateTotalBooks();
	}

	incNbBooksParsed(count) {
		this.nbBooksParsed.inc(count);
		this.updateTotalBooks();
	}

	updateTotalBooks() {
		let percent = (this.nbBooksParsed.val / this.nbBooks.val) * 100;
		let inc = percent - this.totalBooks.val;

		if(inc >= 1) {
			this.totalBooks.inc(Math.floor(inc));
		}
	}
}