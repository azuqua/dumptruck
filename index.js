/**
 * Created by austin on 12/8/15.
 */

"use strict";

var Promise = require("bluebird")
  , path = require("path")
  , fs = Promise.promisifyAll(require("fs"))
  , _ = require("lodash");

var Migration = require("./lib/Migration")
  , constants = require("./constants")
  , utils = require("./lib/utils");

var _scriptMethods = constants.scriptMethods
  , _dumpFormats = constants.dumpFormats;

var argv
  , client;

module.exports = function (_argv, cb) {

  // default the argv values
  argv = _argv;
  client = _argv.client;
  _.defaults(argv, constants.runDefaults);

  var cbOrExit = function (err, cb) {
      if (cb) {
        cb(err);
      }
      else {
        process.exit(err ? 1 : 0);
      }
    }
    , success = function () {
      console.log("Migration task complete!");
      cbOrExit(null, cb);
    }
    , fail = function (err) {
      console.log("Error in migrate task!", err);
      console.log(err.stack);
      cbOrExit(err, cb);
    };

  switch (argv.command) {

    case _scriptMethods[0]:
      if (argv.schema) {
        _loadSchema().then(success).catch(fail);
      }
      else {
        _runMigration(utils.constants.directions.UP).then(success).catch(fail);
      }
      break;

    case _scriptMethods[1]:
      _runMigration(utils.constants.directions.DOWN).then(success).catch(fail);
      break;

    case _scriptMethods[2]:
      _dump().then(success).catch(fail);
      break;

    default :
      fail(new Error("Invalid command passed to rdb-migrate/index.js"));
      break;
  }
};

/**
 *
 * @param direction
 * @private
 */
function _runMigration(direction) {

  var m = new Migration(client, direction, argv)
    , success = function (result) {
      console.log("Migration task successful!");
      return (!argv.dry ? Promise.delay(500).then(_dump) : null);
    }
    , fail = function (err) {
      console.log("Error in migration task!", err);
      console.log(err.stack);
      return err;
    }
    , runMigrationFile = function (file) {
      console.log("Compiling migration", file);
      require(path.join(__dirname, "migrations", file))(m);
    }
    , compileMigration = function (files) {
      console.log("Compiling migration for %s files", files.length);
      return Promise.each(files, runMigrationFile);
    }
    , runMigration = function () {
      console.log("Running migration");
      if (!argv.dry) {
        return m.run();
      }
      else {
        var dry = m.dryRun();
        console.log(dry);
        return dry;
      }
    };

  console.log("Starting migration task");
  return fs.readdirAsync(path.join(__dirname, "migrations"))
    .then(compileMigration)
    .then(runMigration)
    .then(success)
    .catch(fail);
}

/**
 *
 * @private
 */
function _loadSchema() {

  var m = new Migration(client, utils.constants.directions.UP, argv)
    , success = function (result) {
      return null;
    }
    , fail = function (err) {
      console.log("Error in migrate schema task!", err);
      console.log(err.stack);
      return err;
    };

  return fs.readFileAsync(path.resolve(__dirname, argv.out + ".json"))
    .then(function (buffer) {
      return JSON.parse(buffer.toString());
    })
    .then(function (j) {
      return utils.jsonToMigration(j, m);
    })
    .then(function (m) {
      if (!argv.dry) {
        return m.run();
      }
      else {
        var dry = m.dryRun();
        console.log(dry);
        return dry;
      }
    })
    .then(success)
    .catch(fail);
}

/**
 *
 * @private
 */
function _dump() {

  var dump = require("./lib/dump")
    , success = function (result) {
      console.log("Dump task successful");
      return null;
    }
    , fail = function (err) {
      console.log("Error in dump task!", err);
      console.log(err.stack);
      return err;
    }
    , writeDump = function (result) {
      return fs.writeFileAsync(path.resolve(__dirname, argv.out + "." + argv.format), result);
    }
    , stringify = function (json) {
      return JSON.stringify(json, null, 2);
    };

  console.log("Starting dump task");
  switch (argv.format) {
    case _dumpFormats[0]:
      return dump.json(client).then(stringify).then(writeDump).then(success).catch(fail);
    case _dumpFormats[1]:
      return dump.sql(client).then(writeDump).then(success).catch(fail);
  }
}
