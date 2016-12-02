var path = require("path")
  , Promise = require("bluebird")
  , fs = Promise.promisifyAll(require("fs"))
  , _ = require("lodash")
  , dump = require(path.resolve(__dirname, "../../../../lib/dump.js"))
  , assert = require("chai").assert;

module.exports = function(client) { 
  describe('Dumptruck Content Tests', function() {
    this.timeout(0);
    
    it("get list of tables in database", function() {
      return dump().listTables(client)
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
      var tableObject = {
        "name": "addresses"
      };
      return dump().tableData(client, tableObject)
        .then(function(result) {
          assert(result.schemaname != null, 'Returned Result Should Contain Schema Name');
          assert(result.table != null, 'Returned Result Should Contain Table Name');
          assert(result.tableowner != null, 'Returned Result Should Contain Table Owner');
          assert(result.hasindexes != null, 'Returned Result Should Contain Flag About Indexes');
          assert(result.hasrules != null, 'Returned Result Should Contain Flag About Rules');
          assert(result.hastriggers != null, 'Returned Result Should Contain Trigger Flag');
          assert(result.rowsecurity != null, 'Returned Result Should Contain Flag About Security');
          // column check
          assert(result.columns != null, 'Returned Result Lacks Associated Columns');
        });
    });
    
    it("get column metadata of a particular table", function() {
      var tableObject = {
        "name": "addresses"
      };
      return dump().tableColumnData(client, tableObject)
        .then(function(result) {
          assert(result.columns.length > 0, 'No Columns Found On Table');
          assert(result.columns[0].type != null, 'Type Not Parsed, Improperly formed Column');
          assert(result.columns[0].column != null, 'No Column Name, Failure');
          assert(result.columns[0].table != null, 'No table name, possible query failure');
          assert(result.columns[0].nullable != null, 'No information about whether column is nullable found');
        });
    });

    it("get metadata of a particular column", function() {
      var tableObject = {
        "name": "addresses"
      };
      var columnObject = {
        "column": "id"
      };
      return dump().columnData(client, tableObject, columnObject)
        .then(function(result) {
          // check for properly formed normalized column data
          assert(result.length == 1, 'Returned incorrect number of rows');
          assert(result[0].column != null, 'No Name Attached to Column');
          assert(result[0].table != null, 'No Table Attached to Column');
          assert(result[0].type != null, 'No type information found');
          assert(result[0].nullable != null, 'No nullable information found');
          assert(result[0].notNullable != null, 'No notNullable information found');
        })
    });
  });
};