import { OdolReader } from './OdolReader';
import { SpecialFlags } from './enums';

/**
 * Face (polygon) in ODOL
 */
export class Face {
    public vertexIndices: number[] = [];
    public size: number = 0;

    static fromReader(reader: OdolReader): Face {
        const face = new Face();
        const vertexCount = reader.readByte();

        face.vertexIndices = new Array<number>(vertexCount);
        for (let i = 0; i < vertexCount; i++) {
            face.vertexIndices[i] = reader.readUInt16();
        }

        face.size = 1 + (vertexCount * 2);

        return face;
    }
}

/**
 * Collection of polygons
 */
export class Polygons {
    public faces: Face[] = [];
    public unk: number = 0;

    static fromReader(reader: OdolReader): Polygons {
        const polygons = new Polygons();

        const facesCount = reader.readInt32();
        const allocationSize = reader.readInt32();
        polygons.unk = reader.readUInt16();
        if (polygons.unk !== 0) {
            console.warn(`Polygons.unk expected to be 0, got: ${polygons.unk}`);
        }

        let size = 0;
        polygons.faces = new Array<Face>(facesCount);
        for (let i = 0; i < facesCount; i++) {
            polygons.faces[i] = Face.fromReader(reader);
            size += polygons.faces[i].size;
        }

        size += polygons.faces.length;

        if (size !== allocationSize) {
            console.warn(`Polygon allocation size mismatch: expected ${allocationSize}, got ${size}`);
        }

        return polygons;
    }
}

/**
 * Section (material/texture group)
 */
export class Section {
    public faceLowerIndex: number = 0;
    public faceUpperIndex: number = 0;
    public minBoneIndex: number = 0;
    public bonesCount: number = 0;
    public textureIndex: number = 0;
    public commonFaceFlags: SpecialFlags = SpecialFlags.None;
    public materialIndex: number = 0;
    public material: string = '';
    public areaOverTex: number[] = [];
    private unk1: number = 0;

    static fromReader(reader: OdolReader): Section {
        const section = new Section();
        section.faceLowerIndex = reader.readInt32();
        section.faceUpperIndex = reader.readInt32();
        section.minBoneIndex = reader.readInt32();
        section.bonesCount = reader.readInt32();
        section.unk1 = reader.readInt32();
        section.textureIndex = reader.readUInt16();
        section.commonFaceFlags = reader.readUInt32() as SpecialFlags;
        section.materialIndex = reader.readInt32();

        if (section.materialIndex === -1) {
            section.material = reader.readCString();
        }

        section.areaOverTex = reader.readArray(r => r.readFloat());
        return section;
    }

    getFaceIndexes(faces: Face[]): number[] {
        let curFaceOffset = 0;
        const faceStride = 8;
        const quadExtra = 2;
        const indexes: number[] = [];

        for (let index = 0; index < faces.length; index++) {
            if (curFaceOffset >= this.faceLowerIndex && curFaceOffset < this.faceUpperIndex) {
                indexes.push(index);
            }
            curFaceOffset += faceStride;
            if (faces[index].vertexIndices.length === 4) {
                curFaceOffset += quadExtra;
            }
            if (curFaceOffset >= this.faceUpperIndex) break;
        }

        return indexes;
    }
}

/**
 * Named selection (vertex/face groups)
 */
export class NamedSelection {
    public name: string = '';
    public isSectional: boolean = false;
    public selectedFaces: number[] = [];
    public sections: number[] = [];
    public selectedVertices: number[] = [];
    public selectedVerticesWeights: Uint8Array = new Uint8Array(0);

    static fromReader(reader: OdolReader): NamedSelection {
        const selection = new NamedSelection();

        selection.name = reader.readCString();
        selection.selectedFaces = reader.readCompressedVertexIndexArray();

        const unk0 = reader.readInt32();
        if (unk0 !== 0) {
            console.warn(`NamedSelection: expected 0, got ${unk0}`);
        }

        selection.isSectional = reader.readBoolean();
        selection.sections = reader.readCompressedArray(r => r.readInt32(), 4);
        selection.selectedVertices = reader.readCompressedVertexIndexArray();

        const weightsSize = reader.readInt32();
        selection.selectedVerticesWeights = reader.readCompressed(weightsSize);

        return selection;
    }
}

/**
 * UV coordinate set
 */
export class UVSet {
    private minU: number = 0;
    private minV: number = 0;
    private maxU: number = 0;
    private maxV: number = 0;
    private nVertices: number = 0;
    private isDefault: boolean = false;
    private defaultValue: Uint8Array = new Uint8Array(0);
    private uvData: Uint8Array = new Uint8Array(0);

    static fromReader(reader: OdolReader): UVSet {
        const uvSet = new UVSet();

        uvSet.minU = reader.readFloat();
        uvSet.minV = reader.readFloat();
        uvSet.maxU = reader.readFloat();
        uvSet.maxV = reader.readFloat();

        uvSet.nVertices = reader.readInt32();
        uvSet.isDefault = reader.readBoolean();

        if (uvSet.isDefault) {
            uvSet.defaultValue = reader.readBytes(4);
        } else {
            uvSet.uvData = reader.readCompressed(uvSet.nVertices * 4);
        }

        return uvSet;
    }

    /**
     * Get UV data as float array
     */
    getUVData(): Float32Array {
        const uvData = new Float32Array(this.nVertices * 2);

        const rangeU = this.maxU - this.minU;
        const rangeV = this.maxV - this.minV;

        const view = this.isDefault
            ? new DataView(this.defaultValue.buffer, this.defaultValue.byteOffset)
            : new DataView(this.uvData.buffer, this.uvData.byteOffset);

        if (this.isDefault) {
            const u = this.decodeUVComponent(view.getInt16(0, true), rangeU, this.minU);
            const v = this.decodeUVComponent(view.getInt16(2, true), rangeV, this.minV);

            for (let i = 0; i < this.nVertices; i++) {
                const dst = i * 2;
                uvData[dst] = u;
                uvData[dst + 1] = v;
            }
        } else {
            for (let i = 0; i < this.nVertices; i++) {
                const src = i * 4;
                const dst = i * 2;
                uvData[dst] = this.decodeUVComponent(view.getInt16(src, true), rangeU, this.minU);
                uvData[dst + 1] = this.decodeUVComponent(view.getInt16(src + 2, true), rangeV, this.minV);
            }
        }

        return uvData;
    }

    private decodeUVComponent(value: number, range: number, min: number): number {
        return ((value + 32767) / 65536) * range + min;
    }
}
