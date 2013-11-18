var assert = require("assert");

var Frontier = require('./../lib/frontier');

describe('Frontier', function() {
  beforeEach(function() {
    frontier = new Frontier();
  });
  
  describe('#add', function() {
    it('-ing two domains should create two heaps', function() {
      frontier.add('http://www.mbl.is/testing');
      frontier.add('http://www.mbl.is/frettir');
      assert.equal(frontier.heaps.length, 2);
    }),
    it('-ing three urls from two domains should create two heaps', function() {
      frontier.add('http://www.mbl.is/test1');
      frontier.add('http://www.fotbolti.net');
      frontier.add('http://www.mbl.is/test1');
      assert.equal(frontier.heaps.length, 2);
    });
  }),

});