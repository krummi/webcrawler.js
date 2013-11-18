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
		this.heaps[url.hostname] = new Heap();
	}

	this.heaps[url.hostname].push({
		url: urlutils.format(url),
		score: score,
		depth: depth
	});
};

Frontier.prototype.pop = function() {
	if (this.isEmpty()) {
		return null;
	}
	var first = this.frontier.splice(0, 1)[0];
	return first;
};

Frontier.prototype.getNoOfDomains = function() {
	return Object.keys(this.heaps).length;
};

module.exports = Frontier;