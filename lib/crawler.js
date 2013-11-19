/*
 * External dependencies.
 */
var cheerio = require('cheerio'),
    request = require('request'),
    _ = require('lodash'),
    urlparser = require('url'),
    S = require('string'),
    colors = require('colors');

/*
 * Internal dependencies.
 */
var Frontier = require('./frontier');

/*
 * A constructor that creates an instance of a Crawler.
 */
function Crawler(options) {
  // Checks for mandatory options.
  if (!options) {
    throw new Error('no options - required: seeds, topic, query_words.');
  }
  if (!options['seeds'] || !options['topic'] || !options['query_words']) {
    throw new Error('missing args: seeds, topic or query_words.');
  }

  // Create instance variables for the 
  this.topic = options['topic'].toLowerCase();
  this.queryWords = S(options['query_words'].toLowerCase())
                    .collapseWhitespace().s;
  

  // Handles both an array of seeds or just a single string.
  if (_.isString(options['seeds'])) {
    this.seeds = [options['seeds']];
  } else if (_.isArray(options['seeds'])) {
    this.seeds = options['seeds'];
  } else {
    throw new Error('seeds should be an array or a string.');
  }

  // TODO: Handle if !options.
  this.options = _.extend({
    // The maximum number of pages to crawl.
    max_pages: 500,

    // The maximum depth to crawl to.
    max_depth: 0
  }, options);

  // Declares the frontier and the hash that contains visited URLs.
  this.frontier = new Frontier();
  this.visited = {};
}

Crawler.prototype.start = function() {

  // Initialization.
  this.pagesCrawled = 0;

  // Puts the seed url into the frontier.
  for (var i = 0; i < this.seeds.length; i++) {
    var canonicalUrl = this.canonicalize(this.seeds[i]);
    this.frontier.add(canonicalUrl);
  }

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
  var domains = Object.keys(this.frontier.domains);
  this.crawlAll(domains);
};

/*
 * Crawls all domains which are not already being crawled.
 */
Crawler.prototype.crawlAll = function(domains) {
  for (var i = 0; i < domains.length; i++) {
    var domainName = domains[i];
    var domain = this.frontier.get(domainName);
    if (domain) {
      // assert.equal(domain.crawling, false);
      // assert.ok(!domain.isEmpty())

      // In case of a previously unseen domain.
      if (!domain.robots) {
        // First fetch the robots.txt and then start crawling.
        domain.fetchRobots(function(parser) {
          this.crawl(domainName);
        }.bind(this));
      } else {
        this.crawl(domainName);
      }

    }
    
  }
};

Crawler.prototype.crawl = function(domain) {
  var domainFrontier = this.frontier.get(domain);
  var frontierEntry = domainFrontier.popLink();

  // TODO: CHECK FOR ROBOTS TXT ENTRY!!!

  this.crawlEntry(frontierEntry);
};

/*
 * Crawls a single entry in the frontier list.
 */
Crawler.prototype.crawlEntry = function(entry) {
  var url = entry['url'];
  var depth = entry['depth'];

  var body = this.get(url, function(body) {
    // TODO: Make sure this works.
    this.visited[url] = true;

    // TODO: Does the requests library follow redirects? Probably.
    if (body === null) {
      return;
    }

    // Extracts the links and keep track of the new hostnames that
    var links = this.extractLinks(body);
    var newDomains = {};

    _(links).forEach(function(link) {
      // Let us start by resolving and canonicalizing the links.
      var resolved = urlparser.resolve(url, link);

      // Ignore anything but http: and https:.
      if (resolved && (S(resolved).startsWith('http:') ||
                       S(resolved).startsWith('https:'))) {

        // Canonicalize the URL.
        var canonicalized = this.canonicalize(resolved);
      
        // Add the canonicalized link to the frontier.
        // NOTE: We do not score the canonicalized URI. Should we be doing this?
        var score = this.scoreLink(link);

        // Parse the canonicalized URL.
        var parsedUrl = urlparser.parse(canonicalized);

        // Adds this to the list of new domains if it isn't there already.
        if (!(parsedUrl.host in newDomains)) {
          newDomains[parsedUrl.host] = true;
        }

        // TODO: Add depth.
        this.frontier.add(canonicalized, score);
      }
    }.bind(this));

    this.frontier.stats();

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

/*
 * Scores link according to "how relevant" they are to the topic in question.
 * Links are scored on the scale [0, 1] with 0 being non-relevant and 1 being 
 * relevant.
 */
Crawler.prototype.scoreLink = function(link) {
  // TODO: Add unit tests.
  return S(link).contains(this.topic) ? 1.0 : 0.0;
};

/*
 * Finds all <a href="">'s in a web page source with the help of cheerio.
 */
Crawler.prototype.extractLinks = function(body) {
  // Uses cheerio to extract the links from the page.
  var links = [];
  $ = cheerio.load(body);
  $('a').each(function(index) {
    var href = $(this).attr('href');
    if (href) {
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
  var parsedUrl = urlparser.parse(url);

  // Return null for anything but http and https.
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('Cannot canonicalize: ' + parsedUrl.protocol);
  }

  // Checks for default port 80
  if (parsedUrl.port === '80' &&
      parsedUrl.protocol === 'http:' &&
      S(parsedUrl.host).endsWith(':80')) {
    parsedUrl.host = S(parsedUrl.host).chompRight(':80').s;
    delete parsedUrl.port;
  }

  // Checks for default port 443
  if (parsedUrl.port === '443' &&
      parsedUrl.protocol === 'https:' &&
      S(parsedUrl.host).endsWith(':443')) {
    parsedUrl.host = S(parsedUrl.host).chompRight(':443').s;
    delete parsedUrl.port;
  }

  // Remove fragment.
  if (parsedUrl.hash) {
    delete parsedUrl.hash;
  }

  // Replace all HTML encoded hyphens, periods, underscores and tildes with
  // their decoded equivalents.
  // TODO: finish this.
  parsedUrl.pathname = S(parsedUrl.pathname).replaceAll('%7E', '~');

  // Remove dot segments.
  var segments = parsedUrl.pathname.split('/');
  for (var i = 0; i < segments.length; i++) {
    if (segments[i] === '.') {
      segments.splice(i, 1);
      i = 0;
    } else if (segments[i] === '..' && i > 0) {
      segments.splice(i - 1, 2);
      i = 0;
    }
  }
  parsedUrl.pathname = segments.join('/');

  return urlparser.format(parsedUrl);
};

module.exports = Crawler;