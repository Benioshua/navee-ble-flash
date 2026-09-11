// Sanity-checks dist/index.html's OBFUSCATED script against known-answer
// tests before it's allowed to deploy. Catches obfuscation miscompiles
// (control-flow flattening / string encoding corrupting logic) that would
// otherwise only surface as a silent failure against real hardware.
'use strict';
const fs = require('fs');
const path = require('path');

function makeStub() {
  const fn = function () { return makeStub(); };
  return new Proxy(fn, {
    get(t, prop) {
      if (prop === 'then' || typeof prop === 'symbol') return undefined;
      if (!(prop in t)) t[prop] = makeStub();
      return t[prop];
    },
    set(t, prop, v) { t[prop] = v; return true; },
    apply() { return makeStub(); },
  });
}

// Node 21+ ships its own read-only `navigator`/`crypto` globals (Web
// platform compat) that plain assignment can't overwrite -- defineProperty
// forces our stub in regardless.
function setGlobal(name, value) {
  Object.defineProperty(global, name, { value, writable: true, configurable: true });
}

const documentStub = makeStub();
documentStub.getElementById = () => makeStub();
documentStub.querySelectorAll = () => [];
documentStub.querySelector = () => makeStub();
documentStub.createElement = () => makeStub();
documentStub.addEventListener = () => {};
setGlobal('document', documentStub);
const windowStub = makeStub();
windowStub.setTimeout = setTimeout;
windowStub.clearTimeout = clearTimeout;
windowStub.setInterval = setInterval;
windowStub.clearInterval = clearInterval;
windowStub.console = console;
setGlobal('window', windowStub);
setGlobal('navigator', makeStub());
setGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
setGlobal('WebSocket', function () { return makeStub(); });
setGlobal('crypto', { getRandomValues: (a) => a });
setGlobal('btoa', (s) => Buffer.from(s, 'binary').toString('base64'));
setGlobal('atob', (s) => Buffer.from(s, 'base64').toString('binary'));
setGlobal('confirm', () => true);
global.alert = () => {};
global.requestAnimationFrame = (f) => setTimeout(f, 0);

const distPath = path.join(__dirname, 'dist', 'index.html');
const html = fs.readFileSync(distPath, 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (!match) { console.error('verify-build.js: no <script> found in dist/index.html'); process.exit(1); }

const tmp = path.join(__dirname, 'dist', '_verify_tmp.js');
fs.writeFileSync(tmp, match[1], 'utf8');

let mod;
try {
  mod = require(tmp);
} catch (e) {
  console.error('verify-build.js: obfuscated script threw on load:', e);
  process.exit(1);
} finally {
  fs.unlinkSync(tmp);
}

const failures = [];

if (typeof mod.selftestAes !== 'function') failures.push('selftestAes not exported');
else if (!mod.selftestAes()) failures.push('selftestAes() returned false -- AES-128 known-answer test failed');

if (typeof mod.crc16Xmodem !== 'function') failures.push('crc16Xmodem not exported');
else {
  const bytes = Array.from(Buffer.from('123456789', 'ascii'));
  const crc = mod.crc16Xmodem(bytes);
  if (crc !== 0x31c3) failures.push(`crc16Xmodem("123456789") = 0x${crc.toString(16)}, expected 0x31c3 (standard test vector)`);
}

if (typeof mod.buildBlePacket !== 'function' || typeof mod.parseFrame !== 'function') {
  failures.push('buildBlePacket/parseFrame not exported');
} else {
  const cmd = 0x30;
  const payload = new Uint8Array([0x09, 0x00, 0x88, 0, 0, 0, 0, 0, 0]);
  const pkt = mod.buildBlePacket(cmd, payload);
  let expectedSum = 0;
  for (let i = 0; i < 5 + payload.length; i++) expectedSum += pkt[i];
  expectedSum &= 0xFF;
  if (pkt[0] !== 0x55 || pkt[1] !== 0xAA) failures.push('buildBlePacket: bad magic bytes');
  if (pkt[3] !== cmd) failures.push('buildBlePacket: cmd byte corrupted');
  if (pkt[4] !== payload.length) failures.push('buildBlePacket: length byte corrupted');
  if (pkt[5 + payload.length] !== expectedSum) failures.push(`buildBlePacket: checksum = 0x${pkt[5+payload.length].toString(16)}, expected 0x${expectedSum.toString(16)}`);
  if (pkt[5 + payload.length + 1] !== 0xFE || pkt[5 + payload.length + 2] !== 0xFD) failures.push('buildBlePacket: trailer bytes corrupted');

  const parsed = mod.parseFrame(pkt);
  if (parsed.type !== 'navee' || parsed.cmd !== cmd) failures.push('parseFrame: round-trip cmd mismatch');
  else if (Buffer.from(parsed.payload).toString('hex') !== Buffer.from(payload).toString('hex')) failures.push('parseFrame: round-trip payload mismatch');
}

if (typeof mod.AES_KEYS === 'undefined' || !Array.isArray(mod.AES_KEYS) || mod.AES_KEYS.length !== 5) {
  failures.push('AES_KEYS not exported or wrong length (expected 5 entries)');
}

if (failures.length) {
  console.error('verify-build.js: FAILED\n  - ' + failures.join('\n  - '));
  process.exit(1);
}
console.log('verify-build.js: all checks passed on obfuscated dist/index.html');
