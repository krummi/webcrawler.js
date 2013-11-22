/* 
 * External depedencies.
 */
var _ = require('lodash'),
  urlutils = require('url'),
  Heap = require('heap'),
  robots = require('robots');

/*
 * Global variables.
 */
var robotsParser = new robots.RobotsParser();

/*
 * For debugging purposes.
 */
function ASSERT(condition, message) {
  if (!condition) {
    throw new Error('assertion error: ' + message);
  }
}

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

Domain.prototype.popLink = function () {
  var entry = this.heap.pop();

  // Update domain stats.
  this.noOfLinks--;
  this.avgLinkScore -= entry['score'];

  return entry;
};

Domain.prototype.isEmpty = function () {
  return this.heap.size() === 0;
};

Domain.prototype.size = function () {
  return this.heap.size();
};

Domain.prototype.fetchRobots = function (userAgent, callback) {
  // TODO: Fix the "http://".
  console.log('> robots for: '.green + this.host.yellow);
  robotsParser.setUrl(
    "http://" + this.host + '/robots.txt',
    function (parser, success) {
      if (success) {
        console.log('< robots for: '.green +
          this.host.yellow + " - success.".green);
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
        console.log('< robots for: '.green +
          this.host.yellow + " - none.".red);
        this.robots = false;
        callback(this.host);
      }
    }.bind(this));
};

Domain.prototype.getScore = function () {
  return (this.avgLinkScore / this.noOfLinks);
}

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
  // TODO: change from add to push.

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

Frontier.prototype.pop = function (host) {
  if (!host || !(host in this.domains)) {
    throw new Error('no heap exists for this host.');
  }
  if (this.domains[host].isEmpty()) {
    return null;
  }
  return this.domains[host].popLink();
};

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

Frontier.prototype.get = function (domain) {
  return this.domains[domain];
};

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

Frontier.prototype.getDomains = function () {
  return Object.keys(this.domains);
};

Frontier.prototype.stats = function () {
  var keys = Object.keys(this.domains);
  console.log();
  console.log('Frontier statistics'.green);
  console.log('-----------------------------------------'.green);
  for (var i = 0; i < keys.length; i++) {
    console.log(keys[i].green + ": ".green +
      this.domains[keys[i]].size().toString().yellow);
  }
  console.log('Total no of links: '.green +
    this.totalNoOfLinks.toString().yellow);
};

module.exports = Frontier;