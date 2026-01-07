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
    faces: boolean[];
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
    points: boolean[];
    faces: boolean[];
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
export function getSelectedIndices(boolArray: boolean[]): number[] {
    const indices: number[] = [];
    for (let i = 0; i < boolArray.length; i++) {
        if (boolArray[i]) {
            indices.push(i);
        }
    }
    return indices;
}
