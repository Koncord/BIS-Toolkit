import { BinaryReader } from '@bis-toolkit/utils';
import { Entity } from '../Entity';
import { BoneAnimation, AnimEvent, BoneHead, Vector3, Quaternion } from '../types';
import { FpsEntity } from './FpsEntity';
import { HeadEntity } from './HeadEntity';
import { DataEntity } from './DataEntity';
import { EventsEntity } from './EventsEntity';

/**
 * Main animation entity containing FPS, bone headers, animation data, and events
 */
export class AnimationEntity extends Entity {
    public fps?: FpsEntity;
    public head?: HeadEntity;
    public data?: DataEntity;
    public events?: EventsEntity;

    constructor(parent?: Entity) {
        super(parent);
        this.tagLen = 8;
        this.expectedTag = ['ANIMSET5', 'ANIMSET6'];
    }

    protected validateTag(): void {
        // Override to allow any tag (we'll validate in readData if needed)
    }

    protected readData(br: BinaryReader): void {
        this.fps = new FpsEntity(this);
        this.fps.read(br);

        this.head = new HeadEntity(this);
        this.head.read(br);

        this.data = new DataEntity(this, this.head);
        this.data.read(br);

        this.events = new EventsEntity(this);
        this.events.read(br);
    }

    /**
     * Create a new animation from scratch
     * @param data - Map of bone name to animation data
     * @param events - Array of animation events
     * @param fps - Frames per second
     */
    create(data: Record<string, BoneAnimation>, events: AnimEvent[], fps: number): void {
        this.tag = 'ANIMSET6'; // Default to ANIMSET6 which supports scale
        
        this.fps = new FpsEntity(this);
        this.fps.fps = fps;

        this.head = new HeadEntity(this);
        for (const [boneName, anim] of Object.entries(data)) {
            const bone: BoneHead = {
                name: boneName,
                translationFrameCount: anim.translations?.size ?? 0,
                rotationFrameCount: anim.rotations?.size ?? 0,
                scaleFrameCount: anim.scales?.size ?? 0,
                numFrames: anim.frameCount,
                flags: 0,
                translationBias: 0,
                translationMultiplier: 0,
                rotationBias: 0,
                rotationMultiplier: 0,
                scaleBias: 0,
                scaleMultiplier: 0
            };

            if (anim.translations && anim.translations.size > 0) {
                const [min, max] = this.findMinMaxVector3(anim.translations);
                bone.translationBias = min;
                bone.translationMultiplier = this.getMultiplier(min, max);
            }

            if (anim.rotations && anim.rotations.size > 0) {
                const [min, max] = this.findMinMaxQuaternion(anim.rotations);
                bone.rotationBias = min;
                bone.rotationMultiplier = this.getMultiplier(min, max);
            }

            if (anim.scales && anim.scales.size > 0) {
                const [min, max] = this.findMinMaxVector3(anim.scales);
                bone.scaleBias = min;
                bone.scaleMultiplier = this.getMultiplier(min, max);
            }

            this.head.bones.push(bone);
        }

        this.data = new DataEntity(this, this.head);
        for (const [boneName, anim] of Object.entries(data)) {
            this.data.boneAnimations.set(boneName, anim);
        }

        if (events.length > 0) {
            this.events = new EventsEntity(this);
            this.events.animEvents = events;
        }
    }

    private getMultiplier(min: number, max: number): number {
        const epsilon = 9.9999999747524271e-7;
        return Math.abs(max - min) < epsilon ? 1.0 : max - min;
    }

    private findMinMaxVector3(collection: Map<number, Vector3>): [number, number] {
        const values: number[] = [];
        for (const v of collection.values()) {
            values.push(v.x, v.y, v.z);
        }
        return [Math.min(...values), Math.max(...values)];
    }

    private findMinMaxQuaternion(collection: Map<number, Quaternion>): [number, number] {
        const values: number[] = [];
        for (const q of collection.values()) {
            values.push(q.x, q.y, q.z, q.w);
        }
        return [Math.min(...values), Math.max(...values)];
    }
}
