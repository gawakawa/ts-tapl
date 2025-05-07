import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std/assert/mod.ts';

import { Term, Type, typecheck } from '../src/basic.ts';

Deno.test('typecheck boolean literals', () => {
  // true
  assertEquals(typecheck({ tag: 'true' as const }, {}), { tag: 'Boolean' });
  // false
  assertEquals(typecheck({ tag: 'false' as const }, {}), { tag: 'Boolean' });
});

Deno.test('typecheck number literals', () => {
  // 42
  assertEquals(typecheck({ tag: 'number' as const, n: 42 }, {}), {
    tag: 'Number',
  });
});

Deno.test('typecheck addition', () => {
  // 1 + 2
  const term: Term = {
    tag: 'add',
    left: { tag: 'number', n: 1 },
    right: { tag: 'number', n: 2 },
  };
  assertEquals(typecheck(term, {}), { tag: 'Number' });
});

Deno.test('typecheck if-then-else with same branch types', () => {
  // if true then 1 else 2
  const term: Term = {
    tag: 'if',
    cond: { tag: 'true' },
    thn: { tag: 'number', n: 1 },
    els: { tag: 'number', n: 2 },
  };
  assertEquals(typecheck(term, {}), { tag: 'Number' });
});

Deno.test('typecheck if-then-else with boolean branches', () => {
  // if true then true else false
  const term: Term = {
    tag: 'if',
    cond: { tag: 'true' },
    thn: { tag: 'true' },
    els: { tag: 'false' },
  };
  assertEquals(typecheck(term, {}), { tag: 'Boolean' });
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
    () => typecheck(term, {}),
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
    () => typecheck(term, {}),
    'then and else have different types',
  );
});

Deno.test('typecheck variables', () => {
  // x => x (where x: number in env)
  const term: Term = { tag: 'var', name: 'x' };
  const tyEnv = { x: { tag: 'Number' as const } };
  assertEquals(typecheck(term, tyEnv), { tag: 'Number' });
});

Deno.test('typecheck throws on unknown variable', () => {
  // x => error (where x is not in env)
  const term: Term = { tag: 'var', name: 'x' };
  assertThrows(
    () => typecheck(term, {}),
    Error,
    'unknown variable: x',
  );
});

Deno.test('typecheck function definition', () => {
  // (x: number) => x
  const term: Term = {
    tag: 'func',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    body: { tag: 'var', name: 'x' },
  };
  const expectedType: Type = {
    tag: 'Func',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    retType: { tag: 'Number' },
  };
  assertEquals(typecheck(term, {}), expectedType);
});

Deno.test('typecheck function call', () => {
  // ((x: number) => x)(42)
  const funcTerm: Term = {
    tag: 'func',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    body: { tag: 'var', name: 'x' },
  };

  const callTerm: Term = {
    tag: 'call',
    func: funcTerm,
    args: [{ tag: 'number', n: 42 }],
  };

  assertEquals(typecheck(callTerm, {}), { tag: 'Number' });
});

Deno.test('typecheck throws on function call with wrong argument type', () => {
  // ((x: number) => x)(true)
  const funcTerm: Term = {
    tag: 'func',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    body: { tag: 'var', name: 'x' },
  };

  const callTerm: Term = {
    tag: 'call',
    func: funcTerm,
    args: [{ tag: 'true' }],
  };

  assertThrows(
    () => typecheck(callTerm, {}),
    Error,
    'parameter type mismatch',
  );
});

Deno.test('typecheck throws on wrong number of arguments', () => {
  // ((x: number) => x)()
  const funcTerm: Term = {
    tag: 'func',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    body: { tag: 'var', name: 'x' },
  };

  const callTerm: Term = {
    tag: 'call',
    func: funcTerm,
    args: [],
  };

  assertThrows(
    () => typecheck(callTerm, {}),
    Error,
    'wrong number of arguments',
  );
});

Deno.test('typecheck function with multiple parameters', () => {
  // (x: number, y: boolean) => x
  const term: Term = {
    tag: 'func',
    params: [
      { name: 'x', type: { tag: 'Number' } },
      { name: 'y', type: { tag: 'Boolean' } },
    ],
    body: { tag: 'var', name: 'x' },
  };

  const expectedType: Type = {
    tag: 'Func',
    params: [
      { name: 'x', type: { tag: 'Number' } },
      { name: 'y', type: { tag: 'Boolean' } },
    ],
    retType: { tag: 'Number' },
  };

  assertEquals(typecheck(term, {}), expectedType);
});

Deno.test('typecheck throws on variable reference not in environment', () => {
  // ((x: number) => 1)(x)
  const funcTerm: Term = {
    tag: 'func',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    body: { tag: 'number', n: 1 },
  };

  const callTerm: Term = {
    tag: 'call',
    func: funcTerm,
    args: [{ tag: 'var', name: 'x' }],
  };

  assertThrows(
    () => typecheck(callTerm, {}),
    Error,
    'unknown variable: x',
  );
});
