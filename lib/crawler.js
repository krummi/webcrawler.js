var cheerio = require('cheerio'),
    request = require('request'),
    _ = require('lodash'),
    urlparser = require('url'),
    S = require('string');

function Crawler(options) {
  // TODO: Handle if !options.

  // Declares the frontier.
  this.frontier = [];
};

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
  var parsed_url = urlparser.parse(url);

  // Checks for default port 80
  if (parsed_url.port === '80' &&
      parsed_url.protocol === 'http:' &&
      S(parsed_url.host).endsWith(':80')) {
    parsed_url.host = S(parsed_url.host).chompRight(':80');
    delete parsed_url.port;
  }

  // Checks for default port 443
  if (parsed_url.port === '443' &&
      parsed_url.protocol === 'https:' &&
      S(parsed_url.host).endsWith(':443')) {
    parsed_url.host = S(parsed_url.host).chompRight(':443');
    delete parsed_url.port;
  }

  // Remove fragment.
  if (parsed_url.hash) {
    delete parsed_url.hash;
  }

  // Replace all HTML encoded hyphens, periods, underscores and tildes with
  // their decoded equivalents.
  // TODO: finish this.
  parsed_url.pathname = S(parsed_url.pathname).replaceAll('%7E', '~');

  // Remove dot segments.
  var segments = parsed_url.pathname.split('/');
  for (var i = 0; i < segments.length; i++) {
    if (segments[i] === '.') {
      segments.splice(i, 1);
      i = 0;
    } else if (segments[i] === '..' && i > 0) {
      segments.splice(i - 1, 2);
      i = 0;
    }
  }
  parsed_url.pathname = segments.join('/');

  return urlparser.format(parsed_url);
};

module.exports = Crawler;