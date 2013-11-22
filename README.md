webcrawler.js
=============

A targeted web crawler written in NodeJS. In short, our target design was a crawler that was insanely fast, rather flexible whilst still conforming to industry standards when it comes to politeness.

## Implementation Details

### HTML parsing and DOM querying

We use the [cheerio](http://matthewmueller.github.com/cheerio/) for HTML parsing and DOM querying. Cheerio in turn uses the flexible and forgiving [htmlparser](https://github.com/fb55/htmlparser2) library for HTML parsing but further provides an easy-to-use, jQuery-like API for querying and manipulating the DOM.

This however means that our scraper does *not* well handle dynamic web pages. This is mostly due to the fact that we never execute the JavaScript code that many web pages will contain. If the web pages that we scrape run AJAX calls to fetch some arbitrary data, our scraper will not get come across this data. To alleviate this problem we could either use something like [JSDOM](https://github.com/tmpvar/jsdom) that takes DOM emulation even further - but is both stricter when it comes to HTML parsing and slower in general - or [PhantomJS](http://phantomjs.org/) which is a headless WebKit implementation. PhantomJS would probably be the best fit if we wanted to handle very dynamic web pages since it behaves as your typical browser. Waiting for PhantomJS to render pages would however take even more time. 

In general, it obviously depends on the use case you are going after which of the aforementioned one would use. But as we mentioned earlier we wanted our crawler to be fast and flexible, and because of this cheerio seemed to fit us very well. 

### Traversal

We implement a rather simple best-first search tree traversal technique that uses a binary heap to order web pages by their _score_ that tells the crawler _how relevant_ each of the pages seem to be according to some search query that the user provides it with.

### Scoring Mechanism

We give 0.5 to links if their lower case equivalent contains the topic. We also split the query words into an array A of strings and add 1/len(A) to the score for each query word that the link contains. This means that if we have an link that looks like this:

  https://secure.mbl.is/sport/golf/2013/09/25/birgir_leifur_i_urtokumot_fyrir_pga/

and we have the topic 'golf' and query words 'birgir leifur', the link will get a score of 1 (0.5 for including the topic 'golf', 0.25 for including 'birgir' and 0.25 for including 'leifur').