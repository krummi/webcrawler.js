Web Crawler
===========

A web crawler written in NodeJS.

## Implementation Decisions

Does not work for dynamic web pages as we do not run JavaScript. To be able to do this it would however be able to use PhantomJS instead. 

We use cheerio for parsing and query-ing the DOM.

Use https://github.com/MatthewMueller/cheerio for 