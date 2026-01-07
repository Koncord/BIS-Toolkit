import { PaaType } from './PaaType';
import { BinaryReader } from '@bis-toolkit/utils';
import { PixelFormatConversion } from './FormatConverter';
import { lzoDecompress } from '@bis-toolkit/utils';
import { lzssDecompress } from '@bis-toolkit/utils';

/**
 * Represents a single mipmap level in a PAA texture
 */
export class Mipmap {
    public width = 0;
    public height = 0;
    public isLzss = false;
    public isLzo = false;

    private dataOffset = 0;
    private dataSize = 0;
    private rawData: Buffer | Uint8Array | null = null;
    private format!: PaaType;

    constructor(format: PaaType);
    constructor(width: number, height: number, data: Buffer | Uint8Array, format: PaaType);
    constructor(
        formatOrWidth: PaaType | number,
        height?: number,
        data?: Buffer | Uint8Array,
        format?: PaaType
    ) {
        // Distinguish between single-param constructor (format only) vs multi-param (width, height, data, format)
        // If height is provided, it's the multi-param constructor
        if (height !== undefined && data !== undefined && format !== undefined) {
            // Constructor with width, height, data, format
            this.width = formatOrWidth;
            this.height = height;
            this.format = format;
            if (this.width * this.height > 16384) { // 128x128
                this.isLzo = true;
            }
            this.dataOffset = -1;
            if (this.isLzo) {
                // TODO: Implement LZO compression
                // this.rawData = lzoCompress(data);
                this.rawData = data instanceof Uint8Array ? data : data;
                this.dataSize = this.rawData?.length ?? 0;
            } else {
                this.rawData = data instanceof Uint8Array ? data : data;
                this.dataSize = data?.length ?? 0;
            }
        } else {
            // Constructor with just format
            this.format = formatOrWidth as PaaType;
        }
    }

    read(br: BinaryReader): void {
        this.width = br.readUInt16();
        this.height = br.readUInt16();

        // Special 1234 x 8765 signature for LZSS
        if (this.width === 1234 && this.height === 8765) {
            this.width = br.readUInt16();
            this.height = br.readUInt16();
            this.isLzss = true;
        }

        // Arma 2 LZO compression - top bit of width set
        if ((this.width & 0x8000) !== 0) {
            this.width &= 0x7fff;
            this.isLzo = true;
        }

        this.dataSize = br.readInt24();
        this.dataOffset = br.pos;
        br.seek(this.dataSize, 'current');
    }

    getRawPixelData(buffer: Buffer | Uint8Array): Uint8Array {
        if (this.dataOffset === -1) {
            throw new Error('Data offset is not set');
        }

        const br = new BinaryReader(buffer);
        br.seek(this.dataOffset);

        let uncompressedSize = this.width * this.height;

        switch (this.format) {
            case PaaType.DXT1:
                uncompressedSize = Math.floor(uncompressedSize / 2);
                // Fall through
            case PaaType.DXT2:
            case PaaType.DXT3:
            case PaaType.DXT4:
            case PaaType.DXT5:
                if (!this.isLzo) {
                    uncompressedSize = this.dataSize;
                }
                break;
            case PaaType.RGBA_5551:
            case PaaType.RGBA_4444:
            case PaaType.AI88:
                uncompressedSize *= 2;
                this.isLzss = uncompressedSize > 1023;
                break;
            case PaaType.RGBA_8888:
                uncompressedSize *= 4;
                break;
        }

        if (this.isLzo) {
            const compressedData = br.readBytes(this.dataSize);
            return lzoDecompress(compressedData, uncompressedSize);
        }
        if (!this.isLzss) {
            return br.readBytes(this.dataSize);
        }
        
        // LZSS decompression
        const result = lzssDecompress(buffer, br.pos, uncompressedSize, false);
        br.seek(result.bytesRead, 'current');
        return result.data;
    }

    getRgba32PixelData(buffer: Buffer | Uint8Array): Uint8Array {
        const data = this.getRawPixelData(buffer);
        return PixelFormatConversion.convertToARGB32(data, this.width, this.height, this.format);
    }
}
