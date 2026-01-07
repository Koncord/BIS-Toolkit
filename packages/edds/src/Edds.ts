import { BinaryReader, decompressLz4Block } from '@bis-toolkit/utils';
import { decodeBC1, decodeBC2, decodeBC3, decodeBC7 } from '@bis-toolkit/bcn';

const DDS_MAGIC = 'DDS ';
const LZ4_MAGIC = 'LZ4 ';
const COPY_MAGIC = 'COPY';
const HEADER_SIZE = 124;
const FOURCC_DX10 = fourCcToInt('DX10');

const HEADER_CAPS_MIPMAP = 0x400000;
const HEADER_CAPS2_CUBEMAP = 0x200;
const PIXELFORMAT_FLAG_FOURCC = 0x4;
const PIXELFORMAT_FLAG_RGB = 0x40;
const PIXELFORMAT_FLAG_ALPHA_PIXELS = 0x1;
const PIXELFORMAT_FLAG_LUMINANCE = 0x20000;

export type EddsFormat = 'BC1' | 'BC2' | 'BC3' | 'BC4' | 'BC5' | 'BC6' | 'BC7' | 'RGBA8' | 'BGRA8' | 'UNKNOWN';

export interface EddsMipMap {
    width: number;
    height: number;
    data: Uint8Array;
    compression?: 'COPY' | 'LZ4';
}

interface DdsHeader {
    size: number;
    flags: number;
    height: number;
    width: number;
    pitchOrLinearSize: number;
    depth: number;
    mipMapCount: number;
    pixelFormat: DdsPixelFormat;
    caps: number;
    caps2: number;
    caps3: number;
    caps4: number;
}

interface DdsPixelFormat {
    size: number;
    flags: number;
    fourCC: number;
    rgbBitCount: number;
    rMask: number;
    gMask: number;
    bMask: number;
    aMask: number;
}

interface DdsHeaderDx10 {
    dxgiFormat: number;
    resourceDimension: number;
    miscFlag: number;
    arraySize: number;
    miscFlags2: number;
}

interface MipMapBlock {
    kind: 'COPY' | 'LZ4';
    size: number;
}

function fourCcToInt(text: string): number {
    if (text.length !== 4) {
        throw new Error('FourCC needs exactly four characters');
    }
    return (
        text.charCodeAt(0) |
        (text.charCodeAt(1) << 8) |
        (text.charCodeAt(2) << 16) |
        (text.charCodeAt(3) << 24)
    ) >>> 0;
}

function intToFourCc(value: number): string {
    return String.fromCharCode(
        value & 0xff,
        (value >> 8) & 0xff,
        (value >> 16) & 0xff,
        (value >> 24) & 0xff,
    );
}

function readDdsHeader(reader: BinaryReader): { header: DdsHeader; dx10?: DdsHeaderDx10 } {
    const size = reader.readUInt32();
    if (size !== HEADER_SIZE) {
        throw new Error(`Unexpected DDS header size ${size} (expected ${HEADER_SIZE})`);
    }

    const flags = reader.readUInt32();
    const height = reader.readUInt32();
    const width = reader.readUInt32();
    const pitchOrLinearSize = reader.readUInt32();
    const depth = reader.readUInt32();
    const mipMapCount = reader.readUInt32();

    // Skip reserved1[11]
    reader.readBytes(11 * 4);

    const pfSize = reader.readUInt32();
    const pfFlags = reader.readUInt32();
    const pfFourCC = reader.readUInt32();
    const pfRgbBitCount = reader.readUInt32();
    const pfRMask = reader.readUInt32();
    const pfGMask = reader.readUInt32();
    const pfBMask = reader.readUInt32();
    const pfAMask = reader.readUInt32();

    const pixelFormat: DdsPixelFormat = {
        size: pfSize,
        flags: pfFlags,
        fourCC: pfFourCC >>> 0,
        rgbBitCount: pfRgbBitCount,
        rMask: pfRMask >>> 0,
        gMask: pfGMask >>> 0,
        bMask: pfBMask >>> 0,
        aMask: pfAMask >>> 0,
    };

    const caps = reader.readUInt32();
    const caps2 = reader.readUInt32();
    const caps3 = reader.readUInt32();
    const caps4 = reader.readUInt32();
    const reserved2 = reader.readUInt32();
    if (reserved2 !== 0) {
        // Keep reading aligned while warning about unexpected value
        throw new Error('Invalid DDS header: reserved2 is not zero');
    }

    const header: DdsHeader = {
        size,
        flags,
        height,
        width,
        pitchOrLinearSize,
        depth,
        mipMapCount,
        pixelFormat,
        caps,
        caps2,
        caps3,
        caps4,
    };

    if ((pixelFormat.flags & PIXELFORMAT_FLAG_FOURCC) !== 0 && pixelFormat.fourCC === FOURCC_DX10) {
        const dxgiFormat = reader.readUInt32();
        const resourceDimension = reader.readUInt32();
        const miscFlag = reader.readUInt32();
        const arraySize = reader.readUInt32();
        const miscFlags2 = reader.readUInt32();

        return {
            header,
            dx10: { dxgiFormat, resourceDimension, miscFlag, arraySize, miscFlags2 },
        };
    }

    return { header };
}

function mipDimension(base: number, level: number): number {
    return Math.max(1, base >> level);
}

function expectedDataLength(format: EddsFormat, width: number, height: number): number | null {
    switch (format) {
        case 'BC1':
        case 'BC4': {
            const blocksW = Math.max(1, Math.ceil(width / 4));
            const blocksH = Math.max(1, Math.ceil(height / 4));
            return blocksW * blocksH * 8;
        }
        case 'BC2':
        case 'BC3':
        case 'BC5':
        case 'BC6':
        case 'BC7': {
            const blocksW = Math.max(1, Math.ceil(width / 4));
            const blocksH = Math.max(1, Math.ceil(height / 4));
            return blocksW * blocksH * 16;
        }
        case 'RGBA8':
        case 'BGRA8':
            return width * height * 4;
        default:
            return null;
    }
}

function detectFormat(header: DdsHeader, dx10?: DdsHeaderDx10): { format: EddsFormat; details: string } {
    if (dx10) {
        const format = mapDxgiFormat(dx10.dxgiFormat);
        return { format, details: `DXGI ${dx10.dxgiFormat}` };
    }

    const pf = header.pixelFormat;
    if ((pf.flags & PIXELFORMAT_FLAG_FOURCC) !== 0) {
        const fourCCStr = intToFourCc(pf.fourCC).toUpperCase();
        switch (fourCCStr) {
            case 'DXT1':
                return { format: 'BC1', details: fourCCStr };
            case 'DXT2':
            case 'DXT3':
                return { format: 'BC2', details: fourCCStr };
            case 'DXT4':
            case 'DXT5':
                return { format: 'BC3', details: fourCCStr };
            case 'ATI1':
            case 'BC4U':
            case 'BC4S':
                return { format: 'BC4', details: fourCCStr };
            case 'ATI2':
            case 'BC5U':
            case 'BC5S':
                return { format: 'BC5', details: fourCCStr };
            default:
                return { format: 'UNKNOWN', details: fourCCStr };
        }
    }

    if ((pf.flags & PIXELFORMAT_FLAG_RGB) !== 0) {
        if ((pf.flags & PIXELFORMAT_FLAG_ALPHA_PIXELS) !== 0 && pf.rgbBitCount === 32) {
            if (pf.rMask === 0xff && pf.gMask === 0xff00 && pf.bMask === 0xff0000 && pf.aMask === 0xff000000) {
                return { format: 'RGBA8', details: 'RGBA8' };
            }
            if (pf.rMask === 0xff0000 && pf.gMask === 0xff00 && pf.bMask === 0xff && pf.aMask === 0xff000000) {
                return { format: 'BGRA8', details: 'BGRA8' };
            }
        }
    }

    if ((pf.flags & PIXELFORMAT_FLAG_LUMINANCE) !== 0 && pf.rgbBitCount === 8) {
        return { format: 'RGBA8', details: 'LUMINANCE8' };
    }

    return { format: 'UNKNOWN', details: 'UNKNOWN' };
}

function mapDxgiFormat(dxgiFormat: number): EddsFormat {
    // Common DXGI values we expect in EDDS payloads
    switch (dxgiFormat) {
        case 71: // DXGI_FORMAT_BC1_UNORM
            return 'BC1';
        case 74: // DXGI_FORMAT_BC2_UNORM
            return 'BC2';
        case 77: // DXGI_FORMAT_BC3_UNORM
            return 'BC3';
        case 80: // DXGI_FORMAT_BC4_UNORM
            return 'BC4';
        case 83: // DXGI_FORMAT_BC5_UNORM
            return 'BC5';
        case 95: // DXGI_FORMAT_BC6H_UF16
            return 'BC6';
        case 98: // DXGI_FORMAT_BC7_UNORM
            return 'BC7';
        case 87: // DXGI_FORMAT_B8G8R8A8_UNORM
            return 'BGRA8';
        case 28: // DXGI_FORMAT_R8G8B8A8_UNORM
            return 'RGBA8';
        default:
            return 'UNKNOWN';
    }
}

function convertToRgba(mip: EddsMipMap, format: EddsFormat): Uint8Array {
    const dataView = new DataView(mip.data.buffer, mip.data.byteOffset, mip.data.byteLength);
    
    switch (format) {
        case 'BC1':
            return decodeBC1(dataView, mip.width, mip.height);
        case 'BC2':
            return decodeBC2(dataView, mip.width, mip.height);
        case 'BC3':
            return decodeBC3(dataView, mip.width, mip.height);
        case 'BC6':
            throw new Error(`RGBA conversion for BC6 (HDR) is not yet implemented`);
        case 'BC7':
            return decodeBC7(dataView, mip.width, mip.height);
        case 'RGBA8':
            return mip.data.slice();
        case 'BGRA8': {
            const rgba = new Uint8Array(mip.data.length);
            for (let i = 0; i < mip.data.length; i += 4) {
                rgba[i] = mip.data[i + 2];
                rgba[i + 1] = mip.data[i + 1];
                rgba[i + 2] = mip.data[i];
                rgba[i + 3] = mip.data[i + 3];
            }
            return rgba;
        }
        default:
            throw new Error(`RGBA conversion is not implemented for format ${format}`);
    }
}

export class Edds {
    width = 0;
    height = 0;
    format: EddsFormat = 'UNKNOWN';
    formatDetails = '';
    mipmaps: EddsMipMap[] = [];

    read(buffer: Buffer | Uint8Array): void {
        const reader = new BinaryReader(buffer);
        const magic = reader.readRawString(4);
        if (magic !== DDS_MAGIC) {
            throw new Error('File is not a valid EDDS (missing DDS magic)');
        }

        const { header, dx10 } = readDdsHeader(reader);
        const mipCount = (header.caps & HEADER_CAPS_MIPMAP) !== 0 && header.mipMapCount > 0 ? header.mipMapCount : 1;
        const faceCount = (header.caps2 & HEADER_CAPS2_CUBEMAP) !== 0 ? 6 : 1;
        if (faceCount !== 1) {
            throw new Error('Cubemap EDDS files are not supported yet');
        }

        this.width = header.width;
        this.height = header.height;

        const blocks: MipMapBlock[] = [];
        for (let i = 0; i < mipCount; i++) {
            const blockMagic = reader.readRawString(4);
            const size = reader.readInt32();
            if (blockMagic === COPY_MAGIC) {
                blocks.push({ kind: 'COPY', size });
            } else if (blockMagic === LZ4_MAGIC) {
                blocks.push({ kind: 'LZ4', size });
            } else {
                throw new Error(`Unknown EDDS block magic: ${blockMagic}`);
            }
        }

        const { format, details } = detectFormat(header, dx10);
        this.format = format;
        this.formatDetails = details;

        if (blocks.length !== mipCount) {
            throw new Error('Block header count does not match mip map count');
        }

        this.mipmaps = new Array<EddsMipMap>(mipCount);
        for (let mipIdx = 0; mipIdx < mipCount; mipIdx++) {
            const block = blocks[mipIdx];
            const mipLevel = mipCount - mipIdx - 1;
            const mipWidth = mipDimension(header.width, mipLevel);
            const mipHeight = mipDimension(header.height, mipLevel);

            let data: Uint8Array;
            if (block.kind === 'COPY') {
                const raw = reader.readBytes(block.size);
                data = new Uint8Array(raw); // copy to detach from the source buffer
            } else {
                data = decompressLz4Block(reader, block.size);
            }

            const expected = expectedDataLength(this.format, mipWidth, mipHeight);
            if (expected !== null && expected !== data.length) {
                throw new Error(`Unexpected mip level size (expected ${expected} bytes, got ${data.length})`);
            }

            this.mipmaps[mipLevel] = { width: mipWidth, height: mipHeight, data, compression: block.kind };
        }
    }

    getRgbaPixelData(mipLevel = 0): Uint8Array {
        if (this.mipmaps.length === 0) {
            throw new Error('No mipmaps loaded');
        }
        if (mipLevel < 0 || mipLevel >= this.mipmaps.length) {
            throw new RangeError(`mipLevel ${mipLevel} is out of range`);
        }

        const mip = this.mipmaps[mipLevel];
        return convertToRgba(mip, this.format);
    }

    get formatName(): string {
        if (this.formatDetails && this.format !== 'UNKNOWN') {
            return `${this.format} (${this.formatDetails})`;
        }
        return this.formatDetails || this.format;
    }
}
