/**
 * Binary reader utility for reading binary data from a buffer
 * Works with both Node.js Buffer and browser Uint8Array
 */
export class BinaryReader {
    protected buffer: Uint8Array;
    protected view: DataView;
    protected position = 0;

    constructor(buffer: Buffer | Uint8Array) {
        // Ensure we have a Uint8Array - Buffer extends Uint8Array so instanceof check covers both
        this.buffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        this.view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
    }

    get length(): number {
        return this.buffer.length;
    }

    get pos(): number {
        return this.position;
    }

    seek(offset: number, origin: 'begin' | 'current' | 'end' = 'begin'): void {
        switch (origin) {
            case 'begin':
                this.position = offset;
                break;
            case 'current':
                this.position += offset;
                break;
            case 'end':
                this.position = this.buffer.length + offset;
                break;
        }
    }

    readByte(): number {
        const value = this.view.getUint8(this.position);
        this.position += 1;
        return value;
    }

    readUInt16(): number {
        const value = this.view.getUint16(this.position, true); // true = little endian
        this.position += 2;
        return value;
    }

    readUInt32(): number {
        const value = this.view.getUint32(this.position, true);
        this.position += 4;
        return value;
    }

    readInt32(): number {
        const value = this.view.getInt32(this.position, true);
        this.position += 4;
        return value;
    }

    readInt24(): number {
        const b1 = this.view.getUint8(this.position);
        const b2 = this.view.getUint8(this.position + 1);
        const b3 = this.view.getUint8(this.position + 2);
        this.position += 3;
        return b1 | (b2 << 8) | (b3 << 16);
    }

    readBytes(count: number): Uint8Array {
        const bytes = this.buffer.subarray(this.position, this.position + count);
        this.position += count;
        return bytes;
    }

    readRawString(length: number): string {
        const bytes = this.buffer.subarray(this.position, this.position + length);
        this.position += length;
        return String.fromCharCode(...bytes);
    }

    readFloat(): number {
        const value = this.view.getFloat32(this.position, true);
        this.position += 4;
        return value;
    }

    readBoolean(): boolean {
        return this.readByte() !== 0;
    }

    /**
     * Read a null-terminated C-style string
     */
    readCString(): string {
        const start = this.position;
        let end = start;
        
        // Find null terminator
        while (end < this.buffer.length && this.buffer[end] !== 0) {
            end++;
        }
        
        const bytes = this.buffer.subarray(start, end);
        this.position = end + 1; // Skip null terminator
        
        // Decode as UTF-8
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(bytes);
    }

    /**
     * Alias for readRawString for compatibility
     */
    readString(length: number): string {
        return this.readRawString(length);
    }
}
