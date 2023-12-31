import { VCDParser } from './vcdparser.js';
import { TransformedData } from './types';

function format(): string { 
  return [...arguments].reduce((acc, arg, idx) => 
    acc.replace(new RegExp("\\{" + (idx - 1) + "\\}", "g"), arg));
}

function formatArray(formatstring: string, arr: string[]) {
  let out="";
  arr.forEach(element => {
    // @ts-ignore: variadic function
    const boo = format(formatstring, element);
    out = out.concat(boo);
  });
  return out;
}

function varDecl(varType: string, vars: any) {
  const varNames = [];
  for (const vcdVar of vars) {
    varNames.push(`${varType} ${vcdVar.name};\n      `);
  }
  return varNames;
}




function wokwi_signals(signals: any, vars:string[]) {
  let out = '';
  signals.forEach((element: TransformedData ) => {
    const timestamp = element.timestamp;
    let line = `{.timestamp=${timestamp}, `;
    vars.forEach(varvar  => {
       const signal_names = element.signals.map(signal=>signal.signal_name);
       if (signal_names.includes(varvar)) {
        line = line.concat(`.${varvar}=${element.signals[signal_names.indexOf(varvar)].value}, `) 
       }
       else {
        line = line.concat(`.${varvar}=-1, `)
       }       
    });
    /*
    element.signals.forEach((signal: TransformedSignal ) => {
        const signal_name = signal.signal_name;
        const value = signal.value;
        //console.log(signal);
        if (vars.index() > -1) {
          line = line.concat(`.${signal_name}=${value}, `)
        }
        else {
          line = line.concat(`.${signal_name}=-1, `)
        }
        
      
    });
    */    
    out = out.concat(`${line}},\n    `);    
  });
  return out;
}

export function to_wokwi(parser: VCDParser): string {
  const signals = parser.resolve_variables();
  const signals_grouped = parser.transformToTimestamp(signals);
  const vars = parser.vars.map(element=>element.name);

  const signals_lit: any = wokwi_signals(signals_grouped, vars);

  const varNames = varDecl("pin_t",parser.vars);
  const varNames2 = varDecl("int", parser.vars);

  const chipTimerDecls = formatArray("tristatelevel {0}=current_pulse.{0};\n      ", vars);
  const chipTimerDef =  formatArray("if ({0} != dontcarelevel ) {  pin_write(chip->{0}, {0});  }\n      ", vars);
  const chipInit = formatArray("chip->{0} = pin_init(\"{0}\", OUTPUT);\n      ", vars);

const out =  
`
    #include <stdio.h>
    #include <stdlib.h>
    #include "wokwi-api.h"

    typedef struct {
      int index;
      timer_t timer;
      ${varNames.join("")} 
    } chip_state_t;
  
    typedef struct {
      uint64_t timestamp;
      ${varNames2.join("")}
    } pulse;
  
    typedef enum {
      dontcarelevel=-1,
      lowlevel=0,
      highlevel=1,
    } tristatelevel;    

    const pulse pulse_train[] = {
    ${signals_lit}
    };

    const unsigned int NUMBER_OF_PULSES = sizeof(pulse_train)/sizeof(pulse);

    void chip_timer_event(void *user_data) {
      chip_state_t *chip = (chip_state_t *)user_data;
      pulse current_pulse = pulse_train[chip->index];
      unsigned long long t = current_pulse.timestamp;
      
      ${chipTimerDecls}
      ${chipTimerDef}
      uint64_t sim_time = (unsigned long) get_sim_nanos();
      chip->index = chip->index + 1;
      if ((chip->index) != NUMBER_OF_PULSES) {
          uint64_t next_pulse = pulse_train[chip->index].timestamp - t;
          timer_start_ns(chip->timer, next_pulse, false);
      }
    }
  
    void chip_init() {
      chip_state_t *chip = malloc(sizeof(chip_state_t));
      
      ${chipInit}
      timer_config_t timer_config = {
          .callback = chip_timer_event,
          .user_data = chip
      };
    
      chip->timer = timer_init(&timer_config);
      timer_start_ns(chip->timer, 10, false);
    }


`;

return out;
}

export function to_wokwi_chip_json(parser: VCDParser) {
  const vars = parser.vars.map(element=>element.name);

  return `{
  "name": "remote-control",
  "author": "Raspberry Pi",
  "pins": [
    ${vars.map(element=>`"${element}"`)}
  ],
  "controls": []
}
  `;
}