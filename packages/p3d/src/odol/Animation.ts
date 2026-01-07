import { Vector3 } from './math';
import { OdolReader } from './OdolReader';

export enum AnimType {
    Rotation = 0,
    RotationX = 1,
    RotationY = 2,
    RotationZ = 3,
    Translation = 4,
    TranslationX = 5,
    TranslationY = 6,
    TranslationZ = 7,
    Direct = 8,
    Hide = 9
}


export class Animation {
    kind: AnimType = 0;
    animName: string = '';
    source: string = '';
    minValue: number = 0;
    maxValue: number = 0;
    minPhase: number = 0;
    maxPhase: number = 0;
    sourceAddress: number = 0;

    protected read(reader: OdolReader, kind: AnimType): void {
        this.kind = kind;
        this.animName = reader.readCString();
        this.source = reader.readCString();
        this.minPhase = reader.readFloat();
        this.maxPhase = reader.readFloat();
        this.minValue = reader.readFloat();
        this.maxValue = reader.readFloat();
        this.sourceAddress = reader.readUInt32();
    }
}

export class AnimationRotation extends Animation {
    angle0: number = 0;
    angle1: number = 0;

    static fromReader(reader: OdolReader, kind: AnimType): AnimationRotation {
        const anim = new AnimationRotation();
        anim.read(reader, kind);
        anim.angle0 = reader.readFloat();
        anim.angle1 = reader.readFloat();
        return anim;
    }
}

export class AnimationTranslation extends Animation {
    offset0: number = 0;
    offset1: number = 0;

    static fromReader(reader: OdolReader, kind: AnimType): AnimationTranslation {
        const anim = new AnimationTranslation();
        anim.read(reader, kind);
        anim.offset0 = reader.readFloat();
        anim.offset1 = reader.readFloat();
        return anim;
    }
}

export class AnimationDirect extends Animation {
    axisPos: Vector3 = new Vector3();
    axisDir: Vector3 = new Vector3()
    angle: number = 0;
    axisOffset: number = 0;

    static fromReader(reader: OdolReader, kind: AnimType): AnimationDirect {
        const anim = new AnimationDirect();
        anim.read(reader, kind);
        anim.axisPos = Vector3.fromReader(reader);
        anim.axisDir = Vector3.fromReader(reader);
        anim.angle = reader.readFloat();
        anim.axisOffset = reader.readFloat();
        return anim;
    }
}

export class AnimationHide extends Animation {
    hideValue: number = 0;

    static fromReader(reader: OdolReader, kind: AnimType): AnimationHide {
        const anim = new AnimationHide();
        anim.read(reader, kind);
        anim.hideValue = reader.readFloat();
        return anim;
    }
}

export function isAnimationDirect(anim: Animation): anim is AnimationDirect {
    return anim.kind === AnimType.Direct;
}

export function isAnimationHide(anim: Animation): anim is AnimationHide {
    return anim.kind === AnimType.Hide;
}
