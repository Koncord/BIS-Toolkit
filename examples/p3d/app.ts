/**
 * P3D Model Viewer Application
 * 
 * This application renders P3D model files (both MLOD and ODOL formats) using Three.js.
 * It supports texture loading, named selections, and various rendering options.
 */

import * as THREE from 'three';
import {
    RenderAppBase,
    INamedSelection,
    DomElements
} from './src';
import { Face as OdolFace, NamedSelection, Odol, OdolLod, Vector3 as OdolVector3 } from '../../packages/p3d/src/odol';
import { Mlod, MlodLod } from '../../packages/p3d/src/mlod';
import { ILod } from '../../packages/p3d/src/shared/Lod';
import { P3D } from '../../packages/p3d/src/shared/P3d';
import { getSelectedIndices, type NamedSelectionTagg, type PropertyTagg } from '../../packages/p3d/src/mlod/Tagg';

/**
 * Adapter for ODOL named selections
 */
class OdolNamedSelection implements INamedSelection {
    constructor(public selection: NamedSelection) { }

    get name(): string {
        return this.selection.name;
    }

    getFaceCount(): number {
        return this.selection.selectedFaces.length;
    }

    getVertexCount(): number {
        return this.selection.selectedVertices.length;
    }
}

/**
 * Adapter for MLOD named selections (from Tagg data)
 */
class MlodNamedSelection implements INamedSelection {
    constructor(public tagg: NamedSelectionTagg) { }

    get name(): string {
        return this.tagg.name;
    }

    getFaceCount(): number {
        return getSelectedIndices(this.tagg.faces).length;
    }

    getVertexCount(): number {
        return getSelectedIndices(this.tagg.points).length;
    }
}

/**
 * P3D Application - handles rendering of both MLOD and ODOL format models
 */
class P3dApp extends RenderAppBase {
    private isMlod = false;

    /**
     * Override updateUI to add property tagg display for MLOD models
     */
    override async updateUI(model: P3D): Promise<void> {
        const stats = model.getStats();
        // Add model type to stats
        (stats as any).modelType = this.isMlod ? 'MLOD' : 'ODOL';

        this.uiUtils.updateModelInfo(stats);

        // Convert lods to LodInfo for UIUtils
        const lodInfos = model.lods.map(lod => ({
            resolutionName: lod.resolutionName,
            verticesCount: lod.verticesCount,
            facesCount: lod.facesCount
        }));
        this.uiUtils.populateLodSelector(lodInfos);

        // Display textures from model
        await this.displayModelTextures(model);

        this.uiUtils.showModel();
    }

    /**
     * Display properties from the current LOD
     */
    override displayLodProperties(lod: ILod): void {
        const uniqueProps = new Map<string, string>();

        if (this.isMlod && lod instanceof MlodLod) {
            // MLOD: Extract from PropertyTaggs
            if (lod.taggs) {
                const lodProperties = lod.taggs.filter(
                    (tagg): tagg is PropertyTagg => tagg.kind === 'Property'
                );
                lodProperties.forEach(prop => {
                    uniqueProps.set(prop.propName, prop.propValue);
                });
            }
        } else if (!this.isMlod && lod instanceof OdolLod) {
            // ODOL: Extract from namedProperties
            if (lod.namedProperties) {
                lod.namedProperties.forEach(([key, value]) => {
                    uniqueProps.set(key, value);
                });
            }
        }

        // Convert to PropertyInfo array for UI
        const properties = Array.from(uniqueProps.entries()).map(([name, value]) => ({
            name,
            value
        }));

        this.uiUtils.renderProperties(properties);
    }

    /**
     * Detects and parses P3D model from buffer
     * Supports both MLOD and ODOL formats based on file signature
     */
    parseModel = (buffer: Uint8Array): P3D => {
        // Read the 4-byte file signature to detect format
        const signature = new TextDecoder('ascii').decode(buffer.slice(0, 4));

        if (signature === 'MLOD') {
            console.log('Detected MLOD format');
            this.isMlod = true;
            return Mlod.fromBuffer(buffer);
        } else if (signature === 'ODOL') {
            console.log('Detected ODOL format');
            this.isMlod = false;
            return Odol.fromBuffer(buffer);
        } else {
            throw new Error('Unsupported P3D format: ' + signature);
        }
    };

    /**
     * Converts an LOD to a Three.js mesh
     * Routes to format-specific implementation based on detected format
     */
    getThreeModel = (ilod: ILod): THREE.Mesh => {
        if (this.isMlod) {
            return this.getMlodThreeModel(ilod as MlodLod);
        } else {
            return this.getOdolThreeModel(ilod as OdolLod);
        }
    };

    /**
     * Converts an ODOL LOD to a Three.js mesh
     */
    private getOdolThreeModel(lod: OdolLod): THREE.Mesh {
        const geometry = new THREE.BufferGeometry();

        // Extract vertex positions and convert to Three.js coordinate system
        const vertices = lod.vertexData?.vertices || [];
        const positions = new Float32Array(vertices.length * 3);
        vertices.forEach((v: OdolVector3, i: number) => {
            const offset = i * 3;
            positions[offset] = v.x;
            positions[offset + 1] = v.y;
            positions[offset + 2] = -v.z; // Invert Z for Three.js coordinate system
        });
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Convert polygons to triangle indices
        // Triangles stay as-is, quads are split into two triangles
        const indices: number[] = [];
        if (lod.polygons && lod.polygons.faces) {
            lod.polygons.faces.forEach((face: OdolFace) => {
                if (face.vertexIndices.length === 3) {
                    indices.push(face.vertexIndices[0], face.vertexIndices[1], face.vertexIndices[2]);
                } else if (face.vertexIndices.length === 4) {
                    indices.push(
                        face.vertexIndices[0], face.vertexIndices[1], face.vertexIndices[2],
                        face.vertexIndices[0], face.vertexIndices[2], face.vertexIndices[3]
                    );
                }
            });
        }
        geometry.setIndex(indices);

        // Add normals if available
        if (lod.vertexData.normals) {
            try {
                const normals = lod.vertexData.normals;
                const normalArray = new Float32Array(normals.length * 3);
                normals.forEach((n: OdolVector3, i: number) => {
                    const offset = i * 3;
                    // Invert X and Y for Three.js coordinate system
                    normalArray[offset] = -n.x;
                    normalArray[offset + 1] = -n.y;
                    normalArray[offset + 2] = n.z;
                });
                geometry.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3));
            } catch (e) {
                console.warn('Failed to add normals:', e);
                geometry.computeVertexNormals();
            }
        } else {
            geometry.computeVertexNormals();
        }

        // Add UVs if available
        if (lod.vertexData.uvSets && lod.vertexData.uvSets.length > 0) {
            try {
                const uvData = lod.vertexData.uvSets[0].getUVData();
                geometry.setAttribute('uv', new THREE.BufferAttribute(uvData, 2));
            } catch (e) {
                console.warn('Failed to add UVs:', e);
            }
        }

        geometry.computeTangents();

        // Build material with texture slots
        const material = this.fileHandler.textureSlots.buildMaterial({
            wireframeEnabled: this.wireframeEnabled,
            normalStrength: this.normalStrength,
            rvmat: this.fileHandler.currentRvmat
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.enableDebugNormals(mesh);

        return mesh;
    }

    /**
     * Converts an MLOD LOD to a Three.js mesh
     * MLOD uses material groups, so we build multiple materials
     */
    private getMlodThreeModel(lod: MlodLod): THREE.Mesh {
        const geometry = new THREE.BufferGeometry();
        const hasTextures = Array.isArray(lod.textures) && lod.textures.length > 0;

        // Prepare geometry data arrays
        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const materials: THREE.MeshPhysicalMaterial[] = [];
        const materialMap = new Map<string, number>(); // Maps material key to material index

        let vertexCount = 0;

        // Process each face and assign to material groups
        for (const face of lod.faces) {
            const faceVertices = face.getUsedVertices();

            // Convert face to triangles (tri = 1 triangle, quad = 2 triangles)
            const triangles = face.sidesCnt === 3
                ? [[0, 2, 1]]  // Single triangle with winding order correction
                : [[0, 3, 2], [0, 2, 1]];  // Two triangles from quad

            // Get or create material for this face
            const materialKey = (face.material || face.texture || 'default').toLowerCase();
            let materialIndex = materialMap.get(materialKey);
            if (materialIndex === undefined) {
                materialIndex = materials.length;
                materials.push(this.buildMaterialForKey(face.texture, hasTextures, this.fileHandler.loadedTextures));
                materialMap.set(materialKey, materialIndex);
            }

            const groupStartIndex = indices.length;

            // Build triangles from face vertices
            for (const tri of triangles) {
                for (const vertIndex of tri) {
                    if (vertIndex >= faceVertices.length) continue;

                    const vertex = faceVertices[vertIndex];
                    const point = lod.vertices[vertex.pointIndex];
                    const normal = lod.normals[vertex.normalIndex];

                    // Add position (Z inverted for Three.js coordinate system)
                    positions.push(point.x, point.y, -point.z);

                    // Add normal (X and Y inverted for Three.js coordinate system)
                    if (normal) {
                        normals.push(-normal.x, -normal.y, normal.z);
                    } else {
                        normals.push(0, 1, 0);  // Default up vector if no normal
                    }

                    // Add UV coordinates
                    uvs.push(vertex.u, vertex.v);
                    indices.push(vertexCount++);
                }
            }

            // Add geometry group for this face's material
            const triangleCount = indices.length - groupStartIndex;
            if (triangleCount > 0) {
                geometry.addGroup(groupStartIndex, triangleCount, materialIndex);
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);

        geometry.computeTangents();

        const mesh = new THREE.Mesh(geometry, materials);

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.enableDebugNormals(mesh);

        return mesh;
    }

    /**
     * Extracts named selections from the LOD
     * Routes to format-specific implementation
     */
    override getNamedSelections(lod: ILod): INamedSelection[] {
        if (this.isMlod) {
            const mlodLod = lod as MlodLod;
            const selections = mlodLod.taggs?.filter(t => t.kind === 'NamedSelection') as NamedSelectionTagg[] || [];
            return selections.map(tagg => new MlodNamedSelection(tagg));
        } else {
            const odolLod = lod as OdolLod;
            const selections = odolLod.namedSelections || [];
            return selections.map(sel => new OdolNamedSelection(sel));
        }
    }

    /**
     * Gets vertex positions for a named selection (for point visualization)
     */
    override getSelectionVertices(lod: ILod, selection: INamedSelection): THREE.Vector3[] {
        if (this.isMlod && lod instanceof MlodLod) {
            return this.getMlodSelectionVertices(lod, selection as MlodNamedSelection);
        } else {
            return this.getOdolSelectionVertices(lod as OdolLod, selection as OdolNamedSelection);
        }
    }

    /**
     * Gets vertex positions for an MLOD named selection
     */
    private getMlodSelectionVertices(lod: MlodLod, selection: MlodNamedSelection): THREE.Vector3[] {
        const vertices = lod.vertices || [];
        const selectedIndices = getSelectedIndices(selection.tagg.points);

        return selectedIndices
            .filter(idx => vertices[idx] !== undefined)
            .map(idx => new THREE.Vector3(
                vertices[idx].x,
                vertices[idx].y,
                -vertices[idx].z  // Z inverted
            ));
    }

    /**
     * Gets vertex positions for an ODOL named selection
     * Extracts vertices from selected faces and directly selected vertices
     */
    private getOdolSelectionVertices(lod: OdolLod, selection: OdolNamedSelection): THREE.Vector3[] {
        const vertices = lod.vertexData?.vertices || [];
        const faces = lod.polygons?.faces || [];
        const selectedFaceIndices = selection.selection.selectedFaces || [];
        const selectedVertexIndices = selection.selection.selectedVertices || [];

        // Collect unique vertex indices from all selected faces
        const vertexIndicesSet = new Set<number>();
        selectedFaceIndices.forEach((faceIdx: number) => {
            const face = faces[faceIdx];
            if (face && face.vertexIndices) {
                face.vertexIndices.forEach((vIdx: number) => {
                    vertexIndicesSet.add(vIdx);
                });
            }
        });

        // Add directly selected vertices (for helper vertices without faces)
        selectedVertexIndices.forEach((vIdx: number) => {
            vertexIndicesSet.add(vIdx);
        });

        // Convert unique vertex indices to Three.js vectors
        const result: THREE.Vector3[] = [];
        vertexIndicesSet.forEach((idx: number) => {
            if (vertices[idx]) {
                result.push(new THREE.Vector3(
                    vertices[idx].x,
                    vertices[idx].y,
                    -vertices[idx].z  // Z inverted
                ));
            }
        });

        return result;
    }

    /**
     * Gets face geometry for a named selection (for face visualization)
     * Returns positions and indices for rendering the selected faces
     */
    override getSelectionFaces(lod: ILod, selection: INamedSelection): { positions: number[]; indices: number[] } | null {
        if (this.isMlod && lod instanceof MlodLod) {
            return this.getMlodSelectionFaces(lod, selection as MlodNamedSelection);
        } else {
            return this.getOdolSelectionFaces(lod as OdolLod, selection as OdolNamedSelection);
        }
    }

    /**
     * Gets face geometry for an MLOD named selection
     */
    private getMlodSelectionFaces(lod: MlodLod, selection: MlodNamedSelection): { positions: number[]; indices: number[] } | null {
        const vertices = lod.vertices || [];
        const faces = lod.faces || [];
        const selectedIndices = getSelectedIndices(selection.tagg.faces);

        const faceIndices: number[] = [];
        const facePositions: number[] = [];
        let vertexOffset = 0;

        selectedIndices.forEach((faceIdx: number) => {
            const face = faces[faceIdx];
            if (face) {
                const faceVertices = face.getUsedVertices();
                // Convert to triangles with corrected winding order
                const triangles = face.sidesCnt === 3
                    ? [[0, 2, 1]]  // Single triangle
                    : [[0, 2, 1], [0, 3, 2]];  // Two triangles from quad

                for (const tri of triangles) {
                    for (const vertIndex of tri) {
                        if (vertIndex >= faceVertices.length) continue;

                        const vertex = faceVertices[vertIndex];
                        const point = vertices[vertex.pointIndex];

                        if (point) {
                            facePositions.push(point.x, point.y, -point.z);
                        }
                        faceIndices.push(vertexOffset++);
                    }
                }
            }
        });

        return facePositions.length > 0 ? { positions: facePositions, indices: faceIndices } : null;
    }

    /**
     * Gets face geometry for an ODOL named selection
     */
    private getOdolSelectionFaces(lod: OdolLod, selection: OdolNamedSelection): { positions: number[]; indices: number[] } | null {
        const vertices = lod.vertexData?.vertices || [];
        const faces = lod.polygons?.faces || [];
        const selectedFaceIndices = selection.selection.selectedFaces || [];

        const faceIndices: number[] = [];
        const facePositions: number[] = [];
        let vertexOffset = 0;

        selectedFaceIndices.forEach((faceIdx: number) => {
            const face = faces[faceIdx];
            if (face && face.vertexIndices) {
                const faceVertices = face.vertexIndices;

                // Add all face vertices to positions array
                faceVertices.forEach((vIdx: number) => {
                    if (vertices[vIdx]) {
                        facePositions.push(
                            vertices[vIdx].x,
                            vertices[vIdx].y,
                            -vertices[vIdx].z  // Z inverted
                        );
                    }
                });

                // Triangulate face (tri = 1 triangle, quad = 2 triangles)
                if (faceVertices.length === 3) {
                    // Single triangle
                    faceIndices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2);
                    vertexOffset += 3;
                } else if (faceVertices.length === 4) {
                    // Two triangles from quad
                    faceIndices.push(
                        vertexOffset, vertexOffset + 1, vertexOffset + 2,
                        vertexOffset, vertexOffset + 2, vertexOffset + 3
                    );
                    vertexOffset += 4;
                }
            }
        });

        return facePositions.length > 0 ? { positions: facePositions, indices: faceIndices } : null;
    }
}

async function init(): Promise<void> {
    const dom = new DomElements();
    const p3dApp = new P3dApp(dom);
    p3dApp.init();
    console.log('P3D Viewer initialized');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
