# @bis-toolkit/alpine-libs

Complete Alpine Labs TypeScript library suite for DayZ game modding.

## Overview

This meta-package provides convenient access to all Alpine Labs libraries in a single dependency. Perfect for projects that need multiple BIS Toolkit.

## Installation

```bash
npm install @bis-toolkit/alpine-libs
```

## What's Included

- **@bis-toolkit/utils** - Binary I/O, decompression (LZO, LZSS)
- **@bis-toolkit/bcn** - Block compression codecs (BC1-BC5, BC7)
- **@bis-toolkit/paa** - PAA texture format reader
- **@bis-toolkit/edds** - EDDS texture format reader
- **@bis-toolkit/p3d** - P3D (MLOD/ODOL) model format reader
- **@bis-toolkit/cppparser** - ``config.cpp`` and RVMat parser

### Import Individual Packages

If you only need specific functionality, consider installing individual packages instead:

```bash
npm install @bis-toolkit/paa @bis-toolkit/bcn
```

## Documentation

See individual package READMEs for detailed usage:

- [PAA Documentation](../paa/README.md)
- [MLOD Documentation](../mlod/README.md)
- [ODOL Documentation](../odol/README.md)
- [EDDS Documentation](../edds/README.md)
- [BCN Documentation](../bcn/README.md)
- [Utils Documentation](../utils/README.md)
- [CppParser Documentation](../cppparser/README.md)

## License

GPLv3 © Alpine Labs - see [LICENSE](LICENSE).
