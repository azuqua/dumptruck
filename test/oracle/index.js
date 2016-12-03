var path = require("path"),
    os = require("os"),
    async = require("async"),
    uuid = require("node-uuid"),
    assert = require("chai").assert;

var config = require(path.resolve(__dirname, "../../config/config.json"))
  , clientPath = "../../lib/clients/oracle"
  , client = require(path.resolve(__dirname, clientPath))(config)
  , dump = require(path.resolve(__dirname, "../../lib/dump.js"));

describe("Dumptruck Oracle Tests", function() {
  this.timeout(0);
  it("Dumptruck unit tests: dump", function(done) {
    require(path.resolve(__dirname, "unit/dump-tests"))(client);
    done();
  });

  it("Dumptruck unit tests: content", function(done) {
    require(path.resolve(__dirname, "unit/content-tests"))(client);
    done();
  });
});