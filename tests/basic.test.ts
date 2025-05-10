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
    'unknown variable',
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
    'unknown variable',
  );
});

Deno.test('typecheck sequence of expressions', () => {
  // 1; 2
  const term: Term = {
    tag: 'seq',
    body: { tag: 'number', n: 1 },
    rest: { tag: 'number', n: 2 },
  };

  assertEquals(typecheck(term, {}), { tag: 'Number' });
});

Deno.test('typecheck throws on invalid expression in seq body', () => {
  // add(1, true); 2
  const term: Term = {
    tag: 'seq',
    body: {
      tag: 'add',
      left: { tag: 'number', n: 1 },
      right: { tag: 'true' },
    },
    rest: { tag: 'number', n: 2 },
  };

  assertThrows(
    () => typecheck(term, {}),
    Error,
    'number expected',
  );
});

Deno.test('typecheck const declaration', () => {
  // const x = 1; x
  const term: Term = {
    tag: 'const',
    name: 'x',
    init: { tag: 'number', n: 1 },
    rest: { tag: 'var', name: 'x' },
  };

  assertEquals(typecheck(term, {}), { tag: 'Number' });
});

Deno.test('typecheck throws on invalid expression in const initialization', () => {
  // const x = add(1, true); x
  const term: Term = {
    tag: 'const',
    name: 'x',
    init: {
      tag: 'add',
      left: { tag: 'number', n: 1 },
      right: { tag: 'true' },
    },
    rest: { tag: 'var', name: 'x' },
  };

  assertThrows(
    () => typecheck(term, {}),
    Error,
    'number expected',
  );
});

Deno.test('typecheck throws on reference to undefined variable in const body', () => {
  // const x = 1; y
  const term: Term = {
    tag: 'const',
    name: 'x',
    init: { tag: 'number', n: 1 },
    rest: { tag: 'var', name: 'y' },
  };

  assertThrows(
    () => typecheck(term, {}),
    Error,
    'unknown variable',
  );
});

Deno.test('typecheck allows variable shadowing in const declarations', () => {
  // const x = 1; const x = true; x
  const term: Term = {
    tag: 'const',
    name: 'x',
    init: { tag: 'number', n: 1 },
    rest: {
      tag: 'const',
      name: 'x',
      init: { tag: 'true' },
      rest: { tag: 'var', name: 'x' },
    },
  };

  assertEquals(typecheck(term, {}), { tag: 'Boolean' });
});

Deno.test('typecheck throws on recursive function definition', () => {
  // const fact = (n: number) => n === 0 ? 1 : n * fact(n - 1); fact(5)
  // Simplified here as just: const fact = (n: number) => fact(n); fact(5)
  const term: Term = {
    tag: 'const',
    name: 'fact',
    init: {
      tag: 'func',
      params: [{ name: 'n', type: { tag: 'Number' } }],
      body: {
        tag: 'call',
        func: { tag: 'var', name: 'fact' }, // Reference to 'fact' which is not yet defined in the scope
        args: [{ tag: 'var', name: 'n' }],
      },
    },
    rest: {
      tag: 'call',
      func: { tag: 'var', name: 'fact' },
      args: [{ tag: 'number', n: 5 }],
    },
  };

  assertThrows(
    () => typecheck(term, {}),
    Error,
    'unknown variable',
  );
});

Deno.test('typecheck throws on forward reference in const declarations', () => {
  // const y = x; const x = 1; y
  const term: Term = {
    tag: 'const',
    name: 'y',
    init: { tag: 'var', name: 'x' }, // Forward reference to 'x' which is not yet defined
    rest: {
      tag: 'const',
      name: 'x',
      init: { tag: 'number', n: 1 },
      rest: { tag: 'var', name: 'y' },
    },
  };

  assertThrows(
    () => typecheck(term, {}),
    Error,
    'unknown variable',
  );
});
