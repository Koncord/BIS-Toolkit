import { Vector3 } from './Vector3';

export interface AnimationTagg {
    kind: 'Animation';
    name: '#Animation#';
    frameTime: number;
    framePoints: Vector3[];
}

export interface LockTagg {
    kind: 'Lock';
    name: '#Lock#';
    lockedPoints: boolean[];
    lockedFaces: boolean[];
}

export interface MassTagg {
    kind: 'Mass';
    name: '#Mass#';
    mass: number[];
}

export interface PropertyTagg {
    kind: 'Property';
    name: '#Property#';
    propName: string;
    propValue: string;
}

export interface SelectedTagg {
    kind: 'Selected';
    name: '#Selected#';
    weightedPoints: Uint8Array;
    faces: Uint8Array;
}

export interface SharpEdgesTagg {
    kind: 'SharpEdges';
    name: '#SharpEdges#';
    pointIndices: [number, number][];
}

export interface UVSetTagg {
    kind: 'UVSet';
    name: '#UVSet#';
    uvSetNr: number;
    faceUVs: [number, number][][];
}

export interface NamedSelectionTagg {
    kind: 'NamedSelection';
    name: string;
    points: Uint8Array;
    faces: Uint8Array;
}

export interface EndOfFileTagg {
    kind: 'EndOfFile';
    name: '#EndOfFile#';
}

export type Tagg =
    | AnimationTagg
    | LockTagg
    | MassTagg
    | PropertyTagg
    | SelectedTagg
    | SharpEdgesTagg
    | UVSetTagg
    | NamedSelectionTagg
    | EndOfFileTagg;

// Helper functions for working with tagged data
export function getSelectedIndices(arr: Uint8Array): number[] {
    const indices: number[] = [];
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] > 0) {
            indices.push(i);
        }
    }
    return indices;
}
