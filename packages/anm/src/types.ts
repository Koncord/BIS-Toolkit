/**
 * 3D Vector representation
 */
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

/**
 * Quaternion representation for rotations
 */
export interface Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
}

/**
 * Bone header information
 */
export interface BoneHead {
    name: string;
    translationBias: number;
    translationMultiplier: number;
    rotationBias: number;
    rotationMultiplier: number;
    scaleBias: number;
    scaleMultiplier: number;
    numFrames: number;
    translationFrameCount: number;
    rotationFrameCount: number;
    scaleFrameCount: number;
    flags: number;
}

/**
 * Bone animation data for a single bone
 */
export interface BoneAnimation {
    frameCount: number;
    translations?: Map<number, Vector3>;
    scales?: Map<number, Vector3>;
    rotations?: Map<number, Quaternion>;
}

/**
 * Animation event
 */
export interface AnimEvent {
    frame: number;
    name: string;
    unkValue1: string;
    unkValue2: number;
}
