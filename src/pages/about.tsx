import DocumentHead from '../components/document-head'
import styles from '../styles/page.module.css'

import createDOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

const window = (new JSDOM('')).window
const DOMPurify = createDOMPurify(window)




// const rawHTML = `<div data-block-id="75141cf7-ad9c-480e-9753-a55edae2a042" class="notion-selectable notion-quote-block" style="width: 100%; max-width: 546px; margin-top: 4px; margin-bottom: 4px;"><div style="font-size: 1em; padding: 3px 2px; color: inherit; fill: inherit; display: flex;"><div style="border-left: 3px solid currentcolor; padding-left: 14px; padding-right: 14px; width: 100%;"><div spellcheck="true" placeholder="Empty quote" data-content-editable-leaf="true" contenteditable="false" style="max-width: 100%; width: 100%; white-space: pre-wrap; word-break: break-word; caret-color: rgb(55, 53, 47); padding-left: 2px; padding-right: 2px;">Code gì cũng được, miễn có lương thiện là được!</div></div></div></div>
// <div data-block-id="60887035-844b-4664-995b-87bd978a75cd" class="notion-selectable notion-code-block" style="width: 100%; max-width: 546px; margin-top: 4px; margin-bottom: 0px;"><div style="display: flex;"><div contenteditable="false" data-content-editable-void="true" style="flex-grow: 1; border-radius: 3px; text-align: left; position: relative; background: rgb(247, 246, 243); min-width: 0px; width: 100%;"><div><div class="line-numbers notion-code-block" style="display: flex; overflow-x: auto;"><div spellcheck="false" autocorrect="off" autocapitalize="off" placeholder=" " data-content-editable-leaf="true" contenteditable="false" style="flex-grow: 1; flex-shrink: 1; text-align: left; font-family: SFMono-Regular, Menlo, Consolas, &quot;PT Mono&quot;, &quot;Liberation Mono&quot;, Courier, monospace; font-size: 85%; tab-size: 2; padding: 34px 16px 32px 32px; min-height: 1em; color: rgb(55, 53, 47); white-space: pre;"><span class="token keyword">using</span><span class=""> </span><span class="token namespace">Life</span><span class="token punctuation">;</span><span class="">
// </span><span class="token keyword">public</span><span class=""> </span><span class="token keyword">class</span><span class=""> </span><span class="token class-name">AlgorithmOfSuccess</span><span class=""> </span><span class="token punctuation">{</span><span class="">
//   </span><span class="token keyword">public</span><span class=""> </span><span class="token keyword">static</span><span class=""> </span><span class="token keyword">void</span><span class=""> </span><span class="token function">main</span><span class="token punctuation">(</span><span class="token keyword">string</span><span class="token punctuation">[</span><span class="token punctuation">]</span><span class=""> args</span><span class="token punctuation">)</span><span class=""> </span><span class="token punctuation">{</span><span class="">
//   </span><span class="token keyword">while</span><span class=""> </span><span class="token punctuation">(</span><span class="">noSuccess</span><span class="token punctuation">)</span><span class=""> </span><span class="token punctuation">{</span><span class="">
//   </span><span class="token function">tryAgain</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span><span class="">
//   </span><span class="token keyword">if</span><span class=""> </span><span class="token punctuation">(</span><span class="">Dead</span><span class="token punctuation">)</span><span class=""> </span><span class="token keyword">break</span><span class="token punctuation">;</span><span class="">
//   </span><span class="token punctuation">}</span><span class="">
//   </span><span class="token punctuation">}</span><span class="">
//   </span><span class="token punctuation">}</span><span>
//   </span></div></div></div><div style="position: absolute; top: 3px; right: 1px; color: rgba(55, 53, 47, 0.65); display: flex; align-items: center; justify-content: flex-end; height: 25px; font-size: 11.5px; opacity: 0; transition: opacity 300ms ease-in 0s;"></div><div style="position: absolute; top: 8px; left: 8px; color: rgba(55, 53, 47, 0.65); display: flex; align-items: center; justify-content: flex-end; opacity: 0; transition: opacity 300ms ease-in 0s;"><div class="notion-focusable" role="button" aria-disabled="true" tabindex="-1" style="user-select: none; transition: background 20ms ease-in 0s; display: inline-flex; align-items: center; white-space: nowrap; height: 20px; border-radius: 3px; font-size: 12px; line-height: 1.2; padding-left: 5px; padding-right: 5px; color: rgba(55, 53, 47, 0.65); margin-right: 5px;">C#<svg viewBox="0 0 30 30" class="chevronDown" style="width: 10px; height: 100%; display: block; fill: rgba(55, 53, 47, 0.35); flex-shrink: 0; backface-visibility: hidden; margin-left: 4px;"><polygon points="15,17.4 4.8,7 2,9.8 15,23 28,9.8 25.2,7 "></polygon></svg></div></div><div style="background: white; padding-right: 105px;"></div></div></div></div>
// `;

const RenderPage = () => (
  <div className={styles.container}>
    <DocumentHead />

    <div>
      <h2>ThoCode.com</h2>
      <img src='/image.fe1500615beccc2187c31c43cd72dac3.png' alt='Drop us an email!' />

      <p>Ở đây để chia sẻ về những vấn đề thời sự nóng hổi trên cõi mạng mà những người dùng bàn phím để mưu sinh quan tâm.</p>

      <p>Code gì nào cũng được, miễn có lương thiện là được!</p>
    </div>
  </div>
)

export default RenderPage
