/* 
 * External depedencies.
 */
var _ = require('lodash');

function Frontier(seed) {
	// Initializes the frontier.
	this.frontier = [];
}

/*
 * Pushes an URL to the frontier. The depth defaults to 0.
 */
Frontier.prototype.add = function(url, depth) {
	// Default depth to 0.
	depth = typeof depth !== 'undefined' ? depth : 0;
	this.frontier.push(url);
};

Frontier.prototype.pop = function() {
	if (this.isEmpty()) {
		return null;
	}
	var first = this.frontier.splice(0, 1)[0];
	return first;
};

Frontier.prototype.isEmpty = function() {
	return this.frontier.length === 0;
};