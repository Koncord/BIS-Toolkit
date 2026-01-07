import { BinaryReader } from '@bis-toolkit/utils';
import { Face } from './Face';
import { Vector3 } from './Vector3';
import {
    type AnimationTagg,
    type EndOfFileTagg,
    type LockTagg,
    type MassTagg,
    type NamedSelectionTagg,
    type PropertyTagg,
    type SelectedTagg,
    type SharpEdgesTagg,
    type Tagg,
    type UVSetTagg
} from './Tagg';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class TaggReader {
    static readTaggs(reader: BinaryReader, verticesLength: number, faces: Face[]): Tagg[] {
        const taggSignature = reader.readString(4);
        if (taggSignature !== 'TAGG') {
            throw new Error('TAGG section expected');
        }

        const taggs: Tagg[] = [];
        while (reader.pos < reader.length) {
            const isActive = reader.readBoolean();
            if (!isActive) {
                throw new Error('Deactivated TAGG encountered');
            }

            const taggName = reader.readCString();
            const tagg = this.readTaggByName(reader, taggName, verticesLength, faces);
            taggs.push(tagg);

            if (tagg.name === '#EndOfFile#') {
                break;
            }
        }

        return taggs;
    }

    private static readTaggByName(reader: BinaryReader, taggName: string, verticesLength: number, faces: Face[]): Tagg {
        switch (taggName) {
            case '#Animation#':
                return this.readAnimationTagg(reader);
            case '#Lock#':
                return this.readLockTagg(reader, verticesLength, faces.length);
            case '#Mass#':
                return this.readMassTagg(reader);
            case '#Property#':
                return this.readPropertyTagg(reader);
            case '#Selected#':
                return this.readSelectedTagg(reader, verticesLength, faces.length);
            case '#SharpEdges#':
                return this.readSharpEdgesTagg(reader);
            case '#UVSet#':
                return this.readUvSetTagg(reader, faces);
            case '#EndOfFile#':
                return this.readEndOfFileTagg(reader);
            default:
                return this.readNamedSelectionTagg(reader, taggName, verticesLength, faces.length);
        }
    }

    private static readAnimationTagg(reader: BinaryReader): AnimationTagg {
        const dataSize = reader.readUInt32();
        const endPos = reader.pos + dataSize;

        const frameTime = reader.readFloat();
        const remainingBytes = endPos - reader.pos;
        const frameCount = Math.max(0, Math.floor(remainingBytes / 12));
        const framePoints: Vector3[] = new Array<Vector3>(frameCount);

        for (let i = 0; i < frameCount; i++) {
            framePoints[i] = Vector3.fromReader(reader);
        }

        this.ensureSectionEnd(reader, endPos, '#Animation#');
        return { kind: 'Animation', name: '#Animation#', frameTime, framePoints };
    }

    private static readLockTagg(reader: BinaryReader, verticesLength: number, facesLength: number): LockTagg {
        const dataSize = reader.readUInt32();
        const endPos = reader.pos + dataSize;

        const lockedPoints = new Array<boolean>(verticesLength);
        for (let i = 0; i < verticesLength; i++) {
            lockedPoints[i] = reader.readBoolean();
        }

        const lockedFaces = new Array<boolean>(facesLength);
        for (let i = 0; i < facesLength; i++) {
            lockedFaces[i] = reader.readBoolean();
        }

        this.ensureSectionEnd(reader, endPos, '#Lock#');
        return { kind: 'Lock', name: '#Lock#', lockedPoints, lockedFaces };
    }

    private static readMassTagg(reader: BinaryReader): MassTagg {
        const dataSize = reader.readUInt32();
        const endPos = reader.pos + dataSize;
        const entryCount = Math.max(0, Math.floor(dataSize / 4));
        const mass = new Array<number>(entryCount);

        for (let i = 0; i < entryCount; i++) {
            mass[i] = reader.readFloat();
        }

        this.ensureSectionEnd(reader, endPos, '#Mass#');
        return { kind: 'Mass', name: '#Mass#', mass };
    }

    private static readPropertyTagg(reader: BinaryReader): PropertyTagg {
        const dataSize = reader.readUInt32();
        if (dataSize !== 128) {
            throw new Error(`Unexpected #Property# data size: ${dataSize}`);
        }

        const endPos = reader.pos + dataSize;
        const propName = this.readFixedString(reader, 64);
        const propValue = this.readFixedString(reader, 64);

        this.ensureSectionEnd(reader, endPos, '#Property#');
        return { kind: 'Property', name: '#Property#', propName, propValue };
    }

    private static readSelectedTagg(reader: BinaryReader, verticesLength: number, facesLength: number): SelectedTagg {
        const dataSize = reader.readUInt32();
        const endPos = reader.pos + dataSize;

        const weightedPoints = reader.readBytes(verticesLength);
        const faces = new Array<boolean>(facesLength);
        for (let i = 0; i < facesLength; i++) {
            faces[i] = reader.readBoolean();
        }

        this.ensureSectionEnd(reader, endPos, '#Selected#');
        return { kind: 'Selected', name: '#Selected#', weightedPoints, faces };
    }

    private static readSharpEdgesTagg(reader: BinaryReader): SharpEdgesTagg {
        const dataSize = reader.readUInt32();
        const endPos = reader.pos + dataSize;
        const pairCount = Math.max(0, Math.floor(dataSize / 8));
        const pointIndices = new Array<[number, number]>(pairCount);

        for (let i = 0; i < pairCount; i++) {
            pointIndices[i] = [reader.readUInt32(), reader.readUInt32()];
        }

        this.ensureSectionEnd(reader, endPos, '#SharpEdges#');
        return { kind: 'SharpEdges', name: '#SharpEdges#', pointIndices };
    }

    private static readUvSetTagg(reader: BinaryReader, faces: Face[]): UVSetTagg {
        const dataSize = reader.readUInt32();
        const endPos = reader.pos + dataSize;
        const uvSetNr = reader.readUInt32();

        const faceUVs = new Array<[number, number][]>(faces.length);
        for (let faceIdx = 0; faceIdx < faces.length; faceIdx++) {
            const vertexCount = faces[faceIdx].sidesCnt;
            const uvs = new Array<[number, number]>(vertexCount);
            for (let uvIdx = 0; uvIdx < vertexCount; uvIdx++) {
                uvs[uvIdx] = [reader.readFloat(), reader.readFloat()];
            }
            faceUVs[faceIdx] = uvs;
        }

        this.ensureSectionEnd(reader, endPos, '#UVSet#');
        return { kind: 'UVSet', name: '#UVSet#', uvSetNr, faceUVs };
    }

    private static readNamedSelectionTagg(reader: BinaryReader, taggName: string, verticesLength: number, facesLength: number): NamedSelectionTagg {
        const dataSize = reader.readUInt32();
        const endPos = reader.pos + dataSize;

        const points = new Array<boolean>(verticesLength);
        for (let i = 0; i < verticesLength; i++) {
            points[i] = reader.readBoolean();
        }

        const faces = new Array<boolean>(facesLength);
        for (let i = 0; i < facesLength; i++) {
            faces[i] = reader.readBoolean();
        }

        this.ensureSectionEnd(reader, endPos, taggName);
        return { kind: 'NamedSelection', name: taggName, points, faces };
    }

    private static readEndOfFileTagg(reader: BinaryReader): EndOfFileTagg {
        const dataSize = reader.readUInt32();
        const endPos = reader.pos + dataSize;
        this.ensureSectionEnd(reader, endPos, '#EndOfFile#');
        return { kind: 'EndOfFile', name: '#EndOfFile#' };
    }

    private static readFixedString(reader: BinaryReader, length: number): string {
        const raw = reader.readRawString(length);
        const nullIndex = raw.indexOf('\0');
        return nullIndex >= 0 ? raw.slice(0, nullIndex) : raw;
    }

    private static ensureSectionEnd(reader: BinaryReader, expectedEnd: number, taggName: string): void {
        if (reader.pos !== expectedEnd) {
            throw new Error(`TAGG ${taggName} length mismatch (expected end ${expectedEnd}, actual ${reader.pos})`);
        }
    }
}
