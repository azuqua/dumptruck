var path = require("path")
  , Promise = require("bluebird")
  , fs = Promise.promisifyAll(require("fs"))
  , dump = require(path.resolve(__dirname, "../../../../lib/dump.js"))
  , assert = require("chai").assert;

module.exports = function(client) {
  describe('Dumptruck Schema Tests', function() {
    this.timeout(0);
    it("scrape metadata from given db", function() {
      return dump().json(client)
        .then(function(result) {
          assert(result != null, "data should exist");
          return JSON.stringify(result, null, 2);
        })
        .then(function(result) {
          return fs.writeFileAsync(path.resolve(__dirname, "../../../../dump/test-dump.json"), result);
        })
        .then(function(result) {
          return null;
        })
    });

    it("verify that dump file of db exists", function() {
      return fs.readFileAsync(path.resolve(__dirname, '../../../../dump/test-dump.json'))
        .then(function(data) {
          assert(data != null, "The file should exist");
        })
    });
  });
};