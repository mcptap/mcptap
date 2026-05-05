import { describe, expect, test } from 'vitest';
import { applyMasks, serializeForSnapshot } from './snapshot.js';

describe('smart defaults', () => {
  test('masks UUID strings', () => {
    const input = { id: 'a3bb189e-8bf9-3888-9912-ace4e6543002', name: 'foo' };
    const out = applyMasks(input);
    expect(out).toEqual({ id: '<UUID>', name: 'foo' });
  });

  test('masks ISO 8601 timestamps', () => {
    const input = { created: '2026-05-05T10:47:36.052Z' };
    const out = applyMasks(input);
    expect(out).toEqual({ created: '<TIMESTAMP>' });
  });

  test('walks nested objects and arrays', () => {
    const input = {
      results: [
        { id: 'a3bb189e-8bf9-3888-9912-ace4e6543002', value: 1 },
        { id: 'a3bb189e-8bf9-3888-9912-ace4e6543003', value: 2 },
      ],
      ts: '2026-05-05T10:47:36Z',
    };
    const out = applyMasks(input);
    expect(out).toEqual({
      results: [
        { id: '<UUID>', value: 1 },
        { id: '<UUID>', value: 2 },
      ],
      ts: '<TIMESTAMP>',
    });
  });

  test('disabling smart defaults preserves dynamic values', () => {
    const input = { id: 'a3bb189e-8bf9-3888-9912-ace4e6543002' };
    const out = applyMasks(input, { smartDefaults: false });
    expect(out).toEqual(input);
  });
});

describe('path masking', () => {
  test('masks a single dot path', () => {
    const input = { a: { b: 'secret' }, c: 'visible' };
    const out = applyMasks(input, { paths: ['a.b'], smartDefaults: false });
    expect(out).toEqual({ a: { b: '<MASKED>' }, c: 'visible' });
  });

  test('wildcard masks every array element', () => {
    const input = { items: [{ id: 1 }, { id: 2 }, { id: 3 }] };
    const out = applyMasks(input, { paths: ['items.*.id'], smartDefaults: false });
    expect(out).toEqual({
      items: [{ id: '<MASKED>' }, { id: '<MASKED>' }, { id: '<MASKED>' }],
    });
  });

  test('wildcard masks every object key', () => {
    const input = { tokens: { a: 'aaa', b: 'bbb' } };
    const out = applyMasks(input, { paths: ['tokens.*'], smartDefaults: false });
    expect(out).toEqual({ tokens: { a: '<MASKED>', b: '<MASKED>' } });
  });

  test('non-existent path is a no-op', () => {
    const input = { a: 1 };
    const out = applyMasks(input, { paths: ['x.y.z'], smartDefaults: false });
    expect(out).toEqual({ a: 1 });
  });
});

describe('serializeForSnapshot', () => {
  test('produces stable, sorted-key, pretty-printed JSON', () => {
    const a = serializeForSnapshot({ b: 1, a: 2 });
    const b = serializeForSnapshot({ a: 2, b: 1 });
    expect(a).toEqual(b);
    expect(a).toEqual('{\n  "a": 2,\n  "b": 1\n}');
  });

  test('integrates smart defaults by default', () => {
    const out = serializeForSnapshot({ id: 'a3bb189e-8bf9-3888-9912-ace4e6543002' });
    expect(out).toContain('<UUID>');
  });

  test('user mask paths apply on top of smart defaults', () => {
    const out = serializeForSnapshot(
      {
        id: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
        token: 'sekrit',
      },
      { paths: ['token'] },
    );
    expect(out).toContain('<UUID>');
    expect(out).toContain('<MASKED>');
    expect(out).not.toContain('sekrit');
  });
});
