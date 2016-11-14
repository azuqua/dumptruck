var path = require("path")
  , Promise = require("bluebird")
  , fs = Promise.promisifyAll(require("fs"))
  , _ = require("lodash")
  , dump = require(path.resolve(__dirname, "../../../lib/dump.js"))
  , assert = require("chai").assert;

module.exports = function(client) { 
  describe('RDB-migrate Content Tests', function() {
    this.timeout(0);
    // pass this object to find table and related Meta-data
    var tableObject = {
      "name": "addresses"
    };

    it("get list of tables in database", function() {
      return dump.listTables(client)
        .then(function(result) {
          console.log("test results", result[0]);
        })
    });

    it("get table metadata of a particular table", function() {
      return dump.tableData(client, tableObject)
        .then(function(result) {
          if(_.get(result, '[0]')){
            // table meta-data
            assert(result[0].schemaname != null, 'Returned Result Should Contain Schema Name');
            assert(result[0].tablename != null, 'Returned Result Should Contain Table Name');
            assert(result[0].tableowner != null, 'Returned Result Should Contain Table Owner');
            assert(result[0].hasindexes != null, 'Returned Result Should Contain Flag About Indexes');
            assert(result[0].hasrules != null, 'Returned Result Should Contain Flag About Rules');
            assert(result[0].hastriggers != null, 'Returned Result Should Contain Trigger Flag');
            assert(result[0].rowsecurity != null, 'Returned Result Should Contain Flag About Security');
            // column check
            assert(result[0].columns != null, 'Returned Result Lacks Associated Columns');
          } else {
            _.noop;
          }
        });
    });
    
    it("get column metadata of a particular table", function() {
      return dump.columnData(client, tableObject)
        .then(function(result) {
          //console.log('columnData', result);
        })
      console.log("what ever this will be");
    });
  });
};