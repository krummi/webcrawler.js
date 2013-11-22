/* 
 * External dependencies.
 */
var _ = require('lodash'),
  urlutils = require('url'),
  Heap = require('heap'),
  robots = require('robots');

/*
 * For debugging purposes.
 */
function ASSERT(condition, message) {
  if (!condition) {
    throw new Error('assertion error: ' + message);
  }
}

/*
 * Used to order two domain frontier entries. Used by the heaps.
 */
function compareEntries(a, b) {
  if (a['score'] < b['score']) {
    return 1;
  } else if (a['score'] > b['score']) {
    return -1;
  } else {
    return 0;
  }
}

/*
 * The Domain class.
 */
function Domain(host) {
  this.host = host;
  this.heap = new Heap(compareEntries);
  this.seen = {};
  this.robots = null;
  this.crawling = false;
  this.crawlDelay = 500; // ms.
  this.noOfLinks = 0;
  this.avgLinkScore = 0.0;
}

/**
 * Adds a link to the queue for this domain.
 *
 * @returns {boolean} true if the link was added and hadn't been seen already.
 */
Domain.prototype.addLink = function (link, score, depth) {
  if (!(link in this.seen)) {
    this.seen[link] = true;
    this.avgLinkScore += score;
    this.noOfLinks++;
    this.heap.push({ url: link, score: score, depth: depth });
    return true;
  } else {
    return false;
  }
};

/*
 * Pops the highest scoring link form this domain's frontier.
 */
Domain.prototype.popLink = function () {
  var entry = this.heap.pop();

  // Update domain stats.
  this.noOfLinks--;
  this.avgLinkScore -= entry['score'];

  return entry;
};

/*
 * Determines if there are any links on this domain's frontier.
 */
Domain.prototype.isEmpty = function () {
  return this.heap.size() === 0;
};

/*
 * Returns the number of links on this domain's frontier.
 */
Domain.prototype.size = function () {
  return this.heap.size();
};

/*
 * Fetches, parses and stores the robots.txt file for this domain. If the
 * domain does not specify a robots.txt file - everything allowed is assumed.
 */
Domain.prototype.fetchRobots = function (userAgent, callback) {
  // TODO: Fix the "http://".
  var robotsParser = new robots.RobotsParser();
  robotsParser.setUrl(
    "http://" + this.host + '/robots.txt', function (parser, success) {
      if (success) {
        console.log('< robots for: '.green + this.host.yellow +
          ' - success.'.green);
        // Fetches the crawl delay, else uses the default.
        if (parser.getCrawlDelay(userAgent)) {
          this.crawlDelay = parseInt(parser.getCrawlDelay(userAgent), 10);
          this.crawlDelay *= 1000; // Convert to ms.
          console.log('parser delay for: '.red + this.host.yellow +
            ' @ '.red + this.crawlDelay.toString().yellow +
            ' ms.'.red);
        }
        this.robots = parser;
        callback(this.host);
      } else {
        // This domain does not contain a robots.txt file.
        console.log('< robots for: '.green + this.host.yellow + " - none.".red);
        this.robots = false;
        callback(this.host);
      }
    }.bind(this));
};

/*
 * Gets the score associated with this domain.
 */
Domain.prototype.getScore = function () {
  return (this.avgLinkScore / this.noOfLinks);
}

/*
 * Determines whether an given user agent can fetch a particular pathname,
 * based on the robots parser for this domain.
 */
Domain.prototype.canFetch = function (userAgent, pathname) {
  // Checks if the domain does not contain a robots file: If so, assume true.
  if (this.robots === null) {
    // TODO: remove this.
    ASSERT(false, "Pathname: " + pathname + " / domain.host: " + this.host);
  } else if (this.robots === false) {
    return true;
  } else {
    return this.robots.canFetchSync(userAgent, pathname);
  }
};

/*
 * The Frontier class.
 */

/*
 * @constructor
 */
function Frontier() {
  // Initializes the frontier.
  this.domains = {};
  this.totalNoOfLinks = 0;
  this.noOfUniqueLinks = 0;
}

/*
 * Pushes an URL to the frontier. The depth defaults to 0.
 * 
 * url can either be an object or a string.
 */
Frontier.prototype.add = function (url, score, depth) {
  // TODO: Should be push, not add.

  // Default score to 0.0 and depth to -1 or UNKNOWN.
  score = typeof score !== 'undefined' ? score : 0.0;
  depth = typeof depth !== 'undefined' ? depth : -1;

  // Parse the url if its in a string format.
  if (_.isString(url)) {
    url = urlutils.parse(url);
  }

  // Adds a new entry to the frontier if none exists.
  if (!(url.host in this.domains)) {
    this.domains[url.host] = new Domain(url.host);
  }

  // Add the link.
  if (this.domains[url.host].addLink(urlutils.format(url), score, depth)) {
    this.noOfUniqueLinks++;
  }
  this.totalNoOfLinks++;
};

/*
 * Finds the highest scoring domain amongst the domains that we have
 * encountered so far. TODO: Should be implemented with a heap.
 */
Frontier.prototype.getBestDomain = function (domain) {
  // Filter domains.
  var values = _.map(this.domains, function (elem) {
    // We do not want to choose domains that are being crawled or are empty.
    return (elem.crawling || elem.isEmpty()) ? null : elem;
  });

  // Remove nulls.
  values = _.compact(values);

  // Find the one with the best score.
  return _.max(values, function (d) {
    return d.getScore();
  })
}

/*
 * Retrieves a particular domain from the domain list.
 */
Frontier.prototype.get = function (domain) {
  return this.domains[domain];
};

/*
 * Returns the number of domains that we've encountered.
 */
Frontier.prototype.getNoOfDomains = function () {
  return this.getDomains().length;
};

/*
 * Returns the number of domains that are not exhausted.
 */
Frontier.prototype.getNoOfAvailableDomains = function () {
  // Filter domains.
  var values = _.map(this.domains, function (elem) {
    // We do not want to choose domains that are being crawled or are empty.
    return (elem.crawling || elem.isEmpty()) ? null : elem;
  });

  // Remove nulls.
  values = _.compact(values);
  return values.length;
};

/*
 * Returns a list of the domain names that we've encountered.
 */
Frontier.prototype.getDomains = function () {
  return Object.keys(this.domains);
};

Frontier.prototype.domainStats = function () {
  var keys = Object.keys(this.domains);
  console.log();
  for (var i = 0; i < keys.length; i++) {
    var domain = this.domains[keys[i]];
    console.log('>>> '.green + domain.host.yellow + ' - crawling: '.green +
      domain.crawling);
  }
  console.log();
},

  module.exports = Frontier;