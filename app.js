var Crawler = require('./lib/crawler.js');

var crawler = new Crawler({
	max_pages: 1
});

crawler.start('http://www.mbl.is', 'golf', 'birgir leifur');