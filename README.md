# mysql-types-generator

[![npm](https://img.shields.io/npm/v/mysql-types-generator)](https://www.npmjs.com/package/mysql-types-generator) [![install size](https://packagephobia.com/badge?p=mysql-types-generator)](https://packagephobia.com/result?p=mysql-types-generator)

Inspects a mysql database and generates Typescript types for each table. Useful when you are using `knex` or raw mysql clients instead of an ORM.

Table names in the database must be in snake_case and will be converted to PascalCase for type names.

## Usage

The tool can be used with the javascript API or as a CLI with `npx`.

### Javascript API

Create a file to configure and run the generator:

`src/db/updateTypes.js`

```
import { generateMysqlTypes } from 'mysql-types-generator';

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'myuser',
  password: 'mypassword',
  database: 'mydatabase',
  ssl: {
    rejectUnauthorized: true
  }
};

// OR

const dbConfig = {
  uri: 'mysql://myuser:mypassword@localhost:3306/mydatabase',
  database: 'mydatabase',
  ssl: {
    rejectUnauthorized: true
  }
};

generateMysqlTypes({
  db: dbConfig,
  output: {
    // Specify only one of the following 2 options:
    dir: 'src/db/types',
    file: 'src/db/types.ts'
  },
  suffix: 'PO',
  ignoreTables: [
    'my_table_a',
    'my_table_b',
  ],
  overrides: [
    {
      tableName: 'my_table',
      columnName: 'my_actual_tinyint_column',
      columnType: 'int',
    },
    {
      tableName: 'my_table',
      columnName: 'my_column',
      columnType: 'enum',
      enumString: `enum('a','b','c')`
    }
  ],
  tinyintIsBoolean: true,
})
```

- `db` : **Required** - the database connection and credentials
  - `ssl` is optional. Defaults to the `mysql2` default.
  - if `uri` is specified, the host, port, username and password options are ignored.
- `output` : **Required** - you should define one of the following 2 options:
  - `dir` : Each type will be output in a separate file in this directory, along with an `index.ts`. **_WARNING: This directory will be emptied and overwritten if it already exists._**
  - `file` : Each type will be output into this single file. **_WARNING: This file will be overwritten if it already exists._**
  - If both `dir` and `file` are provided, `file` will take precedence.
- `suffix` : Optional - a string appended to the PascalCase Type name (`PO` in the example refers to `Persistence Object` but you should use whatever convention you wish)
- `ignoreTables` : Optional - a list of tables to ignore; types won't be generated for these
- `overrides` : Optional - a list of columns where the column type in the database is ignored and the specified `columnType` is used instead
  - `columnType` can be any of the `mysql` column types, e.g. `'varchar'`, `'json'`, etc. Check the file `src/getColumnDataType.ts` in this repo for a list
    - if `columnType` = `'enum'`, you should specify `enumString`
  - `enumString` : Optional unless `columnType` = `'enum'`. Specify the enum options, for example `enum('a','b','c')` will become `'a' | 'b' | 'c'`
- `tinyintIsBoolean`: Optional. Controls if `tinyint(1)` should be converted to boolean or kept as number. Default is `false`
  - `true` : convert to boolean
  - `false` : keep as number (default)

Run this file after running your database migrations. For example with `knex` :

`package.json`

```
(...)
  "scripts": {
    "migrate:dev": "npm run build && npx knex migrate:latest && node src/db/updateTypes.js"
  }
(...)
```

You can use [env-cmd](https://www.npmjs.com/package/env-cmd) to load environment variables from a `.env` file before running: `env-cmd node src/db/updateTypes.js`

### CLI

**NOTE: node v18.3 or greater is required to use the CLI as it uses `parseArgs` from `node:util` under the hood**

```
npx mysql-types-generator [options] --outFile [output file] [database name]
npx mysql-types-generator [options] --outDir [output directory] [database name]

// example
npx mysql-types-generator -h localhost -P 3306 -u myuser -p mypassword --outFile ./src/db/types.ts mydatabase

```

Most options from the Javascript API are available, run `npx mysql-types-generator --help` for details

## Notes

- `SET` data type is treated as a simple string because `knex` returns a comma-delimited string in queries. You need to manually split it by comma if you want to convert it to an array or javascript `Set<>` type.

## Dependencies

- [mysql2](https://www.npmjs.com/package/mysql2)

## Change Log

- `2.0.0`
  - Changed mapping of `decimal` column to string instead of number
  - Added `includeTables` option (optional) to specify a list of tables to generate types for
  - CLI: Added the `ignoreTables` and `includeTables` options
  - CLI: Output to `STDOUT` if no `--outDir` or `--outFile` option is provided
  - JS API: Added `stream` option to ouput to a `writeStream`
- `1.0.8`
  - Bugfixes: node version check, MariaDB support, ES2020 target
- `1.0.3`
  - Updated `README.md` to indicate that node v18.3 or greater is required to use the CLI
- `1.0.2`
  - Added feature: Specify connection using a `uri` (e.g. `mysql://user:password@host:port/database`)
  - Added feature: Specify SSL options (see [mysql2 SslOptions](https://github.com/sidorares/node-mysql2/blob/master/typings/mysql/lib/Connection.d.ts))
- `1.0.1`
  - Added feature: `tinyintIsBoolean` config option in CLI
- `1.0.0`
  - Added feature: CLI / usage with `npx`
  - Added feature: `tinyintIsBoolean` config option in JS API
  - Added feature: mysql column comments are now added as comments in the output files
  - Breaking Change: Changed how the output file / directory is defined in the config
  - Migrated from tslint to eslint
- `0.0.12`
  - Fixed typos in `README.md`
- `0.0.11`
  - Bugfix: `overrides` config option wasn't working properly
  - Added feature: `output` can now be a path to a single file instead of a directory
  - Added feature: output files now contain a warning comment at the top to indicate that the file was auto-generated and will be overwritten
