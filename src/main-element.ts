import { LitElement, css, html, TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'
import {VCDParser} from './vcdparser.js';
import {to_wokwi} from './wokwi.js';

@customElement('main-element')
export class MyElement extends LitElement {
    private showUpload = true; 
    private tab1 = true; 
    private tab2 = false; 
    private tab3 = false;
    private tab4 = false;
    private original = '';
    private parsed = '';
    private resolved = '';
    private wokwi:TemplateResult = html``;

    b64DecodeUnicode(str: any) {
        // Going backwards: from bytestream, to percent-encoding, to original string.
        return decodeURIComponent(
          atob(str)
            .split('')
            .map(function (c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join('')
        );
      }

    _file_uploaded(_ee: Event) {
        const selectedFile = this.renderRoot.querySelector('input')?.files?.item(0);
        
        const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const base64 = (e.target.result as String).split(',').pop();
        const contents = this.b64DecodeUnicode(base64);
        //console.log(this.b64DecodeUnicode(base64));
        const parser = new VCDParser();
        const digestible_vcd = parser.parse(contents);
        this.original = contents;
        console.log('Parsed VCD');
        console.log('----------------------');
        console.log(digestible_vcd);
        console.log('JSON VCD');
        console.log('----------------------');
        console.log(JSON.stringify(digestible_vcd));
        this.parsed = JSON.stringify(digestible_vcd,  null, 2);
        console.log('Parsed VCD with variable resolution');
        const resolved_signals = parser.resolve_variables();
        console.log(resolved_signals);
        console.log('signal data grouped by timestamp');
        const signals_grouped = parser.transformToTimestamp(resolved_signals);
        console.log(signals_grouped);
        this.resolved = JSON.stringify(resolved_signals, null, 2);
        //this.wokwi = to_wokwi(parser);
        this.showUpload = false;
        //Prism.highlightAllUnder(this.shadowRoot!);
        this.requestUpdate();
        
      }
      };

      if (selectedFile) {
        reader.readAsDataURL(selectedFile);
      }
    }

    render() {
        return html`
          <main>
            <div id="upload">
                <div class="upload-btn-wrapper" ?hidden=${!this.showUpload}>
                    <button class="btn" ?hidden=${!this.showUpload}>Upload a file</button>
                    <input type="file" @change="${this._file_uploaded}" name="myfile" accept=".vcd" />
                    </div>
                </div>
            <div id="view">
            </div>
          </main>
        `
    }

    static override styles = [            
        css`
        nav {
         display: flex;
        }
     
         .upload-btn-wrapper {
           position: relative;
           overflow: hidden;
           display: inline-block;
         }
     
         .btn {
           border: 2px solid gray;
           color: gray;
           background-color: white;
           padding: 8px 20px;
           border-radius: 8px;
           font-size: 20px;
           font-weight: bold;
         }
     
         .upload-btn-wrapper input[type='file'] {
           font-size: 100px;
           position: absolute;
           left: 0;
           top: 0;
           opacity: 0;
         }`
       ];    


}