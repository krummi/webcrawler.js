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
 * For debugging purposes.
 */

var DEBUG = false;

function ASSERT(condition, message) {
  if (!condition) {
    throw new Error('assertion error: ' + message);
  }
}

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

  // Handles both an array of seeds or just a single string.
  if (_.isString(options['seeds'])) {
    this.seeds = [options['seeds']];
  } else if (_.isArray(options['seeds'])) {
    this.seeds = options['seeds'];
  } else {
    throw new Error('seeds should be an array or a string.');
  }

  this.options = _.extend({
    // The user agent that the crawler uses.
    user_agent: 'RuBot',

    // The maximum number of pages to crawl.
    max_pages: 100,

    // The maximum number of domains to simultaneously crawl.
    max_domains: 5
  }, options);

  // Attaches instance variables.
  this.topic = options['topic'].toLowerCase();
  this.queryWords = S(options['query_words'].toLowerCase())
    .collapseWhitespace().s;
  this.queryWordsTokens = this.queryWords.split(' ');
  this.userAgent = this.options['user_agent'];
  this.maxDomains = this.options['max_domains'];
  this.maxPages = this.options['max_pages'];

  // Declares the frontier and the hash that contains visited URLs.
  this.frontier = new Frontier();
  this.relevant = [];
  this.startedAt = new Date().getTime();

  // Keeps track of the number of outgoing requests that we haven't gotten
  // a response for as of yet. TODO: timeouts?
  this.waitingForResponse = 0;
}

/*
 * Starts the crawling process!
 */
Crawler.prototype.start = function () {

  // Initialization.
  this.pagesCrawled = 0;
  this.domainsCrawling = 0;

  // Puts the seed url into the frontier.
  for (var i = 0; i < this.seeds.length; i++) {
    var canonicalUrl = this.canonicalize(this.seeds[i]);
    this.frontier.add(canonicalUrl, 1.0, 0);
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
  console.log('-----------------------------------------'.green);

  // Start crawling!
  this.crawlBestDomains();
};

Crawler.prototype.isRelevantPage = function (text) {
  return S(text.toLowerCase()).contains(this.queryWords);
};


/*
 * Prints a final report detailing stats on the crawl.
 */
Crawler.prototype.printReport = function () {
  var deltaTime = new Date().getTime() - this.startedAt;
  console.log();
  console.log('-----------------------------------------'.green);
  console.log(
    'Search complete, crawled '.green + this.pagesCrawled.toString().yellow +
      ' pages in '.green + deltaTime.toString().yellow + ' ms.'.green
  );
  for (var i = 0; i < this.relevant.length; i++) {
    console.log('Query found on page: '.green + this.relevant[i].yellow);
  }
  console.log('Search query '.green + this.queryWords.yellow +
    ' found in '.green + this.relevant.length.toString().yellow +
    ' pages'.green);
  console.log('No of distinctive links found: '.green +
    this.frontier.noOfUniqueLinks.toString().yellow);
  console.log('Total no of links found: '.green +
    this.frontier.totalNoOfLinks.toString().yellow);
  console.log('-----------------------------------------'.green);
};

/*
 * Starts crawling a set of new domains that we aren't crawling already.
 */
Crawler.prototype.crawlBestDomains = function () {
  // Start crawling new domains until we either reach the maximum number of
  // domains that we want to be crawling simultaneously, or the number of
  // domains that we can crawl.
  var howMany = Math.min(
    this.frontier.getNoOfAvailableDomains(), this.maxDomains);

  while (this.domainsCrawling < howMany) {
    // Find the best domain!
    var domain = this.frontier.getBestDomain();
    var domainName = domain.host;

    if (domain && !domain.crawling) {
      // Sanity checks.
      ASSERT(!domain.crawling);
      ASSERT(!domain.isEmpty());

      // Well, we're officially crawling this domain!
      domain.crawling = true;
      this.domainsCrawling++;

      // Log stuff.
      if (DEBUG) {
        console.log(
          'start crawling domain: '.green + domainName.yellow +
            ' ('.green + this.domainsCrawling.toString().yellow +
            '/'.green + this.maxDomains.toString().yellow + ')'.green +
            ' (score: '.green + domain.getScore().toString().yellow +
            ')'.green
        );
      }

      // In case of a previously unseen domain.
      // First fetch the robots.txt and then start crawling.
      domain.fetchRobots(this.userAgent, function (domain) {
        this.crawl(domain);
      }.bind(this));
    }
  }
};

/*
 * Starts crawling an individual domain.
 */
Crawler.prototype.crawl = function (domain) {
  // Should we stop crawling?
  if (this.shouldStop()) {
    return;
  }

  // Nope, we should not - retrieve data on the domain.
  var domainFrontier = this.frontier.get(domain);

  // Find a frontier entry to crawl.
  var entryToCrawl = null;
  while (true) {

    // Is the domain exhausted?
    if (domainFrontier.isEmpty()) {
      console.log('domain frontier exhausted: '.green + domain.yellow);
      domainFrontier.crawling = false;
      this.domainsCrawling--;

      // This is the thing we should do, right?
      this.crawlBestDomains();

      return;
    }

    // Retrieve the next link to look at for this domain.
    var frontierEntry = domainFrontier.popLink();
    var url = frontierEntry['url'];
    var parsedUrl = urlparser.parse(url);

    // Are we allowed to crawl this site?
    if (domainFrontier.canFetch(this.userAgent, parsedUrl.pathname)) {
      entryToCrawl = frontierEntry;
      break;
    }
  }

  // Sanity check and crawl the frontier entry!
  ASSERT(entryToCrawl !== null);
  this.crawlEntry(entryToCrawl);
};

/*
 * Crawls a single entry in the frontier list.
 */
Crawler.prototype.crawlEntry = function (entry) {
  // Fetch the entry data.
  var url = entry['url'];
  var depth = entry['depth'];
  var score = entry['score'];

  if (DEBUG) {
    console.log('> crawling url: '.green + url.yellow + " - depth: ".green +
      depth.toString().yellow + " - score: ".green + score.toString().yellow
    );
  }

  // We are waiting for a response on this one.
  this.waitingForResponse++;

  // Fires off the GET request!
  this.get(url, function (url, body) {
    // We're no longer waiting for a response on this one.
    this.waitingForResponse--;

    // We've crawled plus one page.
    this.pagesCrawled++;

    // Should we go on to analyze content and links?
    if (body === null) {
      // For debugging purposes:
      if (DEBUG) {
        console.log('< crawling url: '.green + url.yellow + " - halted.".red);
      }
    } else {
      // Parse the body of the page with cheerio, this will be used in both
      // content analysis and link extraction.
      // Extracts the links and keeps track of the new domains that we see.
      try {
        $ = cheerio.load(body);

        // (#1) CONTENT ANALYSIS STEP

        if (this.isRelevantPage(body)) {
          this.relevant.push(url);
        }

        // (#2) LINK EXTRACTION STEP

        var links = this.extractLinks($);

        _(links).forEach(function (link) {
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

            this.frontier.add(canonicalized, score, depth + 1);
          }
        }.bind(this));

        // For debugging purposes.
        if (DEBUG) {
          console.log('< crawling url: '.green + url.yellow +
            ' - successful, links found: '.green +
            links.length.toString().yellow);
        }

        // Check to see if we are available to crawl more domains.
        // TODO: This can be optimized a whole lot!
        if (links.length > 0) {
          this.crawlBestDomains();
        }
      } catch (ex) {
        if (DEBUG) {
          console.log('exception occurred while parsing: '.red + url);
        }
      }
    }

    // Should we stop? Also: Should we print the report?
    if (this.shouldStop()) {
      if (this.waitingForResponse === 0) {
        this.printReport();
      }
      return;
    }

    // Crawls the next site for the domain that we are currently crawling.
    var parsedUrl = urlparser.parse(url);
    var domainName = parsedUrl.host;
    var domain = this.frontier.get(domainName);
    var domainDelay = domain.crawlDelay;

    // For debugging purposes:
    //console.log('crawling next site of: '.green + domainName.yellow +
    //  ' in '.green + domainDelay.toString().yellow + ' ms.'.yellow);

    // Crawls the next link of this domain in X seconds.
    setTimeout(function (domain) {
      this.crawl(domain)
    }.bind(this), domainDelay, domainName);
  }.bind(this));
};

/*
 * Uses the request library to fire off a HTTP GET request to a particular url.
 */
Crawler.prototype.get = function (link, cb) {
  request(link, function (error, response, body) {
    if (!error && response.statusCode == 200 &&
      S(response.headers['content-type']).contains('text/html')) {
      cb(link, body);
    } else {
      cb(link, null);
    }
  });
};

/*
 * A function that determines whether we should stop crawling or not.
 */
Crawler.prototype.shouldStop = function () {
  if ((this.pagesCrawled + this.waitingForResponse) >= this.maxPages) {
    return true;
  }
  return false;
};

/*
 * Scores link according to "how relevant" they are to the topic in question.
 * Links are scored on the scale [0, 1] with 0 being non-relevant and 1 being 
 * relevant.
 */
Crawler.prototype.scoreLink = function (link) {
  var linkLower = link.toLowerCase();
  var score = 0.0;

  // Does it contain the topic?
  if (S(linkLower).contains(this.topic)) {
    score += 0.5;
  }

  // For any query word that it contains, add score for that particular word.
  var scorePerWord = 0.5 / this.queryWordsTokens.length;
  for (var i = 0; i < this.queryWordsTokens.length; i++) {
    if (S(linkLower).contains(this.queryWordsTokens[i])) {
      score += scorePerWord;
    }
  }

  return score;
};

/*
 * Finds all <a href="">'s in a web page source with the help of cheerio.
 */
Crawler.prototype.extractLinks = function (cheerioBody) {
  // Uses cheerio to extract the links from the page.
  var links = [];
  var $ = cheerioBody;
  $('a').each(function (index) {
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
Crawler.prototype.canonicalize = function (url) {
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