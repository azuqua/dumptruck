/**
 * created by hiram 11/07/2016
 */

 /**
  * this is jsut the sql clearing house, it only assigns the sql it doesn't execute it
  */
"use strict";

var Promise = require("bluebird")
  , _ = require("lodash")
  , fs = require("fs")
  , path = require("path");

var _dialect
  , _version;
var schemaCatalog = function(config) {
  if(!!config.dialect) {
    if(!!!config.version)
      // make config.version = to the latest version of the dialect supported by library
    _dialect = config.dialect;
    _version = config.version;
  } else {
    //throw an error, a dialect needs to specified in config
  }
};

var readFile = function(filename) {
  return fs.readFileSync(path.resolve(__dirname, "./sql/" + _dialect /*+ "/" + _version*/ + "/" + filename + ".sql"), "utf-8");
}
schemaCatalog.prototype.init = function(dialectMap) {

  var self = this;
  var get = {};
  _.forEach(dialectMap, function(dia) {
    get[dia] = function() {
      return { query: readFile(dia) };
    };
  });
  self["get"] = get;
};

module.exports = schemaCatalog;