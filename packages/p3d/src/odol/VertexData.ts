import { OdolReader } from './OdolReader';
import { Vector3 } from './math';
import { ClipFlags } from './enums';
import { UVSet } from './structures';

/**
 * Animation RT pair
 */
export class AnimationRTPair {
    constructor(
        public selectionIndex: number,
        public weight: number
    ) { }
}

/**
 * Animation RT weight
 */
export class AnimationRTWeight {
    private nSmall: number = 0;
    private smallSpace: Uint8Array = new Uint8Array(8);

    static fromReader(reader: OdolReader): AnimationRTWeight {
        const weight = new AnimationRTWeight();
        weight.nSmall = reader.readInt32();
        weight.smallSpace = reader.readBytes(8);
        return weight;
    }

    getAnimationRTPairs(): AnimationRTPair[] {
        const pairs: AnimationRTPair[] = [];
        for (let i = 0; i < this.nSmall; i++) {
            pairs.push(new AnimationRTPair(
                this.smallSpace[i * 2],
                this.smallSpace[i * 2 + 1]
            ));
        }
        return pairs;
    }
}

/**
 * Vertex neighbor info
 */
export class VertexNeighborInfo {
    public posA: number = 0;
    private unk1: number = 0;
    public weightA: AnimationRTWeight | null = null;
    public posB: number = 0;
    private unk2: number = 0;
    public weightB: AnimationRTWeight | null = null;

    static fromReader(reader: OdolReader): VertexNeighborInfo {
        const info = new VertexNeighborInfo();
        info.posA = reader.readUInt16();
        info.unk1 = reader.readUInt16();
        info.weightA = AnimationRTWeight.fromReader(reader);
        info.posB = reader.readUInt16();
        info.unk2 = reader.readUInt16();
        info.weightB = AnimationRTWeight.fromReader(reader);
        return info;
    }
}

/**
 * ST coordinate pair (tangent/bitangent)
 */
export class STPair {
    public s: Vector3 = new Vector3();
    public t: Vector3 = new Vector3();

    static fromReader(reader: OdolReader): STPair {
        const pair = new STPair();
        pair.s = reader.readCompressedVector3();
        pair.t = reader.readCompressedVector3();

        return pair;
    }
}

export class VertexData {
    public vertexBoneRefIsSimple: boolean = false;
    public clipFlags: ClipFlags[] = [];
    public uvSets: UVSet[] = [];
    public vertices: Vector3[] = [];
    public normals: Vector3[] = [];
    public stCoords: STPair[] = [];
    public vertexBoneRef: AnimationRTWeight[] = [];
    public neighborBoneRef: VertexNeighborInfo[] = [];

    static fromReader(reader: OdolReader): VertexData {
        const data = new VertexData();

        data.vertexBoneRefIsSimple = reader.readBoolean();
        const calcSizeStart = reader.pos;
        const sizeOfData = reader.readUInt32();
        const clipFlagsInt = reader.readCompressedFillArray(r => r.readInt32(), 4);
        data.clipFlags = clipFlagsInt.map(f => f as ClipFlags);

        // Read first UV set
        const uvSet0 = UVSet.fromReader(reader);
        const uvSetCount = reader.readInt32();
        data.uvSets = new Array<UVSet>(uvSetCount);
        data.uvSets[0] = uvSet0;

        // Read remaining UV sets
        for (let i = 1; i < uvSetCount; i++) {
            data.uvSets[i] = UVSet.fromReader(reader);
        }

        // Read vertices
        data.vertices = reader.readCompressedArray(r => Vector3.fromReader(r), 12);

        // Read normals
        data.normals = reader.readCompressedFillArray(r => r.readCompressedVector3(), 4);

        // Read ST coordinates (tangent/bitangent)
        data.stCoords = reader.readCompressedArray(r => STPair.fromReader(r), 8);

        // Read vertex bone references
        data.vertexBoneRef = reader.readCompressedArray(r => AnimationRTWeight.fromReader(r), 12);

        // Read neighbor bone references
        data.neighborBoneRef = reader.readCompressedArray(r => VertexNeighborInfo.fromReader(r), 32);

        const size = reader.pos - calcSizeStart;
        if (size !== sizeOfData) {
            console.warn(`Vertex Data size mismatch: expected ${sizeOfData}, got ${size}`);
        }

        return data;
    }
}
