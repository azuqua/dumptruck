/**
 * Created by austin on 11/10/15.
 * updated by hiram on 11/30/16
 */

// this a driver for selecting which metadata to use for a given dialect
"use strict";

var path = require("path")
  , dialectMetadata;
 
module.exports = (config) => {
  if(!config) {
    config = require(path.resolve(__dirname, "../config/config.json"));
  }
  dialectMetadata = config.dialect;

  switch(dialectMetadata) {
    case "pg" : 
      return require(path.resolve(__dirname, "./dialectInspect/postgres.js"));
      break;
    case "oracledb" :
      return require(path.resolve(__dirname, "./dialectInspect/oracledb.js"));
      break;
    case "mysql" :
      return require(path.resolve(__dirname, "./dialectInspect/mysql.js"));
      break;
    case "mssql":
      return require(path.resolve(__dirname, "./dialectInspect/mssql.js"));
      break;
    default :
      throw new Error("Invalid or Unsupported Dialect Passed to Dumptruck");
      break;
  }
};