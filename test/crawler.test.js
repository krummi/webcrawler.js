var assert = require("assert");

var Crawler = require('./../lib/crawler');

describe('Crawler', function() {

  describe('#constructor', function () {
    it('should understand an array of seeds', function() {
      crawler = new Crawler({
        seeds: ['http://www.mbl.is', 'http://www.dv.is'],
        topic: 'golf',
        query_words: 'birgir leifur'
      });
      assert.equal(crawler.seeds.length, 2);
    }),
    it('should understand a string seed', function() {
      crawler = new Crawler({
        seeds: 'http://www.mbl.is/',
        topic: 'golf',
        query_words: 'birgir leifur'
      });
      assert.equal(crawler.seeds.length, 1);
      assert.equal(crawler.seeds[0], 'http://www.mbl.is');
    }),
    it('should throw an error when it does not understand seeds', function() {
      try {
        crawler = new Crawler({
          seeds: { 'test': 'ing' }, topic: 'a', query_words: 'b'
        });
        assert.false();
      } catch (e) {
        assert.true();
      }
    });
  }),

  describe('#extractLinks()', function() {
    beforeEach(function() {
      crawler = new Crawler({ seeds: 'a', topic: 'b', query_words: 'c' });
    });
    it('should return 1 when one link in body', function() {
      var x = crawler.extractLinks('<a href="http://www.mbl.is">mbl.is</a>');
      assert.equal(x.length, 1);
    });
  }),

  describe('#scoreLink', function() {
    beforeEach(function() {
      crawler = new Crawler({ seeds: 'a', topic: 'golf', query_words: 'c' });
    });
    it('should give 1.0 to relevant links', function() {
      assert.equal(1.0, crawler.scoreLink('http://mbl.is/sport/golf/'));
      assert.equal(1.0, crawler.scoreLink('golf/2013/11/06/hoggi_fra_ad_k'));
    }),
    it('should give 0.0 to non-relevant links', function() {
      assert.equal(0.0, crawler.scoreLink('http://www.mbl.is/sport/fotbolti/'));
      assert.equal(0.0, crawler.scoreLink('/sport/fotbolti/'));
    });
  }),
  
  describe('#canonicalize', function() {
    it('should remove port when 80 with scheme:http', function() {
      var a = crawler.canonicalize('http://www.cnn.com:80/TECH/');
      assert.equal(a, 'http://www.cnn.com/TECH/');
    }),
    it('should remove port when 443 with scheme:https', function() {
      var a = crawler.canonicalize('https://www.cnn.com:443/TECH/');
      assert.equal(a, 'https://www.cnn.com/TECH/');
    }),
    it('should not remove port when 443 with scheme:http', function() {
      var a = crawler.canonicalize('http://www.cnn.com:443/TECH/');
      assert.equal(a, 'http://www.cnn.com:443/TECH/');
    }),
    it('should add trailing slash to host', function() {
      var a = crawler.canonicalize('http://informatics.indiana.edu');
      assert.equal(a, 'http://informatics.indiana.edu/');
    }),
    /**
    Note: It does not make any sense to me to do this since many websites
          have something that looks like a subdirectory but isnt one.
    it('should add trailing slash with directories', function() {
      var a = crawler.canonicalize('http://informatics.indiana.edu/test');
      assert.equal(a, 'http://informatics.indiana.edu/test/');
    }),
    */
    it('should remove fragments', function() {
      a = crawler.canonicalize('http://informatics.indiana.edu/index.html#fragment');
      assert.equal(a, 'http://informatics.indiana.edu/index.html');
    }),
    it('should remove dot segments', function() {
      a = crawler.canonicalize('http://informatics.indiana.edu/dir1/./../dir2/');
      assert.equal(a, 'http://informatics.indiana.edu/dir2/');
    }),
    it('should HTML decode some letters', function() {
      a = crawler.canonicalize('http://informatics.indiana.edu/%7Efil/');
      assert.equal(a, 'http://informatics.indiana.edu/~fil/');
    }),
    it('should lowercase the scheme and host', function() {
      a = crawler.canonicalize('http://INFORMATICS.INDIANA.EDU/fil/');
      assert.equal(a, 'http://informatics.indiana.edu/fil/');
    });
  });
});