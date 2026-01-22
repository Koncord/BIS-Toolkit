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
- **[@bis-toolkit/p3d](./packages/p3d)** - P3D (MLOD) model format reader

## Installation

```bash
npm install
npm run build
```

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
