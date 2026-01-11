import { BinaryReader } from '@bis-toolkit/utils';
import { Entity } from '../Entity';
import { BoneHead } from '../types';

/**
 * Head entity - stores bone header information
 */
export class HeadEntity extends Entity {
    public bones: BoneHead[] = [];

    constructor(parent?: Entity) {
        super(parent);
        this.expectedTag = ['HEAD'];
    }

    protected readData(br: BinaryReader): void {
        if (!this.parent) {
            throw new Error('HeadEntity requires a parent entity');
        }

        switch (this.parent.Tag) {
            case 'ANIMSET5':
                this.read5(br);
                break;
            case 'ANIMSET6':
                this.read6(br);
                break;
            default:
                throw new Error(`Unknown model type: ${this.parent.Tag}`);
        }
    }

    private read5(br: BinaryReader): void {
        while (br.pos < this.entrySize + this.dataOffset) {
            const name = br.readRawString(32).replace(/\0/g, '');
            const translationBias = br.readFloat();
            const translationMultiplier = br.readFloat();
            const rotationBias = br.readFloat();
            const rotationMultiplier = br.readFloat();
            const numFrames = br.readUInt16();
            const translationFrameCount = br.readUInt16();
            const rotationFrameCount = br.readUInt16();
            const flags = br.readUInt16();

            this.bones.push({
                name,
                translationBias,
                translationMultiplier,
                rotationBias,
                rotationMultiplier,
                scaleBias: 0,
                scaleMultiplier: 0,
                numFrames,
                translationFrameCount,
                rotationFrameCount,
                scaleFrameCount: 0,
                flags
            });
        }
    }

    private read6(br: BinaryReader): void {
        while (br.pos < this.entrySize + this.dataOffset) {
            const translationBias = br.readFloat();
            const translationMultiplier = br.readFloat();
            const rotationBias = br.readFloat();
            const rotationMultiplier = br.readFloat();
            const scaleBias = br.readFloat();
            const scaleMultiplier = br.readFloat();
            const numFrames = br.readUInt16();
            const translationFrameCount = br.readUInt16();
            const rotationFrameCount = br.readUInt16();
            const scaleFrameCount = br.readUInt16();
            const flags = br.readByte();
            const nameLength = br.readByte();
            const name = br.readRawString(nameLength).replace(/\0/g, '');

            this.bones.push({
                name,
                translationBias,
                translationMultiplier,
                rotationBias,
                rotationMultiplier,
                scaleBias,
                scaleMultiplier,
                numFrames,
                translationFrameCount,
                rotationFrameCount,
                scaleFrameCount,
                flags
            });
        }
    }
}
