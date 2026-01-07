# @bis-toolkit/paa

A library for reading PAA (Real Virtuality texture format) files.

Part of the [BIS Toolkit TypeScript](../../README.md) monorepo.

## Features

- Read PAA files
- Support for multiple texture formats (DXT1-5, RGBA variants, AI88)
- Mipmap handling
- Channel swizzling
- Compression support (LZSS, LZO)
- Format conversion utilities

## Installation

```bash
npm install @bis-toolkit/paa
```

## Usage

```typescript
import { Paa } from '@bis-toolkit/paa';
import * as fs from 'fs';

// Read a PAA file
const buffer = fs.readFileSync('texture.paa');
const paa = new Paa();
paa.read(buffer);

// Get RGBA pixel data
const pixelData = paa.getArgb32PixelData(buffer, 0); // mipLevel 0

// Access properties
console.log(`Type: ${paa.type}`);
console.log(`Mipmaps: ${paa.mipmaps.length}`);
console.log(`Has Alpha: ${paa.isAlpha}`);
```

## Supported Formats

- DXT1, DXT2, DXT3, DXT4, DXT5
- RGBA_5551
- RGBA_4444
- RGBA_8888
- AI88

## API

### Reading PAA Files

```typescript
import { Paa } from 'bis-toolkit/paa';
import * as fs from 'fs';

const buffer = fs.readFileSync('texture.paa');
const paa = new Paa();
paa.read(buffer);

// Get pixel data for specific mipmap level
const pixelData = paa.getArgb32PixelData(buffer, 0);

// Access mipmap information
for (let i = 0; i < paa.mipmaps.length; i++) {
    const mip = paa.mipmaps[i];
    console.log(`Mipmap ${i}: ${mip.width}x${mip.height}`);
}
```

### Channel Swizzling

```typescript
import { RgbaSwizzle, ChannelSwizzle, ChannelSwizzler } from '@bis-toolkit/paa';

// Define custom channel mapping
const swizzle = new RgbaSwizzle();
swizzle.swizRed = ChannelSwizzle.Blue;
swizzle.swizBlue = ChannelSwizzle.Red;
swizzle.swizGreen = ChannelSwizzle.Green;
swizzle.swizAlpha = ChannelSwizzle.One; // Force alpha to 255

// Apply to RGBA data
ChannelSwizzler.apply(rgbaData, swizzle);
```

## License

GPLv3 © Alpine Labs - see [LICENSE](LICENSE).
