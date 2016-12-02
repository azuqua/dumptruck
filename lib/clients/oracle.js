/**
 created by hiram 11/16/2016
 */

"use strict";

var knex = require("knex");

/**
 * Creates an oracle knexjs client using options from the config.json file
 *
 * @param config
 * @returns {*}
 */
module.exports = function (config) {
  var client = knex({
    client: 'oracledb'
    , connection: config.oracledb
    , debug: config.debug ? true : false
    , version: config.version
  });
  return client;
};