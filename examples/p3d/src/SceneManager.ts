import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { P3D } from '../../../packages/p3d/src/shared/P3d';
import { ILod } from "../../../packages/p3d/src/shared/Lod";

/**
 * Scene configuration options
 */
export interface SceneConfig {
    canvas: HTMLCanvasElement;
    container?: HTMLElement;
    backgroundColor?: number;
    ambientLightIntensity?: number;
    directionalLightIntensity?: number;
    hemisphereIntensity?: number;
    showGrid?: boolean;
    showAxes?: boolean;
}

/**
 * Manages Three.js scene components and provides utility methods
 */
export class SceneManager {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;

    constructor(
        config: SceneConfig,
        OrbitControlsClass: typeof OrbitControls
    ) {
        const {
            canvas,
            container,
            backgroundColor = 0x0F1117,
            ambientLightIntensity = 0.6,
            directionalLightIntensity = 0.8,
            hemisphereIntensity = 0.5,
            showGrid = true,
            showAxes = true
        } = config;

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(backgroundColor);

        // Create camera
        const width = container?.clientWidth || canvas.clientWidth;
        const height = container?.clientHeight || canvas.clientHeight || 1;
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 1000);
        this.camera.position.set(-5, 3, 5);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Create controls
        this.controls = new OrbitControlsClass(this.camera, canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.rotateSpeed = 0.6;
        this.controls.zoomSpeed = 1.2;
        this.controls.panSpeed = 0.8;
        this.controls.minDistance = 0.1;
        this.controls.maxDistance = 100;
        this.controls.target.set(0, 1, 0);
        this.controls.update();

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xFFFFFF, ambientLightIntensity);
        this.scene.add(ambientLight);

        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xFFFFFF, directionalLightIntensity);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 100;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);

        // Add hemisphere light
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x90EE90, hemisphereIntensity);
        this.scene.add(hemisphereLight);

        // Add grid helper
        if (showGrid) {
            const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xCCCCCC);
            this.scene.add(gridHelper);
        }

        // Add axes helper
        if (showAxes) {
            const axesHelper = new THREE.AxesHelper(5);
            this.scene.add(axesHelper);
        }
    }

    /**
     * Handle window/container resize
     */
    handleResize(canvas: HTMLCanvasElement, container?: HTMLElement): void {
        const width = container?.clientWidth || canvas.clientWidth;
        const height = container?.clientHeight || canvas.clientHeight || 1;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Reset camera to default position
     */
    resetCamera(
        position: THREE.Vector3 = new THREE.Vector3(-5, 3, 5),
        target: THREE.Vector3 = new THREE.Vector3(0, 1, 0)
    ): void {
        this.camera.position.copy(position);
        this.controls.target.copy(target);
        this.controls.update();
    }

    /**
     * Position camera based on object size
     */
    private positionCameraForSize(size: THREE.Vector3): void {
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;

        this.camera.position.set(-cameraDistance, cameraDistance * 0.5, cameraDistance);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    /**
     * Center camera on a mesh
     */
    centerCameraOnMesh(mesh: THREE.Mesh): void {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        this.positionCameraForSize(size);
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Start animation loop with debug normal mode support
     */
    startAnimationLoop(): void {
        const animate = (): void => {
            requestAnimationFrame(animate);

            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        };

        animate();
    }

    /**
     * Display a model in the scene with optional view preservation
     */
    displayModel(
        model: P3D,
        lodIndex: number,
        currentMeshRef: { current: THREE.Mesh | null },
        createMeshFn: (lod: ILod) => THREE.Mesh,
        options: { preserveView?: boolean } = {},
        onLodUpdate?: (model: P3D, lodIndex: number) => void
    ): void {
        const preserveView = !!options.preserveView;
        const prevCameraPos = this.camera.position.clone();
        const prevTarget = this.controls.target.clone();
        const prevMeshQuat = currentMeshRef.current ? currentMeshRef.current.quaternion.clone() : null;
        const prevMeshPos = currentMeshRef.current ? currentMeshRef.current.position.clone() : null;

        if (!model.lods[lodIndex]) {
            throw new Error(`LOD ${lodIndex} not found`);
        }

        // Remove previous mesh
        if (currentMeshRef.current) {
            this.scene.remove(currentMeshRef.current);
            currentMeshRef.current.geometry.dispose();
            if (Array.isArray(currentMeshRef.current.material)) {
                currentMeshRef.current.material.forEach(m => m.dispose());
            } else if (currentMeshRef.current.material && typeof currentMeshRef.current.material.dispose === 'function') {
                currentMeshRef.current.material.dispose();
            }
        }

        // Create and add new mesh
        try {
            currentMeshRef.current = createMeshFn(model.lods[lodIndex]);
            this.scene.add(currentMeshRef.current);

            // Center and frame the model
            const box = new THREE.Box3().setFromObject(currentMeshRef.current);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            if (preserveView && prevMeshPos) {
                // Keep previous position and rotation
                currentMeshRef.current.position.copy(prevMeshPos);
                if (prevMeshQuat) {
                    currentMeshRef.current.quaternion.copy(prevMeshQuat);
                }
            } else {
                // Center the model
                currentMeshRef.current.position.sub(center);
                if (prevMeshQuat) {
                    currentMeshRef.current.quaternion.copy(prevMeshQuat);
                }
            }

            if (!preserveView) {
                // Position camera
                this.positionCameraForSize(size);
            } else {
                // Keep prior camera framing
                this.camera.position.copy(prevCameraPos);
                this.controls.target.copy(prevTarget);
            }

            this.camera.lookAt(this.controls.target);
            this.controls.update();

            // Call optional LOD update callback
            if (onLodUpdate) {
                onLodUpdate(model, lodIndex);
            }

        } catch (error) {
            throw new Error(`Failed to display model: ${(error as Error).message}`);
        }
    }
}
