import {
  assertEquals,
  assertThrows,
} from 'https://deno.land/std/assert/mod.ts';

import { Term, Type, typecheck } from '../src/sub.ts';

// Subtyping tests
Deno.test('subtyping allows object with extra properties in function call', () => {
  // const f = (x: { foo: number }) => x.foo;
  // const x = { foo: 1, bar: true };
  // f(x);
  const term: Term = {
    tag: 'const',
    name: 'f',
    init: {
      tag: 'func',
      params: [{
        name: 'x',
        type: {
          tag: 'Object',
          props: [
            { name: 'foo', type: { tag: 'Number' } },
          ],
        },
      }],
      body: {
        tag: 'objectGet',
        obj: { tag: 'var', name: 'x' },
        propName: 'foo',
      },
    },
    rest: {
      tag: 'const',
      name: 'x',
      init: {
        tag: 'objectNew',
        props: [
          { name: 'foo', term: { tag: 'number', n: 1 } },
          { name: 'bar', term: { tag: 'true' } },
        ],
      },
      rest: {
        tag: 'call',
        func: { tag: 'var', name: 'f' },
        args: [{ tag: 'var', name: 'x' }],
      },
    },
  };

  assertEquals(typecheck(term, {}), { tag: 'Number' });
});

Deno.test('subtyping fails with incompatible function return types', () => {
  // type F = () => { foo: number; bar: boolean };
  // const f = (x: F) => x().bar;
  // const g = () => ({ foo: 1 });
  // f(g);
  const term: Term = {
    tag: 'const',
    name: 'f',
    init: {
      tag: 'func',
      params: [{
        name: 'x',
        type: {
          tag: 'Func',
          params: [],
          retType: {
            tag: 'Object',
            props: [
              { name: 'foo', type: { tag: 'Number' } },
              { name: 'bar', type: { tag: 'Boolean' } },
            ],
          },
        },
      }],
      body: {
        tag: 'objectGet',
        obj: {
          tag: 'call',
          func: { tag: 'var', name: 'x' },
          args: [],
        },
        propName: 'bar',
      },
    },
    rest: {
      tag: 'const',
      name: 'g',
      init: {
        tag: 'func',
        params: [],
        body: {
          tag: 'objectNew',
          props: [
            { name: 'foo', term: { tag: 'number', n: 1 } },
          ],
        },
      },
      rest: {
        tag: 'call',
        func: { tag: 'var', name: 'f' },
        args: [{ tag: 'var', name: 'g' }],
      },
    },
  };

  assertThrows(
    () => typecheck(term, {}),
    Error,
    'parameter type mismatch',
  );
});

Deno.test('subtyping allows function with compatible parameter types', () => {
  const fTerm: Term = {
    tag: 'func',
    params: [{
      name: 'x',
      type: {
        tag: 'Object',
        props: [
          { name: 'foo', type: { tag: 'Number' } },
          { name: 'bar', type: { tag: 'Boolean' } },
        ],
      },
    }],
    body: { tag: 'var', name: 'x' },
  };

  const callTerm: Term = {
    tag: 'call',
    func: fTerm,
    args: [{
      tag: 'objectNew',
      props: [
        { name: 'foo', term: { tag: 'number', n: 1 } },
        { name: 'bar', term: { tag: 'true' } },
        { name: 'baz', term: { tag: 'number', n: 2 } },
      ],
    }],
  };

  const expectedType: Type = {
    tag: 'Object',
    props: [
      { name: 'foo', type: { tag: 'Number' } },
      { name: 'bar', type: { tag: 'Boolean' } },
    ],
  };

  assertEquals(typecheck(callTerm, {}), expectedType);
});

Deno.test('subtyping fails when required property is missing', () => {
  const fTerm: Term = {
    tag: 'func',
    params: [{
      name: 'x',
      type: {
        tag: 'Object',
        props: [
          { name: 'foo', type: { tag: 'Number' } },
          { name: 'bar', type: { tag: 'Boolean' } },
        ],
      },
    }],
    body: { tag: 'var', name: 'x' },
  };

  const callTerm: Term = {
    tag: 'call',
    func: fTerm,
    args: [{
      tag: 'objectNew',
      props: [
        { name: 'foo', term: { tag: 'number', n: 1 } },
      ],
    }],
  };

  assertThrows(
    () => typecheck(callTerm, {}),
    Error,
    'parameter type mismatch',
  );
});

Deno.test('subtyping fails when property types are incompatible', () => {
  const fTerm: Term = {
    tag: 'func',
    params: [{
      name: 'x',
      type: {
        tag: 'Object',
        props: [
          { name: 'foo', type: { tag: 'Number' } },
        ],
      },
    }],
    body: { tag: 'var', name: 'x' },
  };

  const callTerm: Term = {
    tag: 'call',
    func: fTerm,
    args: [{
      tag: 'objectNew',
      props: [
        { name: 'foo', term: { tag: 'true' } },
      ],
    }],
  };

  assertThrows(
    () => typecheck(callTerm, {}),
    Error,
    'parameter type mismatch',
  );
});

Deno.test('subtyping with function contravariance in parameters', () => {
  const fTerm: Term = {
    tag: 'func',
    params: [{
      name: 'callback',
      type: {
        tag: 'Func',
        params: [{
          name: 'x',
          type: {
            tag: 'Object',
            props: [
              { name: 'foo', type: { tag: 'Number' } },
              { name: 'bar', type: { tag: 'Boolean' } },
            ],
          },
        }],
        retType: { tag: 'Number' },
      },
    }],
    body: {
      tag: 'call',
      func: { tag: 'var', name: 'callback' },
      args: [{
        tag: 'objectNew',
        props: [
          { name: 'foo', term: { tag: 'number', n: 1 } },
          { name: 'bar', term: { tag: 'true' } },
        ],
      }],
    },
  };

  const gTerm: Term = {
    tag: 'func',
    params: [{
      name: 'x',
      type: {
        tag: 'Object',
        props: [
          { name: 'foo', type: { tag: 'Number' } },
        ],
      },
    }],
    body: {
      tag: 'objectGet',
      obj: { tag: 'var', name: 'x' },
      propName: 'foo',
    },
  };

  const callTerm: Term = {
    tag: 'call',
    func: fTerm,
    args: [gTerm],
  };

  assertEquals(typecheck(callTerm, {}), { tag: 'Number' });
});

Deno.test('subtyping basic type equivalence', () => {
  const numberTerm: Term = { tag: 'number', n: 42 };
  const booleanTerm: Term = { tag: 'true' };

  assertEquals(typecheck(numberTerm, {}), { tag: 'Number' });
  assertEquals(typecheck(booleanTerm, {}), { tag: 'Boolean' });
});

Deno.test('subtyping object structural typing', () => {
  const objTerm: Term = {
    tag: 'objectNew',
    props: [
      { name: 'x', term: { tag: 'number', n: 1 } },
      { name: 'y', term: { tag: 'number', n: 2 } },
    ],
  };

  const expectedType: Type = {
    tag: 'Object',
    props: [
      { name: 'x', type: { tag: 'Number' } },
      { name: 'y', type: { tag: 'Number' } },
    ],
  };

  assertEquals(typecheck(objTerm, {}), expectedType);
});

Deno.test('console.log example 1 - object with extra properties', () => {
  // const f = (x: { foo: number }) => x.foo;
  // const x = { foo: 1, bar: true };
  // f(x);
  const term: Term = {
    tag: 'const',
    name: 'f',
    init: {
      tag: 'func',
      params: [{
        name: 'x',
        type: {
          tag: 'Object',
          props: [
            { name: 'foo', type: { tag: 'Number' } },
          ],
        },
      }],
      body: {
        tag: 'objectGet',
        obj: { tag: 'var', name: 'x' },
        propName: 'foo',
      },
    },
    rest: {
      tag: 'const',
      name: 'x',
      init: {
        tag: 'objectNew',
        props: [
          { name: 'foo', term: { tag: 'number', n: 1 } },
          { name: 'bar', term: { tag: 'true' } },
        ],
      },
      rest: {
        tag: 'call',
        func: { tag: 'var', name: 'f' },
        args: [{ tag: 'var', name: 'x' }],
      },
    },
  };

  assertEquals(typecheck(term, {}), { tag: 'Number' });
});

Deno.test('console.log example 2 - function subtyping failure', () => {
  // type F = () => { foo: number; bar: boolean };
  // const f = (x: F) => x().bar;
  // const g = () => ({ foo: 1 });
  // f(g);
  const term: Term = {
    tag: 'const',
    name: 'f',
    init: {
      tag: 'func',
      params: [{
        name: 'x',
        type: {
          tag: 'Func',
          params: [],
          retType: {
            tag: 'Object',
            props: [
              { name: 'foo', type: { tag: 'Number' } },
              { name: 'bar', type: { tag: 'Boolean' } },
            ],
          },
        },
      }],
      body: {
        tag: 'objectGet',
        obj: {
          tag: 'call',
          func: { tag: 'var', name: 'x' },
          args: [],
        },
        propName: 'bar',
      },
    },
    rest: {
      tag: 'const',
      name: 'g',
      init: {
        tag: 'func',
        params: [],
        body: {
          tag: 'objectNew',
          props: [
            { name: 'foo', term: { tag: 'number', n: 1 } },
          ],
        },
      },
      rest: {
        tag: 'call',
        func: { tag: 'var', name: 'f' },
        args: [{ tag: 'var', name: 'g' }],
      },
    },
  };

  assertThrows(
    () => typecheck(term, {}),
    Error,
    'parameter type mismatch',
  );
});
