/**
 * Created by austin on 11/10/15.
 */

"use strict";

var constants = require("./constants");
var _scriptMethods = constants.scriptMethods
  , _dialects = constants.dialects
  , _dumpFormats = constants.dumpFormats;

// set up the command line interface
var argv = require("yargs")
  .usage("Usage: $0 $1 --config [string] --dialect [string] --format [string] --out [relative path] --schema --bdr --dry")
  .demand([1])
  .describe(1, _scriptMethods.join("|"))
  .describe("config", "config: specify config path")
  .describe("dialect", "migration: choose desired knexjs dialect - " + _dialects.join("|"))
  .describe("schema", "migrate: perform migration from dump.json file - true|false")
  .describe("dry", "migrate: perform dry run - true|false")
  .describe("format", "dump: choose dump format - " + _dumpFormats.join("|"))
  .describe("out", "dump: choose dump output file name - ./relative/path/to/dump/file")
  .describe("bdr", "bdr, use BDR compliant update statements - true|false")
  .default(constants.runDefaults)
  .check(function (args) {
    if (_scriptMethods.indexOf(args._[0]) < 0) {
      throw new Error("Invalid '-1' option '" + args._[0] + "' supplied!");
    }
    if (_dialects.indexOf(args.dialect) < 0) {
      throw new Error("Invalid dialect '" + args.dialect + "' supplied!");
    }
    if (_dumpFormats.indexOf(args.format) < 0) {
      throw new Error("Invalid format '" + args.format + "' supplied!");
    }
    return true;
  })
  .argv;

// imports
var path = require("path")
  , _ = require("lodash");

// load config
var config = require(path.resolve(__dirname, argv.config));

// determine client path and instantiate connection
var clientPath = "";
switch (argv.dialect) {
  case "pg":
    clientPath = "lib/clients/postgres.js";
    break;
}
var client = require(path.resolve(__dirname, clientPath))(config);

// build _argv
var _argv = _.extend({}, argv, {
  command: argv._[0],
  client: client
});

// run it
var runner = require("./index");
runner(_argv, function (err) {
  if (!err) {
    console.log("Migration task complete!");
  }
  else {
    console.log("Error in migrate task!", err);
    console.log(err.stack);
  }

  process.exit(err ? 1 : 0);
});
