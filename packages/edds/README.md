````markdown
# @bis-toolkit/edds

Library for reading EDDS (DayZ compressed DDS) files and obtaining RGBA pixel data for previews or further processing.

Part of the [BIS Toolkit TypeScript](../../README.md) monorepo.

## Features

- Parse EDDS containers (DDS header + LZ4/COPY mip blocks)
- Validate headers and mip sizes
- Decode BC1/BC2/BC3 and RGBA/BGRA mipmaps to RGBA buffers
- Small, dependency-light build (custom LZ4 block decoder)
- Works in Node.js and browsers (ESM build bundled for the demo)

## Install

```bash
npm install @bis-toolkit/edds
```

## Quick Start

```typescript
import { Edds } from '@bis-toolkit/edds';
import * as fs from 'fs';

const buffer = fs.readFileSync('texture.edds');
const edds = new Edds();
edds.read(buffer);

console.log(`Format: ${edds.formatName}`);
console.log(`Mipmaps: ${edds.mipmaps.length}`);

// Get RGBA pixels for the top mip level
const rgba = edds.getRgbaPixelData(0);
console.log(`First pixel RGBA: ${Array.from(rgba.slice(0, 4))}`);
```

### Supported output formats

- BC1 / DXT1 -> RGBA
- BC2 / DXT3/2 -> RGBA
- BC3 / DXT5/4 -> RGBA
- RGBA8 / BGRA8 -> RGBA

## LICENSE

GPLv3 © Alpine Labs - see [LICENSE](LICENSE).
