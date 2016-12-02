/**
 * -- postgres.js
 * Created by austin on 10/9/16.
 */

"use strict";

var knex = require("knex");

/**
 * Creates a postgres knexjs client using options from the config.json file
 *
 * @param config
 * @returns {*}
 */
module.exports = function (config) {
  var client = knex({
    client: 'pg'
    , connection: config.pg
    , debug: config.debug ? true : false
    , version: config.version
  });
  return client;
};
