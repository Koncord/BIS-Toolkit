/**
 * Shared utilities for BC decoders
 * Source: https://github.com/Nominom/BCnEncoder.NET
 */

export interface ColorRgba32 {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface ColorRgb24 {
    r: number;
    g: number;
    b: number;
}

// RGB565 color (5 bits red, 6 bits green, 5 bits blue)
export class ColorRgb565 {
    data: number;

    constructor(r?: number, g?: number, b?: number) {
        if (r !== undefined && g !== undefined && b !== undefined) {
            // Convert 8-bit RGB to 565
            const r5 = (r >> 3) & 0x1F;
            const g6 = (g >> 2) & 0x3F;
            const b5 = (b >> 3) & 0x1F;
            this.data = (r5 << 11) | (g6 << 5) | b5;
        } else {
            this.data = 0;
        }
    }

    toColorRgb24(): ColorRgb24 {
        const r5 = (this.data >> 11) & 0x1F;
        const g6 = (this.data >> 5) & 0x3F;
        const b5 = this.data & 0x1F;

        // Expand to 8-bit
        const r = (r5 << 3) | (r5 >> 2);
        const g = (g6 << 2) | (g6 >> 4);
        const b = (b5 << 3) | (b5 >> 2);

        return { r, g, b };
    }
}

// Color interpolation helpers
export function interpolateHalf(c0: ColorRgb24, c1: ColorRgb24): ColorRgb24 {
    return {
        r: ((c0.r + c1.r) / 2) | 0,
        g: ((c0.g + c1.g) / 2) | 0,
        b: ((c0.b + c1.b) / 2) | 0
    };
}

export function interpolateThird(c0: ColorRgb24, c1: ColorRgb24, step: number): ColorRgb24 {
    if (step === 1) {
        return {
            r: ((2 * c0.r + c1.r) / 3) | 0,
            g: ((2 * c0.g + c1.g) / 3) | 0,
            b: ((2 * c0.b + c1.b) / 3) | 0
        };
    } else { // step === 2
        return {
            r: ((c0.r + 2 * c1.r) / 3) | 0,
            g: ((c0.g + 2 * c1.g) / 3) | 0,
            b: ((c0.b + 2 * c1.b) / 3) | 0
        };
    }
}

// Byte interpolation for alpha/component channels
export function interpolateByteFifth(e0: number, e1: number, step: number): number {
    if (step === 1) return ((4 * e0 + e1) / 5) | 0;
    if (step === 2) return ((3 * e0 + 2 * e1) / 5) | 0;
    if (step === 3) return ((2 * e0 + 3 * e1) / 5) | 0;
    return ((e0 + 4 * e1) / 5) | 0; // step === 4
}

export function interpolateByteSeventh(e0: number, e1: number, step: number): number {
    if (step === 1) return ((6 * e0 + e1) / 7) | 0;
    if (step === 2) return ((5 * e0 + 2 * e1) / 7) | 0;
    if (step === 3) return ((4 * e0 + 3 * e1) / 7) | 0;
    if (step === 4) return ((3 * e0 + 4 * e1) / 7) | 0;
    if (step === 5) return ((2 * e0 + 5 * e1) / 7) | 0;
    return ((e0 + 6 * e1) / 7) | 0; // step === 6
}
