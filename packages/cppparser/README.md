# @bis-toolkit/cppparser

Parser for Arma/DayZ `config.cpp` and RVMat files.

Part of the [BIS Toolkit TypeScript](../../README.md) monorepo.

## Features
- Lex + parse Arma config syntax (variables, arrays, enums, classes, prototypes, deletes)
- Simple preprocessor supporting `#define`, `#ifdef`/`#ifndef`, `#include` (only for node.js)
- Produces a typed AST for further processing
- RVMat file parsing (material definitions)

## Installation

```bash
npm install @bis-toolkit/cppparser
```

From the monorepo root for development:

```bash
npm install
npm run build
```

## Usage

Parse an already-loaded string:

```typescript
import { Parser } from '@bis-toolkit/cppparser';

const source = 'class MyClass { value = 42; };';
const ast = new Parser(source, 'inline').parse();
console.log(ast.statements.length);
```

Preprocess and parse a `config.cpp` from disk:

```typescript
import { Parser, Preprocessor } from '@bis-toolkit/cppparser';
import { join } from 'path';

const configPath = join(process.cwd(), 'config.cpp');
const pre = new Preprocessor();
const text = pre.preprocess(configPath);
const ast = new Parser(text, configPath).parse();
console.log(`Statements: ${ast.statements.length}`);
```

## License

GPLv3 © Alpine Labs - see [LICENSE](LICENSE).
