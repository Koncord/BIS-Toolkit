# @bis-toolkit/anm

ANM (Enfusion Animation Format) reader DayZ.

## Features

- Read ANIMSET5 and ANIMSET6 animation formats
- Support for bone animations (translation, rotation, scale)
- Animation events parsing
- FPS metadata

## Installation

```bash
npm install @bis-toolkit/anm
```

## Usage

```typescript
import { AnimationEntity, BoneAnimation, AnimEvent } from '@bis-toolkit/anm';
import { BinaryReader } from '@bis-toolkit/utils';
import { readFileSync } from 'fs';

// Read an animation file
const buffer = readFileSync('animation.anm');
const reader = new BinaryReader(buffer);
const animation = new AnimationEntity();
animation.read(reader);

// Access animation data
console.log('FPS:', animation.fps?.fps);
console.log('Bones:', animation.head?.bones.length);

// Create a new animation
const newAnim = new AnimationEntity();
const boneData: Record<string, BoneAnimation> = {
    'Bone1': {
        frameCount: 100,
        translations: new Map([[0, { x: 0, y: 0, z: 0 }]]),
        rotations: new Map([[0, { x: 0, y: 0, z: 0, w: 1 }]]),
        scales: new Map([[0, { x: 1, y: 1, z: 1 }]])
    }
};
const events: AnimEvent[] = [];
newAnim.create(boneData, events, 30);
```

## License

GPL-3.0-or-later
