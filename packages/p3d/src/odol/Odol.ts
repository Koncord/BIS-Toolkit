import { OdolReader } from './OdolReader';
import { OdolLod } from './OdolLod';
import { ModelInfo } from './ModelInfo';
import { Animations } from './Animations';
import { LodMetadata as LodMetadata, Skeleton } from './auxiliaryStructures';
import { P3D, P3dStats } from '../shared/P3d';

/**
 * LOD information
 */
class LodInfo {
    public resolution: number = 0;
    public lodStartPosition: number = 0;
    public lodEndPosition: number = 0;
    public hasLodMeta: boolean = false;
    public lodMetadata: LodMetadata | null = null;
}

/**
 * Main ODOL file reader
 * ODOL is the compiled/binary format for Bohemia Interactive 3D models
 */
export class Odol implements P3D {
    public version: number = 0;
    public modelInfo: ModelInfo | null = null;
    public lods: OdolLod[] = [];
    public animations: Animations | null = null;

    public static readonly MIN_SUPPORTED_VERSION = 53;
    public static readonly MAX_SUPPORTED_VERSION = 54;

    /**
     * Read ODOL from a buffer
     */
    static fromBuffer(buffer: Buffer | Uint8Array): Odol {
        const reader = new OdolReader(buffer);
        return Odol.fromReader(reader);
    }

    /**
     * Read ODOL from an OdolReader
     */
    static fromReader(reader: OdolReader): Odol {
        const odol = new Odol();

        // Read and check signature
        const signature = reader.readString(4);
        if (signature !== 'ODOL') {
            throw new Error(`Expected ODOL signature, got: ${signature}`);
        }

        // Read version
        odol.version = reader.readInt32();
        reader.version = odol.version;

        if (odol.version > Odol.MAX_SUPPORTED_VERSION || odol.version < Odol.MIN_SUPPORTED_VERSION) {
            throw new Error(`Unsupported ODOL version: ${odol.version}. Supported versions: ${Odol.MIN_SUPPORTED_VERSION}-${Odol.MAX_SUPPORTED_VERSION}`);
        }

        // Read LOD count and resolutions
        const lodCount = reader.readInt32();
        const lodInfos = new Array<LodInfo>(lodCount);

        for (let i = 0; i < lodCount; i++) {
            lodInfos[i] = new LodInfo();
            lodInfos[i].resolution = reader.readFloat();
        }

        // Read model info
        odol.modelInfo = ModelInfo.fromReader(reader);

        const _unk = reader.readUInt32(); // unknown (seems to be 0)

        // Read animations if present
        const hasAnimations = reader.readBoolean();
        if (hasAnimations) {
            odol.animations = Animations.fromReader(reader);
        }

        // Read LOD addresses
        for (let i = 0; i < lodCount; i++) {
            lodInfos[i].lodStartPosition = reader.readUInt32();
        }

        for (let i = 0; i < lodCount; i++) {
            lodInfos[i].lodEndPosition = reader.readUInt32();
        }

        for (let i = 0; i < lodCount; i++) {
            lodInfos[i].hasLodMeta = !reader.readBoolean();
        }

        for (let i = 0; i < lodCount; i++) {
            if (lodInfos[i].hasLodMeta) {
                lodInfos[i].lodMetadata = LodMetadata.fromReader(reader);
            }
        }

        // Find lowest LOD start address
        const lowestPos = Math.min(...lodInfos.map(info => info.lodStartPosition));
        if (reader.pos !== lowestPos) {
            throw new Error(`Not all data read correctly, expected LODs to start at ${lowestPos}, but current position is ${reader.pos} (Difference: ${lowestPos - reader.pos})`);
        }

        odol.lods = new Array<OdolLod>(lodCount);
        // Read each LOD - ALL of them, including permanent ones
        for (let i = 0; i < lodCount; i++) {
            const lodInfo = lodInfos[i];

            // Skip LODs with start address at or beyond file size
            if (lodInfo.lodStartPosition >= reader.length) {
                continue;
            }

            reader.seek(lodInfo.lodStartPosition, 'begin');

            const lod = OdolLod.fromReader(reader);

            lod.resolution = lodInfo.resolution;
            lod.lodMetadata = lodInfos[i].lodMetadata; // Preserve the lodMetadata we read earlier
            odol.lods[i] = lod;

            // Validate position matches end address if end address is valid
            if (lodInfo.lodEndPosition > 0 && lodInfo.lodEndPosition <= reader.length) {
                if (reader.pos !== lodInfo.lodEndPosition) {
                    console.warn(`LOD[${i}] position mismatch: expected ${lodInfo.lodEndPosition}, got ${reader.pos}`);
                }
            }
        }

        return odol;
    }

    /**
     * Get skeleton from model info
     */
    get skeleton(): Skeleton | null {
        return this.modelInfo?.skeleton ?? null;
    }

    /**
     * Get mass from model info
     */
    get mass(): number {
        return this.modelInfo?.mass ?? 0;
    }

    /**
     * Check if model has animations
     */
    get hasAnims(): boolean {
        return this.animations !== null;
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

    get allMaterials(): string[] {
        const materials = new Set<string>();
        for (const lod of this.lods) {
            for (const material of lod.materials) {
                materials.add(material.materialName);
            }
        }
        return Array.from(materials);
    }

    /**
     * Get statistics about the model
     */
    getStats(): Partial<P3dStats> {
        return {
            version: this.version,
            lodCount: this.lods.length,
            totalVertices: this.lods.reduce((sum, lod) => sum + lod.vertices.length, 0),
            totalFaces: this.lods.reduce((sum, lod) => sum + lod.faces.length, 0),
            textures: this.allTextures,
            materials: this.allMaterials,
            mass: this.mass,
            hasAnimations: this.hasAnims,
            skeleton: this.skeleton?.name ?? 'none'
        };
    }
}
