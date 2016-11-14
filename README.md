
> NB! This repository is currently WIP and as such is extremely unstable.

# rdb-migrate

An knexjs relational database framework that allows for **safe migrations** and **data schema scraping**
via either the **cli interface** or **in code** for automated schema changes.


## Installation

```
$ npm install --save rdb-migration
```

## Index

- [Quick Start](#Quickstart)
  - [Running a database migration](#QS-running)
  - [Cloning a database schema](#QS-cloning)
- [Schema Migration Flow](#Flow)
- [ChangeLog](#ChangeLog)

## <a name="Quickstart"></a> Quickstart

### <a name="QS-running"></a> Running a database migration

From the terminal:
```bash
$ node rdb-migrate run -c <pathToConfigDir>
```

In code:
```js
var migrate = require("rdb-migrate");
var args = {
  client: <initialized knexjs client>
};
runner(args, function (err) {
  if (!err) {
    console.log("Migration task complete!");
  }
  else {
    console.log("Error in migrate task!", err);
    console.log(err.stack);
  }
});
```

Example `config.json` file:
```json
// <pathToConfigDir>/config.json
{
  "dialect": "pg",
  "debug": false,
  "migrationsPath": "./migrations/",
  "dumpPath": "./dump/",
  "pg": {
    "host": "127.0.0.1",
    "port": 5432,
    "pass": "",
    "user": "rdb-migrate",
    "database": "rdb-migrate"
  }
}
```

Example migration `.js` file:
```js
// <pathToMigrations>/helloTables.js
module.exports = function (m) {

  // Run in `safe` mode.
  // Perform the migration iff the specified tables do not exist.
  m.safe();

  m.create.table({
    table: "foo",
    timestamps: true,
    columns: [
      {
        type: "integer",
        args: ["id"]
      },
      {
        type: "string",
        args: ["fooString"]
      }
    ]
  });

  m.create.table({
    table: "bar",
    timestamps: true,
    columns: [
      {
        type: "integer",
        args: ["id"]
      },
      {
        type: "json",
        args: ["barJson"],
        default: "'{}'::json"
      }
    ]
  });

  // Create a `bar_foo` join table w/ appropriate foreign keys.
  m.create.joinTable(["foo", "bar"]);

};
```

### Cloning a database schema

First generate a `dump.json` file by scraping your original database:

```bash
$ node rdb-migrate dump --configFile <pathToConfigFile-database1>
```

```json
// <configFile-database1>
{
  "dialect": "pg",
  "debug": false,
  "migrationsPath": "./migrations/",
  "dumpPath": "./dump_db_1/",
  "pg": {
    "host": "127.0.0.1",
    "port": 5432,
    "pass": "",
    "user": "db_user",
    "database": "db_1"
  }
}
```

```json
// dump file structure/ template
{
  // table array
  "tables": [
    {
      //table meta-data
      "table": "table name",
      "sequences": [
        {
          //sequences on table meta-data
        }
      ],
      "columns": [
        {
          //columns on table meta-data
        }
      ],
      "indexes": [
        {
          //index on table meta-data
        }
      ],
      "primary": {
        "columns": [
          //columns in primary key
        ]
      },
      "constraints": [
        {
          //constraint meta-data
        }
      ]
    }
  ],
  "users": [
    {
      //database users
    }
  ],
  // sql dialect specific items: e.g. postgres extensions, etc.
}
```

Now run a full `--schema` migration, where your config file references the `dumpDir` from the first step
and the database connection references an empty database.

```bash
$ node rdb-migrate run --configFile <pathToConfigFile-database2> --schema
```

```json
// <configFile-database2>
{
  "dialect": "pg",
  "debug": false,
  "migrationsPath": "./migrations/",
  "dumpPath": "./dump_db_1/",
  "pg": {
    "host": "127.0.0.1",
    "port": 5432,
    "pass": "",
    "user": "db_user",
    "database": "db_2"
  },
  // optional parameter
  "version" : 9.5
}
```

## <a name="Flow"></a> Schema Migration Flow

1. Compile migrations.
2. Compare migrations against current schema history.
3. Run unapplied migrations according to specified order.
4. Update migration history.
5. Scrape database and provide `dump.json` file for subsequent schema cloning.

## <a name="ChangeLog"></a> ChangeLog

- 0.0.1 [WIP]
