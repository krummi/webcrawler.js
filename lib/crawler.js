var cheerio = require('cheerio'),
    request = require('request'),
    _ = require('lodash'),
    url = require('url');



request('http://www.mbl.is', function (error, response, body) {
  if (!error && response.statusCode == 200) {
    $ = cheerio.load(body);
    $('a').each(function(index, link) {
      var parsed_url = url.parse($(this).attr('href'));
      console.log(parsed_url);
    });
  }
});

