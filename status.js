'use strict';

const status = require('terminal-status');

module.exports = class LeanpubScraperStatus {
	constructor() {
		this._status = status;

		this.nbPages = 0;
		this.nbPagesParsed = 0;
		this.nbBooks = 0;
		this.nbBooksParsed = 0;
	}

	update(options) {
		this._status.update(options);
	}

	incNbPages(count) {
		this.nbPages += count;
		this.updateSubaction();
	}

	incNbPagesParsed(count) {
		this.nbPagesParsed += count;
		this.updateSubaction();
	}

	incNbBooks(count) {
		this.nbBooks += count;
		this.updateSubaction();
	}

	incNbBooksParsed(count) {
		this.nbBooksParsed += count;
		this.updateSubaction();
	}

	updateSubaction() {
		this.update({subaction: 'Pages parsed '+ this.nbPagesParsed +'/'+ this.nbPages +'    |    Books parsed '+ this.nbBooksParsed +'/'+ this.nbBooks});
	}
}