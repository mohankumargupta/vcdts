import { TemplateResult, html } from 'lit';
import { VCDParser } from './vcdparser.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';


function varDecl(varType: string, vars: any) {
  const varNames = [];
  for (const vcdVar of vars) {
    varNames.push(html`${varType} ${vcdVar.name};\n    `);
  }
  return varNames;
}

function wokwi_signals(signals: any, vars: any) {
  const out: TemplateResult[] = [];
  signals.forEach(element => {
    const timestamp = element.timestamp;
    let line = `{.timestamp=${timestamp}, `;

    element.signals.forEach(signal => {
        const signal_name = signal.signal_name;
        const value = signal.value;
        console.log(signal);
        line = line.concat(`.${signal_name}=${value}, `)
      
    });
    
    out.push(html`${line}},\n    `);
    
  });
  return out;
}

export function to_wokwi(parser: VCDParser) {
  const signals = parser.resolve_variables();
  const signals_grouped = parser.transformToTimestamp(signals);
  const vars = parser.vars.map(element=>element.name);
  
  const signals_lit = wokwi_signals(signals_grouped, vars);

  const stdio = "#include &lt;stdio.h&gt;";
  const stdlib = "#include &lt;stdlib.h&gt;";

  const varNames = varDecl("pin_t",parser.vars);
  const varNames2 = varDecl("int", parser.vars);
  
  return html`
  ${unsafeHTML(stdio)}
  ${unsafeHTML(stdlib)}
  #include "wokwi-api.h"
  
  typedef struct {
    int index;
    timer_t timer;
  
    ${varNames}
  } chip_state_t;

  typedef struct {
    unsigned long timestamp;
    ${varNames2}
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

    unsigned long t = current_pulse.timestamp;
    tristatelevel D1=current_pulse.D1;
    tristatelevel D2=current_pulse.D2;
    tristatelevel D0=current_pulse.D0;
    tristatelevel D3=current_pulse.D3;

    if (D1 != dontcarelevel ) {pin_write(chip->D1, D1);}
    if (D2 != dontcarelevel ) {pin_write(chip->D2, D2);}
    if (D0 != dontcarelevel ) {pin_write(chip->D0, D0);}
    if (D3 != dontcarelevel ) {pin_write(chip->D3, D3);}

    unsigned long sim_time = (unsigned long) get_sim_nanos();
    chip->index = chip->index + 1;
    if ((chip->index) != NUMBER_OF_PULSES) {
        unsigned long next_pulse = pulse_train[chip->index].timestamp - t;
        timer_start_ns(chip->timer, next_pulse, false);
    }
}

void chip_init() {

    chip_state_t *chip = malloc(sizeof(chip_state_t));

    chip->D0 = pin_init("D0", OUTPUT);
    chip->D1 = pin_init("D1", OUTPUT);
    chip->D2 = pin_init("D2", OUTPUT);
    chip->D3 = pin_init("D3", OUTPUT);


    timer_config_t timer_config = {
        .callback = chip_timer_event,
        .user_data = chip
    };

    chip->timer = timer_init(&timer_config);
    timer_start_ns(chip->timer, 10, false);
   }

  
  `;
}