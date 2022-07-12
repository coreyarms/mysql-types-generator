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
  suffix: 'DBO',
  ignoreTables: [
    'my_table_a',
    'my_table_b',
  ],
})
```

Run this file after running your database migrations:

`package.json`
```
(...)
  "scripts": {
    "migrate:dev": "npm run build && env-cmd npx knex migrate:latest && node src/db/updateTypes.js"
  }
(...)
```

You can use `env-cmd` to load environment variables before running: `env-cmd node src/db/updateTypes.js`

## Notes
- `TINYINT` data type is always assumed to be `boolean`
- `SET` data type is treated as a simple string because `knex` returns a comma-delimited string in queries. You need to manually split it by comma if you want to convert it to an array or javascript `Set<>` type.