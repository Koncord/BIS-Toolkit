/**
 * Represents a color in PAA format (ARGB)
 */
export class PaaColor {
    private _value: number;

    constructor(value: number);
    constructor(red: number, green: number, blue: number, alpha?: number);
    constructor(valueOrRed: number, green?: number, blue?: number, alpha = 0xff) {
        if (green === undefined) {
            // Single argument constructor - uint value
            this._value = valueOrRed >>> 0; // Ensure unsigned
        } else {
            // Multi-argument constructor - r, g, b, a
            this._value = PaaColor.colorToUint(valueOrRed, green, blue ?? 0, alpha ?? 0);
        }
    }

    get alpha(): number {
        return (this._value >>> 24) & 0xff;
    }

    get red(): number {
        return (this._value >>> 16) & 0xff;
    }

    get green(): number {
        return (this._value >>> 8) & 0xff;
    }

    get blue(): number {
        return this._value & 0xff;
    }

    get color(): number {
        return this._value;
    }

    private static colorToUint(r: number, g: number, b: number, a: number): number {
        return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0; // >>> 0 ensures unsigned
    }

    static fromFloat(red: number, green: number, blue: number, alpha: number): PaaColor {
        return new PaaColor(
            Math.floor(red * 255),
            Math.floor(green * 255),
            Math.floor(blue * 255),
            Math.floor(alpha * 255)
        );
    }
}
