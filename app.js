var Crawler = require('./lib/crawler.js');

var crawler = new Crawler({
	seeds: ['http://www.mbl.is'],
	topic: 'golf',
	query_words: 'birgir leifur',
	max_pages: 200,
  max_domains: 20
});

crawler.start();