import { ILod } from "./Lod";

export interface P3dStats {
    version: number;
    lodCount: number;
    totalVertices: number;
    totalFaces: number;
    textures: string[];
    materials: string[];
    mass: number;
    skeleton: string;
    hasAnimations: boolean;
}

export interface P3D {
    version: number;
    lods: ILod[];

    get allMaterials(): string[];
    get allTextures(): string[];

    getStats(): Partial<P3dStats>;
}
