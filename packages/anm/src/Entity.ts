import { BinaryReader } from '@bis-toolkit/utils';

/**
 * Base entity class for reading binary data structures
 */
export abstract class Entity {
    protected tagLen = 4;
    protected expectedTag: string[] = [];
    protected tag = '';
    protected entrySize = 0;
    protected dataOffset = 0;
    
    public parent?: Entity;

    constructor(parent?: Entity) {
        this.parent = parent;
    }

    get Tag(): string {
        return this.tag;
    }

    get EntrySize(): number {
        return this.entrySize;
    }

    get DataOffset(): number {
        return this.dataOffset;
    }

    /**
     * Read entity from binary reader
     */
    read(br: BinaryReader): void {
        this.dataOffset = br.pos;
        this.tag = br.readRawString(this.tagLen).replace(/\0/g, '');
        this.validateTag();
        this.entrySize = br.readUInt32();
        this.readData(br);
    }

    /**
     * Validate that the tag matches expected tags
     */
    protected validateTag(): void {
        if (this.expectedTag.length > 0 && !this.expectedTag.includes(this.tag)) {
            throw new Error(`Invalid tag. Expected one of [${this.expectedTag.join(', ')}] but got '${this.tag}'`);
        }
    }

    /**
     * Read entity-specific data
     */
    protected abstract readData(br: BinaryReader): void;
}
