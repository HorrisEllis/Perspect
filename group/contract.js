'use strict';
/* group/contract.js — the interaction contract, loaded once and enforced. Every door (WebSocket, HTTP, CLI) calls
 * check(cmd, args) before the core runs anything, so nothing reaches the core that the contract does not describe.
 *   CONTRACT   the parsed contract.json          HASH   sha256 of it with keys sorted (the handshake compares it)
 *   check(cmd, args) → { ok, args } (unknown keys dropped is NOT done: an unknown key is an error) or { ok:false, code, message }
 *   hashOf(obj)      → the canonical hash of any contract object (the client computes the same) */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONTRACT = JSON.parse(fs.readFileSync(path.join(__dirname, 'contract.json'), 'utf8'));
const PERMISSIONS = Object.keys(CONTRACT.permissions);

function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
const hashOf = (obj) => crypto.createHash('sha256').update(canonical(obj)).digest('hex');
const HASH = hashOf(CONTRACT);

// one value against one field spec; returns an error message or null
function checkValue(name, v, spec) {
  const t = spec.type;
  if (t === 'string') {
    if (typeof v !== 'string') return name + ' must be a string';
    const len = [...v].length;
    if (spec.min != null && len < spec.min) return name + ' is too short (min ' + spec.min + ')';
    if (spec.max != null && len > spec.max) return name + ' is too long (max ' + spec.max + ')';
    const en = spec.enum === 'permissions' ? PERMISSIONS : spec.enum;
    if (en && !en.includes(v)) return name + ' must be one of ' + en.join(', ');
    if (spec.pattern && !new RegExp(spec.pattern, 'u').test(v)) return name + ' has characters it may not';
    return null;
  }
  if (t === 'int') {
    if (!Number.isInteger(v)) return name + ' must be a whole number';
    if (spec.min != null && v < spec.min) return name + ' is below ' + spec.min;
    if (spec.max != null && v > spec.max) return name + ' is above ' + spec.max;
    return null;
  }
  if (t === 'bool') return typeof v === 'boolean' ? null : name + ' must be true or false';
  if (t === 'array') {
    if (!Array.isArray(v)) return name + ' must be a list';
    if (spec.max != null && v.length > spec.max) return name + ' has too many items (max ' + spec.max + ')';
    for (let i = 0; i < v.length; i++) { const e = checkValue(name + '[' + i + ']', v[i], spec.of); if (e) return e; }
    return null;
  }
  if (t === 'object') {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return name + ' must be an object';
    return checkFields(name + '.', v, spec.fields || {});
  }
  return name + ' has a type the contract does not know (' + t + ')';
}
function checkFields(prefix, obj, fields) {
  for (const k of Object.keys(obj)) if (!fields[k]) return prefix + k + ' is not in the contract';
  for (const [k, spec] of Object.entries(fields)) {
    if (obj[k] === undefined || obj[k] === null) { if (spec.required) return prefix + k + ' is required'; continue; }
    const e = checkValue(prefix + k, obj[k], spec); if (e) return e;
  }
  return null;
}
function check(cmd, args) {
  const c = CONTRACT.commands[cmd];
  if (!c) return { ok: false, code: 'unknown_command', message: 'not in the contract: ' + cmd };
  if (args == null) args = {};
  if (typeof args !== 'object' || Array.isArray(args)) return { ok: false, code: 'bad_args', message: 'args must be an object' };
  const e = checkFields('', args, c.args || {});
  return e ? { ok: false, code: 'bad_args', message: e } : { ok: true, args, spec: c };
}

module.exports = { CONTRACT, HASH, VERSION: CONTRACT.version, PERMISSIONS, hashOf, canonical, check };
