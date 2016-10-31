/**
 * Created by austin on 11/10/15.
 */

"use strict";

var Promise = require("bluebird")
  , _ = require("lodash")
  , fs = require("fs")
  , path = require("path")

  , Migration = require("./Migration")
  , utils = require("./utils");

var _schema = "public"
  , _catalog = "demo"
  , constants = utils.constants;

var client
  , _currentDatabaseQuery = "SELECT current_database();"
  , _users = {
    table: "pg_user",
    columns: ["*"]
  }
  , _extensions = {
    table: "pg_extension",
    columns: ["*"]
  }
  , _tables = {
    table: "pg_tables",
    columns: ["*"],
    where: {"schemaname": _schema}
  }
  , _constraints_join = fs.readFileSync(path.resolve(__dirname, "./sql/constraints.sql"), "utf-8")
  ,
  _indexes = {
    table: "pg_indexes",
    columns: ["*"],
    _columns: ["indexdef"],
    where: {"schemaname": _schema}
  }
  , _primaryIndexesJoin = {
    pg_indexes_table: "pg_indexes",
    pg_classes_table: "pg_classes",
    raw: "SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type " +
    "FROM   pg_index i " +
    "JOIN   pg_attribute a ON a.attrelid = i.indrelid " +
    "AND a.attnum = ANY(i.indkey) " +
    "WHERE  i.indrelid = 'TABLE_NAME'::regclass " +
    "AND    i.indisprimary "
  }
  , _sequences_columns_join = {
    sequences_table: "information_schema.sequences",
    columns_table: "information_schema.columns",
    onJoin: {"table_schema": "sequence_schema"},
    andOnJoinRaw: "pg_get_serial_sequence(table_schema || '.' || table_name, column_name) = sequence_schema || '.' || sequence_name",
    columns: ["*"],
    where: {"sequence_catalog": "", "sequence_schema": _schema}
  }
  , _columns = {
    table: "information_schema.columns",
    _columns: ["*"],
    columns: [
      "column_name",
      "table_name",
      "udt_name",
      "column_default",
      "is_nullable",
      "character_maximum_length",
      "numeric_precision",
      "numeric_precision_radix",
      "numeric_precision",
      "numeric_precision_radix",
      "numeric_scale"
    ],
    where: {"table_catalog": ""}
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
}

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

function _setClient(_client) {

  client = _client;
  return client.raw(_currentDatabaseQuery)
    .then();
}

function _getTables() {

  var tablesQb = client(_tables.table)
    .select(_tables.columns)
    .where(_tables.where);

  return tablesQb
    .then(_filterNull)
    .then(function (result) {
      return _.sortBy(result, "ordinal_position");
    });
}

function _getTableConstraints(table) {

  var constraintsQb = client.raw(_constraints_join, [_schema, table.table]);
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
}

function _getTableColumns(table) {

  _columns.where.table_catalog = _catalog;

  var columnsQb = client(_columns.table)
    .select(_columns.columns)
    .where(_columns.where)
    .andWhere("table_name", table.table);

  return columnsQb
    .then(_filterNull)
    .then(function (result) {
      table.columns = _.map(result, function (column) {
        return _massageColumnToKnex(column);
      });
      return table;
    });
}

function _getTableIndexes(table) {

  var indexesQb = client(_indexes.table)
    .select(_indexes.columns)
    .where(_indexes.where)
    .andWhere("tablename", table.table);

  var raw = _primaryIndexesJoin.raw.replace("TABLE_NAME", table.table)
    , primaryIndexesQb = client.raw(raw);

  return indexesQb
    .then(_filterNull)
    .then(function (result) {
      table.indexes = [];

      _.each(result, function (index) {
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

        table.primary.columns = [];
        return table;
      });
    });
}

function _getUsers(db) {

  var usersQb = client(_users.table)
    .select(_users.columns);

  return usersQb
    .then(_filterNull)
    .then(function (result) {
      db.users = result;
      return db;
    });
}

function _getExtensions(db) {

  var extensionsQb = client(_extensions.table)
    .select(_extensions.columns);

  return extensionsQb
    .then(_filterNull)
    .then(function (result) {
      db.extensions = result;
      return db;
    });
}

function _getSequences() {

  _sequences_columns_join.where.sequence_catalog = _catalog;

  var sequencesQb = client(_sequences_columns_join.columns_table)
    .join(_sequences_columns_join.sequences_table, function () {
      this.on(_sequences_columns_join.onJoin)
        .andOn(client.raw(_sequences_columns_join.andOnJoinRaw));
    })
    .select(_sequences_columns_join.columns)
    .where(_sequences_columns_join.where);

  return sequencesQb
    .then(_filterNull)
    .then(function (result) {
      return result;
    });
}

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
}

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
}
