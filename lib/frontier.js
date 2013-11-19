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

function Frontier(seed) {
	// Initializes the frontier.
	this.domains = {};
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
 * Pushes an URL to the frontier. The depth defaults to 0.
 * 
 * url can either be an object or a string.
 */
Frontier.prototype.add = function(url, score, depth) {

	// Default depth and score to 0.
	score = typeof score !== 'undefined' ? score : 0.0;
	depth = typeof depth !== 'undefined' ? depth : 0;
		
	if (_.isString(url)) {
		url = urlutils.parse(url);
	}

	// Adds a new entry to the frontier if none exists.
	if (!(url.host in this.domains)) {
		this.domains[url.host] = {
			heap: new Heap(compareEntries),
			robots: null,
			isBeingCrawled: false
		};
	}

	this.domains[url.host]['heap'].push({
		url: urlutils.format(url),
		score: score,
		depth: depth
	});
};

Frontier.prototype.fetchRobots = function(domain, callback) {
	
};

Frontier.prototype.pop = function(host) {
	if (!host || !(host in this.domains)) {
		throw new Error('no heap exists for this host.');
	}
	if (this.domains[host]['heap'].empty()) {
		return null;
	}
	var first = this.domains[host]['heap'].pop();
	return first;
};

Frontier.prototype.getNoOfDomains = function() {
	return Object.keys(this.domains).length;
};

module.exports = Frontier;