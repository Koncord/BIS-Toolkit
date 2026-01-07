/**
 * LZSS (Lempel-Ziv-Storer-Szymanski) decompression
 */

const N = 4096;
const F = 18;
const THRESHOLD = 2;

/**
 * Decompress LZSS compressed data
 * @param input Input stream containing compressed data
 * @param expectedSize Expected size of decompressed output
 * @param useSignedChecksum Whether to use signed checksum calculation
 * @returns Object containing decompressed data and bytes read
 */
export function lzssDecompress(
    input: Buffer | Uint8Array,
    inputOffset: number,
    expectedSize: number,
    useSignedChecksum = false
): { data: Uint8Array; bytesRead: number } {
    const buffer = new Array<number>(N + F - 1);
    const dst = new Uint8Array(expectedSize);

    if (expectedSize <= 0) {
        return { data: new Uint8Array(0), bytesRead: 0 };
    }

    const startPos = inputOffset;
    let inPos = inputOffset;
    let iDst = 0;

    let calculatedChecksum = 0;
    let r = N - F;
    
    // Initialize buffer with spaces
    for (let i = 0; i < r; i++) {
        buffer[i] = 0x20; // space character
    }

    let flags = 0;
    while (expectedSize > 0) {
        if (((flags >>>= 1) & 256) === 0) {
            const c = input[inPos++];
            flags = c | 0xff00;
        }

        if ((flags & 1) !== 0) {
            // Literal byte
            const c = input[inPos++];
            calculatedChecksum = (calculatedChecksum + (useSignedChecksum ? (c << 24 >> 24) : c)) | 0;
            dst[iDst++] = c;
            expectedSize--;
            
            // Update ring buffer
            buffer[r] = c;
            r = (r + 1) & (N - 1);
        } else {
            // Match (backreference)
            const i = input[inPos++];
            const j = input[inPos++];
            const offset = i | ((j & 0xf0) << 4);
            const length = (j & 0x0f) + THRESHOLD;

            if (length + 1 > expectedSize + length - THRESHOLD) {
                throw new Error('LZSS overflow');
            }

            let ii = r - offset;
            const jj = length + ii;
            
            for (; ii <= jj; ii++) {
                const c = buffer[ii & (N - 1)];
                calculatedChecksum = (calculatedChecksum + (useSignedChecksum ? (c << 24 >> 24) : c)) | 0;
                
                // Save byte
                dst[iDst++] = c;
                expectedSize--;
                
                // Update ring buffer
                buffer[r] = c;
                r = (r + 1) & (N - 1);
            }
        }
    }

    // Read and verify checksum using DataView
    const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
    const checksum = view.getInt32(inPos, true); // true = little endian
    inPos += 4;

    if (checksum !== calculatedChecksum) {
        throw new Error(`Checksum mismatch: expected ${checksum}, got ${calculatedChecksum}`);
    }

    return {
        data: dst,
        bytesRead: inPos - startPos
    };
}

/**
 * Calculate CRC/checksum for data
 */
export function calculateChecksum(data: Buffer, signed = false): number {
    let checksum = 0;
    for (const byte of data) {
        checksum = (checksum + (signed ? (byte << 24 >> 24) : byte)) | 0;
    }
    return checksum;
}
