import { BinaryReader } from '@bis-toolkit/utils';

export class Vector3 {
    constructor(
        public x: number = 0,
        public y: number = 0,
        public z: number = 0
    ) {}

    get length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    static fromReader(reader: BinaryReader): Vector3 {
        return new Vector3(
            reader.readFloat(),
            reader.readFloat(),
            reader.readFloat()
        );
    }

    static readCompressed(reader: BinaryReader): Vector3 {
        const compressed = reader.readInt32();

        return Vector3.fromInt32(compressed);
    }

    static fromInt32(compressed: number): Vector3 {
        const scaleFactor = -1.0 / 511;
        let x = compressed & 0x3FF;
        let y = (compressed >> 10) & 0x3FF;
        let z = (compressed >> 20) & 0x3FF;

        if (x > 511) x -= 1024;
        if (y > 511) y -= 1024;
        if (z > 511) z -= 1024;

        return new Vector3(
            x * scaleFactor,
            y * scaleFactor,
            z * scaleFactor
        );
    }

    distance(v: Vector3): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    normalize(): Vector3 {
        const len = this.length;
        if (len === 0) return new Vector3(0, 0, 0);
        return new Vector3(this.x / len, this.y / len, this.z / len);
    }

    toArray(): [number, number, number] {
        return [this.x, this.y, this.z];
    }
}

export class Matrix3 {
    constructor(
        public m00 = 0, public m01 = 0, public m02 = 0,
        public m10 = 0, public m11 = 0, public m12 = 0,
        public m20 = 0, public m21 = 0, public m22 = 0
    ) {}

    static fromReader(reader: BinaryReader): Matrix3 {
        return new Matrix3(
            reader.readFloat(), reader.readFloat(), reader.readFloat(),
            reader.readFloat(), reader.readFloat(), reader.readFloat(),
            reader.readFloat(), reader.readFloat(), reader.readFloat()
        );
    }
}

/**
 * Matrix4 (stored as 3x3 orientation + 3D position)
 */
export class Matrix4 {
    // 3x3 orientation matrix
    constructor(
        public m00 = 0, public m01 = 0, public m02 = 0,
        public m10 = 0, public m11 = 0, public m12 = 0,
        public m20 = 0, public m21 = 0, public m22 = 0,
        // Position vector
        public px = 0, public py = 0, public pz = 0
    ) {}

    static fromReader(reader: BinaryReader): Matrix4 {
        // Read 3x3 orientation matrix + position vector (12 floats total, not 16)
        return new Matrix4(
            reader.readFloat(), reader.readFloat(), reader.readFloat(),
            reader.readFloat(), reader.readFloat(), reader.readFloat(),
            reader.readFloat(), reader.readFloat(), reader.readFloat(),
            reader.readFloat(), reader.readFloat(), reader.readFloat()
        );
    }
}
