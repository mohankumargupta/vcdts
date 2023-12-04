//@ts-ignore

import {VCDParser} from '../src/vcdparser';
import {describe, expect, test, it} from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

function discoverAllTests(): any {
  const files = fs.readdirSync(path.join('test', 'data'));
  //console.log(files);
  const vcdFiles = files.filter((file) => path.extname(file) === '.vcd');
  //let inputs: {in: string; out: string}[] = [];
  const inputs = vcdFiles.map((filename) => {
    const contents = fs.readFileSync(path.join('test', 'data', filename), {
      encoding: 'utf-8',
    });
    const filenameWithoutExtension = path.parse(filename).name;
    const filenameWithJSONExtension = `${filenameWithoutExtension}.json`;
    try {
      fs.accessSync(
        path.join('test', 'data', filenameWithJSONExtension),
        fs.constants.F_OK
      );

      const json_contents = fs.readFileSync(
        path.join('test', 'data', filenameWithJSONExtension),
        {
          encoding: 'utf-8',
        }
      );
      return {
        filenameWithoutExtension: filenameWithoutExtension,
        in: contents,
        out: json_contents,
      };
    } catch (err) {
      return {
        filenameWithoutExtension: filenameWithoutExtension,
        in: contents,
        out: null,
      };
    }
  });
  //console.log(inputs);
  return inputs;
}

const allTests = discoverAllTests();
//console.log(allTests);
const allTestsPrepared = allTests.map((item) => [
  item.filenameWithoutExtension,
  item.in,
  item.out,
]);
//console.log(allTestsPrepared);

describe('VCD stress tests', () => {
  //@ts-ignore
  describe.each(allTestsPrepared)('Testing %s', (filename, input, output) => {
    it(`Parsing ${filename}.vcd should not fail`, () => {
      const parser = new VCDParser();
      const parsed = parser.parse(input);
      //console.log('all good');
    });
    if (output) {
      it(`Checking if expected output agrees with input`, () => {
        const parser = new VCDParser();
        const parsed = parser.parse(input);
        const parsed_json = JSON.stringify(parsed);
        const expected_json = JSON.stringify(JSON.parse(output));
        expect(parsed_json).toBe(expected_json);
      });
    }
  });
});
