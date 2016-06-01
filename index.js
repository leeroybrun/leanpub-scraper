'use strict';

const LeanpubScraper = require('./scraper');

console.log(LeanpubScraper);

var scraper = new LeanpubScraper();

scraper.start('all');