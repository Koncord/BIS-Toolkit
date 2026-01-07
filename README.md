# BIS Toolkit

TypeScript libraries for Bohemia Interactive game modding (Arma 3, DayZ).

## Structure

This is a monorepo containing the following packages:
- **[bis-toolkit](./packages/bis-toolkit)** - Complete BIS Toolkit library suite
- **[@bis-toolkit/bcn](./packages/bcn)** - BCn (BC1-BC5, BC7) block compression decoders
- **[@bis-toolkit/utils](./packages/utils)** - Shared utilities (binary I/O, decompression)
- **[@bis-toolkit/paa](./packages/paa)** - PAA texture format reader
- **[@bis-toolkit/edds](./packages/edds)** - EDDS texture format reader
- **[@bis-toolkit/cppparser](./packages/cppparser)** - CPP and RVMat config parser
- **[@bis-toolkit/p3d](./packages/p3d)** - P3D (MLOD/ODOL) model format reader

## Installation

```bash
npm install
npm run build
```

## Packages

### @bis-toolkit/utils

Shared utilities for all BIS Toolkit including binary I/O (BinaryReader/Writer) and decompression algorithms (LZ4, LZO, LZSS).

[Read more](./packages/utils/README.md)

### @bis-toolkit/paa

For reading PAA texture files.

[Read more](./packages/paa/README.md)

### @bis-toolkit/p3d

For reading P3D model files (MLOD and ODOL formats).

[Read more](./packages/p3d/README.md)

## Development

```bash
# Install dependencies for all packages
npm install

# Build all packages
npm run build

# Lint all packages
npm run lint

# Clean build artifacts
npm run clean
```

## License

GPLv3 © Alpine Labs - See [LICENSE](./LICENSE).
