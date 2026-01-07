import { BinaryReader } from '@bis-toolkit/utils';

/**
 * Packed color (RGBA as a single 32-bit integer)
 */

export class PackedColor {
    constructor(public value: number = 0) { }

    static fromReader(reader: BinaryReader): PackedColor {
        return new PackedColor(reader.readUInt32());
    }

    get r(): number {
        return (this.value >> 0) & 0xFF;
    }

    get g(): number {
        return (this.value >> 8) & 0xFF;
    }

    get b(): number {
        return (this.value >> 16) & 0xFF;
    }

    get a(): number {
        return (this.value >> 24) & 0xFF;
    }

    toArray(): [number, number, number, number] {
        return [this.r, this.g, this.b, this.a];
    }
}
