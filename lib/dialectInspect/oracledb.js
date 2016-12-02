"use strict";

var Promise = require("bluebird")
  , _ = require("lodash")
  , fs = require("fs")
  , path = require("path")

  , Migration = require("../Migration")
  , SchemaCatalog = require("../schemaCatalog")
  , utils = require("../utils")

var _schema = "public"
  , _catalog = "demo"
  , constants = utils.constants;

var client
  , _statements;

module.exports.json = function (_client) {
  return _setClient(_client)
    .then(function (result) {
      return Promise.all(_getTables())
        .then(function(result) {
          var _tables = result;
          return _tables;
        })
        .then(function(_tables) {
          return Promise.all(_.map(_tables, function (table) {
            return _getTableColumns(table);
          }));
        })
        .then(function(_tables) {
          return Promise.all(_.map(_tables, function (table) {
            return _getTableIndexes(table);
          }));
        })
        .then(function (_tables) {
          return Promise.all(_.map(_tables, function (table) {
            return _getTableConstraints(table);
          }));
        })
        .then(function(_tables) {
          var _db = {TABLES: _tables};
          return _db;
        })
        .then(function(_db) {
          return Promise.all(_getSequences())
          .then(function(result) {
            _db.SEQUENCES = result;
            return _db;
          });
        });
    });
};

// // list all tables in current db schema
// module.exports.listTables() {};

// // get the data of a table
// module.exports.tableData() {};

// // get the data of column
// module.exports.columnData() {};


function _getTables() {
  var tablesQb = client.raw(_statements.get.tables(), _schema);

  return tablesQb
    .then(function (result) {
      //var filtered = _filterNull(result.rows);
      return _.sortBy(result, "TABLE_NAME");
    });
};

function _getSequences() {
  var sequencesQb = client.raw(_statements.get.sequences());

  return sequencesQb
    .then(function (result) {
      return result;
    });
};

function _getTableIndexes(table) {
  var indexesQb = client.raw(_statements.get.indexes(), [table.TABLE_NAME]);
  return indexesQb
    .then(function(result) {
      table.INDEXES = [];
      var table_indexes = result;
      _.each(table_indexes, function (index) {
        if (!_.find(table.CONSTRAINTS, {constraint_name: index.INDEX_NAME}) && !_.find(table.INDEXES, {indexname: index.INDEX_NAME})) {
          
          table.INDEXES.push({
              TABLE: table.TABLE_NAME,
              TYPE: constants.knexType.raw,
              INDEX_NAME: index.INDEX_NAME
            });
        }
      });
      return table;
    })
    .then(function(table) {
      return Promise.all(_.map(table.INDEXES, function (index) {
        return _getIndexDef(index);
      }));
    })
    .then(function(result) {
      return table;
    });
};

function _getTableConstraints(table) {
  var constraintsQb = client.raw(_statements.get.constraints(), [table.TABLE_NAME]);

  return constraintsQb
    .then(function (result) {
      table.CONSTRAINTS = [];
      _.each(result, function (constraint) {
        if (!_.find(table.CONSTRAINTS, {constraint: constraint.constraint}) && !_.find(table.INDEXES, {indexname: constraint.constraint})) {
          table.CONSTRAINTS.push(constraint);
        }
      });
      return table;
    });
};

function _getIndexDef(index) {
  var defQB = client.raw("select DBMS_METADATA.GET_DDL('INDEX', ? ) from DUAL", index.INDEX_NAME);
  return defQB
    .then(function(result) {
      index.DEF = result[0];
      return index;
    })
    .catch(function(err) {
      index.DEF = "ERROR: Index Not Found";
      return index;
    });
};

function _getTableColumns(table) {
  var columnsQb = client.raw(_statements.get.columns(), [table.TABLE_NAME]);
  return columnsQb
    .then(function (result) {
      table.COLUMNS = _.map(result, function (column) {
        var massagedCol = _massageColumnToUDT(column);
        return massagedCol;
      });
      return table;
    });
};

function _setClient(_client) {
  client = _client;
  _sqlForDialect(client);
  return client.raw(_statements.get.database())
    .then(function(result) {
      _schema = result[0].USER;
    });
};

function _sqlForDialect(client) {
  _statements = new SchemaCatalog(client.client.config);
};

//change the oracle db object into a more standard format
function _massageColumnToUDT(column) {
  column.type = utils.oracleToKnex(column.DATA_TYPE);
  column.args = [column.COLUMN_NAME];
  column.table = column.TABLE_NAME;
  column.column = column.COLUMN_NAME;
  column.character_maximum_length = column.DATA_LENGTH;
  column.numeric_precision = column.DATA_PRECISION;
  column.numeric_scale = column.DATA_SCALE

  if (column.type === constants.knexType.string && column.DATA_LENGTH) {
    column.args.push(column.DATA_LENGTH);
  }

  if (column.type === constants.knexType.float && column.DATA_PRECISION) {
    column.args.push(column.DATA_PRECISION);
    if (column.DATA_SCALE) {
      column.args.push(column.DATA_SCALE);
    }
  }

  if (column.type === constants.knexType.decimal && column.DATA_PRECISION) {
    column.args.push(column.DATA_PRECISION);
    if (column.DATA_SCALE) {
      column.args.push(column.DATA_SCALE);
    }
  }
  column.nullable = column.NULLABLE ? (column.NULLABLE === constants.Y) : null;
  column.notNullable = column.NULLABLE ? (column.NULLABLE === constants.N) : null;

  delete column.NULLABLE;
  delete column.DATA_PRECISION;
  delete column.DATA_SCALE;
  delete column.DATA_LENGTH;
  delete column.DATA_TYPE;
  delete column.COLUMN_NAME;
  delete column.TABLE_NAME;
  return column;
};