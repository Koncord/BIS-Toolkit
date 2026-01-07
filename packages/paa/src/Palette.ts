import { PaaColor } from './PaaColor';
import { BinaryReader } from '@bis-toolkit/utils';

/**
 * Represents a color palette for indexed PAA formats
 */
export class Palette {
    public colors: PaaColor[] = [];

    read(br: BinaryReader): void {
        const nPaletteTriplets = br.readUInt16();
        this.colors = [];
        for (let i = 0; i < nPaletteTriplets; i++) {
            const b = br.readByte();
            const g = br.readByte();
            const r = br.readByte();
            this.colors.push(new PaaColor(r, g, b));
        }
    }
}
