var path = require("path"),
    os = require("os"),
    async = require("async"),
    uuid = require("node-uuid"),
    assert = require("chai").assert;

// set the client, currently just uses a postgres client, need to abstract this for more dialects
var config = require(path.resolve(__dirname, "../../config/config.json"))
  , clientPath = "../../lib/clients/postgres"
  , client = require(path.resolve(__dirname, clientPath))(config);

describe("RDB-migrate Tests", function () {
  this.timeout(0);
  it("RDB-migrate unit tests: dump", function (done) {
    require(path.resolve(__dirname, "unit/dump-tests"))(client);
    done();
  })

  it("RDB-migrate unit tests: content", function(done) {
    require(path.resolve(__dirname, "unit/content-tests"))(client);
    done();
  })
});