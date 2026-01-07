// Main ODOL classes
export { Animation } from './Animation';
export { Animations } from './Animations';
export { Odol } from './Odol';
export { OdolLod } from './OdolLod';
export { ModelInfo } from './ModelInfo';
export { OdolReader } from './OdolReader';
export { getLodName } from '../shared/Resolution';

// Math structures
export {
    Vector3,
    Matrix3,
    Matrix4
} from './math';

export { PackedColor } from './PackedColor';

// Enums
export {
    ClipFlags,
    SpecialFlags,
    ShadowBufferSource,
    MapType,
    AnimationType
} from './enums';

// Structures
export {
    Face,
    Polygons,
    Section,
    NamedSelection,
    UVSet
} from './structures';

// Vertex table and related
export {
    AnimationRTPair,
    AnimationRTWeight,
    VertexNeighborInfo,
    STPair,
    VertexData
} from './VertexData';

// Auxiliary structures
export {
    Skeleton,
    ProxyObject,
    Keyframe,
    SubSkeletonIndexSet,
    LodMetadata
} from './auxiliaryStructures';

export {
    Color,
    EmbeddedMaterial,
    StageTexture,
    StageTransform
} from './Materials';
