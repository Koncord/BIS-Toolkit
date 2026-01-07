import { OdolReader } from './OdolReader';
import { Vector3 } from './math';
import { ClipFlags, SpecialFlags } from './enums';
import {
    ProxyObject,
    SubSkeletonIndexSet,
    Keyframe,
    LodMetadata
} from './auxiliaryStructures';
import { EmbeddedMaterial } from './Materials';
import {
    Polygons,
    Section,
    NamedSelection,
    Face
} from './structures';
import { VertexData } from './VertexData';
import { getLodName } from '../shared/Resolution';
import { ILod } from '../shared/Lod';

/**
 * ODOL LOD (Level of Detail)
 */
export class OdolLod implements ILod {
    public resolution: number = 0;
    public proxyObjects: ProxyObject[] = [];
    public subSkeletonsToSkeleton: number[] = [];
    public skeletonToSubSkeleton: SubSkeletonIndexSet[] = [];
    public vertexCount: number = 0;
    public faceArea: number = 0;
    public orHints: ClipFlags = ClipFlags.None;
    public andHints: ClipFlags = ClipFlags.None;
    public bMin: Vector3 = new Vector3();
    public bMax: Vector3 = new Vector3();
    public bCenter: Vector3 = new Vector3();
    public bRadius: number = 0;
    public textures: string[] = [];
    public materials: EmbeddedMaterial[] = [];
    public pointToVertex: number[] = [];
    public vertexToPoint: number[] = [];
    public polygons: Polygons = new Polygons();
    public sections: Section[] = [];
    public namedSelections: NamedSelection[] = [];
    public namedProperties: [string, string][] = [];
    public frames: Keyframe[] = [];
    public iconColor: number = 0;
    public selectedColor: number = 0;
    public special: SpecialFlags = SpecialFlags.None;
    public vertexData: VertexData = new VertexData();
    public lodMetadata: LodMetadata | null = null;

    static fromReader(reader: OdolReader): OdolLod {
        const lod = new OdolLod();

        // Read proxies
        lod.proxyObjects = reader.readArray(r => ProxyObject.fromReader(r));

        // Read skeleton mappings
        lod.subSkeletonsToSkeleton = reader.readArray(r => r.readInt32());
        lod.skeletonToSubSkeleton = reader.readArray(r => SubSkeletonIndexSet.fromReader(r));
        lod.vertexCount = reader.readUInt32();
        lod.faceArea = reader.readFloat();
        lod.orHints = reader.readInt32() as ClipFlags;
        lod.andHints = reader.readInt32() as ClipFlags;
        lod.bMin = Vector3.fromReader(reader);
        lod.bMax = Vector3.fromReader(reader);
        lod.bCenter = Vector3.fromReader(reader);
        lod.bRadius = reader.readFloat();

        // Read textures
        lod.textures = reader.readArray(r => r.readCString());

        // Read materials
        lod.materials = reader.readArray(r => EmbeddedMaterial.fromReader(r));

        // Read vertex index mappings
        lod.pointToVertex = reader.readCompressedVertexIndexArray();
        lod.vertexToPoint = reader.readCompressedVertexIndexArray();

        // Read polygons
        lod.polygons = Polygons.fromReader(reader);

        // Read sections
        lod.sections = reader.readArray(r => Section.fromReader(r));

        // Read named selections
        lod.namedSelections = reader.readArray(r => NamedSelection.fromReader(r));

        // Read named properties
        const namedPropertiesCnt = reader.readInt32();
        lod.namedProperties = new Array<[string, string]>(namedPropertiesCnt);
        for (let i = 0; i < namedPropertiesCnt; i++) {
            const key = reader.readCString();
            const value = reader.readCString();
            lod.namedProperties[i] = [key, value];
        }

        // Read frames (keyframes)
        lod.frames = reader.readArray(r => Keyframe.fromReader(r));

        lod.iconColor = reader.readInt32();
        lod.selectedColor = reader.readUInt32();
        lod.special = reader.readInt32() as SpecialFlags;

        // Read vertex table
        lod.vertexData = VertexData.fromReader(reader);

        return lod;
    }

    /**
     * Get resolution name
     */
    get resolutionName(): string {
        return getLodName(this.resolution);
    }

    /**
     * Get all unique texture paths
     */
    get allTextures(): string[] {
        return [...new Set(this.textures)];
    }

    /**
     * Get all material names
     */
    get materialNames(): string[] {
        return this.materials.map(m => m.materialName);
    }

    /**
     * Get vertices
     */
    get vertices(): Vector3[] {
        return this.vertexData.vertices;
    }

    get verticesCount(): number {
        return this.vertexData.vertices.length;
    }

    get facesCount(): number {
        return this.polygons.faces.length;
    }

    /**
     * Get face count
     */
    get faces(): Face[] {
        return this.polygons.faces;
    }

    /**
     * Get statistics about this LOD
     */
    getStats() {
        return {
            resolution: this.resolution,
            vertexCount: this.vertices.length,
            faceCount: this.faces.length,
            textureCount: this.textures.length,
            materialCount: this.materials.length,
            sectionCount: this.sections.length,
            namedSelectionCount: this.namedSelections.length,
            proxyCount: this.proxyObjects.length
        };
    }
}
