/**
 * Channel swizzle operations
 */
export enum ChannelSwizzle {
    Alpha = 0,
    Red = 1,
    Green = 2,
    Blue = 3,
    InvertedAlpha = 4,
    InvertedRed = 5,
    InvertedGreen = 6,
    InvertedBlue = 7,
    One = 8
}

/**
 * RGBA swizzle configuration
 */
export class RgbaSwizzle {
    public swizBlue: ChannelSwizzle = ChannelSwizzle.Blue;
    public swizGreen: ChannelSwizzle = ChannelSwizzle.Green;
    public swizRed: ChannelSwizzle = ChannelSwizzle.Red;
    public swizAlpha: ChannelSwizzle = ChannelSwizzle.Alpha;

    static readonly Default = new RgbaSwizzle();

    equals(other: RgbaSwizzle): boolean {
        return this.swizBlue === other.swizBlue &&
               this.swizGreen === other.swizGreen &&
               this.swizRed === other.swizRed &&
               this.swizAlpha === other.swizAlpha;
    }
}

/**
 * Utility class for applying channel swizzling to RGBA data
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ChannelSwizzler {
    static apply(rgbaData: Uint8Array, swizzle: RgbaSwizzle): void {
        if (swizzle.equals(RgbaSwizzle.Default)) {
            return;
        }

        for (let pixOffset = 0; pixOffset < rgbaData.length; pixOffset += 4) {
            // Data is in BGRA format, so pack accordingly
            const pixel = 
                (rgbaData[pixOffset + 2] |           // Red at bit 0
                (rgbaData[pixOffset + 1] << 8) |     // Green at bit 8
                (rgbaData[pixOffset] << 16) |        // Blue at bit 16
                (rgbaData[pixOffset + 3] << 24)) >>> 0; // Alpha at bit 24

            // Write back in BGRA order
            rgbaData[pixOffset + 2] = this.transformChannel(pixel, swizzle.swizRed);   // Red
            rgbaData[pixOffset + 1] = this.transformChannel(pixel, swizzle.swizGreen); // Green
            rgbaData[pixOffset + 0] = this.transformChannel(pixel, swizzle.swizBlue);  // Blue
            rgbaData[pixOffset + 3] = this.transformChannel(pixel, swizzle.swizAlpha); // Alpha
        }
    }

    private static transformChannel(pixel: number, swizzle: ChannelSwizzle): number {
        if (swizzle === ChannelSwizzle.One) {
            return 0xff;
        }

        const isInverted = swizzle >= ChannelSwizzle.InvertedAlpha && 
                         swizzle <= ChannelSwizzle.InvertedBlue;

        if (isInverted) {
            swizzle = swizzle - ChannelSwizzle.InvertedAlpha + ChannelSwizzle.Alpha;
        }

        let offset: number;
        switch (swizzle) {
            case ChannelSwizzle.Red:
                offset = 0;
                break;
            case ChannelSwizzle.Green:
                offset = 8;
                break;
            case ChannelSwizzle.Blue:
                offset = 16;
                break;
            case ChannelSwizzle.Alpha:
                offset = 24;
                break;
            default:
                throw new Error(`Invalid swizzle: ${swizzle}`);
        }

        const result = (pixel >>> offset) & 0xff;
        return isInverted ? (0xff - result) : result;
    }
}
