# @bis-toolkit/p3d

A library for reading P3D model files (MLOD and ODOL formats) used in Bohemia Interactive games (Arma, DayZ).

## Features

- **MLOD Reader**: Parse editable P3D model files (.p3d, .mlod)
- **ODOL Reader**: Parse binary P3D model files (binarized .p3d)
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

### ODOL (Binary P3D Format)

```typescript
import { Odol } from '@bis-toolkit/p3d';

const buffer = new Uint8Array(/* your file data */);
const odol = Odol.fromBuffer(buffer);

// Access model information
console.log(`Version: ${odol.version}`);
console.log(`LODs: ${odol.lods.length}`);

// Access LODs
odol.lods.forEach(lod => {
  console.log(`LOD: ${lod.resolutionName}`);
  console.log(`Vertices: ${lod.vertices.length}`);
  console.log(`Faces: ${lod.faces.length}`);
});
```

## License

GPLv3 © Alpine Labs - see [LICENSE](LICENSE).
