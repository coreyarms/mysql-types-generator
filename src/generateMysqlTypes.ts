import * as fs from 'fs';
import * as path from 'path';
import * as mysql from 'mysql2/promise';

import { getColumnDataType } from './getColumnDataType';
import { writeToFile } from './writeToFile';
import { COLUMNS } from './information-schema/COLUMNS';
import type { SslOptions } from 'mysql2';

export type GenerateMysqlTypesConfig = {
  db:
    | (
        | {
            host: string;
            port?: number;
            user: string;
            password: string;
          }
        | {
            uri: string;
          }
      ) & {
        database: string;
        ssl?: SslOptions;
      };
  output:
    | {
        dir: string;
      }
    | {
        file: string;
      };
  suffix?: string;
  ignoreTables?: string[];
  overrides?: {
    tableName: string;
    columnName: string;
    columnType: string;
    enumString?: string;
  }[];
  tinyintIsBoolean?: boolean;
};

export const generateMysqlTypes = async (config: GenerateMysqlTypesConfig) => {
  const tinyintIsBoolean = config.tinyintIsBoolean ?? false;

  // connect to db
  let connectionConfig: mysql.ConnectionOptions;
  if ('uri' in config.db) {
    connectionConfig = {
      uri: config.db.uri,
      database: config.db.database,
      ssl: config.db.ssl,
    };
  } else {
    connectionConfig = {
      host: config.db.host,
      port: config.db.port || 3306,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      ssl: config.db.ssl,
    };
  }
  const connection = await mysql.createConnection(connectionConfig);

  const tables = await getTableNames(connection, config.db.database, config.ignoreTables ?? []);

  // check if at least one table exists
  if (tables.length === 0) {
    throw new Error(`0 eligible tables found in ${config.db.database}`);
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

    const columns = await getColumnInfo(connection, config.db.database, table);

    // define output file
    const outputTypeFilePath = splitIntoFiles ? `${outputPath}/${typeName}.ts` : outputPath;

    await writeToFile(outputTypeFilePath, `export type ${typeName} = {\n`);

    // output the columns and types
    for (const column of columns) {
      let columnDataType = `${getColumnDataType(column.DATA_TYPE, column.COLUMN_TYPE, tinyintIsBoolean)}`;

      const columnOverride = config.overrides?.find(
        (override) => override.tableName === table && override.columnName === column.COLUMN_NAME,
      );
      if (columnOverride) {
        columnDataType = getColumnDataType(
          columnOverride.columnType,
          columnOverride.columnType === 'enum' ? columnOverride.enumString || 'enum(undefined)' : '',
          tinyintIsBoolean,
        );
      }

      let comment = '';
      if (column.COLUMN_COMMENT) {
        comment = `
  /**
   * ${column.COLUMN_COMMENT}
   */
`;
      }

      await writeToFile(
        outputTypeFilePath,
        `${comment}  ${column.COLUMN_NAME}: ${columnDataType}${column.IS_NULLABLE === 'YES' ? ' | null' : ''};\n`,
      );
    }
    await writeToFile(outputTypeFilePath, '};\n');

    // add type to index file
    if (splitIntoFiles) {
      await writeToFile(`${outputPath}/index.ts`, `export type { ${typeName} } from './${typeName};'\n`);
    }
  }

  // write the index file
  if (splitIntoFiles) {
    await writeToFile(`${outputPath}/index.ts`, '\n');
  }

  // close the mysql connection
  await connection.end();
};

async function getTableNames(
  connection: mysql.Connection,
  databaseName: string,
  ignoredTables: string[],
): Promise<string[]> {
  const [tables] = (await connection.execute(
    'SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ?',
    [databaseName],
  )) as any;

  // filter default ignored tables
  return tables
    .map((table: { TABLE_NAME: string }): string => table.TABLE_NAME)
    .filter((tableName: string) => !tableName.includes('knex_'))
    .filter((tableName: string) => !ignoredTables.includes(tableName));
}

const columnInfoColumns = ['column_name', 'data_type', 'column_type', 'is_nullable', 'column_comment'] as const;

async function getColumnInfo(
  connection: mysql.Connection,
  databaseName: string,
  tableName: string,
): Promise<COLUMNS[]> {
  const [result] = (await connection.query(
    'SELECT ?? FROM information_schema.columns WHERE table_schema = ? and table_name = ? ORDER BY ordinal_position ASC',
    [columnInfoColumns, databaseName, tableName],
  )) as any;
  return result;
}
