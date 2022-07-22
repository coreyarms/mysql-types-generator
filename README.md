# mysql-types-generator

**Warning: This library is incomplete; it works for some personal projects and is updated as issues are found. Use at your own risk.**

Inspects a mysql database and generates Typescript types for each table. Useful when you are using `knex` or raw mysql clients instead of an ORM.

Table names in the database must be in snake_case and will be converted to PascalCase for type names.

## Usage

Create a file to configure and run the generator:

`src/db/updateTypes.js`
```
import { generateMysqlTypes } from 'mysql-types-generator';

generateMysqlTypes({
  db: {
    host: 'localhost',
    port: 3306,
    user: 'myuser',
    password: 'mypassword',
    database: 'mydatabase'
  },
  output: {
    path: 'src/db/types',
  },
  suffix: 'PO',
  ignoreTables: [
    'my_table_a',
    'my_table_b',
  ],
  overrides: [
    {
      tableName: 'my_table',
      columnName: 'my_column',
      columnType: 'json'
    }
  ]
})
```

- `db` : **Required** - the database connection and credentials
- `output` : **Required** - the path to a directory where all the type files will be created. ***WARNING: This directory will be emptied and overwritten.***
- `suffix` : Optional - a string appended to the PascalCase Type name (`PO` in the example refers to `Persistence Object` but you should use whatever convention you wish)
- `ignoreTables` : Optional - a list of tables to ignore; types won't be generated for these
- `overrides` : Optional - a list of columns where the column type in the database is ignored and the specified `columnType` is used instead
  - `columnType` can be any of the `mysql` column types, e.g. `varchar`, `json`, etc. Check the file `src/getColumnDataType.ts` in this repo for a list

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

## Notes
- `TINYINT` data type is always assumed to be `boolean`
- `SET` data type is treated as a simple string because `knex` returns a comma-delimited string in queries. You need to manually split it by comma if you want to convert it to an array or javascript `Set<>` type.

## Dependencies
- [mysql2](https://www.npmjs.com/package/mysql2)