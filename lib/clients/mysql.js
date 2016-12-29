/**
 * created by hiram 11/2016
 */

"use strict";

var knex = require("knex");

/**
 * Creates a mysql knexjs client using options from the config.json file
 *
 * @param config
 * @returns {*}
 */
module.exports = function (config) {
  var client = knex({
    client: 'mysql'
    , connection: config.mysql
    , debug: config.debug ? true : false
    , version: config.version
  });
  return client;
};