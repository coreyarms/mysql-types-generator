import * as fs from 'fs';
import * as path from 'path';
import * as mysql from 'mysql2/promise';

import { getColumnDataType } from './getColumnDataType';
import { writeToFile } from './writeToFile';

export type GenerateMysqlTypesConfig = {
  db: {
    host: string;
    port?: number;
    user: string;
    password: string;
    database: string;
  };
  output: ({
    dir: string;
  }) | ({
    file: string;
  });
  suffix?: string;
  ignoreTables?: string[];
  overrides?: {
    tableName: string;
    columnName: string;
    columnType: string;
    enumString?: string;
  }[];
};

export const generateMysqlTypes = async (config: GenerateMysqlTypesConfig) => {
  // connect to db
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port || 3306,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
  });

  // get all tables
  let [tables] = (await connection.execute('SELECT table_name FROM information_schema.tables WHERE table_schema = ?', [
    config.db.database,
  ])) as any;

  // filter default ignored tables
  tables = tables
    .map((table: { TABLE_NAME: string }) => table.TABLE_NAME)
    .filter((tableName: string) => !tableName.includes('knex_'));

  // filter ignored tables
  if (config.ignoreTables && config.ignoreTables.length > 0) {
    tables = tables.filter((tableName: string) => !config.ignoreTables?.includes(tableName));
  }

  // check if at least one table exists
  if (tables.length === 0) {
    return;
  }

  // check the output type
  let outputPath;
  let splitIntoFiles;

  if ('file' in config.output) {
    outputPath = config.output.file;
    splitIntoFiles = false;
  } else {
    outputPath = config.output.dir || '';
    splitIntoFiles = true;
  }

  // delete existing output
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath, { recursive: true });
  }

  // make sure parent folder of output path exists
  const parentFolder = splitIntoFiles ? outputPath : path.resolve(outputPath, '../');
  if (!fs.existsSync(parentFolder)) {
    fs.mkdirSync(parentFolder, { recursive: true });
  }

  // loop through each table
  for (const table of tables) {
    // convert table names from snake case to camel case
    const typeName = `${table
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')}${config.suffix || ''}`;

    // get the columns
    const [columns] = (await connection.execute(
      'SELECT column_name, data_type, column_type, is_nullable FROM information_schema.columns WHERE table_schema = ? and table_name = ? ORDER BY ordinal_position ASC',
      [config.db.database, table],
    )) as any;

    // define output file
    const outputTypeFilePath = splitIntoFiles ? `${outputPath}/${typeName}.ts` : outputPath;

    await writeToFile(outputTypeFilePath, `export type ${typeName} = {\n`);

    // output the columns and types
    for (const column of columns) {
      let columnDataType = `${getColumnDataType(column.DATA_TYPE, column.COLUMN_TYPE)}`;

      const columnOverride = config.overrides?.find(
        (override) => override.tableName === table && override.columnName === column.COLUMN_NAME,
      );
      if (columnOverride) {
        columnDataType = getColumnDataType(
          columnOverride.columnType,
          columnOverride.columnType === 'enum' ? columnOverride.enumString || 'enum(undefined)' : '',
        );
      }

      await writeToFile(
        outputTypeFilePath,
        `  ${column.COLUMN_NAME}: ${columnDataType}${column.IS_NULLABLE === 'YES' ? ' | null' : ''};\n`,
      );
    }
    await writeToFile(outputTypeFilePath, '}\n\n');

    // add type to index file
    if (splitIntoFiles) {
      await writeToFile(`${outputPath}/index.ts`, `export type { ${typeName} } from './${typeName}'\n`);
    }
  }

  // write the index file
  if (splitIntoFiles) {
    await writeToFile(`${outputPath}/index.ts`, '\n');
  }

  // close the mysql connection
  await connection.end();
};
