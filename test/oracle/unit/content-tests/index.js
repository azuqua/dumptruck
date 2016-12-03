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
          //add checks to compare to a complete list of tables
        });
    });

    it("get table metadata of a particular table", function() {
      var tableObject = {
        TABLE_NAME: "JOBS"
      };
      return dump().tableData(client, tableObject)
        .then(function(result) {
          // add checks to ensure table is formed correctly and columns are present
        });
    });
    
    it("get column metadata of a particular table", function() {
      var tableObject = {
        TABLE_NAME: "JOBS"
      };

      return dump().tableColumnData(client, tableObject)
        .then(function(result) {
          // add checks for ensuring columns exist and number is correct
        });
    });

    it("get metadata of a particular column", function() {
      var tableObject = {
         TABLE_NAME: "JOBS"
      },
      columnObject = {
        COLUMN_NAME: "JOB_TITLE"
      };
      return dump().columnData(client, tableObject, columnObject)
        .then(function(result) {
          // add checks for properly formed normalized column
        })
    });
  });
};