const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const source = fs.readFileSync('src/utils/noteGroups.ts', 'utf8');
const mod = new Module('noteGroups');
mod._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, 'noteGroups.js');

test('note detail uses the same grouping as the ranking, including empty notes', () => {
  const { noteGroupName } = mod.exports;
  assert.equal(noteGroupName('午饭'), '午饭');
  assert.equal(noteGroupName(''), '无备注');
  assert.equal(noteGroupName(null), '无备注');
  assert.equal(noteGroupName('无备注'), '无备注');
});
