import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std/assert/mod.ts';

import { Term, typecheck } from './arith.ts';

Deno.test('typecheck boolean literals', () => {
  // true
  assertEquals(typecheck({ tag: 'true' as const }), { tag: 'Boolean' });
  // false
  assertEquals(typecheck({ tag: 'false' as const }), { tag: 'Boolean' });
});

Deno.test('typecheck number literals', () => {
  // 42
  assertEquals(typecheck({ tag: 'number' as const, n: 42 }), { tag: 'Number' });
});

Deno.test('typecheck addition', () => {
  // 1 + 2
  const term: Term = {
    tag: 'add',
    left: { tag: 'number', n: 1 },
    right: { tag: 'number', n: 2 },
  };
  assertEquals(typecheck(term), { tag: 'Number' });
});

Deno.test('typecheck if-then-else with same branch types', () => {
  // if true then 1 else 2
  const term: Term = {
    tag: 'if',
    cond: { tag: 'true' },
    thn: { tag: 'number', n: 1 },
    els: { tag: 'number', n: 2 },
  };
  assertEquals(typecheck(term), { tag: 'Number' });
});

Deno.test('typecheck if-then-else with boolean branches', () => {
  // if true then true else false
  const term: Term = {
    tag: 'if',
    cond: { tag: 'true' },
    thn: { tag: 'true' },
    els: { tag: 'false' },
  };
  assertEquals(typecheck(term), { tag: 'Boolean' });
});

Deno.test('typecheck throws on non-boolean condition', () => {
  // if 1 then 2 else 3
  const term: Term = {
    tag: 'if',
    cond: { tag: 'number', n: 1 },
    thn: { tag: 'number', n: 2 },
    els: { tag: 'number', n: 3 },
  };
  assertThrows(
    () => typecheck(term),
    'boolean expected',
  );
});

Deno.test('typecheck throws on different branch types', () => {
  // if true then 1 else false
  const term: Term = {
    tag: 'if',
    cond: { tag: 'true' },
    thn: { tag: 'number', n: 1 },
    els: { tag: 'false' },
  };
  assertThrows(
    () => typecheck(term),
    'then and else have different types',
  );
});

Deno.test('typecheck throws on non-number in add left', () => {
  // true + 1
  const term: Term = {
    tag: 'add',
    left: { tag: 'true' },
    right: { tag: 'number', n: 1 },
  };
  assertThrows(
    () => typecheck(term),
    'number expected',
  );
});

Deno.test('typecheck throws on non-number in add right', () => {
  // 1 + false
  const term: Term = {
    tag: 'add',
    left: { tag: 'number', n: 1 },
    right: { tag: 'false' },
  };
  assertThrows(
    () => typecheck(term),
    'number expected',
  );
});

Deno.test('typecheck with nested expressions', () => {
  // (if true then 1 else 2) + 3
  const term: Term = {
    tag: 'add',
    left: {
      tag: 'if',
      cond: { tag: 'true' },
      thn: { tag: 'number', n: 1 },
      els: { tag: 'number', n: 2 },
    },
    right: { tag: 'number', n: 3 },
  };
  assertEquals(typecheck(term), { tag: 'Number' });
});
