import { BinaryReader } from '@bis-toolkit/utils';
import { Vertex } from './Vertex';
import { FaceFlags } from './FaceFlags';

/**
 * Represents a face (polygon) in the model
 */
export class Face {
    public sidesCnt: number;
    public vertices: Vertex[];
    public flags: FaceFlags;
    public texture: string;
    public material: string;

    constructor(
        sidesCnt: number,
        vertices: Vertex[],
        flags: FaceFlags,
        texture: string,
        material: string
    ) {
        this.sidesCnt = sidesCnt;
        this.vertices = vertices;
        this.flags = flags;
        this.texture = texture;
        this.material = material;
    }

    static fromReader(reader: BinaryReader): Face {
        const sidesCnt = reader.readInt32();
        const vertices: Vertex[] = [];
        
        // Always read 4 vertices (padding with unused vertices if sidesCnt < 4)
        for (let i = 0; i < 4; i++) {
            vertices.push(Vertex.fromReader(reader));
        }

        const flags = reader.readInt32() as FaceFlags;
        const texture = reader.readCString();
        const material = reader.readCString();

        return new Face(sidesCnt, vertices, flags, texture, material);
    }

    /**
     * Get only the used vertices (based on sidesCnt)
     */
    getUsedVertices(): Vertex[] {
        return this.vertices.slice(0, this.sidesCnt);
    }
}
