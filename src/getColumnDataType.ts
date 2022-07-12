export const getColumnDataType = (dataType: string, columnType: string): string => {
  switch (dataType) {
    case 'int':
    case 'smallint':
    case 'mediumint':
    case 'bigint':
    case 'decimal':
    case 'float':
    case 'double':
    case 'numeric':
      return 'number';

    case 'char':
    case 'varchar':
    case 'text':
    case 'mediumtext':
    case 'longtext':
      return 'string';

    case 'date':
    case 'datetime':
    case 'timestamp':
      return 'Date';
    case 'year':
      return 'number';
    case 'time':
      return 'string';

    case 'binary':
    case 'varbinary':
    case 'blob':
    case 'tinyblob':
    case 'mediumblob':
    case 'longblob':
    case 'bit':
      return 'Buffer';

    case 'tinyint':
      return 'boolean';

    case 'json':
      return 'any';

    case 'enum':
      return columnType
        .substring(5, columnType.length - 1)
        .split(',')
        .join(' | ');

    case 'set':
      return 'string';

    default:
      /* tslint:disable-next-line:no-console */
      console.log('WARNING: unknown data type: ' + dataType);
      return 'any';
  }
};
