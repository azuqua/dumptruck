/**
 * Created by austin on 11/10/15.
 */

"use strict";

var Promise = require("bluebird")
  , _ = require("lodash")
  , fs = require("fs")
  , path = require("path")

  , Migration = require("./Migration")
  , SchemaCatalog = require("./schemaCatalog")
  , utils = require("./utils")
  , config = require(path.resolve(__dirname, "../config/config.json"));

var _schema = "public"
  , _catalog = "demo"
  , constants = utils.constants;

var client
  , _statements;

module.exports.json = function (_client) {
  return _setClient(_client)
    .then(function (result) {
      _catalog = result.rows.pop().current_database;

      return Promise.join(_getTables(), _getSequences())
        .then(function (result) {

          var _tables = result[0]
            , _sequences = result[1];

          _.each(_tables, function (table) {
            table.table = table.tablename;
            delete table.tablename;
            table.sequences = _.filter(_sequences, function (sequence) {
              return sequence.table_name === table.table;
            });
          });
          return _tables;
        })
        .then(function (_tables) {
          return Promise.all(_.map(_tables, function (table) {
            return _getTableColumns(table);
          }));
        })
        .then(function (_tables) {
          return Promise.all(_.map(_tables, function (table) {
            return _getTableIndexes(table);
          }));
        })
        .then(function (_tables) {
          return Promise.all(_.map(_tables, function (table) {
            return _getTableConstraints(table);
          }));
        })
        .then(function (_tables) {
          var _db = {tables: _tables};
          return _getUsers(_db);
        })
        .then(function (_db) {
          return _getExtensions(_db);
        })
        .then(function (_db) {
          //console.log(_db.tables);
          //console.log(_.find(_db.tables, {table: "channel_versions"}));
          return _db;
        });
    });
};

module.exports.sql = function (_client) {
  return this.json(_client)
    .then(function (j) {
      // create new migration off of json dump
      var m = new Migration();
      return utils.jsonToMigration(j, m);
    })
    .then(utils.migrationToSQL);
};

module.exports.listTables = function(_client) {
  return _setClient(_client)
    .then(function(result) {
      _catalog = result.rows.pop().current_database;
      return _catalog;
    })
    .then(function(catalog) {
      return _getTables();
    });
};

module.exports.tableData = function(_client, table) {
  if(!!table.name) {
    return _setClient(_client)
      .then(function(result) {
        _catalog = result.rows.pop().current_database;
        return _catalog;
      })
      .then(function(catalog) {
        return _getTable(table);
      })
      .then(function(table) {
        table[0].table = table[0].tablename;
        delete table[0].tablename;
        return _getTableColumns(table[0]);
      });
  } else {
    throw new Error("Passed in Table Object Lacks A Name Property");
  }
};

module.exports.columnData = function(_client, table) {
  if(!!table.name) {
    return _setClient(_client)
      .then(function(result) {
        _catalog = result.rows.pop().current_database;
        return _catalog;
      })
      .then(function(catalog) {
        table.table = table.name;
        delete table.name;
        return _getTableColumns(table)
      });
  } else {
    throw new Error("Passed in Table Object Lacks A Name Property");
  }
};

function _getExtensions(db) {
  var extensionsQb = client.raw(_statements.get.extensions());

  return extensionsQb
    .then(function (result) {
      db.extensions = _filterNull(result.rows)
      return db;
    });
};

function _getSequences() {
  var sequencesQb = client.raw(_statements.get.sequences(), ['azuqua', _schema]);

  return sequencesQb
    .then(function (result) {
      var seqs = _filterNull(result.rows);
      return seqs;
    });
};

function _getTable(table) {
  var tableQb = client.raw(_statements.get.table(), [_schema, table.name]);

  return tableQb
    .then(function (result) {
      var filtered = _filterNull(result.rows);
      return filtered;
    });
};

function _getTables() {
  var tablesQb = client.raw(_statements.get.tables(), [_schema]);

  return tablesQb
    .then(function (result) {
      var filtered = _filterNull(result.rows);
      return _.sortBy(filtered, "ordinal_position");
    });
};

function _getTableColumns(table) {
  var columnsQb = client.raw(_statements.get.columns(), [_catalog, table.table]);
  return columnsQb
    .then(function (result) {
      var columns = _filterNull(result.rows);
      table.columns = _.map(columns, function (column) {
        return _massageColumnToKnex(column);
      });
      return table;
    });
};

function _getTableConstraints(table) {
  var constraintsQb = client.raw(_statements.get.constraints(), [_schema, table.table]);
  
  return constraintsQb
    .then(_filterNull)
    .then(function (result) {
      table.constraints = [];
      _.each(result.rows, function (constraint) {
        if (!_.find(table.constraints, {constraint_name: constraint.constraint_name}) && !_.find(table.indexes, {indexname: constraint.constraint_name})) {
          table.constraints.push(constraint);
        }
      });
      return table;
    });
};

function _getTableIndexes(table) {
  var indexesQb = client.raw(_statements.get.indexes(), [_schema, table.table]);

  var raw = _statements.get.primary_indexes().replace("TABLE_NAME", table.table)
    , primaryIndexesQb = client.raw(raw);
  
  return indexesQb
    .then(function (result) {
      
      table.indexes = [];
      var table_indexes = _filterNull(result.rows);
      _.each(table_indexes, function (index) {
        if (!_.find(table.constraints, {constraint_name: index.indexname}) && !_.find(table.indexes, {indexname: index.indexname})) {
          table.indexes.push({
            table: table.table,
            type: constants.knexType.raw,
            args: index.indexdef,
            indexname: index.indexname
          });
        }
      });

      return primaryIndexesQb.then(function (result) {
        // associate primary indexes
        table.primary = {
          columns: _.map(result.rows, function (row) {
            return row.attname;
          })
        };

        // filter out primary columns from the indexes array
        table.indexes = _.filter(table.indexes, function (index) {
          var notPrimary = true;
          _.each(table.primary.columns, function (columnName) {
            var regex = new RegExp("\\(" + columnName + "\\)$");
            if (regex.test(index.args)) {
              notPrimary = false;
            }
          });
          return notPrimary;
        });

        return table;
      });
    });
};

function _getUsers(db) {
  var usersQb = client.raw(_statements.get.users());

  return usersQb
    .then(function (result) {
      db.users = _filterNull(result.rows);
      return db;
    });
};

function _initializeSQL(_client) {
  _statements = new SchemaCatalog(config);
};

function _filterNull(result) {
  _.each(result, function (v, i) {
    _.each(v, function (v, k) {
      if (v === null) {
        delete result[i][k];
      }
    });
  });
  return result;
};

function _setClient(_client) {
  client = _client;
  _initializeSQL(client);
  return client.raw(_statements.get.database())
    .then();
};

function _massageColumnToKnex(column) {

  column.type = utils.udtToKnex(column.udt_name);
  column.args = [column.column_name];
  column.column = column.column_name;
  column.table = column.table_name;

  if (column.type === constants.knexType.string && column.character_maximum_length) {
    column.args.push(column.character_maximum_length);
  }

  if (column.type === constants.knexType.specificType && column.udt_name === constants.udt._int4) {
    column.args.push(constants.knexType.integer + "[]");
  }

  if (column.type === constants.knexType.specificType && column.udt_name === constants.udt.hstore) {
    column.args.push(constants.udt.hstore);
  }

  if (column.type === constants.knexType.float && column.numeric_precision) {
    column.args.push(column.numeric_precision);
    if (column.numeric_scale) {
      column.args.push(column.numeric_scale);
    }
  }

  if (column.type === constants.knexType.decimal && column.numeric_precision) {
    column.args.push(column.numeric_precision);
    if (column.numeric_scale) {
      column.args.push(column.numeric_scale);
    }
  }

  column.nullable = column.is_nullable ? (column.is_nullable === constants.YES) : null;
  column.notNullable = column.is_nullable ? (column.is_nullable === constants.NO) : null;
  column.default = column.column_default || null;

  delete column.udt_name;
  delete column.character_maximum_length;
  delete column.column_name;
  delete column.table_name;
  delete column.column_default;
  delete column.is_nullable;
  return column;
};

function _massageConstraintToKnex(constraint) {
  //console.log("==============")
  //console.log(constraint)
  //console.log("==============")
  /*constraint.name = constraint.constraint_name;
   constraint.type = constraint.constraint_type;
   constraint.table = constraint.table_name;
   constraint.column = constraint.column_name;

   delete constraint.constraint_name;
   delete constraint.constraint_type;
   delete constraint.table_name;
   delete constraint.column_name;*/
  return constraint;
};
