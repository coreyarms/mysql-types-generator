import { getColumnDataType } from '../src/getColumnDataType';

describe('getColumnDataType', () => {
  it('converts enum properly', () => {
    const dataType = 'enum';
    const columnType = `enum('value1','value2','value3')`;
    expect(getColumnDataType(dataType, columnType, false)).toEqual(`'value1' | 'value2' | 'value3'`);
  });
});
