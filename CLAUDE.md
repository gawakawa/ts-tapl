# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is a TypeScript implementation of various type systems and language
features following the concepts from "Types and Programming Languages" (TAPL).
The project implements progressively complex type checkers:

- `arith.ts`: Basic arithmetic and boolean expressions with conditionals
- `basic.ts`: Functions with parameters, variables, sequential execution, and
  constant binding
- `obj.ts`: Object creation and property access
- `recfunc.ts`: Recursive functions
- `sub.ts`: Subtyping for functions and objects

Each module has a corresponding AST type system with `Term` and `Type`
definitions, plus a `typecheck` function that performs static type checking.

## Development Commands

### Testing

- Run all tests: `deno task test`
- Alternative: `deno test --allow-env --allow-sys=cpus --allow-net` Do not run
  `deno test` without flags.

### Code Formatting

- Format code: `deno fmt` (uses settings from deno.jsonc)

### Linting

- Lint: `deno lint`

### Running Individual Modules

- Execute any module directly: `deno run -A src/arith.ts`

## Architecture

### Core Components

1. **Parser Integration**: Each module uses `tiny-ts-parser.ts` for parsing
   source code into ASTs
2. **Type System**: Tagged union types for both `Term` (expressions) and `Type`
   (type annotations)
3. **Type Checking**: Recursive descent type checker with environment passing
   for variable scoping
4. **Error Handling**: Uses `error()` function from parser for source location
   reporting

### Type System Evolution

The type systems build upon each other:

- `arith.ts`: Boolean and Number types only
- `basic.ts`: Adds function types with parameter lists and return types
- `obj.ts`: Adds object types with property type checking
- `recfunc.ts`: Adds recursive function definitions
- `sub.ts`: Adds subtyping with contravariant parameters and covariant return
  types

### Key Patterns

- All AST nodes use tagged unions with `tag` field for discrimination
- Type environments (`TypeEnv`) are plain objects mapping variable names to
  types
- Type equality checking (`typeEq`) handles structural comparison of complex
  types
- Subtyping (`subtype`) implements contravariant function parameters and
  covariant return types
- Each module includes example usage with `console.log` statements

## Testing Strategy

Tests use Deno's built-in testing framework with assertions from
`https://deno.land/std/assert/mod.ts`. Test files follow the pattern
`moduleName.test.ts` and cover both positive and negative cases for type
checking.
