webcrawler.js
=============

A targeted web crawler written in NodeJS. In short, our target design was a crawler that would be insanely fast, rather flexible whilst still conforming to industry standards when it comes to politeness.

## Implementation Details

### HTML parsing and DOM querying

We use the [cheerio](http://matthewmueller.github.com/cheerio/) for HTML parsing and DOM querying. Cheerio in turn uses the flexible and forgiving [htmlparser](https://github.com/fb55/htmlparser2) library for HTML parsing but further provides an easy-to-use, jQuery-like API for querying and manipulating the DOM.

This however means that our scraper does *not* handle dynamic web pages well. This is mostly due to the fact that we never execute the JavaScript code that many web pages will contain. If the web pages that we scrape run AJAX calls to fetch some arbitrary data, our scraper will not come across this data. To alleviate this problem we could either use something like [JSDOM](https://github.com/tmpvar/jsdom) that takes DOM emulation even further - but is both stricter when it comes to HTML parsing and slower in general - or [PhantomJS](http://phantomjs.org/) which is a headless WebKit implementation. PhantomJS would probably be the best fit if we wanted to handle very dynamic web pages since it behaves as your typical browser. Waiting for PhantomJS to render pages would however take even more time.

In general, it depends on the use case which of the aforementioned approaches you would use. But as we mentioned earlier we wanted our crawler to be fast and flexible, and because of this cheerio seemed to fit us very well.

### Traversal

We implement a rather simple best-first search tree traversal technique that uses a binary heap to order web pages by their _score_ that tells the crawler _how relevant_ each of the pages seem to be according to some search query that the user provides it with.

### Scoring Mechanism

We give 0.5 to links if their lower case equivalent contains the topic. We also split the query words into an array *A* of strings and add 1/len(*A*) to the score for each query word that the link contains. This means that if we have an link that looks like this:

    https://secure.mbl.is/sport/golf/2013/09/25/birgir_leifur_i_urtokumot_fyrir_pga/

and we have the topic `golf` and query words `birgir leifur`, the link will get a score of 1 (0.5 for containing the topic `golf`, 0.25 for containing `birgir` and 0.25 for containing `leifur`).

### Concurrency Approach

TODO.

### Example Usage

#### Input

```node
var Crawler = require('./lib/crawler.js');

var crawler = new Crawler({
	seeds: ['http://www.mbl.is'],
	topic: 'golf',
	query_words: 'birgir leifur',
	max_pages: 500,
  max_domains: 10
});

crawler.start();
``

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