import { BinaryReader } from '@bis-toolkit/utils';
import { Entity } from '../Entity';
import { BoneHead, BoneAnimation } from '../types';
import { HeadEntity } from './HeadEntity';

const RAD_PER_VAL = 1.0 / 65535; // ushort.MaxValue

/**
 * Data entity - stores the actual animation data (translations, rotations, scales)
 */
export class DataEntity extends Entity {
    public boneAnimations: Map<string, BoneAnimation> = new Map();
    private headEntity?: HeadEntity;

    constructor(parent?: Entity, headEntity?: HeadEntity) {
        super(parent);
        this.expectedTag = ['DATA'];
        this.headEntity = headEntity;
    }

    protected readData(br: BinaryReader): void {
        if (!this.headEntity) {
            throw new Error('DataEntity requires HeadEntity to be initialized');
        }

        for (const bone of this.headEntity.bones) {
            const boneAnim: BoneAnimation = {
                frameCount: bone.numFrames
            };
            
            this.readTranslations(br, bone, boneAnim);
            this.readScales(br, bone, boneAnim);
            this.readRotations(br, bone, boneAnim);
            
            this.boneAnimations.set(bone.name, boneAnim);
        }
    }

    private readTranslations(br: BinaryReader, boneHead: BoneHead, boneAnimation: BoneAnimation): void {
        if (boneHead.translationFrameCount <= 0) {
            return;
        }

        boneAnimation.translations = new Map();

        const translationIds: number[] = [];
        for (let i = 0; i < boneHead.translationFrameCount; i++) {
            translationIds.push(br.readUInt16());
        }

        const multiplier = boneHead.translationMultiplier * RAD_PER_VAL;

        for (let i = 0; i < boneHead.translationFrameCount; i++) {
            const x = br.readUInt16() * multiplier + boneHead.translationBias;
            const y = br.readUInt16() * multiplier + boneHead.translationBias;
            const z = br.readUInt16() * multiplier + boneHead.translationBias;

            boneAnimation.translations.set(translationIds[i], { x, y, z });
        }
    }

    private readRotations(br: BinaryReader, boneHead: BoneHead, boneAnimation: BoneAnimation): void {
        if (boneHead.rotationFrameCount <= 0) {
            return;
        }

        boneAnimation.rotations = new Map();

        const rotationIds: number[] = [];
        for (let i = 0; i < boneHead.rotationFrameCount; i++) {
            rotationIds.push(br.readUInt16());
        }

        const multiplier = boneHead.rotationMultiplier * RAD_PER_VAL;

        for (let i = 0; i < boneHead.rotationFrameCount; i++) {
            const x = br.readUInt16() * multiplier + boneHead.rotationBias;
            const y = br.readUInt16() * multiplier + boneHead.rotationBias;
            const z = br.readUInt16() * multiplier + boneHead.rotationBias;
            const w = br.readUInt16() * multiplier + boneHead.rotationBias;

            boneAnimation.rotations.set(rotationIds[i], { x, y, z, w });
        }
    }

    private readScales(br: BinaryReader, boneHead: BoneHead, boneAnimation: BoneAnimation): void {
        if (boneHead.scaleFrameCount <= 0) {
            return;
        }

        boneAnimation.scales = new Map();

        const scaleIds: number[] = [];
        for (let i = 0; i < boneHead.scaleFrameCount; i++) {
            scaleIds.push(br.readUInt16());
        }

        const multiplier = boneHead.scaleMultiplier * RAD_PER_VAL;

        for (let i = 0; i < boneHead.scaleFrameCount; i++) {
            const x = br.readUInt16() * multiplier + boneHead.scaleBias;
            const y = br.readUInt16() * multiplier + boneHead.scaleBias;
            const z = br.readUInt16() * multiplier + boneHead.scaleBias;

            boneAnimation.scales.set(scaleIds[i], { x, y, z });
        }
    }
}
