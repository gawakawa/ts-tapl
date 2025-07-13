import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std/assert/mod.ts';
import { Term, Type, typecheck } from '../src/poly.ts';
import { parsePoly } from '../src/tiny-ts-parser.ts';

Deno.test('poly - typecheck boolean literals', () => {
  // true
  assertEquals(typecheck({ tag: 'true' }, {}, []), { tag: 'Boolean' });
  // false
  assertEquals(typecheck({ tag: 'false' }, {}, []), { tag: 'Boolean' });
});

Deno.test('poly - typecheck number literal', () => {
  // 42
  assertEquals(typecheck({ tag: 'number', n: 42 }, {}, []), { tag: 'Number' });
});

Deno.test('poly - typecheck addition', () => {
  // 1 + 2
  const addTerm: Term = {
    tag: 'add',
    left: { tag: 'number', n: 1 },
    right: { tag: 'number', n: 2 },
  };
  assertEquals(typecheck(addTerm, {}, []), { tag: 'Number' });
});

Deno.test('poly - typecheck if expression', () => {
  // if true then 1 else 2
  const ifTerm: Term = {
    tag: 'if',
    cond: { tag: 'true' },
    thn: { tag: 'number', n: 1 },
    els: { tag: 'number', n: 2 },
  };
  assertEquals(typecheck(ifTerm, {}, []), { tag: 'Number' });
});

Deno.test('poly - typecheck variable', () => {
  // x (where x: Number in environment)
  const varTerm: Term = { tag: 'var', name: 'x' };
  const tyEnv = { x: { tag: 'Number' as const } };
  assertEquals(typecheck(varTerm, tyEnv, []), { tag: 'Number' });
});

Deno.test('poly - typecheck function definition', () => {
  // (x: Number) => x
  const funcTerm: Term = {
    tag: 'func',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    body: { tag: 'var', name: 'x' },
  };

  const expected: Type = {
    tag: 'Func',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    retType: { tag: 'Number' },
  };

  assertEquals(typecheck(funcTerm, {}, []), expected);
});

Deno.test('poly - typecheck function call', () => {
  // ((x: Number) => x)(42)
  const callTerm: Term = {
    tag: 'call',
    func: {
      tag: 'func',
      params: [{ name: 'x', type: { tag: 'Number' } }],
      body: { tag: 'var', name: 'x' },
    },
    args: [{ tag: 'number', n: 42 }],
  };
  assertEquals(typecheck(callTerm, {}, []), { tag: 'Number' });
});

Deno.test('poly - typecheck type abstraction', () => {
  // <T>(x: T) => x
  const typeAbsTerm: Term = {
    tag: 'typeAbs',
    typeParams: ['T'],
    body: {
      tag: 'func',
      params: [{ name: 'x', type: { tag: 'TypeVar', name: 'T' } }],
      body: { tag: 'var', name: 'x' },
    },
  };

  const expected: Type = {
    tag: 'TypeAbs',
    typeParams: ['T'],
    type: {
      tag: 'Func',
      params: [{ name: 'x', type: { tag: 'TypeVar', name: 'T' } }],
      retType: { tag: 'TypeVar', name: 'T' },
    },
  };

  assertEquals(typecheck(typeAbsTerm, {}, []), expected);
});

Deno.test('poly - typecheck type application', () => {
  // (<T>(x: T) => x)<Number>
  const typeAppTerm: Term = {
    tag: 'typeApp',
    typeAbs: {
      tag: 'typeAbs',
      typeParams: ['T'],
      body: {
        tag: 'func',
        params: [{ name: 'x', type: { tag: 'TypeVar', name: 'T' } }],
        body: { tag: 'var', name: 'x' },
      },
    },
    typeArgs: [{ tag: 'Number' }],
  };

  const expected: Type = {
    tag: 'Func',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    retType: { tag: 'Number' },
  };

  assertEquals(typecheck(typeAppTerm, {}, []), expected);
});

Deno.test('poly - typecheck sequence expression', () => {
  // 1; 2
  const seqTerm: Term = {
    tag: 'seq',
    body: { tag: 'number', n: 1 },
    rest: { tag: 'number', n: 2 },
  };
  assertEquals(typecheck(seqTerm, {}, []), { tag: 'Number' });
});

Deno.test('poly - typecheck const declaration', () => {
  // const x = 42; x
  const constTerm: Term = {
    tag: 'const',
    name: 'x',
    init: { tag: 'number', n: 42 },
    rest: { tag: 'var', name: 'x' },
  };
  assertEquals(typecheck(constTerm, {}, []), { tag: 'Number' });
});

Deno.test('poly - console.log example 1: identity function', () => {
  // const f = <T>(x:T) => x; f;
  const result = typecheck(
    parsePoly(`
      const f = <T>(x:T) => x;
      f;
    `),
    {},
    [],
  );

  const expected: Type = {
    tag: 'TypeAbs',
    typeParams: ['T'],
    type: {
      tag: 'Func',
      params: [{ name: 'x', type: { tag: 'TypeVar', name: 'T' } }],
      retType: { tag: 'TypeVar', name: 'T' },
    },
  };

  assertEquals(result, expected);
});

Deno.test('poly - console.log example 2: type application of identity', () => {
  // const f = <T>(x: T) => x; f<number>;
  const result = typecheck(
    parsePoly(`
      const f = <T>(x: T) => x;
      f<number>;
    `),
    {},
    [],
  );

  const expected: Type = {
    tag: 'Func',
    params: [{ name: 'x', type: { tag: 'Number' } }],
    retType: { tag: 'Number' },
  };

  assertEquals(result, expected);
});

Deno.test('poly - console.log example 3: select function specialization', () => {
  // const select = <T>(cond: boolean, a: T, b: T) => (cond ? a : b); const selectBoolean = select<boolean>; selectBoolean;
  const result = typecheck(
    parsePoly(`
      const select = <T>(cond: boolean, a: T, b: T) => (cond ? a : b);
      const selectBoolean = select<boolean>;
      selectBoolean;
    `),
    {},
    [],
  );

  const expected: Type = {
    tag: 'Func',
    params: [
      { name: 'cond', type: { tag: 'Boolean' } },
      { name: 'a', type: { tag: 'Boolean' } },
      { name: 'b', type: { tag: 'Boolean' } },
    ],
    retType: { tag: 'Boolean' },
  };

  assertEquals(result, expected);
});

Deno.test('poly - console.log example 4: function with nested type abstraction parameter', () => {
  // const foo = <T>(arg1: T, arg2: <T>(x: T) => boolean) => true; foo<number>;
  const result = typecheck(
    parsePoly(`
      const foo = <T>(arg1: T, arg2: <T>(x: T) => boolean) => true;
      foo<number>;
    `),
    {},
    [],
  );

  const expected: Type = {
    tag: 'Func',
    params: [
      { name: 'arg1', type: { tag: 'Number' } },
      {
        name: 'arg2',
        type: {
          tag: 'TypeAbs',
          typeParams: ['T'],
          type: {
            tag: 'Func',
            params: [{ name: 'x', type: { tag: 'TypeVar', name: 'T' } }],
            retType: { tag: 'Boolean' },
          },
        },
      },
    ],
    retType: { tag: 'Boolean' },
  };

  assertEquals(result, expected);
});

Deno.test('poly - console.log example 5: complex nested type abstractions', () => {
  // const foo = <T>(arg1: T, arg2: <U>(x: T, y: U) => boolean) => true; const bar = <U>() => foo<U>; bar;
  const result = typecheck(
    parsePoly(`
      const foo = <T>(arg1: T, arg2: <U>(x: T, y: U) => boolean) => true;
      const bar = <U>() => foo<U>;
      bar;
    `),
    {},
    [],
  );

  const expected: Type = {
    tag: 'TypeAbs',
    typeParams: ['U'],
    type: {
      tag: 'Func',
      params: [],
      retType: {
        tag: 'Func',
        params: [
          { name: 'arg1', type: { tag: 'TypeVar', name: 'U' } },
          {
            name: 'arg2',
            type: {
              tag: 'TypeAbs',
              typeParams: ['U@2'],
              type: {
                tag: 'Func',
                params: [
                  { name: 'x', type: { tag: 'TypeVar', name: 'U' } },
                  { name: 'y', type: { tag: 'TypeVar', name: 'U@2' } },
                ],
                retType: { tag: 'Boolean' },
              },
            },
          },
        ],
        retType: { tag: 'Boolean' },
      },
    },
  };

  assertEquals(result, expected);
});

Deno.test('poly - typecheck throws on non-boolean condition', () => {
  // if 1 then 2 else 3
  assertThrows(() => {
    typecheck(
      {
        tag: 'if',
        cond: { tag: 'number', n: 1 },
        thn: { tag: 'number', n: 2 },
        els: { tag: 'number', n: 3 },
      },
      {},
      [],
    );
  });
});

Deno.test('poly - typecheck throws on different branch types', () => {
  // if true then 1 else false
  assertThrows(() => {
    typecheck(
      {
        tag: 'if',
        cond: { tag: 'true' },
        thn: { tag: 'number', n: 1 },
        els: { tag: 'false' },
      },
      {},
      [],
    );
  });
});

Deno.test('poly - typecheck throws on non-number in addition', () => {
  // true + 1
  assertThrows(() => {
    typecheck(
      {
        tag: 'add',
        left: { tag: 'true' },
        right: { tag: 'number', n: 1 },
      },
      {},
      [],
    );
  });
});

Deno.test('poly - typecheck throws on unknown variable', () => {
  // unknown
  assertThrows(() => {
    typecheck({ tag: 'var', name: 'unknown' }, {}, []);
  });
});

Deno.test('poly - typecheck throws on calling non-function', () => {
  // 42()
  assertThrows(() => {
    typecheck(
      {
        tag: 'call',
        func: { tag: 'number', n: 42 },
        args: [],
      },
      {},
      [],
    );
  });
});

Deno.test('poly - typecheck throws on wrong number of arguments', () => {
  // ((x: Number) => x)()
  assertThrows(() => {
    typecheck(
      {
        tag: 'call',
        func: {
          tag: 'func',
          params: [{ name: 'x', type: { tag: 'Number' } }],
          body: { tag: 'var', name: 'x' },
        },
        args: [],
      },
      {},
      [],
    );
  });
});

Deno.test('poly - typecheck throws on parameter type mismatch', () => {
  // ((x: Number) => x)(true)
  assertThrows(() => {
    typecheck(
      {
        tag: 'call',
        func: {
          tag: 'func',
          params: [{ name: 'x', type: { tag: 'Number' } }],
          body: { tag: 'var', name: 'x' },
        },
        args: [{ tag: 'true' }],
      },
      {},
      [],
    );
  });
});

Deno.test('poly - typecheck throws on type application to non-type-abstraction', () => {
  // 42<Number>
  assertThrows(() => {
    typecheck(
      {
        tag: 'typeApp',
        typeAbs: { tag: 'number', n: 42 },
        typeArgs: [{ tag: 'Number' }],
      },
      {},
      [],
    );
  });
});

Deno.test('poly - typecheck throws on wrong number of type arguments', () => {
  // (<T>(x: T) => x)<>
  assertThrows(() => {
    typecheck(
      {
        tag: 'typeApp',
        typeAbs: {
          tag: 'typeAbs',
          typeParams: ['T'],
          body: {
            tag: 'func',
            params: [{ name: 'x', type: { tag: 'TypeVar', name: 'T' } }],
            body: { tag: 'var', name: 'x' },
          },
        },
        typeArgs: [],
      },
      {},
      [],
    );
  });
});

Deno.test('poly - typecheck multiple type parameters', () => {
  // <T, U>(x: T, y: U) => x
  const result = typecheck(
    parsePoly(`<T, U>(x: T, y: U) => x`),
    {},
    [],
  );

  const expected: Type = {
    tag: 'TypeAbs',
    typeParams: ['T', 'U'],
    type: {
      tag: 'Func',
      params: [
        { name: 'x', type: { tag: 'TypeVar', name: 'T' } },
        { name: 'y', type: { tag: 'TypeVar', name: 'U' } },
      ],
      retType: { tag: 'TypeVar', name: 'T' },
    },
  };

  assertEquals(result, expected);
});

Deno.test('poly - typecheck nested type abstractions', () => {
  // <T>() => <U>(x: T, y: U) => x
  const result = typecheck(
    parsePoly(`<T>() => <U>(x: T, y: U) => x`),
    {},
    [],
  );

  const expected: Type = {
    tag: 'TypeAbs',
    typeParams: ['T'],
    type: {
      tag: 'Func',
      params: [],
      retType: {
        tag: 'TypeAbs',
        typeParams: ['U'],
        type: {
          tag: 'Func',
          params: [
            { name: 'x', type: { tag: 'TypeVar', name: 'T' } },
            { name: 'y', type: { tag: 'TypeVar', name: 'U' } },
          ],
          retType: { tag: 'TypeVar', name: 'T' },
        },
      },
    },
  };

  assertEquals(result, expected);
});
