import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';

import { SceneManager } from "./SceneManager";
import { UIUtils } from "./uiUtils";
import { FileHandler, LoadedTexture } from "./fileHandling";
import { TextureSlots } from "./textureSlots";
import { P3D } from '../../../packages/p3d/src/shared/P3d';
import { ILod } from "../../../packages/p3d/src/shared/Lod";
import { IDomElements } from "./DomElements";

export interface INamedSelection {
    name: string;
    getFaceCount(): number;
    getVertexCount(): number;
    getSelectedVertexIndices?(): number[];
    getSelectedFaceIndices?(): number[];
}

export class RenderAppBase {
    sceneManager: SceneManager;
    currentMesh: THREE.Mesh | null = null;
    normalHelper: VertexNormalsHelper | null = null;
    selectionPoints: THREE.Points | null = null;
    selectionMesh: THREE.Mesh | null = null;
    currentSelectedSelection: string | null = null;
    wireframeEnabled = false;
    normalStrength = 1.0;
    debugNormals = false;
    uiUtils: UIUtils;
    fileHandler: FileHandler;

    constructor(
        protected dom: IDomElements
    ) {
        this.fileHandler = new FileHandler();

        this.sceneManager = new SceneManager({
            canvas: this.dom.canvas,
            container: this.dom.viewerContainer,
            backgroundColor: 0x0F1117,
            ambientLightIntensity: 0.6,
            directionalLightIntensity: 0.8,
            hemisphereIntensity: 0.5,
            showGrid: true,
            showAxes: true
        }, OrbitControls);

        this.uiUtils = new UIUtils(this.dom);

        this.fileHandler.onError = (message: string) => this.uiUtils.showError(message);
    }

    init(): void {
        this.fileHandler.onSuccess = this.onSuccess.bind(this);
        this.fileHandler.modelParser = this.parseModel.bind(this);
        this.fileHandler.modelReload = this.modelReload.bind(this);
        this.fileHandler.renderTextureSlots = this.renderTextureSlots.bind(this);
        this.fileHandler.updateMaterialList = this.updateMaterialList.bind(this);

        this.setupEventListeners();
        this.uiUtils.setupTextureSlotsCollapse();

        // Start the animation loop
        this.sceneManager.startAnimationLoop();
    }

    displayModel(model: P3D, lodIndex = 0, options: any = {}): void {
        const currentMeshRef = { current: this.currentMesh };
        // Clear any vertex selection when changing models/LODs
        this.clearVertexSelection();
        try {
            this.sceneManager.displayModel(model, lodIndex, currentMeshRef, this.getThreeModel, options, this.onLodUpdate);
            this.currentMesh = currentMeshRef.current;
        } catch (error: any) {
            this.uiUtils.showError(error.message);
        }
    }

    enableDebugNormals(mesh: THREE.Mesh): void {
        if (this.debugNormals) {
            const normalHelper = new VertexNormalsHelper(mesh, 0.02, 0x00FF00);
            mesh.add(normalHelper);
            this.normalHelper = normalHelper;
        }
    }

    setMeshWireframe(mesh: THREE.Mesh | null, enabled: boolean): void {
        if (!mesh?.material) return;

        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(m => {
            if ('wireframe' in m) {
                (m as any).wireframe = enabled;
                m.needsUpdate = true;
            }
        });
    }

    // Clear texture slot
    clearTextureSlot(slotKey: string, currentLodIndex: number = 0): void {
        const slot = this.fileHandler.textureSlots.getSlot(slotKey as keyof TextureSlots);
        if (!slot) return;

        slot.clear();
        this.renderTextureSlots();

        // Reload model
        if (this.fileHandler.currentModel) {
            this.displayModel(this.fileHandler.currentModel, currentLodIndex);
        }
    }

    resetModel(): void {
        if (this.currentMesh) {
            this.sceneManager.scene.remove(this.currentMesh);
            this.currentMesh.geometry.dispose();
            if (Array.isArray(this.currentMesh.material)) {
                this.currentMesh.material.forEach(m => m.dispose());
            } else {
                this.currentMesh.material.dispose();
            }
            this.currentMesh = null;
        }
        if (this.normalHelper) {
            this.sceneManager.scene.remove(this.normalHelper);
            this.normalHelper.dispose();
            this.normalHelper = null;
        }
        this.fileHandler.currentModel = null;
    }

    resetUI(): void {
        this.uiUtils.resetUI();
        this.resetModel();
    }

    onSuccess = async (model: P3D): Promise<void> => {
        await this.updateUI(model);
        this.displayModel(model, 0, {});
        this.uiUtils.showModel();
    }

    renderTextureSlots = () => {
        const slots = Object.entries(this.fileHandler.textureSlots).map(([key, slot]) => ({
            key,
            name: slot.name,
            texture: !!slot.texture,
            url: slot.url || undefined,
            fileName: slot.file?.name,
            roughnessUrl: slot.roughnessUrl,
            metalnessUrl: slot.metalnessUrl,
            specularIntensityUrl: slot.specularIntensityUrl,
            specularColorUrl: slot.specularColorUrl
        }));

        const specularHex = this.fileHandler.currentRvmat?.getSpecularHex() || null;

        this.uiUtils.renderTextureSlots(
            slots,
            specularHex,
            (slotKey) => this.clearTextureSlot(slotKey, this.currentLodIndex()),
            (slotKey, file) => this.fileHandler.loadTextureToSlot(slotKey, file)
        );
    };

    updateMaterialList = () => {
        const materials = Array.from(this.fileHandler.materialLibrary.entries()).map(([name, data]) => ({
            name,
            path: data.path,
            loaded: data.loaded,
            textureCount: data.rvmat?.stages.length
        }));

        this.uiUtils.renderMaterialList(
            materials,
            (file) => this.fileHandler.handleRvmatFile(file)
        );
    };

    onLodUpdate = (model: P3D, lodIndex: number): void => {
        const selections = this.getNamedSelections(model.lods[lodIndex]);

        // Convert to SelectionInfo for UIUtils
        const selectionInfos = selections.map(sel => ({
            name: sel.name,
            faceCount: sel.getFaceCount(),
            vertexCount: sel.getVertexCount()
        }));

        this.uiUtils.updateSelectionList(selectionInfos, (selInfo, element) => {
            // Find the original selection by name
            const sel = selections.find(s => s.name === selInfo.name);
            if (!sel) return;

            if (this.currentSelectedSelection === sel.name) {
                this.clearVertexSelection();
                this.currentSelectedSelection = null;
            } else {
                this.highlightNamedSelection(sel, model.lods[lodIndex]);
                this.currentSelectedSelection = sel.name;
                // Update UI to show selected state
                this.uiUtils.clearSelectionHighlight();
                element.classList.add('selected');
            }
        });

        // Display properties for the current LOD
        this.displayLodProperties(model.lods[lodIndex]);
    }

    // Override this to provide named selections for specific model types
    getNamedSelections(lod: ILod): INamedSelection[] {
        return [];
    }

    // Override this to display LOD-specific properties
    displayLodProperties(lod: ILod): void {
        // Default implementation does nothing - override in subclasses
    }

    // Get vertices for highlighting - override in subclasses
    getSelectionVertices(lod: ILod, selection: INamedSelection): THREE.Vector3[] {
        return [];
    }

    // Get face geometry data for highlighting - override in subclasses
    getSelectionFaces(lod: ILod, selection: INamedSelection): { positions: number[]; indices: number[] } | null {
        return null;
    }

    // Implement selection highlighting with common logic
    highlightNamedSelection(selection: INamedSelection, lod: ILod): void {
        if (!this.currentMesh) return;

        // Clear existing selection
        this.clearVertexSelection();

        // Get vertices for point cloud
        const vertices = this.getSelectionVertices(lod, selection);
        if (vertices.length === 0) {
            console.warn('No valid points to highlight');
            return;
        }

        // Create point cloud geometry
        const points: number[] = [];
        vertices.forEach(v => {
            points.push(v.x, v.y, v.z);
        });

        const pointGeometry = new THREE.BufferGeometry();
        pointGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3));

        const pointMaterial = new THREE.PointsMaterial({
            color: 0xff00ff,
            size: 0.015,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8
        });

        this.selectionPoints = new THREE.Points(pointGeometry, pointMaterial);

        // Apply same transformation as the main mesh
        if (this.currentMesh) {
            this.selectionPoints.position.copy(this.currentMesh.position);
            this.selectionPoints.quaternion.copy(this.currentMesh.quaternion);
        }

        this.sceneManager.scene.add(this.selectionPoints);

        // Create face mesh if faces are available
        const faceData = this.getSelectionFaces(lod, selection);
        if (faceData && faceData.positions.length > 0) {
            const faceGeometry = new THREE.BufferGeometry();
            faceGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(faceData.positions), 3));
            faceGeometry.setIndex(faceData.indices);
            faceGeometry.computeVertexNormals();

            const faceMaterial = new THREE.MeshBasicMaterial({
                color: 0xff00ff,
                transparent: true,
                opacity: 0.4,
                side: THREE.FrontSide,
                depthTest: true,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
            });

            this.selectionMesh = new THREE.Mesh(faceGeometry, faceMaterial);
            this.selectionMesh.renderOrder = 999;

            // Apply same transformation as the main mesh
            if (this.currentMesh) {
                this.selectionMesh.position.copy(this.currentMesh.position);
                this.selectionMesh.quaternion.copy(this.currentMesh.quaternion);
            }

            this.sceneManager.scene.add(this.selectionMesh);
        }
    }

    clearVertexSelection(): void {
        if (this.selectionPoints) {
            this.sceneManager.scene.remove(this.selectionPoints);
            this.selectionPoints.geometry.dispose();
            (this.selectionPoints.material as THREE.Material).dispose();
            this.selectionPoints = null;
        }
        if (this.selectionMesh) {
            this.sceneManager.scene.remove(this.selectionMesh);
            this.selectionMesh.geometry.dispose();
            (this.selectionMesh.material as THREE.Material).dispose();
            this.selectionMesh = null;
        }
        if (this.normalHelper) {
            this.sceneManager.scene.remove(this.normalHelper);
            this.normalHelper.dispose();
            this.normalHelper = null;
        }

        this.uiUtils.clearSelectionHighlight();
    }

    currentLodIndex = (): number => parseInt(this.dom.lodSelect.value) || 0;

    // should be overridden
    async updateUI(model: P3D): Promise<void> {
        const stats = model.getStats();

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

    // Display textures and materials referenced in the model
    async displayModelTextures(model: P3D): Promise<void> {
        const allMaterials = model.allMaterials;

        // Handle material paths (RVMAT references)
        if (allMaterials.length > 0) {
            console.log('Materials found in model:', allMaterials);

            // Add material entries
            for (const materialPath of allMaterials) {
                if (!materialPath) continue;

                const filename = materialPath.split(/[\\/]/).pop() || materialPath;

                // Skip if already in library
                if (this.fileHandler.materialLibrary.has(filename)) continue;

                // Add material reference
                this.fileHandler.materialLibrary.set(filename, {
                    path: materialPath,
                    loaded: false,
                    rvmat: null
                });

                console.log(`Model references material: ${filename}`);
            }

            this.updateMaterialList();
        }
    }

    // should be overridden
    getThreeModel = (lod: ILod): THREE.Mesh => {
        throw new Error('getThreeModel method not implemented');
    }

    // should be overridden
    parseModel = (buffer: Uint8Array): P3D => {
        throw new Error('parseModel method not implemented');
    }

    // should be overridden
    modelReload = () => {
        if (this.fileHandler.currentModel) {
            const currentLodIndex = this.currentLodIndex();
            this.displayModel(this.fileHandler.currentModel, currentLodIndex);
        }
    };

    setupEventListeners(): void {
        this.uiUtils.setupDropZone(this.fileHandler.handleFiles);
        this.uiUtils.setupPanelCollapse();
        this.setupCtrlRotateInteraction();

        window.addEventListener('resize', () => {
            this.sceneManager.handleResize(this.dom.canvas, this.dom.viewerContainer);
        });


        this.dom.lodSelect.addEventListener('change', (e) => {
            if (this.fileHandler.currentModel) {
                this.displayModel(this.fileHandler.currentModel, parseInt((e.target as HTMLSelectElement).value));
            }
        });

        this.dom.wireframeBtn.addEventListener('click', () => {
            if (!this.currentMesh) return;
            this.wireframeEnabled = !this.wireframeEnabled;
            this.setMeshWireframe(this.currentMesh, this.wireframeEnabled);
        });

        this.dom.resetCameraBtn.addEventListener('click', () => this.resetCameraToMesh());
        this.dom.normalsBtn.addEventListener('click', () => {
            this.debugNormals = !this.debugNormals;
            if (this.fileHandler.currentModel) {
                const currentLodIndex = this.currentLodIndex();
                this.displayModel(this.fileHandler.currentModel, currentLodIndex, { preserveView: true });
            }
        });

        this.dom.errorResetBtn.addEventListener('click', this.resetUI);
    }

    resetCameraToMesh(): void {
        if (!this.currentMesh) return;
        this.sceneManager.centerCameraOnMesh(this.currentMesh);
    }

    setupCtrlRotateInteraction(): void {
        const ctrlRotateState = { active: false, lastX: 0, lastY: 0 };

        const endRotate = (e: PointerEvent) => {
            if (!ctrlRotateState.active) return;
            ctrlRotateState.active = false;
            this.sceneManager.controls.enabled = true;
            try {
                this.dom.canvas.releasePointerCapture(e.pointerId);
            } catch (_) {
                /* ignore */
            }
        };

        this.dom.canvas.addEventListener('pointerdown', (e) => {
            if (!e.ctrlKey || !this.currentMesh) return;

            ctrlRotateState.active = true;
            ctrlRotateState.lastX = e.clientX;
            ctrlRotateState.lastY = e.clientY;
            this.sceneManager.controls.enabled = false;
            try {
                this.dom.canvas.setPointerCapture(e.pointerId);
            } catch (_) {
                /* ignore */
            }
            e.preventDefault();
        });

        this.dom.canvas.addEventListener('pointermove', (e) => {
            if (!ctrlRotateState.active || !this.currentMesh) return;

            const dx = e.clientX - ctrlRotateState.lastX;
            const dy = e.clientY - ctrlRotateState.lastY;
            ctrlRotateState.lastX = e.clientX;
            ctrlRotateState.lastY = e.clientY;

            const turnRate = 0.005;
            this.currentMesh.rotation.y += dx * turnRate;
            this.currentMesh.rotation.x += dy * turnRate;

            // Also rotate selection objects if they exist
            if (this.selectionMesh) {
                this.selectionMesh.rotation.y += dx * turnRate;
                this.selectionMesh.rotation.x += dy * turnRate;
            }
            if (this.selectionPoints) {
                this.selectionPoints.rotation.y += dx * turnRate;
                this.selectionPoints.rotation.x += dy * turnRate;
            }

        });

        this.dom.canvas.addEventListener('pointerup', endRotate);
        this.dom.canvas.addEventListener('pointercancel', endRotate);
        this.dom.canvas.addEventListener('pointerleave', endRotate);
    }

    buildMaterialForKey(faceTexture: string | null, lodHasTextures: boolean, loadedTextures: Map<string, LoadedTexture>): THREE.MeshPhysicalMaterial {
        // Resolve textures: per-face texture if loaded, else slot (only if LOD has textures)
        const faceDiffuse = faceTexture ? findTextureByName(faceTexture) : null;
        const diffuseTexture = faceDiffuse || (lodHasTextures ? this.fileHandler.textureSlots.diffuse.texture : null);

        // Resolve normal map: try variant of face texture, else slot
        let faceNormal: THREE.Texture | null = null;
        if (faceTexture) {
            faceNormal = findVariant(faceTexture, [
                { suffix: '_nohq', append: '' },
                { suffix: '_dt', append: '' }
            ]);
        }
        const normalTexture = faceNormal || (lodHasTextures ? this.fileHandler.textureSlots.normal.texture : null);

        // Resolve ambient shadow (_as) map: try variant of face texture, else slot
        let faceAo: THREE.Texture | null = null;
        if (faceTexture) {
            faceAo = findVariant(faceTexture, [
                { suffix: '_as', append: '' }
            ]);
        }
        const aoTexture = faceAo || (lodHasTextures ? this.fileHandler.textureSlots.ao.texture : null);

        // Resolve SMDI: try variant, else slot
        let faceSmdi: THREE.Texture | null = null;
        if (faceTexture) {
            faceSmdi = findVariant(faceTexture, [
                { suffix: '_smdi', append: '' }
            ]);
        }
        const smdiTexture = faceSmdi || (lodHasTextures ? this.fileHandler.textureSlots.smdi.texture : null);

        // Build material with resolved textures using the override system
        const material = this.fileHandler.textureSlots.buildMaterial({
            wireframeEnabled: false,
            normalStrength: this.normalStrength,
            rvmat: this.fileHandler.currentRvmat,
            textureOverrides: {
                diffuse: diffuseTexture,
                normal: normalTexture,
                ao: aoTexture,
                smdi: smdiTexture
            }
        });

        return material;

        function findVariant(baseName: string | null, replacements: Array<{ suffix: string; append: string }>): THREE.Texture | null {
            if (!baseName) return null;
            const baseNoExt = baseName.replace(/\.[^.]+$/, '');
            for (const rep of replacements) {
                const candidate = baseNoExt.replace(/_(co|ca|nohq|smdi|as)$/i, rep.suffix) + rep.append;
                const tex = findTextureByName(candidate);
                if (tex) return tex;
            }
            return null;
        }

        function findTextureByName(name: string | null): THREE.Texture | null {
            if (!name) return null;
            const base = name.split(/[\\/]/).pop();
            if (!base) return null;
            const baseNoExt = base.replace(/\.[^.]+$/, '').toLowerCase();
            for (const [k, v] of loadedTextures) {
                const kb = k.split(/[\\/]/).pop();
                const kbNoExt = kb?.replace(/\.[^.]+$/, '').toLowerCase();
                if (kbNoExt === baseNoExt) return v.texture;
            }
            return null;
        }
    }
}
