/**
 * BC7 Decoder - Direct port from BCnEnc.Net
 * Source: https://github.com/Nominom/BCnEncoder.NET
 */

import { ColorRgba32 } from './utils';

// ByteHelper utilities
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class ByteHelper {
    static extract(source: bigint, index: number, bitCount: number): number {
        const mask = (1n << BigInt(bitCount)) - 1n;
        return Number((source >> BigInt(index)) & mask);
    }

    static extractFrom128(low: bigint, high: bigint, index: number, bitCount: number): number {
        // Extract from low
        if (index + bitCount <= 64) {
            return ByteHelper.extract(low, index, bitCount);
        }

        // Extract from high
        if (index >= 64) {
            return ByteHelper.extract(high, index - 64, bitCount);
        }

        // Handle boundary case
        const lowBitCount = 64 - index;
        const highBitCount = bitCount - lowBitCount;

        const lowValue = ByteHelper.extract(low, index, lowBitCount);
        const highValue = ByteHelper.extract(high, 0, highBitCount);
        
        return lowValue | (highValue << lowBitCount);
    }

    static extract1(source: bigint, index: number): number {
        return Number((source >> BigInt(index)) & 1n);
    }

    static extract2(source: bigint, index: number): number {
        return Number((source >> BigInt(index)) & 3n);
    }

    static extract4(source: bigint, index: number): number {
        return Number((source >> BigInt(index)) & 15n);
    }

    static extract6(source: bigint, index: number): number {
        return Number((source >> BigInt(index)) & 63n);
    }
}

// Interpolation weights
const COLOR_WEIGHTS_2 = [0, 21, 43, 64];
const COLOR_WEIGHTS_3 = [0, 9, 18, 27, 37, 46, 55, 64];
const COLOR_WEIGHTS_4 = [0, 4, 9, 13, 17, 21, 26, 30, 34, 38, 43, 47, 51, 55, 60, 64];

function interpolateByte(e0: number, e1: number, index: number, indexPrecision: number): number {
    if (indexPrecision === 0) return e0;
    
    const weights = indexPrecision === 2 ? COLOR_WEIGHTS_2 :
                   indexPrecision === 3 ? COLOR_WEIGHTS_3 :
                   COLOR_WEIGHTS_4;
    
    const w = weights[index];
    return ((64 - w) * e0 + w * e1 + 32) >> 6;
}

// Partition tables (complete 64 patterns)
const SUBSETS_2_PARTITION_TABLE = [
    [0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1],[0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
    [0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1],[0,0,0,1,0,0,1,1,0,0,1,1,0,1,1,1],
    [0,0,0,0,0,0,0,1,0,0,0,1,0,0,1,1],[0,0,1,1,0,1,1,1,0,1,1,1,1,1,1,1],
    [0,0,0,1,0,0,1,1,0,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,1,0,0,1,1,0,1,1,1],
    [0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,1],[0,0,1,1,0,1,1,1,1,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,1,0,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,0,0,0,1,0,1,1,1],
    [0,0,0,1,0,1,1,1,1,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
    [0,0,0,0,1,0,0,0,1,1,1,0,1,1,1,1],[0,1,1,1,0,0,0,1,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,1,0,0,0,1,1,1,0],[0,1,1,1,0,0,1,1,0,0,0,1,0,0,0,0],
    [0,0,1,1,0,0,0,1,0,0,0,0,0,0,0,0],[0,0,0,0,1,0,0,0,1,1,0,0,1,1,1,0],
    [0,0,0,0,0,0,0,0,1,0,0,0,1,1,0,0],[0,1,1,1,0,0,1,1,0,0,1,1,0,0,0,1],
    [0,0,1,1,0,0,0,1,0,0,0,1,0,0,0,0],[0,0,0,0,1,0,0,0,1,0,0,0,1,1,0,0],
    [0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0],[0,0,1,1,0,1,1,0,0,1,1,0,1,1,0,0],
    [0,0,0,1,0,1,1,1,1,1,1,0,1,0,0,0],[0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,1,1,1,0,0,0,1,1,0,0,0,1,1,1,0],[0,0,1,1,1,0,0,1,1,0,0,1,1,1,0,0],
    [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1],[0,0,0,0,1,1,1,1,0,0,0,0,1,1,1,1],
    [0,1,0,1,1,0,1,0,0,1,0,1,1,0,1,0],[0,0,1,1,0,0,1,1,1,1,0,0,1,1,0,0],
    [0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0],[0,1,0,1,0,1,0,1,1,0,1,0,1,0,1,0],
    [0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1],[0,1,0,1,1,0,1,0,1,0,1,0,0,1,0,1],
    [0,1,1,1,0,0,1,1,1,1,0,0,1,1,1,0],[0,0,0,1,0,0,1,1,1,1,0,0,1,0,0,0],
    [0,0,1,1,0,0,1,0,0,1,0,0,1,1,0,0],[0,0,1,1,1,0,1,1,1,1,0,1,1,1,0,0],
    [0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0],[0,0,1,1,1,1,0,0,1,1,0,0,0,0,1,1],
    [0,1,1,0,0,1,1,0,1,0,0,1,1,0,0,1],[0,0,0,0,0,1,1,0,0,1,1,0,0,0,0,0],
    [0,1,0,0,1,1,1,0,0,1,0,0,0,0,0,0],[0,0,1,0,0,1,1,1,0,0,1,0,0,0,0,0],
    [0,0,0,0,0,0,1,0,0,1,1,1,0,0,1,0],[0,0,0,0,0,1,0,0,1,1,1,0,0,1,0,0],
    [0,1,1,0,1,1,0,0,1,0,0,1,0,0,1,1],[0,0,1,1,0,1,1,0,1,1,0,0,1,0,0,1],
    [0,1,1,0,0,0,1,1,1,0,0,1,1,1,0,0],[0,0,1,1,1,0,0,1,1,1,0,0,0,1,1,0],
    [0,1,1,0,1,1,0,0,1,1,0,0,1,0,0,1],[0,1,1,0,0,0,1,1,0,0,1,1,1,0,0,1],
    [0,1,1,1,1,1,1,0,1,0,0,0,0,0,0,1],[0,0,0,1,1,0,0,0,1,1,1,0,0,1,1,1],
    [0,0,0,0,1,1,1,1,0,0,1,1,0,0,1,1],[0,0,1,1,0,0,1,1,1,1,1,1,0,0,0,0],
    [0,0,1,0,0,0,1,0,1,1,1,0,1,1,1,0],[0,1,0,0,0,1,0,0,0,1,1,1,0,1,1,1]
];

const SUBSETS_3_PARTITION_TABLE = [
    [0,0,1,1,0,0,1,1,0,2,2,1,2,2,2,2],[0,0,0,1,0,0,1,1,2,2,1,1,2,2,2,1],
    [0,0,0,0,2,0,0,1,2,2,1,1,2,2,1,1],[0,2,2,2,0,0,2,2,0,0,1,1,0,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,2,2,1,1,2,2],[0,0,1,1,0,0,1,1,0,0,2,2,0,0,2,2],
    [0,0,2,2,0,0,2,2,1,1,1,1,1,1,1,1],[0,0,1,1,0,0,1,1,2,2,1,1,2,2,1,1],
    [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2],[0,0,0,0,1,1,1,1,1,1,1,1,2,2,2,2],
    [0,0,0,0,1,1,1,1,2,2,2,2,2,2,2,2],[0,0,1,2,0,0,1,2,0,0,1,2,0,0,1,2],
    [0,1,1,2,0,1,1,2,0,1,1,2,0,1,1,2],[0,1,2,2,0,1,2,2,0,1,2,2,0,1,2,2],
    [0,0,1,1,0,1,1,2,1,1,2,2,1,2,2,2],[0,0,1,1,2,0,0,1,2,2,0,0,2,2,2,0],
    [0,0,0,1,0,0,1,1,0,1,1,2,1,1,2,2],[0,1,1,1,0,0,1,1,2,0,0,1,2,2,0,0],
    [0,0,0,0,1,1,2,2,1,1,2,2,1,1,2,2],[0,0,2,2,0,0,2,2,0,0,2,2,1,1,1,1],
    [0,1,1,1,0,1,1,1,0,2,2,2,0,2,2,2],[0,0,0,1,0,0,0,1,2,2,2,1,2,2,2,1],
    [0,0,0,0,0,0,1,1,0,1,2,2,0,1,2,2],[0,0,0,0,1,1,0,0,2,2,1,0,2,2,1,0],
    [0,1,2,2,0,1,2,2,0,0,1,1,0,0,0,0],[0,0,1,2,0,0,1,2,1,1,2,2,2,2,2,2],
    [0,1,1,0,1,2,2,1,1,2,2,1,0,1,1,0],[0,0,0,0,0,1,1,0,1,2,2,1,1,2,2,1],
    [0,0,2,2,1,1,0,2,1,1,0,2,0,0,2,2],[0,1,1,0,0,1,1,0,2,0,0,2,2,2,2,2],
    [0,0,1,1,0,1,2,2,0,1,2,2,0,0,1,1],[0,0,0,0,2,0,0,0,2,2,1,1,2,2,2,1],
    [0,0,0,0,0,0,0,2,1,1,2,2,1,2,2,2],[0,2,2,2,0,0,2,2,0,0,1,2,0,0,1,1],
    [0,0,1,1,0,0,1,2,0,0,2,2,0,2,2,2],[0,1,2,0,0,1,2,0,0,1,2,0,0,1,2,0],
    [0,0,0,0,1,1,1,1,2,2,2,2,0,0,0,0],[0,1,2,0,1,2,0,1,2,0,1,2,0,1,2,0],
    [0,1,2,0,2,0,1,2,1,2,0,1,0,1,2,0],[0,0,1,1,2,2,0,0,1,1,2,2,0,0,1,1],
    [0,0,1,1,1,1,2,2,2,2,0,0,0,0,1,1],[0,1,0,1,0,1,0,1,2,2,2,2,2,2,2,2],
    [0,0,0,0,0,0,0,0,2,1,2,1,2,1,2,1],[0,0,2,2,1,1,2,2,0,0,2,2,1,1,2,2],
    [0,0,2,2,0,0,1,1,0,0,2,2,0,0,1,1],[0,2,2,0,1,2,2,1,0,2,2,0,1,2,2,1],
    [0,1,0,1,2,2,2,2,2,2,2,2,0,1,0,1],[0,0,0,0,2,1,2,1,2,1,2,1,2,1,2,1],
    [0,1,0,1,0,1,0,1,0,1,0,1,2,2,2,2],[0,2,2,2,0,1,1,1,0,2,2,2,0,1,1,1],
    [0,0,0,2,1,1,1,2,0,0,0,2,1,1,1,2],[0,0,0,0,2,1,1,2,2,1,1,2,2,1,1,2],
    [0,2,2,2,0,1,1,1,0,1,1,1,0,2,2,2],[0,0,0,2,1,1,1,2,1,1,1,2,0,0,0,2],
    [0,1,1,0,0,1,1,0,0,1,1,0,2,2,2,2],[0,0,0,0,0,0,0,0,2,1,1,2,2,1,1,2],
    [0,1,1,0,0,1,1,0,2,2,2,2,2,2,2,2],[0,0,2,2,0,0,1,1,0,0,1,1,0,0,2,2],
    [0,0,2,2,1,1,2,2,1,1,2,2,0,0,2,2],[0,0,0,0,0,0,0,0,0,0,0,0,2,1,1,2],
    [0,0,0,2,0,0,0,1,0,0,0,2,0,0,0,1],[0,2,2,2,1,2,2,2,0,2,2,2,1,2,2,2],
    [0,1,0,1,2,2,2,2,2,2,2,2,2,2,2,2],[0,1,1,1,2,0,1,1,2,2,0,1,2,2,2,0]
];

const SUBSETS_2_ANCHOR_INDICES = [
    15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,
    15,2,8,2,2,8,8,15,2,8,2,2,8,8,2,2,
    15,15,6,8,2,8,15,15,2,8,2,2,2,15,15,6,
    6,2,6,8,15,15,2,2,15,15,15,15,15,2,2,15
];

const SUBSETS_3_ANCHOR_INDICES_2 = [
    3,3,15,15,8,3,15,15,8,8,6,6,6,5,3,3,
    3,3,8,15,3,3,6,10,5,8,8,6,8,5,15,15,
    8,15,3,5,6,10,8,15,15,3,15,5,15,15,15,15,
    3,15,5,5,5,8,5,10,5,10,8,13,15,12,3,3
];

const SUBSETS_3_ANCHOR_INDICES_3 = [
    15,8,8,3,15,15,3,8,15,15,15,15,15,15,15,8,
    15,8,15,3,15,8,15,8,3,15,6,10,15,15,10,8,
    15,3,15,10,10,8,9,10,6,15,8,15,3,6,6,8,
    15,3,15,15,15,15,15,15,15,15,15,15,3,15,15,8
];

class Bc7Block {
    private lowBits: bigint;
    private highBits: bigint;

    constructor(data: Uint8Array) {
        // Read 16 bytes as two 64-bit values
        const view = new DataView(data.buffer, data.byteOffset, 16);
        this.lowBits = view.getBigUint64(0, true);
        this.highBits = view.getBigUint64(8, true);
    }

    private getType(): number {
        for (let i = 0; i < 8; i++) {
            const mask = 1n << BigInt(i);
            if ((this.lowBits & mask) === mask) {
                return i;
            }
        }
        return 8; // Reserved
    }

    private getNumSubsets(type: number): number {
        if (type === 0 || type === 2) return 3;
        if (type === 1 || type === 3 || type === 7) return 2;
        return 1;
    }

    private getPartitionSetId(type: number): number {
        switch (type) {
            case 0: return ByteHelper.extract4(this.lowBits, 1);
            case 1: return ByteHelper.extract6(this.lowBits, 2);
            case 2: return ByteHelper.extract6(this.lowBits, 3);
            case 3: return ByteHelper.extract6(this.lowBits, 4);
            case 7: return ByteHelper.extract6(this.lowBits, 8);
            default: return 0;
        }
    }

    private getRotationBits(type: number): number {
        if (type === 4) return ByteHelper.extract2(this.lowBits, 5);
        if (type === 5) return ByteHelper.extract2(this.lowBits, 6);
        return 0;
    }

    private getColorComponentPrecision(type: number): number {
        const precisions = [5, 7, 5, 8, 5, 7, 8, 6];
        return precisions[type] || 0;
    }

    private getAlphaComponentPrecision(type: number): number {
        if (type === 4) return 6;
        if (type === 5 || type === 6) return 8;
        if (type === 7) return 6;
        return 0;
    }

    private getType4IndexMode(): number {
        return ByteHelper.extract1(this.lowBits, 7);
    }

    private getColorIndexBitCount(type: number): number {
        if (type === 0 || type === 1) return 3;
        if (type === 2 || type === 3 || type === 5 || type === 7) return 2;
        if (type === 4) {
            const indexMode = this.getType4IndexMode();
            return indexMode === 0 ? 2 : 3;
        }
        if (type === 6) return 4;
        return 0;
    }

    private getAlphaIndexBitCount(type: number): number {
        if (type === 4) {
            const indexMode = this.getType4IndexMode();
            return indexMode === 0 ? 3 : 2;
        }
        if (type === 5 || type === 7) return 2;
        if (type === 6) return 4;
        return 0;
    }

    private extractRawEndpoints(type: number, numSubsets: number): ColorRgba32[] {
        const endpoints: ColorRgba32[] = Array(numSubsets * 2).fill(null).map(() => ({ r: 0, g: 0, b: 0, a: 0 }));

        switch (type) {
            case 0:
                for (let i = 0; i < 6; i++) {
                    endpoints[i].r = ByteHelper.extractFrom128(this.lowBits, this.highBits, 5 + i * 4, 4);
                    endpoints[i].g = ByteHelper.extractFrom128(this.lowBits, this.highBits, 29 + i * 4, 4);
                    endpoints[i].b = ByteHelper.extractFrom128(this.lowBits, this.highBits, 53 + i * 4, 4);
                }
                break;
            case 1:
                for (let i = 0; i < 4; i++) {
                    endpoints[i].r = ByteHelper.extractFrom128(this.lowBits, this.highBits, 8 + i * 6, 6);
                    endpoints[i].g = ByteHelper.extractFrom128(this.lowBits, this.highBits, 32 + i * 6, 6);
                    endpoints[i].b = ByteHelper.extractFrom128(this.lowBits, this.highBits, 56 + i * 6, 6);
                }
                break;
            case 2:
                for (let i = 0; i < 6; i++) {
                    endpoints[i].r = ByteHelper.extractFrom128(this.lowBits, this.highBits, 9 + i * 5, 5);
                    endpoints[i].g = ByteHelper.extractFrom128(this.lowBits, this.highBits, 39 + i * 5, 5);
                    endpoints[i].b = ByteHelper.extractFrom128(this.lowBits, this.highBits, 69 + i * 5, 5);
                }
                break;
            case 3:
                for (let i = 0; i < 4; i++) {
                    endpoints[i].r = ByteHelper.extractFrom128(this.lowBits, this.highBits, 10 + i * 7, 7);
                    endpoints[i].g = ByteHelper.extractFrom128(this.lowBits, this.highBits, 38 + i * 7, 7);
                    endpoints[i].b = ByteHelper.extractFrom128(this.lowBits, this.highBits, 66 + i * 7, 7);
                }
                break;
            case 4:
                endpoints[0].r = ByteHelper.extractFrom128(this.lowBits, this.highBits, 8, 5);
                endpoints[1].r = ByteHelper.extractFrom128(this.lowBits, this.highBits, 13, 5);
                endpoints[0].g = ByteHelper.extractFrom128(this.lowBits, this.highBits, 18, 5);
                endpoints[1].g = ByteHelper.extractFrom128(this.lowBits, this.highBits, 23, 5);
                endpoints[0].b = ByteHelper.extractFrom128(this.lowBits, this.highBits, 28, 5);
                endpoints[1].b = ByteHelper.extractFrom128(this.lowBits, this.highBits, 33, 5);
                endpoints[0].a = ByteHelper.extractFrom128(this.lowBits, this.highBits, 38, 6);
                endpoints[1].a = ByteHelper.extractFrom128(this.lowBits, this.highBits, 44, 6);
                break;
            case 5:
                endpoints[0].r = ByteHelper.extractFrom128(this.lowBits, this.highBits, 8, 7);
                endpoints[1].r = ByteHelper.extractFrom128(this.lowBits, this.highBits, 15, 7);
                endpoints[0].g = ByteHelper.extractFrom128(this.lowBits, this.highBits, 22, 7);
                endpoints[1].g = ByteHelper.extractFrom128(this.lowBits, this.highBits, 29, 7);
                endpoints[0].b = ByteHelper.extractFrom128(this.lowBits, this.highBits, 36, 7);
                endpoints[1].b = ByteHelper.extractFrom128(this.lowBits, this.highBits, 43, 7);
                endpoints[0].a = ByteHelper.extractFrom128(this.lowBits, this.highBits, 50, 8);
                endpoints[1].a = ByteHelper.extractFrom128(this.lowBits, this.highBits, 58, 8);
                break;
            case 6:
                endpoints[0].r = ByteHelper.extractFrom128(this.lowBits, this.highBits, 7, 7);
                endpoints[1].r = ByteHelper.extractFrom128(this.lowBits, this.highBits, 14, 7);
                endpoints[0].g = ByteHelper.extractFrom128(this.lowBits, this.highBits, 21, 7);
                endpoints[1].g = ByteHelper.extractFrom128(this.lowBits, this.highBits, 28, 7);
                endpoints[0].b = ByteHelper.extractFrom128(this.lowBits, this.highBits, 35, 7);
                endpoints[1].b = ByteHelper.extractFrom128(this.lowBits, this.highBits, 42, 7);
                endpoints[0].a = ByteHelper.extractFrom128(this.lowBits, this.highBits, 49, 7);
                endpoints[1].a = ByteHelper.extractFrom128(this.lowBits, this.highBits, 56, 7);
                break;
            case 7:
                for (let i = 0; i < 4; i++) {
                    endpoints[i].r = ByteHelper.extractFrom128(this.lowBits, this.highBits, 14 + i * 5, 5);
                    endpoints[i].g = ByteHelper.extractFrom128(this.lowBits, this.highBits, 34 + i * 5, 5);
                    endpoints[i].b = ByteHelper.extractFrom128(this.lowBits, this.highBits, 54 + i * 5, 5);
                    endpoints[i].a = ByteHelper.extractFrom128(this.lowBits, this.highBits, 74 + i * 5, 5);
                }
                break;
        }

        return endpoints;
    }

    private extractPBits(type: number, _numSubsets: number): number[] {
        switch (type) {
            case 0:
                return [
                    ByteHelper.extract1(this.highBits, 77 - 64),
                    ByteHelper.extract1(this.highBits, 78 - 64),
                    ByteHelper.extract1(this.highBits, 79 - 64),
                    ByteHelper.extract1(this.highBits, 80 - 64),
                    ByteHelper.extract1(this.highBits, 81 - 64),
                    ByteHelper.extract1(this.highBits, 82 - 64)
                ];
            case 1:
                return [
                    ByteHelper.extract1(this.highBits, 80 - 64),
                    ByteHelper.extract1(this.highBits, 81 - 64)
                ];
            case 3:
                return [
                    ByteHelper.extract1(this.highBits, 94 - 64),
                    ByteHelper.extract1(this.highBits, 95 - 64),
                    ByteHelper.extract1(this.highBits, 96 - 64),
                    ByteHelper.extract1(this.highBits, 97 - 64)
                ];
            case 6:
                return [
                    ByteHelper.extract1(this.lowBits, 63),
                    ByteHelper.extract1(this.highBits, 0)
                ];
            case 7:
                return [
                    ByteHelper.extract1(this.highBits, 94 - 64),
                    ByteHelper.extract1(this.highBits, 95 - 64),
                    ByteHelper.extract1(this.highBits, 96 - 64),
                    ByteHelper.extract1(this.highBits, 97 - 64)
                ];
            default:
                return [];
        }
    }

    private hasPBits(type: number): boolean {
        return type === 0 || type === 1 || type === 3 || type === 6 || type === 7;
    }

    private hasAlpha(type: number): boolean {
        return type === 4 || type === 5 || type === 6 || type === 7;
    }

    private finalizeEndpoints(endpoints: ColorRgba32[], type: number): void {
        const hasPBits = this.hasPBits(type);
        
        if (hasPBits) {
            const pBits = this.extractPBits(type, endpoints.length);
            
            // Left shift by 1
            for (const ep of endpoints) {
                ep.r <<= 1;
                ep.g <<= 1;
                ep.b <<= 1;
                ep.a <<= 1;
            }

            // Apply P-bits
            if (type === 1) {
                // Shared P-bits for Type 1
                endpoints[0].r |= pBits[0]; endpoints[0].g |= pBits[0]; endpoints[0].b |= pBits[0];
                endpoints[1].r |= pBits[0]; endpoints[1].g |= pBits[0]; endpoints[1].b |= pBits[0];
                endpoints[2].r |= pBits[1]; endpoints[2].g |= pBits[1]; endpoints[2].b |= pBits[1];
                endpoints[3].r |= pBits[1]; endpoints[3].g |= pBits[1]; endpoints[3].b |= pBits[1];
            } else {
                for (let i = 0; i < endpoints.length; i++) {
                    endpoints[i].r |= pBits[i];
                    endpoints[i].g |= pBits[i];
                    endpoints[i].b |= pBits[i];
                    if (this.hasAlpha(type)) {
                        endpoints[i].a |= pBits[i];
                    }
                }
            }
        }

        const colorPrec = this.getColorComponentPrecision(type);
        const alphaPrec = this.getAlphaComponentPrecision(type);

        for (const ep of endpoints) {
            // Left shift to place MSB in bit 7
            ep.r = (ep.r << (8 - colorPrec)) | (ep.r >> (colorPrec - (8 - colorPrec)));
            ep.g = (ep.g << (8 - colorPrec)) | (ep.g >> (colorPrec - (8 - colorPrec)));
            ep.b = (ep.b << (8 - colorPrec)) | (ep.b >> (colorPrec - (8 - colorPrec)));
            ep.a = alphaPrec > 0 
                ? (ep.a << (8 - alphaPrec)) | (ep.a >> (alphaPrec - (8 - alphaPrec)))
                : 255;
        }

        if (!this.hasAlpha(type)) {
            for (const ep of endpoints) {
                ep.a = 255;
            }
        }
    }

    private getPartitionIndex(numSubsets: number, partitionSetId: number, pixelIndex: number): number {
        if (numSubsets === 1) return 0;
        if (numSubsets === 2) return SUBSETS_2_PARTITION_TABLE[partitionSetId][pixelIndex];
        return SUBSETS_3_PARTITION_TABLE[partitionSetId][pixelIndex];
    }

    private getIndexBegin(type: number, bitCount: number, isAlpha: boolean): number {
        switch (type) {
            case 0: return 83;
            case 1: return 82;
            case 2: return 99;
            case 3: return 98;
            case 4: return bitCount === 2 ? 50 : 81;
            case 5: return isAlpha ? 97 : 66;
            case 6: return 65;
            case 7: return 98;
            default: return 0;
        }
    }

    private getIndexBitCount(numSubsets: number, partitionIndex: number, bitCount: number, pixelIndex: number): number {
        if (pixelIndex === 0) return bitCount - 1;
        
        if (numSubsets === 2) {
            const anchorIndex = SUBSETS_2_ANCHOR_INDICES[partitionIndex];
            if (pixelIndex === anchorIndex) return bitCount - 1;
        } else if (numSubsets === 3) {
            const anchor2 = SUBSETS_3_ANCHOR_INDICES_2[partitionIndex];
            const anchor3 = SUBSETS_3_ANCHOR_INDICES_3[partitionIndex];
            if (pixelIndex === anchor2 || pixelIndex === anchor3) return bitCount - 1;
        }
        
        return bitCount;
    }

    private getIndexOffset(type: number, numSubsets: number, partitionIndex: number, bitCount: number, pixelIndex: number): number {
        if (pixelIndex === 0) return 0;
        
        if (numSubsets === 1) {
            return bitCount * pixelIndex - 1;
        }

        if (numSubsets === 2) {
            const anchorIndex = SUBSETS_2_ANCHOR_INDICES[partitionIndex];
            if (pixelIndex <= anchorIndex) {
                return bitCount * pixelIndex - 1;
            } else {
                return bitCount * pixelIndex - 2;
            }
        }

        if (numSubsets === 3) {
            const anchor2 = SUBSETS_3_ANCHOR_INDICES_2[partitionIndex];
            const anchor3 = SUBSETS_3_ANCHOR_INDICES_3[partitionIndex];

            if (pixelIndex <= anchor2 && pixelIndex <= anchor3) {
                return bitCount * pixelIndex - 1;
            } else if (pixelIndex > anchor2 && pixelIndex > anchor3) {
                return bitCount * pixelIndex - 3;
            } else {
                return bitCount * pixelIndex - 2;
            }
        }

        return 0;
    }

    private getColorIndex(type: number, numSubsets: number, partitionIndex: number, bitCount: number, pixelIndex: number): number {
        const indexOffset = this.getIndexOffset(type, numSubsets, partitionIndex, bitCount, pixelIndex);
        const indexBitCount = this.getIndexBitCount(numSubsets, partitionIndex, bitCount, pixelIndex);
        const indexBegin = this.getIndexBegin(type, bitCount, false);
        return ByteHelper.extractFrom128(this.lowBits, this.highBits, indexBegin + indexOffset, indexBitCount);
    }

    private getAlphaIndex(type: number, numSubsets: number, partitionIndex: number, bitCount: number, pixelIndex: number): number {
        if (bitCount === 0) return 0;
        const indexOffset = this.getIndexOffset(type, numSubsets, partitionIndex, bitCount, pixelIndex);
        const indexBitCount = this.getIndexBitCount(numSubsets, partitionIndex, bitCount, pixelIndex);
        const indexBegin = this.getIndexBegin(type, bitCount, true);
        return ByteHelper.extractFrom128(this.lowBits, this.highBits, indexBegin + indexOffset, indexBitCount);
    }

    private swapChannels(color: ColorRgba32, rotation: number): ColorRgba32 {
        switch (rotation) {
            case 0: return color;
            case 1: return { r: color.a, g: color.g, b: color.b, a: color.r };
            case 2: return { r: color.r, g: color.a, b: color.b, a: color.g };
            case 3: return { r: color.r, g: color.g, b: color.a, a: color.b };
            default: return color;
        }
    }

    decode(): Uint8Array {
        const output = new Uint8Array(16 * 4);
        const type = this.getType();

        if (type === 8) {
            // Reserved type - return error color (magenta)
            for (let i = 0; i < 16; i++) {
                output[i * 4] = 255;
                output[i * 4 + 1] = 0;
                output[i * 4 + 2] = 255;
                output[i * 4 + 3] = 255;
            }
            return output;
        }

        const numSubsets = this.getNumSubsets(type);
        const partitionSetId = this.getPartitionSetId(type);
        const rotation = this.getRotationBits(type);

        const endpoints = this.extractRawEndpoints(type, numSubsets);
        this.finalizeEndpoints(endpoints, type);

        const colorBitCount = this.getColorIndexBitCount(type);
        const alphaBitCount = this.getAlphaIndexBitCount(type);

        for (let i = 0; i < 16; i++) {
            const subsetIndex = this.getPartitionIndex(numSubsets, partitionSetId, i);
            const ep0 = endpoints[2 * subsetIndex];
            const ep1 = endpoints[2 * subsetIndex + 1];

            const colorIndex = this.getColorIndex(type, numSubsets, partitionSetId, colorBitCount, i);
            const alphaIndex = this.getAlphaIndex(type, numSubsets, partitionSetId, alphaBitCount, i);

            let color: ColorRgba32 = {
                r: interpolateByte(ep0.r, ep1.r, colorIndex, colorBitCount),
                g: interpolateByte(ep0.g, ep1.g, colorIndex, colorBitCount),
                b: interpolateByte(ep0.b, ep1.b, colorIndex, colorBitCount),
                a: interpolateByte(ep0.a, ep1.a, alphaIndex, alphaBitCount || colorBitCount)
            };

            if (rotation > 0) {
                color = this.swapChannels(color, rotation);
            }

            output[i * 4] = color.r;
            output[i * 4 + 1] = color.g;
            output[i * 4 + 2] = color.b;
            output[i * 4 + 3] = color.a;
        }

        return output;
    }
}

export function decodeBC7(imageData: DataView, width: number, height: number): Uint8Array {
    const rgba = new Uint8Array(width * height * 4);
    const blocksX = Math.ceil(width / 4);
    const blocksY = Math.ceil(height / 4);

    let offset = 0;
    for (let by = 0; by < blocksY; by++) {
        for (let bx = 0; bx < blocksX; bx++) {
            const blockData = new Uint8Array(16);
            for (let i = 0; i < 16; i++) {
                blockData[i] = imageData.getUint8(offset + i);
            }
            
            const block = new Bc7Block(blockData);
            const decodedBlock = block.decode();

            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 4; x++) {
                    const px = bx * 4 + x;
                    const py = by * 4 + y;
                    
                    if (px < width && py < height) {
                        const srcIdx = (y * 4 + x) * 4;
                        const dstIdx = (py * width + px) * 4;
                        rgba[dstIdx] = decodedBlock[srcIdx];
                        rgba[dstIdx + 1] = decodedBlock[srcIdx + 1];
                        rgba[dstIdx + 2] = decodedBlock[srcIdx + 2];
                        rgba[dstIdx + 3] = decodedBlock[srcIdx + 3];
                    }
                }
            }

            offset += 16;
        }
    }

    return rgba;
}
