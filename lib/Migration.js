/**
 * Created by austin on 11/10/15.
 */

"use strict";

var _ = require("lodash")
  , Promise = require("bluebird")

  , Catalog = require("./catalog")
  , utils = require("./utils");

var constants = utils.constants;

/**
 *
 * @constructor
 */
var Migration = function (knexClient, direction, argv) {
  this.setDirection(direction);
  this.exec();
  this._knexClient = knexClient || null;
  this._argv = argv;
  if (this._knexClient) {
    this.setCatalog(new Catalog(this._knexClient, argv));
  }
  else {
    this.setCatalog(new Catalog(null, argv));
  }
};

/**
 * ducktype
 *
 * @returns {string}
 */
Migration.prototype.toString = function () {
  return "[PSQL-Migration]";
};

/**
 *
 * @param knexClient
 */
Migration.prototype.setClient = function (knexClient) {
  this._knexClient = knexClient;
};

/**
 *
 * @returns {Knex|null}
 */
Migration.prototype.getClient = function () {
  return this._knexClient;
};

/**
 *
 * @param notch -> run|safe|up|down|change
 * @private
 */
Migration.prototype._setNotch = function (notch) {
  this._currentNotch = notch;
  this._callQueue.push(({notch: notch, queue: []}));
};

Migration.prototype.setCatalog = function (catalog) {
  this._catalog = catalog;
  this._catalog.init();
}.bind(Migration.prototype);

Migration.prototype.getCatalog = function () {
  return this._catalog;
};

Migration.prototype.setDirection = function (direction) {
  this._direction = direction;
}.bind(Migration.prototype);

Migration.prototype.getDirection = function () {
  return this._direction;
};

/**
 * migration stack
 * @type {Array}
 * @private
 */
Migration.prototype._callQueue = [];

/**
 * construct call via catalog and push into call queue
 * @param method
 * @param resource
 * @param args
 * @private
 */
Migration.prototype._callQueuePush = function (method, resource, args) {
  var listing = this._getListing(method, resource)
    , idx = this._callQueue.length - 1;

  switch (this._currentNotch) {
    case constants.notches.SAFE:
      this._callQueue[idx].queue.push(this.getCatalog()[this._currentNotch][this.getDirection()][listing].apply(null, _.isArray(args) ? args : [args]));
      break;
    case constants.notches.EXEC:
      this._callQueue[idx].queue.push(this.getCatalog()[listing].apply(null, _.isArray(args) ? args : [args]));
      break;
  }
};

/**
 *
 * @returns {Array - Knex[]}
 */
Migration.prototype.getCallQueue = function () {
  var queue = _.slice(this._callQueue, 0);
  if (this.getDirection() === constants.directions.UP) {
    return queue;
  }
  else {
    return queue.reverse();
  }
};

/**
 * run through the migration stack
 * and return an array of sql statements
 * in the order that they will be run during migration
 *
 * @returns {Array - String[]}
 */
Migration.prototype.dryRun = function () {

  var callStrings = []
    , self = this
    , _concatCallStrings = function (queue) {
      callStrings = callStrings.concat(_.map(queue, function (call) {
        return call.check && call.query ? call.query.toString() : call.toString();
      }));
    };

  _.each(this.getCallQueue(), function (notch) {
    if (self.getDirection() === constants.directions.UP && notch.notch !== constants.notches.DOWN) {
      _concatCallStrings(_.flatten(notch.queue));
    }
    else if (self.getDirection() === constants.directions.DOWN && notch.notch !== constants.notches.UP) {
      _concatCallStrings(_.flatten(notch.queue));
    }
  });

  return callStrings;
};

/**
 *
 * @returns {Promise}
 */
Migration.prototype.run = function () {

  // first dry run as a sanity check
  this.dryRun();

  var self = this
    , _executeQuery = function (query) {
      // TODO figure out where the empty records are coming from
      if (query.then) {
        //console.log("--> " + query.toString());
        if (!self._argv.bdr) {
          return query.then().delay(250);
        }
        else {
          return query.toString();
        }
      }
      else {
        return null;
      }
    }
    , _runNotch = function (queue) {
      return Promise.map(self.getDirection() === constants.directions.UP ? queue : queue.reverse(), function (call) {
        if (call.check && call.query) {
          return call.check.then(function (proceed) {
            return this.resolve(proceed) ? _executeQuery(call.query) : null;
          });
        }
        else {
          return _executeQuery(call);
        }
      });
    }
    , _compileBDRStatement = function (cb) {
      return Promise.map(self.getCallQueue(), function (notch, idx, length) {
        return _runNotch(_.flatten(notch.queue));
      }).then(cb);
    };

  // then do it all, fucking everything
  if (!self._argv.bdr) {
    return Promise.each(self.getCallQueue(), function (notch, idx, length) {
      return _runNotch(_.flatten(notch.queue));
    });
  }
  else {
    return _compileBDRStatement(function (_statements) {

      var statements = Array().concat(["BEGIN"], _.filter(_.flattenDeep(_statements), function (statment) {
        return statment;
      }), ["COMMIT;"]).join(";\n");

      console.log("-------SQL-------");
      console.log(statements);
      console.log("-------SQL-------");

      return self._knexClient.raw(statements);
    });
  }
};

/**
 * wrap all calls in an 'in catalog' check prior to inserting into the callQueue
 * @param method
 * @param resource
 * @private
 */
Migration.prototype._callWrap = function (method, resource) {

  // TODO perform validation based on the current notch
  var listing = this._getListing(method, resource);
  if (this.getCatalog()[listing]) {
    return this._callQueuePush(arguments[0], arguments[1], arguments[2]);
  }
  else {
    var err = "Migration " + listing + " is not included in the migration catalog!";
    throw new Error(err);
  }
};

/**
 *
 * @param method
 * @param resource
 * @returns {*}
 * @private
 */
Migration.prototype._getListing = function (method, resource) {
  return resource ? [method, resource].join(".") : method;
};

/**
 *
 * @type {function(this:(Object|Function))}
 */
Migration.prototype.raw = Migration.prototype._callWrap.bind(Migration.prototype, constants.methods.RAW, null);

// set notch
// draw
// set
// fire or retrieve

/**
 * set the notch calls
 */
_.extend(Migration.prototype, _.mapValues({
  safe: constants.notches.SAFE,
  exec: constants.notches.EXEC,
  change: constants.notches.CHANGE,
  up: constants.notches.UP,
  down: constants.notches.DOWN
}, function (notch) {
  return this._setNotch.bind(this, notch);
}, Migration.prototype));

/**
 * set up 'create' calls
 */
Migration.prototype.create = _.mapValues({
  db: constants.resources.DB,
  user: constants.resources.USER,
  table: constants.resources.TABLE,
  joinTable: constants.resources.JOIN_TABLE,
  constraint: constants.resources.CONSTRAINT,
  index: constants.resources.INDEX
}, function (resource) {
  return this._callWrap.bind(this, constants.methods.CREATE, resource);
}, Migration.prototype);


/**
 * set up 'alter' calls
 */
Migration.prototype.alter = _.mapValues({
  db: constants.resources.DB,
  user: constants.resources.USER,
  table: constants.resources.TABLE,
  constraint: constants.resources.CONSTRAINT,
  column: constants.resources.COLUMN,
  index: constants.resources.INDEX
}, function (resource) {
  return this._callWrap.bind(this, constants.methods.ALTER, resource);
}, Migration.prototype);

/**
 * set up 'drop' calls
 */
Migration.prototype.drop = _.mapValues({
  db: constants.resources.DB,
  user: constants.resources.USER,
  table: constants.resources.TABLE,
  constraint: constants.resources.CONSTRAINT,
  column: constants.resources.COLUMN,
  index: constants.resources.INDEX
}, function (resource) {
  return this._callWrap.bind(this, constants.methods.DROP, resource);
}, Migration.prototype);

/**
 * export the constructor function
 * @type {Function}
 */
module.exports = Migration;
