import { LitElement, css, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import hljs from 'highlight.js';
import {VCDParser} from './vcdparser.js';
import {to_wokwi} from './wokwi.js';
import { onedark } from './onedark.js';

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
    private wokwi = '';
    private parsedHTML = '';
    private resolvedHTML = '';
    private wokwiHTML = '';

    disableTabs() {
      this.tab1 = false;
      this.tab2 = false;
      this.tab3 = false;   
      this.tab4 = false;
    }
  
    showTab1() {
      this.disableTabs();
      this.tab1 = true;
      this.requestUpdate();
    }
  
    showTab2() {
      this.disableTabs();
      this.tab2 = true;
      this.requestUpdate();
    }
  
    showTab3() {

      this.disableTabs();
      this.tab3 = true;
      this.requestUpdate();
    
    }
  
    showTab4() {
      this.disableTabs();
      this.tab4 = true;
      this.requestUpdate();
    } 

     unEscapeHTML(htmlStr:string) {
      htmlStr = htmlStr.replace(/&lt;/g , "<");	 
      htmlStr = htmlStr.replace(/&gt;/g , ">");     
      htmlStr = htmlStr.replace(/&quot;/g , "\"");  
      htmlStr = htmlStr.replace(/&#39;/g , "\'");   
      htmlStr = htmlStr.replace(/&amp;/g , "&");
      return htmlStr;
    }

    escapeHTML(htmlStr: string) {
      return htmlStr.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");        
   
    }

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
        this.parsedHTML = hljs.highlight(this.parsed, {language:"json"}).value;
        this.resolvedHTML = hljs.highlight(this.resolved, {language: "json"}).value;
        this.wokwi = to_wokwi(parser);
        this.wokwiHTML = hljs.highlight(this.wokwi, {language: "c"}).value;
        this.requestUpdate();
        
      }
      };

      if (selectedFile) {
        reader.readAsDataURL(selectedFile);
      }
    }

    _copyToClipboard(code: string) {
      navigator.clipboard.writeText(code);
      this.shadowRoot?.querySelectorAll(".clipboard").forEach(element => {
        element.innerHTML = "Copied!";
      });
      //this.innerText = 'Copied!';
      //button = this;
      const that = this;
      setTimeout(function () {
        that.shadowRoot?.querySelectorAll(".clipboard").forEach(element => {
          element.innerHTML = "Copy To Clipboard";
        });
      }, 2000);
     
    }

    copyToClipboard() {
      console.log("copied!");
      if (this.tab2) {
        this._copyToClipboard(this.parsed);
      }

      if (this.tab3) {
        this._copyToClipboard(this.resolved);
      }

      if (this.tab4) {
        this._copyToClipboard(this.wokwi);
      }

    }

    render() {
        return html`
          <main>
            <section id="upload" ?hidden=${!this.showUpload}>
                <div class="upload-btn-wrapper">
                    <button class="btn" ?hidden=${!this.showUpload}>Upload a file</button>
                    <input type="file" @change="${this._file_uploaded}" name="myfile" accept=".vcd" />
                </div>
            </section>
            <section ?hidden=${this.showUpload}>
              <nav>
                <button @click=${this.showTab1}>Original</button>
                <button @click=${this.showTab2}>Parsed</button>
                <button @click=${this.showTab3}>Resolved</button>
                <button @click=${this.showTab4}>To Wokwi</button>
              </nav>
            </section>
            <section ?hidden=${!this.tab1} >
              <pre>
              <code> 
${this.original}
              </code>
              </pre>
            </section>
            <section ?hidden=${!this.tab2}>
              <pre class="json">
              <button class="clipboard" style="float:right;cursor:pointer;"  @click="${this.copyToClipboard}">Copy To Clipboard</button>
              <code> 
${unsafeHTML(this.parsedHTML)}
              </code>
              </pre>   
            </section>
            <section ?hidden=${!this.tab3}>
              <pre class="json">
              <button class="clipboard" style="float:right;cursor:pointer;" @click="${this.copyToClipboard}">Copy To Clipboard</button>  
              <code> 
${unsafeHTML(this.resolvedHTML)}
              </code>
              </pre>    
            </section>
            <section ?hidden=${!this.tab4}>        
              <pre  class="c">
              <button class="clipboard" style="float:right;cursor:pointer;"  @click="${this.copyToClipboard}">Copy To Clipboard</button>  
              <code> 
${unsafeHTML(this.wokwiHTML)}
              </code>
              </pre>
            </section>            
          </main>
        `
    }

    static override styles = [    
       onedark,        
        css`
        .json, .c {
          background-color: #333
        }

        /*
        code {
          color: #fff;
        }
        */

        pre > code {
           font-family: "Sans Mono", "Consolas", "Courier", monospace;
         }
   
         .hljs-punctuation, .hljs-class, .c {
          color: #fff;
         }

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