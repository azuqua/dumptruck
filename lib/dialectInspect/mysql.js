"use strict";

var Promise = require("bluebird")
  , _ = require("lodash")
  , path = require("path")

  , Migration = require("../Migration")
  , SchemaCatalog = require("../schemaCatalog")
  , utils = require("../utils");

var _catalog = "demo"
  , constants = utils.constants;

var _client
  , _statements;

module.exports.listTables = function (client) {
  return _setClient(client)
    .then(function(result) {
      _catalog = result[0][0]['database()'];
      return _catalog;
    })
    .then(function(catalog) {
      return _getTables();
    });
};

module.exports.tableData = function (client, table) {
  if(!!table.name) {
    return _setClient(client)
      .then(function(result) {
        _catalog = result[0][0]['database()'];
        return _catalog;
      })
      .then(function(catalog) {
        table.table = table.name;
        delete table.name;
        return _getTableColumns(table);
      });
  } else {
    throw new Error("Passed in Table Object Lacks A Name Property");
  }
};

module.exports.tableColumnData = function (client, table) {
  if(!!table.name) {
    return _setClient(client)
      .then(function(result) {
        _catalog = result[0][0]['database()'];
        return _catalog;
      })
      .then(function(catalog) {
        table.table = table.name;
        delete table.name;
        return _getTableColumns(table);
      });
  } else {
    throw new Error("Passed in Table Object Lacks A Name Property");
  }
};

module.exports.columnData = function (client, table, column) {
  if(!!table.name || !!column.column) {
    return _setClient(client)
      .then(function(result) {
        _catalog = result[0][0]['database()'];
        return _catalog;
      })
      .then(function(catalog) {
        table.table = table.name;
        delete table.name;
        return _getColumn(table, column);
      })
  } else {
    throw new Error("Table or Column Names are missing");
  }
};

function _setClient(client) {
  _client = client;
  _sqlForDialect(_client);
  return _client.raw(_statements.get.database())
    .then();
};

function _getTable(table) {
  var tableQb = _client.raw(_statements.get.table(), [table.name]);

  return tableQb
    .then(function (result) {
      table.columns = result;
      return table;
    });
};

function _getTables() {
  var tablesQb = _client.raw(_statements.get.tables());
  return tablesQb
    .then(function (result) {
      return result[0];
    });
};

function _getColumn(table, column) {
  var columnQb = _client.raw(_statements.get.column(), [table.table, column.column]);
  return columnQb
    .then(function (result) {
      return result[0];
    });
};

function _getTableColumns(table) {
  var columnsQb = _client.raw(_statements.get.columns(), [table.table]);
  return columnsQb
    .then(function (result) {
      table.columns = result[0];
      return table;
    });
};

function _sqlForDialect(client) {
  _statements = new SchemaCatalog(client.client.config);
};