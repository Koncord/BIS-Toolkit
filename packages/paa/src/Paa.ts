import { PaaType } from './PaaType';
import { PaaColor } from './PaaColor';
import { Palette } from './Palette';
import { Mipmap } from './Mipmap';
import { RgbaSwizzle, ChannelSwizzle, ChannelSwizzler } from './ChannelSwizzler';
import { BinaryReader } from '@bis-toolkit/utils';

/**
 * Main PAA file reader/writer class
 */
export class Paa {
    public type: PaaType = PaaType.DXT5;
    public isAlpha = false;
    public isTransparent = false;
    public averageColor: PaaColor | null = null;
    public maxColor: PaaColor | null = null;
    public palette: Palette = new Palette();
    public mipmaps: Mipmap[] = [];
    public channelSwizzle: RgbaSwizzle = RgbaSwizzle.Default;
    
    private procedure = '';

    /**
     * Read a PAA file from a buffer
     */
    read(buffer: Buffer | Uint8Array): void {
        const br = new BinaryReader(buffer);
        this.type = br.readUInt16() as PaaType;

        let mipMapOffsets: number[] | null = null;

        // Read tags
        while (br.readRawString(4) === 'GGAT') {
            const name = br.readRawString(4).split('').reverse().join('');
            const len = br.readInt32();

            switch (name) {
                case 'AVGC':
                    this.averageColor = new PaaColor(br.readUInt32());
                    break;
                case 'MAXC':
                    this.maxColor = new PaaColor(br.readUInt32());
                    break;
                case 'FLAG':
                    const flag = br.readInt32();
                    if ((flag & 0x1) !== 0) {this.isAlpha = true;}
                    if ((flag & 0x2) !== 0) {this.isTransparent = true;}
                    break;
                case 'SWIZ':
                    this.channelSwizzle = new RgbaSwizzle();
                    this.channelSwizzle.swizAlpha = br.readByte() as ChannelSwizzle;
                    this.channelSwizzle.swizRed = br.readByte() as ChannelSwizzle;
                    this.channelSwizzle.swizGreen = br.readByte() as ChannelSwizzle;
                    this.channelSwizzle.swizBlue = br.readByte() as ChannelSwizzle;
                    break;
                case 'PROC':
                    this.procedure = br.readRawString(len);
                    break;
                case 'OFFS':
                    const nOffsets = Math.floor(len / 4);
                    mipMapOffsets = [];
                    for (let i = 0; i < nOffsets; i++) {
                        mipMapOffsets.push(br.readUInt32());
                    }
                    break;
                default:
                    throw new Error(`Got unknown tag: ${name}`);
            }
        }

        // Seek back 4 bytes (we read past the palette marker)
        br.seek(-4, 'current');
        this.palette.read(br);

        // Read mipmaps
        this.mipmaps = [];
        if (mipMapOffsets !== null) {
            for (const mipMapOffset of mipMapOffsets) {
                if (mipMapOffset === 0) {break;}
                br.seek(mipMapOffset, 'begin');
                const mipmap = new Mipmap(this.type);
                mipmap.read(br);
                this.mipmaps.push(mipmap);
            }
        }

        // Check terminator
        const terminator = br.readUInt16();
        if (terminator !== 0) {
            throw new Error('Invalid format: terminator bytes not found');
        }
    }

    /**
     * Get ARGB32 pixel data for a specific mipmap level
     */
    getArgb32PixelData(buffer: Buffer | Uint8Array, mipLevel = 0): Uint8Array {
        if (mipLevel < 0 || mipLevel >= this.mipmaps.length) {
            throw new RangeError(`mipLevel ${mipLevel} out of range`);
        }
        const data = this.mipmaps[mipLevel].getRgba32PixelData(buffer);
        ChannelSwizzler.apply(data, this.channelSwizzle);
        return data;
    }
}
