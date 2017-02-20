/**
 * created by hiram 2/2017
 */

"use strict";

var knex = require("knex");

/**
 * Creates a mssql knexjs client using options from the config.json file
 *
 * @param config
 * @returns {*}
 */
module.exports = function (config) {
  var client = knex({
    client: 'mssql'
    , connection: config.mssql
    , debug: config.debug ? true : false
    , version: config.version
  });
  return client;
};