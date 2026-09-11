// Builds dist/index.html from the real source (index.html) by obfuscating
// its inline <script> block. Source stays plain and readable for editing;
// only the built output (what actually gets deployed) is obfuscated.
'use strict';
const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const SRC = path.join(__dirname, 'index.html');
const OUT_DIR = path.join(__dirname, 'dist');
const OUT = path.join(OUT_DIR, 'index.html');

const html = fs.readFileSync(SRC, 'utf8');

const scriptRe = /<script>([\s\S]*?)<\/script>/;
const match = html.match(scriptRe);
if (!match) {
  console.error('build.js: no <script>...</script> block found in index.html');
  process.exit(1);
}
const source = match[1];

// debugProtection/selfDefending are deliberately OFF: this tool needs to be
// debuggable in the browser devtools console (by us, troubleshooting live
// BLE traffic against real hardware) -- this is obfuscation against casual
// "view source" reading, not anti-tamper against the person running it.
const result = JavaScriptObfuscator.obfuscate(source, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.3,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.9,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  debugProtection: false,
  selfDefending: false,
  disableConsoleOutput: false,
  numbersToExpressions: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  transformObjectKeys: true,
  simplify: true,
});

const obfuscated = result.getObfuscatedCode();
const outHtml = html.replace(scriptRe, `<script>${obfuscated}</script>`);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, outHtml, 'utf8');

console.log(`build.js: wrote ${OUT} (${outHtml.length} bytes, source script ${source.length} -> ${obfuscated.length} bytes)`);
