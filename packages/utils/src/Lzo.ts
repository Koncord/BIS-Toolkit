/**
 * LZO1X compression and decompression
 * Based on https://github.com/thaumictom/lzo-ts
 * @license GPL-3.0
 */

export interface LzoDecompressResult {
    data: Uint8Array;
    bytesRead: number;
}

/**
 * Compress and decompress data using the LZO1X-1 algorithm.
 */
export class LZO {
    private _blockSize = 128 * 1024;

    public get blockSize(): number {
        return this._blockSize;
    }

    public set blockSize(value: number) {
        if (value <= 0) throw new Error('Block size must be a positive integer');
        this._blockSize = value;
    }

    private _minNewSize = this.blockSize;

    private _out = new Uint8Array(256 * 1024);
    private _cbl = 0;
    private _t = 0;

    private _inputPointer = 0;
    private _outputPointer = 0;
    private _matchPosition = 0;

    private _skipToFirstLiteralFunc = false;

    private _buffer!: Uint8Array;

    private _extendBuffer(): void {
        const newBuffer = new Uint8Array(
            this._minNewSize + (this.blockSize - (this._minNewSize % this.blockSize))
        );

        newBuffer.set(this._out);

        this._out = newBuffer;
        this._cbl = this._out.length;
    }

    private _matchNext(): void {
        this._minNewSize = this._outputPointer + 3;

        if (this._minNewSize > this._cbl) this._extendBuffer();

        this._out[this._outputPointer++] = this._buffer[this._inputPointer++];

        if (this._t > 1) {
            this._out[this._outputPointer++] = this._buffer[this._inputPointer++];
            if (this._t > 2) {
                this._out[this._outputPointer++] = this._buffer[this._inputPointer++];
            }
        }

        this._t = this._buffer[this._inputPointer++];
    }

    private _matchDone(): number {
        this._t = this._buffer[this._inputPointer - 2] & 3;
        return this._t;
    }

    private _copyMatch(): void {
        this._t += 2;
        this._minNewSize = this._outputPointer + this._t;
        if (this._minNewSize > this._cbl) {
            this._extendBuffer();
        }

        do {
            this._out[this._outputPointer++] = this._out[this._matchPosition++];
        } while (--this._t > 0);
    }

    private _copyFromBuffer(): void {
        this._minNewSize = this._outputPointer + this._t;
        if (this._minNewSize > this._cbl) {
            this._extendBuffer();
        }

        do {
            this._out[this._outputPointer++] = this._buffer[this._inputPointer++];
        } while (--this._t > 0);
    }

    private _match(): boolean | Uint8Array {
        while (true) {
            if (this._t >= 64) {
                this._matchPosition =
                    this._outputPointer -
                    1 -
                    ((this._t >> 2) & 7) -
                    (this._buffer[this._inputPointer++] << 3);
                this._t = (this._t >> 5) - 1;

                this._copyMatch();
            } else if (this._t >= 32) {
                this._t &= 31;

                if (this._t === 0) {
                    while (this._buffer[this._inputPointer] === 0) {
                        this._t += 255;
                        this._inputPointer++;
                    }

                    this._t += 31 + this._buffer[this._inputPointer++];
                }

                this._matchPosition =
                    this._outputPointer -
                    1 -
                    (this._buffer[this._inputPointer] >> 2) -
                    (this._buffer[this._inputPointer + 1] << 6);
                this._inputPointer += 2;

                this._copyMatch();
            } else if (this._t >= 16) {
                this._matchPosition = this._outputPointer - ((this._t & 8) << 11);

                this._t &= 7;

                if (this._t === 0) {
                    while (this._buffer[this._inputPointer] === 0) {
                        this._t += 255;
                        this._inputPointer++;
                    }

                    this._t += 7 + this._buffer[this._inputPointer++];
                }

                this._matchPosition -=
                    (this._buffer[this._inputPointer] >> 2) +
                    (this._buffer[this._inputPointer + 1] << 6);
                this._inputPointer += 2;

                // End reached
                if (this._matchPosition === this._outputPointer) {
                    return this._out.subarray(0, this._outputPointer);
                } else {
                    this._matchPosition -= 0x4000;
                    this._copyMatch();
                }
            } else {
                this._matchPosition =
                    this._outputPointer - 1 - (this._t >> 2) - (this._buffer[this._inputPointer++] << 2);

                this._minNewSize = this._outputPointer + 2;

                if (this._minNewSize > this._cbl) {
                    this._extendBuffer();
                }

                this._out[this._outputPointer++] = this._out[this._matchPosition++];
                this._out[this._outputPointer++] = this._out[this._matchPosition];
            }

            if (this._matchDone() === 0) {
                return true;
            }

            this._matchNext();
        }
    }

    private _decompressBuffer(buffer: Uint8Array): Uint8Array {
        this._buffer = buffer;

        this._cbl = this._out.length;

        this._t = 0;
        this._inputPointer = 0;
        this._outputPointer = 0;
        this._matchPosition = 0;

        this._skipToFirstLiteralFunc = false;

        if (this._buffer[this._inputPointer] > 17) {
            this._t = this._buffer[this._inputPointer++] - 17;

            if (this._t < 4) {
                this._matchNext();

                const matched = this._match();

                if (matched !== true) return matched as Uint8Array;
            } else {
                this._copyFromBuffer();
                this._skipToFirstLiteralFunc = true;
            }
        }

        while (true) {
            if (!this._skipToFirstLiteralFunc) {
                this._t = this._buffer[this._inputPointer++];

                if (this._t >= 16) {
                    const matched = this._match();

                    if (matched !== true) return matched as Uint8Array;

                    continue;
                } else if (this._t === 0) {
                    while (this._buffer[this._inputPointer] === 0) {
                        this._t += 255;
                        this._inputPointer++;
                    }

                    this._t += 15 + this._buffer[this._inputPointer++];
                }

                this._t += 3;
                this._copyFromBuffer();
            } else this._skipToFirstLiteralFunc = false;

            this._t = this._buffer[this._inputPointer++];

            if (this._t < 16) {
                this._matchPosition = this._outputPointer - (1 + 0x0800);
                this._matchPosition -= this._t >> 2;
                this._matchPosition -= this._buffer[this._inputPointer++] << 2;

                this._minNewSize = this._outputPointer + 3;

                if (this._minNewSize > this._cbl) {
                    this._extendBuffer();
                }

                this._out[this._outputPointer++] = this._out[this._matchPosition++];
                this._out[this._outputPointer++] = this._out[this._matchPosition++];
                this._out[this._outputPointer++] = this._out[this._matchPosition];

                if (this._matchDone() === 0) continue;
                else this._matchNext();
            }

            const matched = this._match();

            if (matched !== true) return matched as Uint8Array;
        }
    }

    /**
     * Decompresses the given buffer using the LZO1X-1 algorithm.
     * @param buffer The buffer to decompress.
     * @returns The decompressed buffer.
     */
    static decompress(buffer: Uint8Array | number[]): Uint8Array {
        return new LZO()._decompressBuffer(buffer as Uint8Array);
    }

    /**
     * Decompresses the given buffer and returns both the decompressed data and bytes read.
     * @param buffer The buffer to decompress.
     * @returns Object containing decompressed data and number of bytes consumed from input.
     */
    static decompressWithSize(buffer: Uint8Array | number[]): LzoDecompressResult {
        const lzo = new LZO();
        const decompressed = lzo._decompressBuffer(buffer as Uint8Array);
        return {
            data: decompressed,
            bytesRead: lzo._inputPointer
        };
    }
}

/**
 * Simple decompression helper
 */
export function lzoDecompress(src: Uint8Array | Buffer, expectedSize: number): Uint8Array {
    const input = src instanceof Uint8Array ? src : new Uint8Array(src);
    const decompressed = LZO.decompress(input);

    if (decompressed.length !== expectedSize) {
        throw new Error(`LZO decompression size mismatch: expected ${expectedSize}, got ${decompressed.length}`);
    }

    return decompressed;
}

/**
 * Decompression with size tracking
 */
export function lzoDecompressWithSize(src: Uint8Array | Buffer, expectedSize: number): LzoDecompressResult {
    const input = src instanceof Uint8Array ? src : new Uint8Array(src);
    const result = LZO.decompressWithSize(input);

    if (result.data.length !== expectedSize) {
        throw new Error(`LZO decompression size mismatch: expected ${expectedSize}, got ${result.data.length}`);
    }

    return result;
}
