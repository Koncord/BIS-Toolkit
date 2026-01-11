import { BinaryReader } from '@bis-toolkit/utils';
import { Entity } from '../Entity';
import { AnimEvent } from '../types';

/**
 * Events entity - stores animation events
 */
export class EventsEntity extends Entity {
    public animEvents: AnimEvent[] = [];

    constructor(parent?: Entity) {
        super(parent);
        this.expectedTag = ['EVNT'];
    }

    protected readData(br: BinaryReader): void {
        const count = br.readUInt16();
        for (let i = 0; i < count; i++) {
            const frame = br.readInt32();
            const nameLength = br.readInt32();
            const name = br.readRawString(nameLength).replace(/\0/g, '');
            const unkValue1Length = br.readInt32();
            const unkValue1 = br.readRawString(unkValue1Length).replace(/\0/g, '');
            const unkValue2 = br.readInt32();
            
            this.animEvents.push({
                frame,
                name,
                unkValue1,
                unkValue2
            });
        }
    }
}
