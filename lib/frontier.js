/* 
 * External depedencies.
 */
var _ = require('lodash'),
	urlutils = require('url'),
    Heap = require('heap');

function Frontier(seed) {
	// Initializes the frontier.
	this.heaps = {};
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

	if (!(url.hostname in this.heaps)) {
		this.heaps[url.hostname] = new Heap(compareEntries);
	}

	this.heaps[url.hostname].push({
		url: urlutils.format(url),
		score: score,
		depth: depth
	});
};

Frontier.prototype.pop = function(hostname) {
	if (!hostname || !(hostname in this.heaps)) {
		throw new Error('no heap exists for this hostname.');
	}
	if (this.heaps[hostname].empty()) {
		return null;
	}
	var first = this.heaps[hostname].pop();
	return first;
};

Frontier.prototype.getNoOfDomains = function() {
	return Object.keys(this.heaps).length;
};

module.exports = Frontier;