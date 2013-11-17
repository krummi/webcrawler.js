var cheerio = require('cheerio'),
    request = require('request'),
    _ = require('lodash'),
    urlparser = require('url'),
    S = require('string'),
    colors = require('colors');

function Crawler(options) {
  // TODO: Handle if !options.
  this.options = _.extend({
    // The maximum number of pages to crawl.
    max_pages: 500,

    // The maximum depth to crawl to.
    max_depth: 0
  }, options);

  // Declares the frontier.
  this.frontier = [];
}

Crawler.prototype.start = function(seedUrl, topic, queryWords) {
  if (!seedUrl || !topic || !queryWords) {
    throw new Error('missing args: start(seedUrl, topic, queryWords)');
  }

  // Initialization.
  this.pagesCrawled = 0;

  this.topic = topic;
  this.queryWords = S(queryWords.toLowerCase()).collapseWhitespace().s;
  console.log(this.queryWords);

  // Puts the seed url into the frontier.
  var canonicalUrl = this.canonicalize(seedUrl);
  this.frontier.push(canonicalUrl);

  // Print out info.
  console.log('-----------------------------------------'.green);
  console.log('Starting crawl, seed: '.green + canonicalUrl.yellow);
  console.log('Topic: '.green + this.topic.yellow);
  console.log('Query string: '.green + this.queryWords.yellow);
  if (this.options['max_pages'] > 0) {
    console.log('Maximum number of pages: '.green +
                this.options['max_pages'].toString().yellow);
  }
  if (this.options['max_depth'] > 0) {
    console.log('Maximum depth: '.green +
                this.options['max_depth'].toString().yellow);
  }
  if (this.options['max_depth'] === 0 && this.options['max_pages'] === 0) {
    console.log('No maximum no of pages nor depth.'.red);
  }
  console.log('-----------------------------------------'.green);
  
  // Start crawling!
  this.crawl(canonicalUrl);
};

/*
 * Crawls a single entry in the frontier list.
 */
Crawler.prototype.crawl = function(entry) {
  var body = this.get(url, function(body) {
    if (body === null) {
      return;
    }

    // Retrieve the links.
    var links = this.extractLinks(body);
    console.log('links: ' + links);
    console.log('no of links: ' + links.length);
    // Immediately fire the requests for the rest of the links.
    _(links).forEach(function(link) {
      console.log('crawling: ' + link);
      if (this.pagesCrawled < this.options['max_pages']) {
        console.log('crawling: ' + link);
      }
    }.bind(this));
  }.bind(this));
};

Crawler.prototype.get = function(link, cb) {
  request('http://www.mbl.is', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      cb(body);
    } else {
      cb(null);
    }
  });
};

Crawler.prototype.extractLinks = function(body) {
  // Uses cheerio to extract the links from the page.
  var links = [];
  $ = cheerio.load(body);
  $('a').each(function(index) {
    var href = $(this).attr('href');
    if (href) {
      var parsed_url = urlparser.parse(href);
      links.push(href);
    }
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
    parsed_url.host = S(parsed_url.host).chompRight(':80').s;
    delete parsed_url.port;
  }

  // Checks for default port 443
  if (parsed_url.port === '443' &&
      parsed_url.protocol === 'https:' &&
      S(parsed_url.host).endsWith(':443')) {
    parsed_url.host = S(parsed_url.host).chompRight(':443').s;
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