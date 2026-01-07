# @bis-toolkit/bcn

Block Compression (BC1-BC5, BC7) texture decoders for TypeScript.

## Features

- **BC1 (DXT1)**: RGB/RGBA compression with 1-bit alpha
- **BC2 (DXT3)**: RGBA compression with explicit alpha
- **BC3 (DXT5)**: RGBA compression with interpolated alpha
- **BC4**: Single channel compression
- **BC5**: Two channel compression (normal maps)
- **BC6H**: HDR compression _(not yet implemented - complex 14-mode HDR format)_
- **BC7**: High quality RGBA compression

## Installation

```bash
npm install @bis-toolkit/bcn
```

## Usage

```typescript
import { decodeBC1, decodeBC3, decodeBC7 } from '@bis-toolkit/bcn';

// Decode BC7 compressed data
const rgba = decodeBC7(compressedData, width, height);

// Decode BC1 (DXT1)
const rgba = decodeBC1(compressedData, width, height);

// Decode BC3 (DXT5)
const rgba = decodeBC3(compressedData, width, height);
```

All decoders return a `Uint8Array` containing RGBA data (4 bytes per pixel).

## API

### decodeBC1(data: DataView, width: number, height: number, useAlpha?: boolean): Uint8Array
### decodeBC2(data: DataView, width: number, height: number): Uint8Array
### decodeBC3(data: DataView, width: number, height: number): Uint8Array
### decodeBC4(data: DataView, width: number, height: number, channel?: 'r' | 'g' | 'b' | 'a'): Uint8Array
### decodeBC5(data: DataView, width: number, height: number, channel1?: 'r' | 'g' | 'b' | 'a', channel2?: 'r' | 'g' | 'b' | 'a'): Uint8Array
### decodeBC7(data: DataView, width: number, height: number): Uint8Array

**Note:** BC6H (HDR) decoder is not yet implemented due to its complexity (14 modes with signed/unsigned variants).

## Attribution

This library is a direct TypeScript port of [BCnEncoder.NET](https://github.com/Nominom/BCnEncoder.NET), originally created by Nominom and licensed under the MIT License.

```
Copyright © 2025 Nominom
Licensed under the MIT License
```

## License

GPLv3 © Alpine Labs - see [LICENSE](LICENSE).

This work is derived from BCnEncoder.NET (MIT License) and is redistributed under GPLv3.

