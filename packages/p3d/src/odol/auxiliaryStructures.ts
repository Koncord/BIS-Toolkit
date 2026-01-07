import { OdolReader } from './OdolReader';
import { PackedColor } from './PackedColor';
import { ClipFlags, SpecialFlags } from './enums';
import { Vector3, Matrix4 } from './math';

/**
 * Skeleton bone structure
 */
export class Skeleton {
    public name: string = '';
    public isDiscrete: boolean = false;
    public bones: string[] = [];
    public pivotsName: string = '';

    static fromReader(reader: OdolReader): Skeleton {
        const skeleton = new Skeleton();
        skeleton.name = reader.readCString();

        if (skeleton.name === '') {
            return skeleton;
        }

        skeleton.isDiscrete = reader.readBoolean();

        const bonesCnt = reader.readInt32();
        skeleton.bones = new Array<string>(bonesCnt * 2);

        for (let i = 0; i < bonesCnt; i++) {
            skeleton.bones[i * 2] = reader.readCString();
            skeleton.bones[i * 2 + 1] = reader.readCString();
        }

        skeleton.pivotsName = reader.readCString();

        return skeleton;
    }

    getBonePairs(): [string, string][] {
        const pairs: [string, string][] = [];
        for (let i = 0; i < this.bones.length; i += 2) {
            pairs.push([this.bones[i], this.bones[i + 1]]);
        }
        return pairs;
    }
}

/**
 * Proxy object (reference to another model)
 */
export class ProxyObject {
    public proxyModel: string = '';
    public transformation: Matrix4 = new Matrix4();
    public sequenceId: number = 0;
    public namedSelectionIndex: number = 0;
    public boneIndex: number = 0;
    public sectionIndex: number = 0;

    static fromReader(reader: OdolReader): ProxyObject {
        const proxy = new ProxyObject();
        proxy.proxyModel = reader.readCString();
        proxy.transformation = Matrix4.fromReader(reader);
        proxy.sequenceId = reader.readInt32();
        proxy.namedSelectionIndex = reader.readInt32();
        proxy.boneIndex = reader.readInt32();
        proxy.sectionIndex = reader.readInt32();
        return proxy;
    }
}

/**
 * Keyframe for animations
 */
export class Keyframe {
    public time: number = 0;
    public points: Vector3[] = [];

    static fromReader(reader: OdolReader): Keyframe {
        const keyframe = new Keyframe();
        keyframe.time = reader.readFloat();
        keyframe.points = reader.readArray(r => Vector3.fromReader(r));
        return keyframe;
    }
}

export class SubSkeletonIndexSet {
    public subSkeletons: number[] = [];

    static fromReader(reader: OdolReader): SubSkeletonIndexSet {
        const set = new SubSkeletonIndexSet();
        set.subSkeletons = reader.readArray(r => r.readInt32());
        return set;
    }
}

export class LodMetadata {
    public facesCount: number = 0;
    public color: PackedColor = new PackedColor();
    public special: SpecialFlags = SpecialFlags.None;
    public orHints: ClipFlags = ClipFlags.None;
    public hasSkeleton: boolean = false;
    public verticesCount: number = 0;
    public faceArea: number = 0;

    static fromReader(reader: OdolReader): LodMetadata {
        const info = new LodMetadata();

        info.facesCount = reader.readInt32();
        info.color = PackedColor.fromReader(reader);
        info.special = reader.readInt32() as SpecialFlags;
        info.orHints = reader.readUInt32() as ClipFlags;
        info.hasSkeleton = reader.readBoolean();

        info.verticesCount = reader.readInt32();
        info.faceArea = reader.readFloat();

        return info;
    }
}
