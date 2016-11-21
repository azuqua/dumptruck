var path = require("path"),
    os = require("os"),
    Promise = require("bluebird"),
    fs = Promise.promisifyAll(require("fs")),
    async = require("async"),
    uuid = require("node-uuid"),
    assert = require("chai").assert;

// set the client, currently just uses a postgres client, need to abstract this for more dialects
var config = require(path.resolve(__dirname, "../../config/config.json"))
  , clientPath = "../../lib/clients/oracle"
  , client = require(path.resolve(__dirname, clientPath))(config)
  , dump = require(path.resolve(__dirname, "../../lib/oracle-dump.js"));

describe("lighting up oracle tests", function() {
  this.timeout(0);

  it('describes a table', function() {
    return dump.json(client)
      .then(function(result) {
        return JSON.stringify(result, null, 2); 
      })
      .then(function(result) {
        return fs.writeFileAsync(path.resolve(__dirname, "../../dump/test-dump.json"), result);
      });
  });
});
