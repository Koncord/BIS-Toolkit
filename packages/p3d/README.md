# @bis-toolkit/p3d

A library for reading P3D model files (MLOD) used in Bohemia Interactive games (Arma, DayZ).

## Features

- **MLOD Reader**: Parse editable P3D model files (.p3d, .mlod)
- Full TypeScript support with type definitions
- Zero dependencies (except for shared BIS Toolkit utilities)

## Installation

```bash
npm install @bis-toolkit/p3d
```

## Usage

### MLOD (Editable P3D Format)

```typescript
import { Mlod } from '@bis-toolkit/p3d';

const buffer = new Uint8Array(/* your file data */);
const mlod = Mlod.fromBuffer(buffer);

// Access LODs
mlod.lods.forEach(lod => {
  console.log(`LOD: ${lod.resolutionName}`);
  console.log(`Vertices: ${lod.vertices.length}`);
  console.log(`Faces: ${lod.faces.length}`);
});
```

## License

GPLv3 © Alpine Labs - see [LICENSE](LICENSE).
