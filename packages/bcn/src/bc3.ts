/**
 * BC3 (DXT5) Decoder - RGBA with interpolated alpha
 * Source: https://github.com/Nominom/BCnEncoder.NET
 */

import { ColorRgb565, interpolateThird, interpolateByteFifth, interpolateByteSeventh } from './utils';

function decodeAlphaBlock(alphaData: bigint): number[] {
    const alpha = new Array<number>(16);

    const alpha0 = Number(alphaData & 0xFFn);
    const alpha1 = Number((alphaData >> 8n) & 0xFFn);

    // Build alpha palette
    const alphas = alpha0 > alpha1 ? [
        alpha0,
        alpha1,
        interpolateByteSeventh(alpha0, alpha1, 1),
        interpolateByteSeventh(alpha0, alpha1, 2),
        interpolateByteSeventh(alpha0, alpha1, 3),
        interpolateByteSeventh(alpha0, alpha1, 4),
        interpolateByteSeventh(alpha0, alpha1, 5),
        interpolateByteSeventh(alpha0, alpha1, 6)
    ] : [
        alpha0,
        alpha1,
        interpolateByteFifth(alpha0, alpha1, 1),
        interpolateByteFifth(alpha0, alpha1, 2),
        interpolateByteFifth(alpha0, alpha1, 3),
        interpolateByteFifth(alpha0, alpha1, 4),
        0,
        255
    ];

    // Decode indices (3 bits per pixel, 48 bits total starting at bit 16)
    for (let i = 0; i < 16; i++) {
        const bitOffset = 16 + i * 3;
        const index = Number((alphaData >> BigInt(bitOffset)) & 0x7n);
        alpha[i] = alphas[index];
    }

    return alpha;
}

export function decodeBC3(data: DataView, width: number, height: number): Uint8Array {
    const rgba = new Uint8Array(width * height * 4);
    const blocksX = Math.ceil(width / 4);
    const blocksY = Math.ceil(height / 4);

    let offset = 0;
    for (let by = 0; by < blocksY; by++) {
        for (let bx = 0; bx < blocksX; bx++) {
            // Read alpha block (64 bits)
            const alphaBlock = data.getBigUint64(offset, true);
            const alphas = decodeAlphaBlock(alphaBlock);

            // Read color block
            const color0Data = data.getUint16(offset + 8, true);
            const color1Data = data.getUint16(offset + 10, true);
            const indices = data.getUint32(offset + 12, true);

            const color0 = new ColorRgb565();
            color0.data = color0Data;
            const color1 = new ColorRgb565();
            color1.data = color1Data;

            const c0 = color0.toColorRgb24();
            const c1 = color1.toColorRgb24();

            // Build color palette (BC3 always uses 4-color mode)
            const colors = [
                c0,
                c1,
                interpolateThird(c0, c1, 1),
                interpolateThird(c0, c1, 2)
            ];

            // Decode 4x4 block
            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 4; x++) {
                    const px = bx * 4 + x;
                    const py = by * 4 + y;

                    if (px < width && py < height) {
                        const i = y * 4 + x;
                        const colorIndex = (indices >> (i * 2)) & 0b11;
                        const color = colors[colorIndex];

                        const dstIdx = (py * width + px) * 4;
                        rgba[dstIdx] = color.r;
                        rgba[dstIdx + 1] = color.g;
                        rgba[dstIdx + 2] = color.b;
                        rgba[dstIdx + 3] = alphas[i];
                    }
                }
            }

            offset += 16;
        }
    }

    return rgba;
}
