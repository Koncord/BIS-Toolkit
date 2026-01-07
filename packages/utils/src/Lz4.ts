import { BinaryReader } from './BinaryReader';

/**
 * Decompresses an LZ4 block with the declared size from the reader.
 * This implementation supports LZ4 chain decoder which maintains a dictionary across chunks.
 * 
 * @param reader - Binary reader positioned at the start of the LZ4 block
 * @param declaredSize - The declared size of the LZ4 block (including headers)
 * @returns Decompressed data as Uint8Array
 */
export function decompressLz4Block(reader: BinaryReader, declaredSize: number): Uint8Array {
    const startPos = reader.pos;
    const targetSize = reader.readUInt32();
    const target = new Uint8Array(targetSize);
    let targetIdx = 0;

    // LZ4 chain decoder - maintains dictionary across chunks
    const LzBlockSize = 65536;
    const dict = new Uint8Array(LzBlockSize);
    let dictSize = 0;

    // Each chunk is: compressedSize (int24), flags (byte), compressedData
    while (true) {
        const compressedSize = reader.readInt24();
        const flags = reader.readByte();
        if ((flags & ~0x80) !== 0) {
            throw new Error(`Unknown LZ4 flags 0x${flags.toString(16)}`);
        }

        const compressed = reader.readBytes(compressedSize);
        const decoded = decompressLz4BlockWithDict(compressed, dict, dictSize);
        if (targetIdx + decoded.length > target.length) {
            throw new Error('Decoded LZ4 data overruns target buffer');
        }
        target.set(decoded, targetIdx);
        targetIdx += decoded.length;

        // Update dictionary with decoded data
        if (decoded.length >= LzBlockSize) {
            // Copy last LZ_BLOCK_SIZE bytes
            dict.set(decoded.subarray(decoded.length - LzBlockSize));
            dictSize = LzBlockSize;
        } else {
            // Append to dictionary, possibly overflowing
            const available = LzBlockSize - dictSize;
            if (decoded.length <= available) {
                dict.set(decoded, dictSize);
                dictSize += decoded.length;
            } else {
                // Shift and append
                const shift = decoded.length - available;
                dict.copyWithin(0, shift);
                dict.set(decoded, LzBlockSize - decoded.length);
                dictSize = LzBlockSize;
            }
        }

        if ((flags & 0x80) !== 0) {
            break;
        }
    }

    if (startPos + declaredSize !== reader.pos) {
        throw new Error('LZ4 block length mismatch');
    }
    if (targetIdx !== targetSize) {
        throw new Error(`LZ4 decoded size mismatch (expected ${targetSize}, got ${targetIdx})`);
    }

    return target;
}

/**
 * Decompresses an LZ4 block with dictionary support.
 * 
 * @param compressed - Compressed data
 * @param dict - Dictionary buffer for LZ4 chain decoder
 * @param dictSize - Current size of valid data in dictionary
 * @returns Decompressed data as Uint8Array
 */
function decompressLz4BlockWithDict(compressed: Uint8Array, dict: Uint8Array, dictSize: number): Uint8Array {
    const output: number[] = [];
    let src = 0;

    while (src < compressed.length) {
        const token = compressed[src++];
        let literalLength = token >> 4;
        if (literalLength === 15) {
            let len = 0;
            do {
                len = compressed[src++];
                literalLength += len;
            } while (len === 255 && src < compressed.length);
        }

        // Copy literals
        for (let i = 0; i < literalLength; i++) {
            output.push(compressed[src++]);
        }

        if (src >= compressed.length) {
            break; // No more matches
        }

        const offset = compressed[src] | (compressed[src + 1] << 8);
        src += 2;

        let matchLength = token & 0x0f;
        if (matchLength === 15) {
            let len = 0;
            do {
                len = compressed[src++];
                matchLength += len;
            } while (len === 255 && src < compressed.length);
        }
        matchLength += 4;

        // LZ4 chain decoder: offset can reference into dictionary or output
        if (offset === 0) {
            throw new Error('Invalid LZ4 offset');
        }

        // Copy from dictionary and/or output
        const totalAvailable = dictSize + output.length;
        if (offset > totalAvailable) {
            throw new Error('Invalid LZ4 offset');
        }

        for (let i = 0; i < matchLength; i++) {
            const backPos = output.length - offset;
            if (backPos >= 0) {
                // Copy from output
                output.push(output[backPos]);
            } else {
                // Copy from dictionary
                const dictPos = dictSize + backPos;
                output.push(dict[dictPos]);
            }
        }
    }

    return Uint8Array.from(output);
}
