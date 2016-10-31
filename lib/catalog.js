/**
 * Created by austin on 11/10/15.
 */

"use strict";

var _ = require("lodash")
  , knex = require("knex")({
    client: "pg",
    debug: false
  })
  , utils = require("./utils");

var _schema = "public";

/**
 * tableObject => {
 *
 * }
 * columnObject => {
 *
 * }
 * rawObject => {
 *
 * }
 */

var Catalog = function (client, argv) {
  this.setClient(client);
  this.setArgv(argv || {});
};

Catalog.prototype.setClient = function (_knex) {
  this.knex = _knex;
}.bind(Catalog.prototype);

Catalog.prototype.setArgv = function (_argv) {
  this.argv = _argv;
}.bind(Catalog.prototype);

Catalog.prototype.getClient = function () {
  return this.knex;
};

Catalog.prototype.getArgv = function () {
  return this.argv;
};

Catalog.prototype.raw = function (raw) {
  return this.getClient().schema.raw(raw);
}.bind(Catalog.prototype);


Catalog.prototype._hasNotTableCheck = function (table) {
  return this.getClient().schema.hasTable(table).bind(this._hasNotTableCheck);
};
Catalog.prototype._hasNotTableCheck.resolve = function (result) {
  return !result;
};
Catalog.prototype._hasColumnCheck = function (table, column) {
  return this.getClient().schema.hasColumn(table, column).bind(this._hasColumnCheck);
};
Catalog.prototype._hasColumnCheck.resolve = function (result) {
  return result;
};
Catalog.prototype._hasNotColumnCheck = function (table, column) {
  return this.getClient().schema.hasColumn(table, column).bind(this._hasNotColumnCheck);
};
Catalog.prototype._hasNotColumnCheck.resolve = function (result) {
  return !result;
};
/**
 * Use of this function requires postgres version >= 9.4
 * @param table
 * @param index
 * @returns {*}
 * @private
 */
Catalog.prototype._hasNotIndexCheck = function (table, index) {
  var qb = this.getClient().schema.withSchema("pubic").alterTable(table, function (table) {
      return table.index.apply(table, [index.columns].concat(index.args || []));
    })
    , statementParts = qb.toString().split(" ")
    , indexName = statementParts[2]
    , raw = "SELECT to_regclass('public." + indexName + "');";
  return this.getClient().schema.raw(raw).bind(this._hasNotIndexCheck);
};
Catalog.prototype._hasNotIndexCheck.resolve = function (result) {
  return !_.get(result, "rows.0.to_regclass", null);
};
/**
 * Use of this function requires postgres version >= 9.4
 * @param table
 * @param index
 * @returns {*}
 * @private
 */
Catalog.prototype._hasIndexCheck = function (table, index) {
  var qb = this.getClient().schema.withSchema("pubic").alterTable(table, function (table) {
      return table.index.apply(table, [index.columns].concat(index.args || []));
    })
    , statementParts = qb.toString().split(" ")
    , indexName = statementParts[2]
    , raw = "SELECT to_regclass('public." + indexName + "');";
  return this.getClient().schema.raw(raw).bind(this._hasIndexCheck);
};
Catalog.prototype._hasIndexCheck.resolve = function (result) {
  return _.get(result, "rows.0.to_regclass", null);
};

Catalog.prototype.init = function () {

  var self = this;

  /**
   *
   * @param args: String<tableName> | Object<tableArgs> => {
   *   table: String<tableName>
   *   columns: Array<columnObjects>
   *   raw: Array<rawObjects>
   * }
   * @returns {*}
   */
  self["create.table"] = function (args, safe) {
    var method = (safe ? "createTableIfNotExists" : "createTable");
    if (_.isString(args)) {
      return self.getClient().schema.withSchema(_schema)[method](args, _.noop);
    }
    else {
      return self.getClient().schema.withSchema(_schema)[method](args.table, function (table) {
        _applyTableArgs(table, args);
      });
    }
  };

  self["create.joinTable"] = function (table1, table2, safe) {
    var tables = [table1, table2];
    tables.sort();
    var joinTable = (tables).sort().join("_")
      , args = {
        table: joinTable,
        columns: _.map(tables, function (tableName) {
          var columnName = tableName.replace(/s$/, "") + "_id";
          return {
            type: "integer",
            notNullable: true,
            args: [columnName],
            references: {table: tableName, column: "id"}
          };
        })
      };
    return self.safe.up["create.table"](args, safe);
  };

  self["drop.table"] = function (tableName, safe) {
    if (safe) {
      return self.getClient().schema.withSchema(_schema).dropTableIfExists(tableName);
    }
    else {
      return self.getClient().schema.withSchema(_schema).dropTable(tableName);
    }
  };
  /**
   *
   * @param args
   * @returns {*}
   */
  self["alter.table"] = function (args) {
    if (!self.getArgv().bdr) {
      return self.getClient().schema.withSchema(_schema).table(args.table, function (table) {
        _applyAlterTableArgs(table, args);
      });
    }
    else {
      return self.getClient().schema.withSchema(_schema).raw(_applyTableArgsBDR(self.getClient(), args));
    }
  };
  /**
   *
   * @param args
   * @returns {*}
   */
  self["create.index"] = function (args) {
    return self.getClient().schema.withSchema("public").table(args.table, function (table) {
      table.index.apply(table, utils.arrayWrap(args.index));
    });
  };
  /**
   *
   * @param args
   */
  self["drop.index"] = function (args) {
    // TODO, in the meantime force a crash
    return false;
  };
  /**
   *
   * @param args
   * @returns {*}
   */
  self["drop.column"] = function (args) {
    return self.getClient().schema.withSchema(_schema).table(args.table, function (table) {
      table.dropColumn(args.column);
    });
  };


  self.safe = {
    "up": {
      "create.table": function (table) {
        return {
          check: self._hasNotTableCheck(_.isString(table) ? table : table.table),
          query: self["create.table"](table, true)
        };
      },
      "alter.table": function (args) {
        var columnAlterations = _.map(args.columns || [], function (column) {
            return {
              check: self._hasNotColumnCheck(args.table, _.first(column.args)),
              query: self["alter.table"]({table: args.table, columns: [column]})
            };
          })
          , indexAlterations = _.map(args.indexes || [], function (index) {
            return {
              check: self._hasNotIndexCheck(args.table, index),
              query: self["alter.table"]({table: args.table, indexes: [index]})
            };
          });
        return columnAlterations.concat(indexAlterations);
      },
      "drop.table": function (table) {
        return self["drop.table"](table, true);
      },
      "create.joinTable": function (table1, table2) {
        return self["create.joinTable"](table1, table2, true);
      }
    },
    "down": {
      "create.table": function (table) {
        return self["drop.table"](_.isString(table) ? table : table.table, true);
      },
      "alter.table": function (args) {
        var columnAlterations = _.map(args.columns, function (column) {
            return {
              check: self._hasColumnCheck(args.table, _.first(column.args)),
              query: self["drop.column"]({table: args.table, column: _.first(column.args)})
            };
          }, this)
          , indexAlterations = _.map(args.indexes || [], function (index) {
            return {
              check: self._hasIndexCheck(args.table, index),
              query: self["drop.index"]({table: args.table, indexes: [index]})
            };
          });
        return columnAlterations.concat(indexAlterations);
      },
      "drop.table": function (table) {
        return self["drop.table"](table, true);
      },
      "create.joinTable": function (table1, table2) {
        var tables = [table1, table2];
        tables.sort();
        var joinTable = tables.join("_");
        return self.safe.down["drop.table"](joinTable);
      }
    }
  };
};

/**
 *
 * @param table
 * @param args
 * @private
 */
function _applyTableArgs(table, args) {
  _.each(args.columns || [], function (columnObj) {
      // tables w/ a primary key must use 'id' as the primary key, by convention
      if (columnObj.args[0] === "id") {
        table.increments(columnObj.args[0]);
      }
      else {
        if (columnObj.type) {
          var column = table[columnObj.type].apply(table, _.isArray(columnObj.args) ? columnObj.args : [columnObj.args]);
          _applyColumnChains(column, columnObj);
        }
      }
    }
  );

  // apply the 'table.primary' method for composite indexes only
  if (args.primary && args.primary.columns.length > 1) {
    table.primary(args.primary.columns);
  }

  _.each(args.indexes || [], function (indexObj) {
    if (indexObj.columns) {
      table.index(indexObj.columns);
    }
  });
}

/**
 *
 * @param table
 * @param args
 * @private
 */
function _applyAlterTableArgs(table, args) {
  _applyTableArgs(table, args);
}

/**
 *
 * @param column
 * @param columnObj
 * @private
 */
function _applyColumnChains(column, columnObj) {
  if (columnObj.index) {
    column.index.apply(column, _.isArray(columnObj.index) ? columnObj.index : [columnObj.index]);
  }
  if (columnObj.primary) {
    column.primary();
  }
  if (_.has(columnObj, "default") && columnObj.default !== null) {
    column.default(knex.raw(columnObj.default));
  }
  if (columnObj.nullable === true) {
    column.nullable();
  }
  if (columnObj.notNullable === true) {
    column.notNullable();
  }
  if (columnObj.references) {
    column.references(columnObj.references.column).inTable(columnObj.references.table);
  }
}

function _applyTableArgsBDR(knex, args) {

  var table = [_schema, args.table].join(".")
    , _sql = [];

  if (args.columns && args.columns.length) {
    _.each(args.columns || [], function (columnObj) {
      if (columnObj.type && columnObj.args) {

        var alterTable = knex.schema.withSchema(_schema).table(args.table, function (table) {
            table[columnObj.type].apply(table, _.isArray(columnObj.args) ? columnObj.args : [columnObj.args]);
          })
          , columnName = _.isArray(columnObj.args) ? columnObj.args[0] : columnObj.args;

        _sql.push(alterTable.toString());

        if (typeof columnObj.default !== "undefined") {
          _sql.push("ALTER TABLE " + table + " ALTER COLUMN " + columnName + " SET DEFAULT " + columnObj.default);
          _sql.push("UPDATE " + table + " SET " + columnName + " = DEFAULT");
        }
        if (columnObj.notNullable) {
          _sql.push("ALTER TABLE " + table + " ALTER COLUMN " + columnName + " SET NOT NULL");
        }

      }
    });
  }

  _.each(args.indexes || [], function (indexObj) {
    if (indexObj.columns) {
      var indexTable = knex.schema.withSchema(_schema).table(args.table, function (table) {
        table.index(indexObj.columns);
      });
      _sql.push(indexTable.toString());
    }
  });

  return _sql.join(";");
}

module.exports = Catalog;
