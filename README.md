webcrawler.js
=============

A web crawler written in NodeJS.

## Implementation Decisions

Does not work for dynamic web pages as we do not run JavaScript. To be able to do this it would however be able to use PhantomJS instead. 

Uses cheerio (https://github.com/MatthewMueller/cheerio) for parsing and query-ing the DOM.