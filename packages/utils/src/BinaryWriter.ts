/**
 * Binary writer utility for writing binary data to a buffer
 */
export class BinaryWriter {
    private buffer: Uint8Array;
    private view: DataView;
    private position = 0;
    private capacity: number;

    constructor(initialCapacity: number = 1024) {
        this.capacity = initialCapacity;
        this.buffer = new Uint8Array(initialCapacity);
        this.view = new DataView(this.buffer.buffer);
    }

    get pos(): number {
        return this.position;
    }

    private ensureCapacity(additionalBytes: number): void {
        const requiredCapacity = this.position + additionalBytes;
        if (requiredCapacity > this.capacity) {
            // Double capacity or use required capacity, whichever is larger
            const newCapacity = Math.max(this.capacity * 2, requiredCapacity);
            const newBuffer = new Uint8Array(newCapacity);
            newBuffer.set(this.buffer);
            this.buffer = newBuffer;
            this.view = new DataView(this.buffer.buffer);
            this.capacity = newCapacity;
        }
    }

    writeUInt8(value: number): void {
        this.ensureCapacity(1);
        this.view.setUint8(this.position, value);
        this.position += 1;
    }

    writeByte(value: number): void {
        this.writeUInt8(value);
    }

    writeUInt16(value: number): void {
        this.ensureCapacity(2);
        this.view.setUint16(this.position, value, true); // true = little endian
        this.position += 2;
    }

    writeUInt32(value: number): void {
        this.ensureCapacity(4);
        this.view.setUint32(this.position, value, true);
        this.position += 4;
    }

    writeInt32(value: number): void {
        this.ensureCapacity(4);
        this.view.setInt32(this.position, value, true);
        this.position += 4;
    }

    writeFloat(value: number): void {
        this.ensureCapacity(4);
        this.view.setFloat32(this.position, value, true);
        this.position += 4;
    }

    writeRawString(str: string): void {
        this.ensureCapacity(str.length);
        for (let i = 0; i < str.length; i++) {
            this.buffer[this.position + i] = str.charCodeAt(i);
        }
        this.position += str.length;
    }

    writeString(str: string): void {
        this.writeRawString(str);
    }

    writeBytes(bytes: Uint8Array): void {
        this.ensureCapacity(bytes.length);
        this.buffer.set(bytes, this.position);
        this.position += bytes.length;
    }

    /**
     * Get the current buffer contents as a Uint8Array
     */
    getBuffer(): Uint8Array {
        return this.buffer.subarray(0, this.position);
    }

    /**
     * Get the current buffer contents as a Buffer (Node.js)
     */
    toBuffer(): Buffer {
        return Buffer.from(this.getBuffer());
    }
}
