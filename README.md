webcrawler.js
=============

A targeted web crawler written in NodeJS. In short, our target design was a crawler that would be insanely fast, rather flexible whilst still conforming to industry standards when it comes to politeness.

### How To Run

```bash
npm install
node app.js
```

### Concurrency Approach

We utilize NodeJS to achieve concurrency in our crawler. This is rather easy with NodeJS, since it is asynchronous by nature, i.e. when you fire off an HTTP request to some URL it will *not* block until a response is received but will instead go on to do other things while it is waiting for the response. But to achieve both "politeness" and "concurrency" you have to be a bit clever, because if you encounter two links: www.mbl.is/1 and www.mbl.is/2 you are not going to want to fire off 2 requests at the same moment, because that wouldn't be polite.

What we do to achieve both concurrency and politeness is that we do not have a single frontier that keeps track of all of the URLs that we are going to visit. Instead, we have a single frontier per each domain that we encounter and then we crawl *X* domains simultaneously. When we've crawled all URLs belonging to a specific domain, a new domain is picked to be crawled instead based on *the average score of the links* associated with that particular domain. We thus process domains that look good first.

### HTML parsing and DOM querying

We use the [cheerio](http://matthewmueller.github.com/cheerio/) for HTML parsing and DOM querying. Cheerio in turn uses the flexible and forgiving [htmlparser](https://github.com/fb55/htmlparser2) library for HTML parsing but further provides an easy-to-use, jQuery-like API for querying and manipulating the DOM.

This however means that our scraper does *not* handle dynamic web pages well. This is mostly due to the fact that we never execute the JavaScript code that many web pages will contain. If the web pages that we scrape run AJAX calls to fetch some arbitrary data, our scraper will not come across this data. To alleviate this problem we could either use something like [JSDOM](https://github.com/tmpvar/jsdom) that takes DOM emulation even further - but is both stricter when it comes to HTML parsing and slower in general - or [PhantomJS](http://phantomjs.org/) which is a headless WebKit implementation. PhantomJS would probably be the best fit if we wanted to handle very dynamic web pages since it behaves as your typical browser. Waiting for PhantomJS to render pages would however take even more time.

In general, it depends on the use case which of the aforementioned approaches you would use. But as we mentioned earlier we wanted our crawler to be fast and flexible, and because of this cheerio seemed to fit us very well.

### Scoring Mechanism

We give 0.5 to links if their lower case equivalent contains the topic. We also split the query words into an array *A* of strings and add 1/len(*A*) to the score for each query word that the link contains. This means that if we have an link that looks like this:

    https://secure.mbl.is/sport/golf/2013/09/25/birgir_leifur_i_urtokumot_fyrir_pga/

and we have the topic `golf` and query words `birgir leifur`, the link will get a score of 1 (0.5 for containing the topic `golf`, 0.25 for containing `birgir` and 0.25 for containing `leifur`).

### Example Usage

#### Input

```javascript
var Crawler = require('./lib/crawler.js');

var crawler = new Crawler({
	seeds: ['http://www.mbl.is'],
	topic: 'golf',
	query_words: 'birgir leifur',
	max_pages: 500,
  max_domains: 10
});

crawler.start();
```

#### Output

<pre>
-----------------------------------------
Starting crawl, seed: http://www.mbl.is/
Topic: golf
Query string: birgir leifur
Maximum number of pages: 500
-----------------------------------------
Search complete, crawled 500 pages in 137020 ms.
Query found on page: http://www.mbl.is/
Query found on page: http://www.mbl.is/sport/golf/2013/11/22/birgir_leifur_thremur_undir_fyrir_lokahringinn/
Query found on page: http://www.mbl.is/sport/golf/
Query found on page: http://www.mbl.is/sport/golf/2013/11/21/birgir_leifur_a_einu_hoggi_yfir_pari/
Query found on page: http://www.mbl.is/sport/golf/2013/11/04/birgir_leifur_lek_a_einu_undir_pari/
Query found on page: http://www.mbl.is/sport/golf/2013/09/25/birgir_leifur_i_urtokumot_fyrir_pga/
Query found on page: http://www.mbl.is/sport/golf/2013/09/20/birgir_leifur_komst_afram/
Query found on page: http://www.mbl.is/sport/golf/2013/11/03/birgir_leifur_tharf_ad_leika_betur/
Query found on page: http://www.mbl.is/sport/golf/2013/10/25/birgir_leifur_komst_afram/
Query found on page: http://www.mbl.is/sport/golf/2013/10/25/birgir_leifur_a_tveimur_yfir_eftir_thrja_hringi/
Query found on page: http://www.mbl.is/sport/golf/2013/10/24/birgir_leifur_a_pari_eftir_tvo_hringi/
Query found on page: http://www.mbl.is/sport/golf/2013/10/22/birgir_leifur_lek_a_hoggi_undir_pari/
Query found on page: http://www.mbl.is/sport/golf/2013/09/19/birgir_og_thordur_i_hardri_barattu/
Query found on page: http://www.mbl.is/sport/golf/2013/09/18/birgir_og_thordur_eru_fjorum_undir_i_thyskalandi/
Search query birgir leifur found in 14 pages
No of distinctive links found: 4126
Total no of links found: 136609
-----------------------------------------
</pre>