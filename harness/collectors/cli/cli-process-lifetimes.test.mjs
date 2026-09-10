import test from 'node:test';
import assert from 'node:assert/strict';
import { recordProcessLifetime } from './cli-validator.mjs';

test('serial commands may receive a previously exited Windows PID', () => {
  const lifetimes = new Map();
  recordProcessLifetime(lifetimes, { pid: 66584, parentPid: 100, at: 1000 }, { at: 1100 });
  recordProcessLifetime(lifetimes, { pid: 66584, parentPid: 200, at: 1101 }, { at: 1500 });
  assert.equal(lifetimes.get(66584).length, 2);
});
for (const [name, start, end] of [
  ['overlapping lifetime', { pid: 66584, parentPid: 200, at: 1099 }, { at: 1500 }],
  ['replayed lifetime', { pid: 66584, parentPid: 100, at: 1000 }, { at: 1100 }],
  ['touching lifetime', { pid: 66584, parentPid: 200, at: 1100 }, { at: 1500 }],
  ['invalid parent', { pid: 700, parentPid: -1, at: 1101 }, { at: 1500 }],
  ['missing start time', { pid: 700, parentPid: 200 }, { at: 1500 }],
  ['missing exit time', { pid: 700, parentPid: 200, at: 1101 }, {}],
  ['fractional time', { pid: 700, parentPid: 200, at: 1101.5 }, { at: 1500 }],
  ['inverted time', { pid: 700, parentPid: 200, at: 1501 }, { at: 1500 }],
]) test(`${name} cannot masquerade as legitimate PID reuse`, () => {
  const lifetimes = new Map();
  recordProcessLifetime(lifetimes, { pid: 66584, parentPid: 100, at: 1000 }, { at: 1100 });
  assert.throws(() => recordProcessLifetime(lifetimes, start, end), /lifetime/);
  assert.equal(lifetimes.size, 1);
  assert.equal(lifetimes.get(66584).length, 1);
});
