/**
 * 3D Vector class
 */
export class Vector3 {
    constructor(
        public x: number = 0,
        public y: number = 0,
        public z: number = 0
    ) {}

    get length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    static fromReader(reader: { readFloat(): number }): Vector3 {
        return new Vector3(
            reader.readFloat(),
            reader.readFloat(),
            reader.readFloat()
        );
    }

    /**
     * Returns a new Vector3 with the X coordinate flipped.
     * Useful for converting between coordinate systems (e.g., MLOD to Three.js)
     */
    flipX(): Vector3 {
        return new Vector3(-this.x, this.y, this.z);
    }

    /**
     * Returns a new Vector3 with the Y coordinate flipped.
     * Useful for converting between coordinate systems
     */
    flipY(): Vector3 {
        return new Vector3(this.x, -this.y, this.z);
    }

    /**
     * Returns a new Vector3 with the Z coordinate flipped.
     * Useful for converting between coordinate systems
     */
    flipZ(): Vector3 {
        return new Vector3(this.x, this.y, -this.z);
    }

    toArray(): [number, number, number] {
        return [this.x, this.y, this.z];
    }
}
