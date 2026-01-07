/**
 * BC2 (DXT3) Decoder - RGBA with explicit alpha
 * Source: https://github.com/Nominom/BCnEncoder.NET
 */

import { ColorRgb565, interpolateThird } from './utils';

export function decodeBC2(data: DataView, width: number, height: number): Uint8Array {
    const rgba = new Uint8Array(width * height * 4);
    const blocksX = Math.ceil(width / 4);
    const blocksY = Math.ceil(height / 4);

    let offset = 0;
    for (let by = 0; by < blocksY; by++) {
        for (let bx = 0; bx < blocksX; bx++) {
            // Read alpha block (64 bits = 16 pixels * 4 bits each)
            const alphaLow = data.getUint32(offset, true);
            const alphaHigh = data.getUint32(offset + 4, true);

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

            // Build color palette (BC2 always uses 4-color mode)
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

                        // Extract 4-bit alpha
                        const alphaIndex = i * 4;
                        let alpha: number;
                        if (alphaIndex < 32) {
                            alpha = (alphaLow >> alphaIndex) & 0xF;
                        } else {
                            alpha = (alphaHigh >> (alphaIndex - 32)) & 0xF;
                        }
                        // Expand 4-bit alpha to 8-bit
                        alpha = (alpha << 4) | alpha;

                        const dstIdx = (py * width + px) * 4;
                        rgba[dstIdx] = color.r;
                        rgba[dstIdx + 1] = color.g;
                        rgba[dstIdx + 2] = color.b;
                        rgba[dstIdx + 3] = alpha;
                    }
                }
            }

            offset += 16;
        }
    }

    return rgba;
}
