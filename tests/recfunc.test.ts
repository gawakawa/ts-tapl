import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std/assert/mod.ts';

import { Term, Type, typecheck } from '../src/recfunc.ts';

// Basic boolean and number tests
Deno.test('typecheck boolean literals', () => {
  assertEquals(typecheck({ tag: 'true' as const }, {}), { tag: 'Boolean' });
  assertEquals(typecheck({ tag: 'false' as const }, {}), { tag: 'Boolean' });
});

Deno.test('typecheck number literals', () => {
  assertEquals(typecheck({ tag: 'number' as const, n: 42 }, {}), {
    tag: 'Number',
  });
});

Deno.test('typecheck addition', () => {
  const term: Term = {
    tag: 'add',
    left: { tag: 'number', n: 1 },
    right: { tag: 'number', n: 2 },
  };
  assertEquals(typecheck(term, {}), { tag: 'Number' });
});

Deno.test('typecheck if-then-else with same branch types', () => {
  const term: Term = {
    tag: 'if',
    cond: { tag: 'true' },
    thn: { tag: 'number', n: 1 },
    els: { tag: 'number', n: 2 },
  };
  assertEquals(typecheck(term, {}), { tag: 'Number' });
});

Deno.test('typecheck if-then-else with boolean branches', () => {
  const term: Term = {
    tag: 'if',
    cond: { tag: 'true' },
    thn: { tag: 'true' },
    els: { tag: 'false' },
  };
  assertEquals(typecheck(term, {}), { tag: 'Boolean' });
});

Deno.test('typecheck throws on non-boolean condition', () => {
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

// Variable tests
Deno.test('typecheck variables', () => {
  const term: Term = { tag: 'var', name: 'x' };
  const tyEnv = { x: { tag: 'Number' as const } };
  assertEquals(typecheck(term, tyEnv), { tag: 'Number' });
});

Deno.test('typecheck throws on unknown variable', () => {
  const term: Term = { tag: 'var', name: 'x' };
  assertThrows(
    () => typecheck(term, {}),
    Error,
    'unknown variable',
  );
});

// Function tests
Deno.test('typecheck function definition', () => {
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

// Sequence tests
Deno.test('typecheck sequence of expressions', () => {
  const term: Term = {
    tag: 'seq',
    body: { tag: 'number', n: 1 },
    rest: { tag: 'number', n: 2 },
  };

  assertEquals(typecheck(term, {}), { tag: 'Number' });
});

Deno.test('typecheck throws on invalid expression in seq body', () => {
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

// Const tests
Deno.test('typecheck const declaration', () => {
  const term: Term = {
    tag: 'const',
    name: 'x',
    init: { tag: 'number', n: 1 },
    rest: { tag: 'var', name: 'x' },
  };

  assertEquals(typecheck(term, {}), { tag: 'Number' });
});

Deno.test('typecheck throws on invalid expression in const initialization', () => {
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

Deno.test('typecheck throws on recursive function definition with const', () => {
  const term: Term = {
    tag: 'const',
    name: 'fact',
    init: {
      tag: 'func',
      params: [{ name: 'n', type: { tag: 'Number' } }],
      body: {
        tag: 'call',
        func: { tag: 'var', name: 'fact' },
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
  const term: Term = {
    tag: 'const',
    name: 'y',
    init: { tag: 'var', name: 'x' },
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

// Object tests
Deno.test('typecheck objectNew with multiple properties', () => {
  const term: Term = {
    tag: 'objectNew',
    props: [
      { name: 'foo', term: { tag: 'number', n: 1 } },
      { name: 'bar', term: { tag: 'true' } },
    ],
  };

  const expectedType: Type = {
    tag: 'Object',
    props: [
      { name: 'foo', type: { tag: 'Number' } },
      { name: 'bar', type: { tag: 'Boolean' } },
    ],
  };

  assertEquals(typecheck(term, {}), expectedType);
});

Deno.test('typecheck objectNew with nested object', () => {
  const term: Term = {
    tag: 'objectNew',
    props: [
      {
        name: 'outer',
        term: {
          tag: 'objectNew',
          props: [
            { name: 'inner', term: { tag: 'number', n: 42 } },
          ],
        },
      },
    ],
  };

  const expectedType: Type = {
    tag: 'Object',
    props: [
      {
        name: 'outer',
        type: {
          tag: 'Object',
          props: [
            { name: 'inner', type: { tag: 'Number' } },
          ],
        },
      },
    ],
  };

  assertEquals(typecheck(term, {}), expectedType);
});

Deno.test('typecheck objectGet property access', () => {
  const term: Term = {
    tag: 'objectGet',
    obj: {
      tag: 'objectNew',
      props: [
        { name: 'foo', term: { tag: 'number', n: 1 } },
        { name: 'bar', term: { tag: 'true' } },
      ],
    },
    propName: 'foo',
  };

  assertEquals(typecheck(term, {}), { tag: 'Number' });
});

Deno.test('typecheck objectGet with variable', () => {
  const term: Term = {
    tag: 'const',
    name: 'obj',
    init: {
      tag: 'objectNew',
      props: [
        { name: 'foo', term: { tag: 'number', n: 1 } },
        { name: 'bar', term: { tag: 'true' } },
      ],
    },
    rest: {
      tag: 'objectGet',
      obj: { tag: 'var', name: 'obj' },
      propName: 'bar',
    },
  };

  assertEquals(typecheck(term, {}), { tag: 'Boolean' });
});

Deno.test('typecheck throws on access to non-existent property', () => {
  const term: Term = {
    tag: 'objectGet',
    obj: {
      tag: 'objectNew',
      props: [
        { name: 'foo', term: { tag: 'number', n: 1 } },
      ],
    },
    propName: 'bar',
  };

  assertThrows(
    () => typecheck(term, {}),
    Error,
    'unknown property name',
  );
});

Deno.test('typecheck throws on property access from non-object', () => {
  const term: Term = {
    tag: 'objectGet',
    obj: { tag: 'number', n: 42 },
    propName: 'foo',
  };

  assertThrows(
    () => typecheck(term, {}),
    Error,
    'object type expected',
  );
});

Deno.test('typecheck nested property access', () => {
  const term: Term = {
    tag: 'objectGet',
    obj: {
      tag: 'objectGet',
      obj: {
        tag: 'objectNew',
        props: [
          {
            name: 'outer',
            term: {
              tag: 'objectNew',
              props: [
                { name: 'inner', term: { tag: 'number', n: 42 } },
              ],
            },
          },
        ],
      },
      propName: 'outer',
    },
    propName: 'inner',
  };

  assertEquals(typecheck(term, {}), { tag: 'Number' });
});

Deno.test('current implementation does not support subtyping with function parameters', () => {
  const funcTerm: Term = {
    tag: 'func',
    params: [{
      name: 'point',
      type: {
        tag: 'Object',
        props: [
          { name: 'x', type: { tag: 'Number' } },
        ],
      },
    }],
    body: {
      tag: 'objectGet',
      obj: { tag: 'var', name: 'point' },
      propName: 'x',
    },
  };

  const callTerm: Term = {
    tag: 'call',
    func: funcTerm,
    args: [{
      tag: 'objectNew',
      props: [
        { name: 'x', term: { tag: 'number', n: 10 } },
        { name: 'y', term: { tag: 'true' } },
      ],
    }],
  };

  assertThrows(
    () => typecheck(callTerm, {}),
    Error,
    'parameter type mismatch',
  );
});

// Recursive function tests
Deno.test('typecheck recursive function calling itself', () => {
  const term: Term = {
    tag: 'recFunc',
    funcName: 'f',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    retType: { tag: 'Number' },
    body: {
      tag: 'call',
      func: { tag: 'var', name: 'f' },
      args: [{ tag: 'var', name: 'x' }],
    },
    rest: { tag: 'var', name: 'f' },
  };

  const expectedType: Type = {
    tag: 'Func',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    retType: { tag: 'Number' },
  };

  assertEquals(typecheck(term, {}), expectedType);
});

Deno.test('typecheck simple recursive identity function', () => {
  const term: Term = {
    tag: 'recFunc',
    funcName: 'id',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    retType: { tag: 'Number' },
    body: { tag: 'var', name: 'x' },
    rest: {
      tag: 'call',
      func: { tag: 'var', name: 'id' },
      args: [{ tag: 'number', n: 42 }],
    },
  };

  assertEquals(typecheck(term, {}), { tag: 'Number' });
});

Deno.test('typecheck recursive function with conditional self-call', () => {
  const term: Term = {
    tag: 'recFunc',
    funcName: 'countdown',
    params: [{ name: 'n', type: { tag: 'Number' } }],
    retType: { tag: 'Number' },
    body: {
      tag: 'if',
      cond: { tag: 'true' },
      thn: {
        tag: 'call',
        func: { tag: 'var', name: 'countdown' },
        args: [{ tag: 'var', name: 'n' }],
      },
      els: { tag: 'number', n: 0 },
    },
    rest: {
      tag: 'call',
      func: { tag: 'var', name: 'countdown' },
      args: [{ tag: 'number', n: 5 }],
    },
  };

  assertEquals(typecheck(term, {}), { tag: 'Number' });
});

Deno.test('typecheck throws on wrong return type in recursive function', () => {
  const term: Term = {
    tag: 'recFunc',
    funcName: 'bad',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    retType: { tag: 'Boolean' },
    body: { tag: 'var', name: 'x' },
    rest: { tag: 'var', name: 'bad' },
  };

  assertThrows(
    () => typecheck(term, {}),
    Error,
    'wrong return type',
  );
});

Deno.test('typecheck recursive function with multiple parameters', () => {
  const term: Term = {
    tag: 'recFunc',
    funcName: 'add',
    params: [
      { name: 'x', type: { tag: 'Number' } },
      { name: 'y', type: { tag: 'Number' } },
    ],
    retType: { tag: 'Number' },
    body: {
      tag: 'call',
      func: { tag: 'var', name: 'add' },
      args: [{ tag: 'var', name: 'y' }, { tag: 'var', name: 'x' }],
    },
    rest: { tag: 'var', name: 'add' },
  };

  const expectedType: Type = {
    tag: 'Func',
    params: [
      { name: 'x', type: { tag: 'Number' } },
      { name: 'y', type: { tag: 'Number' } },
    ],
    retType: { tag: 'Number' },
  };

  assertEquals(typecheck(term, {}), expectedType);
});

Deno.test('typecheck throws on wrong parameter types in recursive call', () => {
  const term: Term = {
    tag: 'recFunc',
    funcName: 'f',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    retType: { tag: 'Number' },
    body: {
      tag: 'call',
      func: { tag: 'var', name: 'f' },
      args: [{ tag: 'true' }],
    },
    rest: { tag: 'var', name: 'f' },
  };

  assertThrows(
    () => typecheck(term, {}),
    Error,
    'parameter type mismatch',
  );
});

Deno.test('typecheck recursive function accessing outer variables', () => {
  const term: Term = {
    tag: 'const',
    name: 'base',
    init: { tag: 'number', n: 10 },
    rest: {
      tag: 'recFunc',
      funcName: 'addBase',
      params: [{ name: 'x', type: { tag: 'Number' } }],
      retType: { tag: 'Number' },
      body: {
        tag: 'add',
        left: { tag: 'var', name: 'x' },
        right: { tag: 'var', name: 'base' },
      },
      rest: { tag: 'var', name: 'addBase' },
    },
  };

  const expectedType: Type = {
    tag: 'Func',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    retType: { tag: 'Number' },
  };

  assertEquals(typecheck(term, {}), expectedType);
});

Deno.test('typecheck throws on parameter reference outside function scope', () => {
  const term: Term = {
    tag: 'recFunc',
    funcName: 'f',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    retType: { tag: 'Number' },
    body: { tag: 'var', name: 'x' },
    rest: { tag: 'var', name: 'x' },
  };

  assertThrows(
    () => typecheck(term, {}),
    Error,
    'unknown variable',
  );
});
