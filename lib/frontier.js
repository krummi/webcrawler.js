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
	this.robots = null;
	this.crawling = false;
	this.crawlDelay = 300;
}

Domain.prototype.addLink = function(link, score, depth) {
	this.heap.push({ url: link, score: score, depth: depth });
};

Domain.prototype.popLink = function() {
	return this.heap.pop();
};

Domain.prototype.isEmpty = function() {
	return this.heap.size() === 0;
};

Domain.prototype.size = function() {
	return this.heap.size();
};

Domain.prototype.fetchRobots = function(userAgent, callback) {
	// TODO: Fix the "http://".
	console.log('> robots for: '.green + this.host.yellow);
	robotsParser.setUrl(
		"http://" + this.host + '/robots.txt', 
		function(parser, success) {
		if (success) {
			console.log('< robots for: '.green + 
				        this.host.yellow + " - success.".green);
			// Fetches the crawl delay, else uses the default.
			if (parser.getCrawlDelay(userAgent)) {
				this.crawlDelay = parseInt(parser.getCrawlDelay('msnbot'), 10);
				console.log('parser delay: ' + this.crawlDelay);
			}
			this.robots = parser;
			callback();
		} else {			
			// This domain does not contain a robots.txt file.
			console.log('< robots for: '.green + 
	        	this.host.yellow + " - none.".red);
			this.robots = false;
		}
	}.bind(this));
};

Domain.prototype.canFetch = function(userAgent, pathname) {
	// Checks if the domain does not contain a robots file: If so, assume true.
	if (this.robots === null) {
		// TODO: remove this.
		console.log('this should not be happening');
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
function Frontier(seed) {
	// Initializes the frontier.
	this.domains = {};
	this.totalNoOfLinks = 0;
}

/*
 * Pushes an URL to the frontier. The depth defaults to 0.
 * 
 * url can either be an object or a string.
 */
Frontier.prototype.add = function(url, score, depth) {
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
	this.domains[url.host].addLink(urlutils.format(url), score, depth);
	this.totalNoOfLinks++;
};

Frontier.prototype.pop = function(host) {
	if (!host || !(host in this.domains)) {
		throw new Error('no heap exists for this host.');
	}
	if (this.domains[host].isEmpty()) {
		return null;
	}
	this.totalNoOfLinks--;
	return this.domains[host].popLink();
};

Frontier.prototype.get = function(domain) {
	return this.domains[domain];
};

Frontier.prototype.getNoOfDomains = function() {
	return this.getDomains().length;
};

Frontier.prototype.getDomains = function() {
	return Object.keys(this.domains);
};

Frontier.prototype.stats = function() {
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