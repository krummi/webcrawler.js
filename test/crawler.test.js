var assert = require("assert");

var Crawler = require('./../lib/crawler');

describe('Crawler', function() {
  beforeEach(function() {
    crawler = new Crawler();
  });
  describe('#extractLinks()', function() {
    it('should return 1 when one link in body', function() {
      var x = crawler.extractLinks('<a href="http://www.mbl.is">mbl.is</a>');
      assert.equal(x.length, 1);
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
    it('should add trailing slash with directories', function() {
      var a = crawler.canonicalize('http://informatics.indiana.edu');
      assert.equal(a, 'http://informatics.indiana.edu/');
    }),
    it('should add trailing slash with directories', function() {
      var a = crawler.canonicalize('http://informatics.indiana.edu/test');
      assert.equal(a, 'http://informatics.indiana.edu/test/');
    }),    
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