var cheerio = require('cheerio'),
    request = require('request'),
    _ = require('lodash'),
    urlparser = require('url');

function Crawler(options) {
  // TODO: Handle if !options.

  // Declares the frontier.
  this.frontier = [];
}

Crawler.prototype.get = function(link) {
  request('http://www.mbl.is', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      return body;
    }
    // TODO: else { ? }
  });
};

Crawler.prototype.extractLinks = function(body) {
  // Uses cheerio to extract the links from the page.
  var links = [];
  $ = cheerio.load(body);
  $('a').each(function(index) {
    var parsed_url = urlparser.parse($(this).attr('href'));
    links.push(parsed_url);
  });
  return links;
};

/**
 * Canonicalizes (aka normalizes) a given URL.
 * 
 * http://en.wikipedia.org/wiki/URL_normalization
 */
Crawler.prototype.canonicalize = function(url) {
  // Parse the URL.
  var url = urlparser.parse(url);

  // Remove dot segments.
  // See: http://tools.ietf.org/html/rfc3986#page-33
  
};

module.exports = Crawler;