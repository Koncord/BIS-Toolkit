import { BinaryReader } from '@bis-toolkit/utils';
import { Entity } from '../Entity';

/**
 * FPS entity - stores the frames per second of the animation
 */
export class FpsEntity extends Entity {
    public fps = 0;

    constructor(parent?: Entity) {
        super(parent);
        this.expectedTag = ['FPS'];
    }

    protected readData(br: BinaryReader): void {
        this.fps = br.readInt32();
    }
}
