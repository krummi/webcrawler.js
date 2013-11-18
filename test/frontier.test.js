var assert = require("assert");

var Frontier = require('./../lib/frontier');

describe('Frontier', function() {
  beforeEach(function() {
    frontier = new Frontier();
  });

  describe('#add', function() {
    it('-ing two domains should create two heaps', function() {
      frontier.add('http://www.mbl.is/testing');
      frontier.add('http://www.fotbolti.net/');
      assert.equal(frontier.getNoOfDomains(), 2);
    }),
    it('-ing three urls from two domains should create two heaps', function() {
      frontier.add('http://www.mbl.is/test1');
      frontier.add('http://www.fotbolti.net');
      frontier.add('http://www.mbl.is/test1');
      assert.equal(frontier.getNoOfDomains(), 2);
    });
  }),
  describe('#pop', function() {
    it('should throw error in case of a missing domain', function() {
      try {
        frontier.pop();
        assert.fail();
      } catch (e) {
        assert.ok(true);
      }
    }),
    it('should return null in case of an empty heap', function() {
      frontier.add('http://mbl.is/frettir/golf');
      frontier.pop('mbl.is');
      assert.equal(frontier.pop('mbl.is'), null);

      //assert.equal(, 'http://www.vedur.is');
      //assert.equal(frontier.pop(), null);
    }),
    it('should pop items with higher scores first', function() {
      frontier.add('http://www.mbl.is/frettir/enski', 0.0);
      frontier.add('http://www.mbl.is/frettir/golf', 1.0);
      frontier.add('http://www.mbl.is/frettir/veidi');
      assert.equal(
        frontier.pop('www.mbl.is')['url'],
        'http://www.mbl.is/frettir/golf'
      );
    });
  });

});