import { BinaryReader, lzoDecompressWithSize } from '@bis-toolkit/utils';
import { Vector3 } from './math';

/**
 * Extended BinaryReader with ODOL-specific functionality
 * Handles compression and compressed arrays
 */
export class OdolReader extends BinaryReader {
    public version: number = 0;

    /**
     * Read an array of elements
     */
    readArray<T>(readElement: (reader: OdolReader) => T, size?: number): T[] {
        const count = size ?? this.readInt32();
        const array = new Array<T>(count);
        for (let i = 0; i < count; i++) {
            array[i] = readElement(this);
        }
        return array;
    }

    /**
     * Read a compressed array of elements
     */
    readCompressedArray<T>(readElement: (reader: OdolReader) => T, elemSize: number): T[] {
        const size = this.readInt32();
        const compressed = this.readCompressed(size * elemSize);
        const tempReader = new OdolReader(compressed);
        tempReader.version = this.version;

        const array = new Array<T>(size);
        for (let i = 0; i < size; i++) {
            array[i] = readElement(tempReader);
        }

        return array;
    }

    /**
     * Read a compressed fill array (optimized for arrays with many repeated values)
     */
    readCompressedFillArray<T>(readElement: (reader: OdolReader) => T, sizeOfT: number): T[] {
        const size = this.readInt32();
        const isFilled = this.readBoolean();

        if (isFilled) {
            // All elements are the same
            const value = readElement(this);
            return new Array<T>(size).fill(value);
        }

        // Array is compressed
        const compressed = this.readCompressed(size * sizeOfT);
        const tempReader = new OdolReader(compressed);
        tempReader.version = this.version;

        const array = new Array<T>(size);
        for (let i = 0; i < size; i++) {
            array[i] = readElement(tempReader);
        }

        return array;
    }

    /**
     * Read compressed data
     */
    readCompressed(expectedSize: number): Uint8Array {
        if (expectedSize === 0) {
            return new Uint8Array(0);
        }

        const useCompression = expectedSize >= 1024;

        if (!useCompression) {
            return this.readBytes(expectedSize);
        }

        // Calculate worst-case compressed size
        const worstCompressedSize = expectedSize + Math.floor(expectedSize / 64) + 16 + 3 + 4;
        const remainingBytes = this.length - this.pos;
        const bytesToRead = Math.min(worstCompressedSize, remainingBytes);

        // Read worst-case amount
        const compressedData = this.readBytes(bytesToRead);

        // Decompress and get actual bytes consumed
        const result = lzoDecompressWithSize(compressedData, expectedSize);

        // Adjust position to account for bytes not consumed
        const bytesNotConsumed = compressedData.length - result.bytesRead;
        if (bytesNotConsumed > 0) {
            this.seek(-bytesNotConsumed, 'current');
        }

        return result.data;
    }

    /**
     * Read compressed vertex index array
     */
    readCompressedVertexIndexArray(): number[] {
        return this.readCompressedArray<number>(reader => reader.readUInt16(), 2);
    }

    readCompressedVector3(): Vector3 {
        const compressed = this.readInt32();
        return Vector3.fromInt32(compressed);
    }
}
