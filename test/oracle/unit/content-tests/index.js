var path = require("path")
  , Promise = require("bluebird")
  , fs = Promise.promisifyAll(require("fs"))
  , _ = require("lodash")
  , dump = require(path.resolve(__dirname, "../../../../lib/dump.js"))
  , assert = require("chai").assert;

module.exports = function(client) { 
  describe('Dumptruck Content Tests', function() {
    this.timeout(0);
    
    it("get list of tables in database", function(done) {
      dump().listTables(client)
        .then(function(result) {
          assert(result.length > 0, "Config misconfigured or database has on tables");
          done();
        });
    });

    it("get table metadata of a particular table", function(done) {
      var tableObject = {
        TABLE_NAME: "JOBS"
      };

      dump().tableData(client, tableObject)
        .then(function(result) {
          assert(!!result[0].TABLE_NAME === true, "data is missing table name");
          assert(!!result[0].OWNER === true, "table data is missing table owner");
          done();
        });
    });
    
    it("get column metadata of a particular table", function(done) {
      var tableObject = {
        TABLE_NAME: "JOBS"
      };

      dump().tableColumnData(client, tableObject)
        .then(function(result) {
          assert(!!result.TABLE_NAME === true, "data missing table name");
          assert(!!result.columns === true, "data missining table columns");
          done();
        });
    });

    it("get metadata of a particular column", function(done) {
      var tableObject = {
         TABLE_NAME: "JOBS"
      },
      columnObject = {
        COLUMN_NAME: "JOB_TITLE"
      };

      dump().columnData(client, tableObject, columnObject)
        .then(function(result) {
          assert(!!result[0].table === true, "table is not present");
          assert(!!result[0].column === true, "column name is not present");
          assert(typeof(result[0].nullable) !== 'undefined', "nullable is not present");
          done();
        })
    });
  });
};