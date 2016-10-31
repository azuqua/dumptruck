/**
 * Created by austin on 12/8/15.
 */

"use strict";

module.exports.scriptMethods = [
  "run",
  "rollback",
  "dump"
];

module.exports.dialects = [
  "pg"
];

module.exports.dumpFormats = [
  "json",
  "sql"
];

module.exports.runDefaults = {
  config: "./config/config.json",
  dialect: "pg",
  format: "json",
  out: "dump",
  schema: false,
  dry: false,
  bdr: true
};
