var path = require("path")
  , Promise = require("bluebird")
  , fs = Promise.promisifyAll(require("fs"))
  , _ = require("lodash")
  , dump = require(path.resolve(__dirname, "../../../../lib/dump.js"))
  , assert = require("chai").assert;

// the table and data objects are here to be filled with values from a more
// permanent mssql test db
module.exports = function(client) { 
  describe('Dumptruck Content Tests', function() {
    this.timeout(0);
    it("get list of tables in database", function(done) {
      dump().listTables(client)
        .then(function(result) { 
          // needs tests to verify structure
          done();
        });
    }); 


    it("get table metadata of a particular table", function(done) {
      var tableObject = {
        name: "Customer"
      };

      dump().tableData(client, tableObject)
        .then(function(result) {
          // needs tests to verify structure
          done();
        });
    });
    
    it("get column metadata of a particular table", function(done) {
      var tableObject = {
         name: "Customer"
      }

      dump().tableColumnData(client, tableObject)
        .then(function(result) {
          // needs tests to verify structure
          done();
        });
    });

    it("get metadata of a particular column", function(done) {
      var tableObject = {
         name: "Customer"
      },
      columnObject = {
        column: "CustomerID"
      };

      dump().columnData(client, tableObject, columnObject)
        .then(function(result) {
          // needs tests to verify structure
          done();
        })
    });
  });
};