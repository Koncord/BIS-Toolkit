import { BinaryReader } from '@bis-toolkit/utils';
import { MlodLod } from './MlodLod';
import { P3D } from '../shared/P3d';

/**
 * Main MLOD (Model LOD) file reader
 * MLOD is the editable source format for Bohemia Interactive 3D models
 */
export class Mlod implements P3D {
    public version: number = 0;
    public lods: MlodLod[] = [];

    public static readonly SUPPORTED_VERSION = 257;

    /**
     * Read MLOD from a buffer
     */
    static fromBuffer(buffer: Buffer | Uint8Array): Mlod {
        const reader = new BinaryReader(buffer);
        return Mlod.fromReader(reader);
    }

    /**
     * Read MLOD from a BinaryReader
     */
    static fromReader(reader: BinaryReader): Mlod {
        const mlod = new Mlod();

        // Read and check signature
        const signature = reader.readString(4);
        if (signature !== 'MLOD') {
            throw new Error(`Expected MLOD signature, got: ${signature}`);
        }

        // Read version
        mlod.version = reader.readInt32();
        if (mlod.version !== Mlod.SUPPORTED_VERSION) {
            throw new Error(`Unsupported MLOD version: ${mlod.version} (expected ${Mlod.SUPPORTED_VERSION})`);
        }

        // Read LOD count
        const lodCount = reader.readInt32();
        mlod.lods = new Array<MlodLod>(lodCount);

        // Read each LOD
        for (let i = 0; i < lodCount; i++) {
            mlod.lods[i] = MlodLod.fromReader(reader);
        }

        return mlod;
    }

    /**
     * Get all unique textures across all LODs
     */
    get allTextures(): string[] {
        const textures = new Set<string>();
        for (const lod of this.lods) {
            for (const texture of lod.textures) {
                textures.add(texture);
            }
        }
        return Array.from(textures);
    }

    /**
     * Get all unique materials across all LODs
     */
    get allMaterials(): string[] {
        const materials = new Set<string>();
        for (const lod of this.lods) {
            for (const material of lod.materials) {
                materials.add(material);
            }
        }
        return Array.from(materials);
    }

    /**
     * Get statistics about the model
     */
    getStats(): {
        version: number;
        lodCount: number;
        totalVertices: number;
        totalFaces: number;
        textures: string[];
        materials: string[];
    } {
        return {
            version: this.version,
            lodCount: this.lods.length,
            totalVertices: this.lods.reduce((sum, lod) => sum + lod.vertices.length, 0),
            totalFaces: this.lods.reduce((sum, lod) => sum + lod.faces.length, 0),
            textures: this.allTextures,
            materials: this.allMaterials
        };
    }
}
