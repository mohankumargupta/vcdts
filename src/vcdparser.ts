import {sort} from './sort';

type Tokeniser = Generator<{lineNumber: number; word: string}, void, unknown>;

interface VCDVar {
  name: string;
  type: string;
  size: number;
  path: string;
  code: string;
}

type ScopeType = 'begin' | 'fork' | 'function' | 'module' | 'task';

interface Scope {
  name: string;
  type: ScopeType;
}

/*
interface Var {
  name: string;
  type: string;
  size: number;
  code: string;
}
*/

interface FourStateVCDFile {
  comment: string;
  date: string;
  scope: Scope[];
  timescale: string;
  vars: VCDVar[];
  version: string;
}

interface VCDDocument {}

interface HeaderWithStringArguments
  extends Pick<FourStateVCDFile, 'comment' | 'date' | 'timescale' | 'version'> {
  [key: string]: string;
}

interface TransformedSignal {
  signal_name: string;
  value: string;
}

interface TransformedData {
  timestamp: number;
  signals: TransformedSignal[];
}

interface SignalData {
  timestamp: number;
  identifier_code: string;
  value: string;
}

interface ResolvedSignalData {
  timestamp: number;
  scopes: string[],
  signal_name: string;
  value: string;
}

export class VCDParser {
  enddefinitions: boolean;
  header: HeaderWithStringArguments;
  scope_hierarchy: Array<Scope>;
  signal_data: SignalData[];
  vars: VCDVar[];
  scope_stack: string[];

  constructor() {
    this.scope_stack = [];
    this.vars = [];
    this.signal_data = [];
    this.header = {
      comment: '',
      date: '',
      timescale: '',
      version: '',
    };
    this.scope_hierarchy = [];
    this.enddefinitions = false;
  }

  repeat_til_end(tokeniser: Tokeniser) {
    let nextvalue = tokeniser.next().value;
    if (nextvalue) {
      while (nextvalue?.word !== '$end') {
        nextvalue = tokeniser.next().value;
        if (!nextvalue) {
          return;
        }
      }
    }
  }

  save_declaration(tokeniser: Tokeniser, token: string) {
    let nextvalue = this.getNextHeaderToken(tokeniser);
    let arg = nextvalue.word;

    while (true) {
      nextvalue = this.getNextHeaderToken(tokeniser);
      if (nextvalue.word === '$end') {
        break;
      }
      arg = `${arg} ${nextvalue.word}`;
    }
    const headerProperty = token.substring(1);
    this.header[headerProperty] = arg.replace(/^\s+/, '');
  }

  vcd_enddefinitions(tokeniser: Tokeniser) {
    let maybeEnd = tokeniser.next().value;
    while (maybeEnd?.word !== '$end') {
      maybeEnd = tokeniser.next().value;
      if (!maybeEnd) {
        break;
      }
    }
    this.enddefinitions = true;
  }

  dontcare(tokeniser: Tokeniser) {
    this.repeat_til_end(tokeniser);
  }

  vcd_var(tokeniser: Tokeniser) {
    const type = this.getNextDataToken(tokeniser).word;
    const size = this.getNextDataToken(tokeniser).word;
    let code = this.getNextDataToken(tokeniser).word;
    let name = this.getNextDataToken(tokeniser).word;
    this.repeat_til_end(tokeniser);

    let path = '';
    if (this.scope_stack.length === 1) {
      path = this.scope_stack[0];
    } else {
      path = this.scope_stack.join('.');
    }

    return {
      name,
      type,
      size: Number(size),
      path,
      code,
    };
  }

  /*
  parse_scalar(matches: RegExpMatchArray, timestamp: number): number {
    const identifier_code = matches[2];
    const value = matches[1];
    this.signal_data.push({
      timestamp: timestamp,
      identifier_code: identifier_code,
      value: value,
    });
    return timestamp;
  }
  */

  get_scope(identifier: string): string {
    this.vars.forEach(vcdvar => {
      console.log(vcdvar);
    });
    return "";
  }

  parse_signal_data(_lineNumber: number, tokeniser: Tokeniser, token: string) {
    const regexPatterns = [
      {
        name: 'time',
        //pattern: /^#(\d+)/,
        pattern: /^#(\d+)\s*((\d.\s*)*)$/,
        action: (matches: RegExpMatchArray, _timestamp: number): number => {
          //timestamp = Number(matches[1]);
          const newtimestamp = Number(matches[1]);
          if (matches.length == 4) {
            const changed_values = matches[2];
            //const possible_regex = /^(\d[!#$])\s*((?:\d[!#$]\s*)*)$/;
            const regex2 = /(\d)(.)/g;
            const new_matches = [...changed_values.matchAll(regex2)];
            new_matches.forEach((item) => {
              const value = item[1];
              const identifier = item[2];
              //const path = this.get_scope(identifier);
              this.signal_data.push({
                timestamp: newtimestamp,
                
                identifier_code: identifier,
                value: value,
              });
            });
          }
          //console.log(newtimestamp);
          return newtimestamp;
        },
      },
      {
        name: 'scalar',
        pattern: /^([01zxZX])(.+)/,
        action: (matches: RegExpMatchArray, timestamp: number): number => {
          const identifier_code = matches[2];
          const value = matches[1];
          //const path = this.get_scope(identifier_code);
          this.signal_data.push({
            timestamp: timestamp,
            
            identifier_code: identifier_code,
            value: value,
          });
          return timestamp;
        },
      },
      {
        name: 'vector',
        pattern: /^([br]\S+)\s+(.+)/,
        action: (matches: RegExpMatchArray, timestamp: number) => {
          const identifier_code = matches[2];
          const value = matches[1];
          //const path = this.get_scope(identifier_code);
          this.signal_data.push({
            timestamp: timestamp,
            
            identifier_code: identifier_code,
            value: value,
          });
          return timestamp;
        },
      },
      {
        name: 'simulation commands',
        pattern: /\$dumpvars(.*)|\$dumpon(.*)|\$dumpoff(.*)/,
        action: (_matches: RegExpMatchArray, timestamp: number) => {
          return timestamp;
        },
      },
      {
        name: 'end',
        pattern: /\$end/,
        action: (_matches: RegExpMatchArray, timestamp: number) => {
          return timestamp;
        },
      },
      {
        name: 'comment',
        pattern: /\$comment/,
        action: (_matches: RegExpMatchArray, timestamp: number) => {
          this.dontcare(tokeniser);
          return timestamp;
        },
      },
    ];

    let nextToken = token;
    let timestamp = 0;

    while (nextToken !== '') {
      for (const {pattern, action} of regexPatterns) {
        const matches = nextToken.match(pattern);
        if (matches && matches.length !== 0) {
          timestamp = action(matches, timestamp);
          nextToken = this.getNextDataToken(tokeniser)?.word || '';
          break;
        }
      }
    }
  }

  public tokenise_vcd(vcd: string) {
    let lineNumber = 0;
    let isHeader = true;
    return function* () {
      for (const line of vcd.split(/[\r\n]+/)) {
        lineNumber++;
        const word = line;
        if (!isHeader) {
          isHeader = yield {lineNumber, word};
        } else {
          const words = line.split(/\s+/);
          for (const word of words) {
            isHeader = yield {lineNumber, word};
          }
        }
      }
    };
  }

  generate_vcd_info(): VCDDocument {
    return {
      header: {
        ...this.header,
        scopes: this.scope_hierarchy,
        vars: this.vars,
      },
      data: this.signal_data,
    };
  }

  getNextHeaderToken(tokeniser: Tokeniser) {
    const result = tokeniser.next(true);
    if (result.done) {
      return {lineNumber: 0, word: ''};
    }
    return result.value;
  }

  getNextDataToken(tokeniser: Tokeniser) {
    const result = tokeniser.next(false);
    if (result.done) {
      return {lineNumber: 0, word: ''};
    }
    return result.value;
  }

  parse_header(tokeniser: Tokeniser) {
    let tokendata;
    let token;
    do {
      tokendata = this.getNextHeaderToken(tokeniser);
      token = tokendata.word;
      //let lineNumber = tokendata?.lineNumber;
      if (token === '$var') {
        const varLine = this.vcd_var(tokeniser);
        this.vars.push(varLine);
      } else if (
        token === '$comment' ||
        token === '$version' ||
        token === '$date' ||
        token === '$timescale'
      ) {
        this.save_declaration(tokeniser, token);
      } else if (token === '$scope') {
        const scope_type = this.getNextHeaderToken(tokeniser);
        const scope_name = this.getNextHeaderToken(tokeniser);
        let scope_fullname = '';
        if (this.scope_stack.length === 0) {
          scope_fullname = scope_name.word;
          this.scope_stack.push(scope_fullname);
        } else {
          scope_fullname = this.scope_stack.join('.') + scope_name.word;
          this.scope_stack.push(scope_name.word);
        }
        const newScope: Scope = {
          name: scope_fullname,
          type: scope_type.word as ScopeType,
        };
        this.scope_hierarchy.push(newScope);
        //this.dontcare(tokeniser);
      } else if (token === '$upscope') {
        this.scope_stack.pop();
        this.dontcare(tokeniser);
      } else if (token === '$enddefinitions') {
        this.dontcare(tokeniser);
        this.enddefinitions = true;
        break;
      } else {
      }
    } while (tokendata);
  }

  parse_data(tokeniser: Tokeniser) {
    let tokendata = tokeniser.next().value;
    const token = tokendata?.word;
    const lineNumber = tokendata?.lineNumber as number;
    if (token) {
      this.parse_signal_data(lineNumber, tokeniser, token);
    }
  }

  public parse(vcd: string) {
    //console.log(vcd);
    const tokeniser = this.tokenise_vcd(vcd)();

    this.parse_header(tokeniser);
    this.parse_data(tokeniser);
    return this.generate_vcd_info();
  }

  public resolve_variables(): ResolvedSignalData[] {
    let signal_data: ResolvedSignalData[] = [];

    for (const variable of this.vars) {
      const name = variable.name;
      const identifier_code = variable.code;
      const path = variable.path;
      const scopes = path.split(".");
      for (const signal of this.signal_data) {
        if (signal.identifier_code === identifier_code) {
          signal_data.push({
            timestamp: signal.timestamp,
            scopes: scopes,
            signal_name: name,
            value: signal.value,
          });
        }
      }
    }

    sort(signal_data, 'timestamp');
    return signal_data;
  }

  public transformToTimestamp(data: ResolvedSignalData[]) {
    const output: TransformedData[] = [];
    data.forEach(item => {
      const existingTimestamp = output.find(o => o.timestamp === item.timestamp);
      const signal: TransformedSignal = {
        signal_name: item.signal_name,
        value: item.value
      };
      if (existingTimestamp) {
        existingTimestamp.signals.push(signal);
      } else {
        output.push({
          timestamp: item.timestamp,
          signals: [signal]
        });
      }      
    });
    
    return output;
  }

}
