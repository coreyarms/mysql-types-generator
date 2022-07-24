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

if (positionals.length !== 2) {
  help();
  console.error('This command requires exactly 2 arguments');
  process.exit(1);
}
if (values.help) {
  help();
  process.exit(0);
}

generateMysqlTypes({
  db: {
    host: values.host ?? options.host.default,
    port: +(values.port ?? options.port.default),
    user: values.user ?? options.user.default,
    password: values.password ?? options.password.default,
    database: positionals[0],
  },

  output: {
    file: positionals[1], // TODO - temporary just to make the build run
  },

  suffix: values.suffix,
});

function help() {
  const command = 'npx mysql-types-generator';

  console.info(`mysql-types-generator

Usage:
  ${command} [mysql databasename] [output file].ts
  ${command} [mysql databasename] [output directory]

Options:`);
  for (const [key, option] of Object.entries(options)) {
    console.info(`
  --${key}${option.short ? ' -' + option.short : ''}
      ${option.description}`);
  }
}
