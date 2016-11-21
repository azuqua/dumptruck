var path = require("path")
  , Promise = require("bluebird")
  , fs = Promise.promisifyAll(require("fs"))
  , _ = require("lodash")
  , dump = require(path.resolve(__dirname, "../../../../lib/dump.js"))
  , assert = require("chai").assert;

module.exports = function(client) { 
  describe('RDB-migrate Content Tests', function() {
    this.timeout(0);
    // pass this object to find table and related Meta-data
    var tableObject = {
      "name": "addresses"
    };

    // finish these tests, the database script is largely superfluous and can be banged out rather quickly.
    it("get list of tables in database", function() {
      return dump.listTables(client)
        .then(function(result) {
          if(_.get(result, '[0]')) {
            // table meta-data: check first table in array
            assert(result[0].schemaname != null, 'Returned Result Should Contain Schema Name');
            assert(result[0].tablename != null, 'Returned Result Should Contain Table Name');
            assert(result[0].tableowner != null, 'Returned Result Should Contain Table Owner');
            assert(result[0].hasindexes != null, 'Returned Result Should Contain Flag About Indexes');
            assert(result[0].hasrules != null, 'Returned Result Should Contain Flag About Rules');
            assert(result[0].hastriggers != null, 'Returned Result Should Contain Trigger Flag');
            assert(result[0].rowsecurity != null, 'Returned Result Should Contain Flag About Security');

            // table meta-data: check last table in array
            assert(result[(result.length-1)].schemaname != null, 'Returned Result Should Contain Schema Name');
            assert(result[(result.length-1)].tablename != null, 'Returned Result Should Contain Table Name');
            assert(result[(result.length-1)].tableowner != null, 'Returned Result Should Contain Table Owner');
            assert(result[(result.length-1)].hasindexes != null, 'Returned Result Should Contain Flag About Indexes');
            assert(result[(result.length-1)].hasrules != null, 'Returned Result Should Contain Flag About Rules');
            assert(result[(result.length-1)].hastriggers != null, 'Returned Result Should Contain Trigger Flag');
            assert(result[(result.length-1)].rowsecurity != null, 'Returned Result Should Contain Flag About Security');
          } else {
            _.noop;
          }
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
        });
    });
  });
};