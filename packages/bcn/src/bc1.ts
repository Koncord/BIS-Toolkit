/**
 * BC1 (DXT1) Decoder
 * Source: https://github.com/Nominom/BCnEncoder.NET
 */

import { ColorRgb565, interpolateHalf, interpolateThird } from './utils';

export function decodeBC1(data: DataView, width: number, height: number, useAlpha = false): Uint8Array {
    const rgba = new Uint8Array(width * height * 4);
    const blocksX = Math.ceil(width / 4);
    const blocksY = Math.ceil(height / 4);

    let offset = 0;
    for (let by = 0; by < blocksY; by++) {
        for (let bx = 0; bx < blocksX; bx++) {
            const color0Data = data.getUint16(offset, true);
            const color1Data = data.getUint16(offset + 2, true);
            const indices = data.getUint32(offset + 4, true);

            const color0 = new ColorRgb565();
            color0.data = color0Data;
            const color1 = new ColorRgb565();
            color1.data = color1Data;

            const c0 = color0.toColorRgb24();
            const c1 = color1.toColorRgb24();

            const hasAlphaOrBlack = color0Data <= color1Data;
            const actualUseAlpha = useAlpha && hasAlphaOrBlack;

            // Build color palette
            const colors = hasAlphaOrBlack ? [
                c0,
                c1,
                interpolateHalf(c0, c1),
                { r: 0, g: 0, b: 0 }
            ] : [
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

                        if (actualUseAlpha && colorIndex === 3) {
                            rgba[dstIdx] = 0;
                            rgba[dstIdx + 1] = 0;
                            rgba[dstIdx + 2] = 0;
                            rgba[dstIdx + 3] = 0;
                        } else {
                            rgba[dstIdx] = color.r;
                            rgba[dstIdx + 1] = color.g;
                            rgba[dstIdx + 2] = color.b;
                            rgba[dstIdx + 3] = 255;
                        }
                    }
                }
            }

            offset += 8;
        }
    }

    return rgba;
}
