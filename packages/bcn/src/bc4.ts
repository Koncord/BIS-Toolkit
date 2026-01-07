/**
 * BC4 Decoder - Single channel compression
 * Source: https://github.com/Nominom/BCnEncoder.NET
 */

import { interpolateByteFifth, interpolateByteSeventh } from './utils';

function decodeComponentBlock(componentData: bigint): number[] {
    const output = new Array<number>(16);

    const c0 = Number(componentData & 0xFFn);
    const c1 = Number((componentData >> 8n) & 0xFFn);

    // Build component palette
    const components = c0 > c1 ? [
        c0,
        c1,
        interpolateByteSeventh(c0, c1, 1),
        interpolateByteSeventh(c0, c1, 2),
        interpolateByteSeventh(c0, c1, 3),
        interpolateByteSeventh(c0, c1, 4),
        interpolateByteSeventh(c0, c1, 5),
        interpolateByteSeventh(c0, c1, 6)
    ] : [
        c0,
        c1,
        interpolateByteFifth(c0, c1, 1),
        interpolateByteFifth(c0, c1, 2),
        interpolateByteFifth(c0, c1, 3),
        interpolateByteFifth(c0, c1, 4),
        0,
        255
    ];

    // Decode indices (3 bits per pixel, 48 bits total starting at bit 16)
    for (let i = 0; i < 16; i++) {
        const bitOffset = 16 + i * 3;
        const index = Number((componentData >> BigInt(bitOffset)) & 0x7n);
        output[i] = components[index];
    }

    return output;
}

export function decodeBC4(data: DataView, width: number, height: number, channel: 'r' | 'g' | 'b' | 'a' = 'r'): Uint8Array {
    const rgba = new Uint8Array(width * height * 4);
    const blocksX = Math.ceil(width / 4);
    const blocksY = Math.ceil(height / 4);

    const channelMap = { r: 0, g: 1, b: 2, a: 3 };
    const outputChannel = channelMap[channel];

    let offset = 0;
    for (let by = 0; by < blocksY; by++) {
        for (let bx = 0; bx < blocksX; bx++) {
            const componentBlock = data.getBigUint64(offset, true);
            const components = decodeComponentBlock(componentBlock);

            // Decode 4x4 block
            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 4; x++) {
                    const px = bx * 4 + x;
                    const py = by * 4 + y;

                    if (px < width && py < height) {
                        const i = y * 4 + x;
                        const dstIdx = (py * width + px) * 4;

                        // Initialize to default
                        rgba[dstIdx] = 0;
                        rgba[dstIdx + 1] = 0;
                        rgba[dstIdx + 2] = 0;
                        rgba[dstIdx + 3] = 255;

                        // Set the decoded channel
                        rgba[dstIdx + outputChannel] = components[i];
                    }
                }
            }

            offset += 8;
        }
    }

    return rgba;
}
