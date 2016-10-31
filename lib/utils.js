/**
 * Created by austin on 11/10/15.
 */

"use strict";

var _ = require("lodash");

module.exports.constants = {
  YES: "YES",
  NO: "NO",
  directions: {
    UP: "up",
    DOWN: "down"
  },
  notches: {
    EXEC: "exec",
    SAFE: "safe",
    UP: "up",
    DOWN: "down",
    CHANGE: "change"
  },
  methods: {
    CREATE: "create",
    ALTER: "alter",
    DROP: "drop",
    RAW: "raw"
  },
  resources: {
    DB: "db",
    USER: "user",
    TABLE: "table",
    JOIN_TABLE: "joinTable",
    COLUMN: "column",
    CONSTRAINT: "constraint",
    INDEX: "index"
  },
  knexType: {
    raw: "raw",
    integer: "integer",
    decimal: "decimal",
    float: "float",
    string: "string",
    boolean: "boolean",
    specificType: "specificType",
    timestamp: "timestamp",
    binary: "binary"
  },
  udt: {
    bytea: "bytea",
    int4: "int4",
    _int4: "_int4",
    float8: "float8",
    float4: "float4",
    hstore: "hstore",
    bool: "bool",
    varchar: "varchar",
    numeric: "numeric",
    timestamptz: "timestamptz"
  },
  constraintType: {
    FOREIGN_KEY: "FOREIGN KEY",
    PRIMARY_KEY: "PRIMARY KEY",
    CHECK: "CHECK",
    UNIQUE: "UNIQUE"
  }
};

module.exports.udtToKnex = function (udt) {
  switch (udt) {
    case this.constants.udt._int4:
    case this.constants.udt.hstore:
      return this.constants.knexType.specificType;
    case this.constants.udt.int4:
      return this.constants.knexType.integer;
    case this.constants.udt.numeric:
      return this.constants.knexType.decimal;
    case this.constants.udt.float4:
    case this.constants.udt.float8:
      return this.constants.knexType.float;
    case this.constants.udt.varchar:
      return this.constants.knexType.string;
    case this.constants.udt.bool:
      return this.constants.knexType.boolean;
    case this.constants.udt.timestamptz:
      return this.constants.knexType.timestamp;
    case this.constants.udt.bytea:
      return this.constants.knexType.binary;
    default:
      return udt;
  }
};

module.exports.arrayWrap = function (args) {
  return _.isArray(args) ? args : [args];
};

/**
 * converts an appropriately structured json object into it's migratory form,
 * injecting it into the given migration object
 * @param j => json structure
 * @param m => Migration object
 * @returns {Migration}
 */
module.exports.jsonToMigration = function (j, m) {

  _.each(j.tables, function (table) {
    m.create.table(table);
  });

  _.each(_.flatten(_.pluck(j.tables, "indexes")), function (index) {
    m.raw(index.args);
  });

  var self = this;
  _.each(_.flatten(_.pluck(j.tables, "constraints")), function (constraint) {

    switch (constraint.constraint_type) {
      case self.constants.constraintType.FOREIGN_KEY:
        m.raw([
          "ALTER TABLE ONLY",
          constraint.table_schema + "." + constraint.table_name,
          "ADD CONSTRAINT ",
          constraint.constraint_name,
          constraint.constraint_type + " (",
          constraint.column_name,
          ") REFERENCES",
          constraint.referenced_schema + "." + constraint.referenced_table,
          "(", constraint.referenced_column, ");"
        ].join(" "));
        break;
      case self.constants.constraintType.PRIMARY_KEY:
        break;
      // TODO figure out if this is truly necessary given the previous create table statements
      /*m.raw([
       "ALTER TABLE ONLY",
       constraint.table_schema + "." + constraint.table_name,
       "ADD CONSTRAINT ",
       constraint.constraint_name,
       constraint.constraint_type + " (",
       constraint.column_name,
       ")"
       ].join(" "));
       break;*/
      case self.constants.constraintType.CHECK:
        m.raw([
          "ALTER TABLE ONLY",
          constraint.table_schema + "." + constraint.table_name,
          "ADD CONSTRAINT ",
          constraint.constraint_name,
          constraint.constraint_type + " (",
          constraint.check_clause,
          ")"
        ].join(" "));
        break;
      case self.constants.constraintType.UNIQUE:
        m.raw([
          "ALTER TABLE ONLY",
          constraint.table_schema + "." + constraint.table_name,
          "ADD CONSTRAINT ",
          constraint.constraint_name,
          constraint.constraint_type + " (",
          constraint.referenced_column,
          ")"
        ].join(" "));
        break;
      default :
        console.log("Attempted to alter table w/ unknown constraint type!");
        console.log(constraint);
    }
  });

  return m;
};

/**
 *
 * @param m => Migration object
 * @returns {string}
 */
module.exports.migrationToSQL = function (m) {

  var dry = m.dryRun()
    , dryString = "";

  _.each(dry, function (s) {
    s = s.replace(/, /g, ", \n\t");
    s = s.replace(/ \("/g, " (\n\t\"");
    s = s.replace(/"\)/g, "\"\n)");
    dryString += s + "; \n\n";
  });

  return dryString;
};

