import { PaaType } from './PaaType';
import { Palette } from './Palette';
import { decodeBC1, decodeBC2, decodeBC3 } from '@bis-toolkit/bcn';

/**
 * Pixel format conversion utilities
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class PixelFormatConversion {
    private static setColor(img: Uint8Array, offset: number, a: number, r: number, g: number, b: number): void {
        img[offset] = b;
        img[offset + 1] = g;
        img[offset + 2] = r;
        img[offset + 3] = a;
    }

    static argb16ToArgb32(src: Buffer | Uint8Array): Uint8Array {
        const dst = new Uint8Array(src.length * 2);
        const nPixel = Math.floor(src.length / 2);
        
        for (let index = 0; index < nPixel; index++) {
            const hbyte = src[index * 2 + 1];
            const lbyte = src[index * 2];
            const lhbyte = hbyte & 0x0f;
            const hhbyte = (hbyte & 0xf0) >> 4;
            const llbyte = lbyte & 0x0f;
            const hlbyte = (lbyte & 0xf0) >> 4;
            const b = Math.floor(lhbyte * 255 / 15);
            const a = Math.floor(hhbyte * 255 / 15);
            const r = Math.floor(llbyte * 255 / 15);
            const g = Math.floor(hlbyte * 255 / 15);

            this.setColor(dst, index * 4, a, r, g, b);
        }

        return dst;
    }

    static argb1555ToArgb32(src: Buffer | Uint8Array): Uint8Array {
        const dst = new Uint8Array(src.length * 2);
        const nPixel = Math.floor(src.length / 2);
        const view = new DataView(src.buffer, src.byteOffset, src.byteLength);
        
        for (let index = 0; index < nPixel; index++) {
            const s = view.getUint16(index * 2, true); // true = little endian
            const abit = ((s & 0x8000) >> 15) === 1;
            const b5bit = s & 0x001f;
            const g5bit = (s & 0x03e0) >> 5;
            const r5bit = (s & 0x7c00) >> 10;
            const b = Math.floor(b5bit * 255 / 31);
            const a = abit ? 255 : 0;
            const r = Math.floor(r5bit * 255 / 31);
            const g = Math.floor(g5bit * 255 / 31);

            this.setColor(dst, index * 4, a, r, g, b);
        }

        return dst;
    }

    static ai88ToArgb32(src: Buffer | Uint8Array): Uint8Array {
        const dst = new Uint8Array(src.length * 2);
        const nPixel = Math.floor(src.length / 2);
        
        for (let index = 0; index < nPixel; index++) {
            const grey = src[index * 2];
            const alpha = src[index * 2 + 1];

            this.setColor(dst, index * 4, alpha, grey, grey, grey);
        }

        return dst;
    }

    static p8ToARGB32(src: Buffer | Uint8Array, palette: Palette): Uint8Array {
        const dst = new Uint8Array(src.length * 4);
        const colors = palette.colors;
        const nPixel = src.length;
        
        for (let index = 0; index < nPixel; index++) {
            const color = colors[src[index]];
            this.setColor(dst, index * 4, color.alpha, color.red, color.green, color.blue);
        }

        return dst;
    }
    static dxtToRgba32(data: Buffer | Uint8Array, width: number, height: number, format: string, useAlpha = true): Uint8Array {
        const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
        
        let rgba: Uint8Array;
        switch (format) {
            case 'BC1':
                rgba = decodeBC1(dataView, width, height, useAlpha);
                break;
            case 'BC2':
                rgba = decodeBC2(dataView, width, height);
                break;
            case 'BC3':
                rgba = decodeBC3(dataView, width, height);
                break;
            default:
                throw new Error(`Unsupported DXT format: ${format}`);
        }
        
        // BCn decoders return RGBA, but we need BGRA to match our other conversions
        const bgra = new Uint8Array(rgba.length);
        for (let i = 0; i < rgba.length; i += 4) {
            bgra[i] = rgba[i + 2];     // B
            bgra[i + 1] = rgba[i + 1]; // G
            bgra[i + 2] = rgba[i];     // R
            bgra[i + 3] = rgba[i + 3]; // A
        }
        return bgra;
    }

    static convertToARGB32(data: Buffer | Uint8Array, width: number, height: number, type: PaaType): Uint8Array {
        switch (type) {
            case PaaType.DXT1:
                return this.dxtToRgba32(data, width, height, 'BC1');
            case PaaType.DXT2:
                return this.dxtToRgba32(data, width, height, 'BC2');
            case PaaType.DXT3:
                return this.dxtToRgba32(data, width, height, 'BC2');
            case PaaType.DXT4:
                return this.dxtToRgba32(data, width, height, 'BC3');
            case PaaType.DXT5:
                return this.dxtToRgba32(data, width, height, 'BC3');
            case PaaType.RGBA_5551:
                return this.argb1555ToArgb32(data);
            case PaaType.RGBA_4444:
                return this.argb16ToArgb32(data);
            case PaaType.AI88:
                return this.ai88ToArgb32(data);
            case PaaType.RGBA_8888:
                return data instanceof Uint8Array ? data : new Uint8Array(data);
            default:
                throw new Error(`Unsupported PaaType: ${String(type)}`);
        }
    }
}
