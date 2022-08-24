// @ts-expect-error This is a very new API, and @types/node doesn't have types
// for this yet.
import { parseArgs } from 'node:util';
import { generateMysqlTypes } from './generateMysqlTypes';

type CliOption = {
  type: 'string' | 'boolean';
  short?: string;
  description?: string;
  default?: string;
};

const options: Record<string, CliOption> = {
  outFile: {
    type: 'string',
    description: 'If specified, all output will be written to this file.',
  },
  outDir: {
    type: 'string',
    description: 'If specified, one .ts file will be created for each MySQL table in this directory.',
  },
  uri: {
    type: 'string',
    description: 'MySQL connection URI. If specified, the host, port, user and password options are ignored.',
  },
  ssl: {
    type: 'string',
    description:
      'SSL options as JSON (see SslOptions at https://github.com/sidorares/node-mysql2/blob/master/typings/mysql/lib/Connection.d.ts)',
  },
  host: {
    type: 'string',
    short: 'h',
    description: 'MySQL hostname. (defaults to 127.0.0.1)',
    default: '127.0.0.1',
  },
  port: {
    type: 'string',
    short: 'P',
    description: 'Port (default is 3306)',
    default: '3306',
  },
  user: {
    type: 'string',
    short: 'u',
    description: 'Username (default is the current user)',
    default: process.env.user,
  },
  password: {
    type: 'string',
    short: 'p',
    description: 'Password',
    default: '',
  },
  suffix: {
    type: 'string',
    description: 'When specified, the name of each generated type will end in this name.',
  },
  tinyintIsBoolean: {
    type: 'boolean',
    description:
      'When specified, tinyint(1) columns will be treated as boolean. By default they are treated as number.',
  },
  help: {
    type: 'boolean',
    description: 'This help message',
  },
};

const { values, positionals } = parseArgs({
  options,
  allowPositionals: true,
  strict: true,
});

if (values.help) {
  help();
  process.exit(0);
}

if (positionals.length !== 1) {
  help();
  console.error("This command requires a 'database name' argument");
  process.exit(1);
}

if (!values.outDir && !values.outFile) {
  help();
  console.error('Either --outFile or --outDir must be specified.');
  process.exit(1);
}
if (values.outDir && values.outFile) {
  help();
  console.error('The --outDir and --outFile options are mutually exclusive. Choose one!');
  process.exit(1);
}

let dbConfig;
if (values.uri && values.uri.length > 0) {
  dbConfig = {
    uri: values.uri,
    database: positionals[0],
    ssl: values.ssl ? JSON.parse(values.ssl) : undefined,
  };
} else {
  dbConfig = {
    host: values.host ?? options.host.default,
    port: +(values.port ?? options.port.default),
    user: values.user ?? options.user.default,
    password: values.password ?? options.password.default,
    database: positionals[0],
    ssl: values.ssl ? JSON.parse(values.ssl) : undefined,
  };
}
generateMysqlTypes({
  db: dbConfig,

  output: values.outFile ? { file: values.outFile } : { dir: values.outDir },

  suffix: values.suffix,

  tinyintIsBoolean: values.tinyintIsBoolean,
});

function help() {
  const command = 'npx mysql-types-generator';

  console.info(`mysql-types-generator

Usage:
  ${command} --outFile [output file] [database name]
  ${command} --outDir [output directory] [database name]

Options:`);
  for (const [key, option] of Object.entries(options)) {
    console.info(`
  --${key}${option.short ? ' -' + option.short : ''}
      ${option.description}`);
  }
}
