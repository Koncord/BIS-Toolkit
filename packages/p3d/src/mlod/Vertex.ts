import { BinaryReader } from '@bis-toolkit/utils';

/**
 * Represents a face vertex with point/normal indices and UV coordinates
 */
export class Vertex {
    constructor(
        public pointIndex: number,
        public normalIndex: number,
        public u: number,
        public v: number
    ) {}

    static fromReader(reader: BinaryReader): Vertex {
        const pointIndex = reader.readInt32();
        const normalIndex = reader.readInt32();
        const u = reader.readFloat();
        const v = reader.readFloat();
        return new Vertex(pointIndex, normalIndex, u, v);
    }
}
