import { BinaryReader } from '@bis-toolkit/utils';
import { type Tagg } from './Tagg';
import { Point } from './Point';
import { Vector3 } from './Vector3';
import { Face } from './Face';
import { TaggReader } from './TaggReader';
import { getLodName } from '../shared/Resolution';
import { ILod } from '../shared/Lod';

/**
 * Represents a single LOD (Level of Detail) in an MLOD model
 */
export class MlodLod implements ILod {
    public resolution: number = 0;
    public flags: number = 0;
    public vertices: Point[] = [];
    public normals: Vector3[] = [];
    public faces: Face[] = [];
    public taggs: Tagg[] = [];

    get resolutionName(): string {
        return getLodName(this.resolution);
    }

    get verticesCount(): number {
        return this.vertices.length;
    }

    get facesCount(): number {
        return this.faces.length;
    }

    /**
     * Get unique textures used in this LOD
     */
    get textures(): string[] {
        const uniqueTextures = new Set<string>();
        for (const face of this.faces) {
            if (face.texture) {
                uniqueTextures.add(face.texture);
            }
        }
        return Array.from(uniqueTextures);
    }

    /**
     * Get unique materials used in this LOD
     */
    get materials(): string[] {
        const uniqueMaterials = new Set<string>();
        for (const face of this.faces) {
            if (face.material) {
                uniqueMaterials.add(face.material);
            }
        }
        return Array.from(uniqueMaterials);
    }


    get namedSelections(): string[] {
        const selections = this.taggs
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((tagg): tagg is Extract<Tagg, { kind: 'NamedSelection' }> => ((tagg as any) as Tagg).kind === 'NamedSelection')
            .map(tagg => tagg.name);
        return selections;
    }

    static fromReader(reader: BinaryReader): MlodLod {
        const lod = new MlodLod();

        // Check P3DM signature
        const signature = reader.readString(4);
        if (signature !== 'P3DM') {
            const bytes = signature.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
            throw new Error(`Unsupported LOD type: "${signature}" (0x${bytes}) at position ${reader.pos - 4}`);
        }

        // Read version info
        const majorVersion = reader.readUInt32();
        const minorVersion = reader.readUInt32();

        if (majorVersion !== 28 || minorVersion !== 256) {
            throw new Error(`Unknown P3DM version: ${majorVersion}.${minorVersion}`);
        }

        // Read counts
        const pointsCnt = reader.readInt32();
        const normalsCnt = reader.readInt32();
        const facesCnt = reader.readInt32();
        lod.flags = reader.readUInt32();

        // Read vertices
        lod.vertices = new Array<Point>(pointsCnt);
        for (let i = 0; i < pointsCnt; i++) {
            lod.vertices[i] = Point.fromReader(reader);
        }

        // Read normals
        lod.normals = new Array<Vector3>(normalsCnt);
        for (let i = 0; i < normalsCnt; i++) {
            lod.normals[i] = Vector3.fromReader(reader);
        }

        // Read faces
        lod.faces = new Array<Face>(facesCnt);
        for (let i = 0; i < facesCnt; i++) {
            lod.faces[i] = Face.fromReader(reader);
        }

        // Parse TAGGs section
        lod.taggs = TaggReader.readTaggs(reader, lod.vertices.length, lod.faces);

        // Read resolution (float at end of LOD)
        lod.resolution = reader.readFloat();

        return lod;
    }
}
