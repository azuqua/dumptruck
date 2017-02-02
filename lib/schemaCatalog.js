/**
 * created by hiram 11/07/2016
 */

 /**
  * this is just the sql clearing house, it only assigns the sql it doesn't execute it
  */
"use strict";

var Promise = require("bluebird")
  , _ = require("lodash")
  , fs = require("fs")
  , path = require("path");

var _dialect
  , _version;
  
var schemaCatalog = function(config) {
  if(!!config.client && /*!!config.version*/) {
    _dialect = config.client;
    //_version = config.version;
    var _structure = JSON.parse(fs.readFileSync(path.resolve(__dirname, "./sql/structures/" + _dialect + ".json"), "utf-8"));
    this.init(_structure);
  } else {
    throw new Error("dialect or dialect version is not selected");
  }
};

var readFile = function(filename) {
  return fs.readFileSync(path.resolve(__dirname, "./sql/" + _dialect /*+ "/" + _version*/ + "/" + filename + ".sql"), "utf-8");
};

schemaCatalog.prototype.init = function(dialectMap) {
  var self = this;
  var get = {};
  _.forEach(dialectMap, function(dia) {
    get[dia.name] = function() {
      return readFile(dia.file);
    };
  });
  self["get"] = get;
};

module.exports = schemaCatalog;