import { Vector3 } from './Vector3';
import { PointFlags } from './PointFlags';
import { BinaryReader } from '@bis-toolkit/utils';

/**
 * Represents a vertex point in 3D space with flags
 */
export class Point extends Vector3 {
    public flags: PointFlags;

    constructor(x: number = 0, y: number = 0, z: number = 0, flags: PointFlags = PointFlags.None) {
        super(x, y, z);
        this.flags = flags;
    }

    static fromReader(reader: BinaryReader): Point {
        const x = reader.readFloat();
        const y = reader.readFloat();
        const z = reader.readFloat();
        const flags = reader.readUInt32() as PointFlags;
        return new Point(x, y, z, flags);
    }

    /**
     * Returns a new Point with the X coordinate flipped.
     * Useful for converting between coordinate systems (e.g., MLOD to Three.js)
     */
    flipX(): Point {
        return new Point(-this.x, this.y, this.z, this.flags);
    }

    /**
     * Returns a new Point with the Y coordinate flipped.
     * Useful for converting between coordinate systems
     */
    flipY(): Point {
        return new Point(this.x, -this.y, this.z, this.flags);
    }

    /**
     * Returns a new Point with the Z coordinate flipped.
     * Useful for converting between coordinate systems
     */
    flipZ(): Point {
        return new Point(this.x, this.y, -this.z, this.flags);
    }
}
