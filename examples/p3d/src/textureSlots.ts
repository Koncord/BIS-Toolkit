import * as THREE from 'three';

import type { RvMat } from './RvMat';
import { RvTexture } from './RvTexture';
import { MeshPhysicalMaterialParameters } from 'three';

/**
 * Texture Utilities for Arma 3 Model Formats
 * 
 * Based on reversed HLSL shaders (shader_reconstructed.ps.hlsl)
 * 
 * TEXTURE CHANNEL USAGE (from shader analysis):
 * 
 * 1. DIFFUSE (_co): Standard RGB + Alpha
 *    - RGB: Base color (sRGB)
 *    - A: Alpha/transparency
 * 
 * 2. NORMAL (_nohq, _no): Tangent-space normals
 *    - Shader samples .xyz and uses custom decode (line 151):
 *      normalXY = sample.xy + (sample.x - sample.z, 0) + (1, 0)
 *      tangentNormal.xy = normalXY * 2 - 1
 *      tangentNormal.z = sqrt(max(1 - dot(xy, xy), 0))
 * 
 * 3. AS (_as): Ambient Shadow/Occlusion  
 *    - Shader samples .yz (line 178): float2 asTexture = Sample(...).yz
 *    - asTexture.x (G channel): Ambient occlusion
 *    - asTexture.y (B channel): Self-shadow factor (line 297)
 *    - R channel: Unused in this shader
 * 
 * 4. SMDI (_smdi): Specular/Material/Displacement/Illumination
 *    - Shader samples .yz (line 169): float2 smdi = Sample(...).yz  
 *    - smdi.x (G channel): Specular intensity for Fresnel (lines 216, 285)
 *    - smdi.y (B channel): Shininess for specular power (line 195)
 *    - R channel: Unused in this shader (older versions may differ)
 * 
 * 5. DETAIL: Tiling detail overlay (RGB)
 *    - Multiplied with diffuse for fine surface detail
 * 
 * 6. MACRO: Large-scale tiling overlay (RGBA)
 *    - RGB: Color, A: Blend weight
 *    - Blended with diffuse based on alpha
 * 
 * 7. EMISSIVE: Self-illumination (RGB)
 *    - Multiplied by Mat.cEmission constant
 * 
 * 8. REFLECTION/ENVIRONMENT: Cubemap or 2D reflection
 *    - Sampled using reflection vector with mip level based on shininess
 *    - mipLevel = max(500.0 / max(shininess, 1.0), 1.0)
 */

/**
 * Texture slot definition
 */
export class TextureSlot {
    name: string;
    texture: THREE.Texture | null = null;
    file: File | null = null;
    url: string | null = null;

    // SMDI-specific properties
    metalnessMap?: THREE.Texture | null;
    roughnessMap?: THREE.Texture | null;
    aoMap?: THREE.Texture | null;
    specularIntensityMap?: THREE.Texture | null;
    specularColorMap?: THREE.Texture | null;
    roughnessUrl?: string | null;
    metalnessUrl?: string | null;
    specularIntensityUrl?: string | null;
    specularColorUrl?: string | null;

    constructor(name: string) {
        this.name = name;
    }

    /**
     * Set texture data
     */
    setTexture(texture: THREE.Texture, file: File, url: string): void {
        // Dispose previous texture if exists
        this.disposeTexture();

        this.texture = texture;
        this.file = file;
        this.url = url;
    }

    /**
     * Set SMDI-derived maps
     */
    setSmdiMaps(maps: {
        metalnessMap?: THREE.Texture | null;
        roughnessMap?: THREE.Texture | null;
        aoMap?: THREE.Texture | null;
        specularIntensityMap?: THREE.Texture | null;
        specularColorMap?: THREE.Texture | null;
        roughnessUrl?: string | null;
        metalnessUrl?: string | null;
        specularIntensityUrl?: string | null;
        specularColorUrl?: string | null;
    }): void {
        // Clear previous SMDI maps
        this.clearSmdiMaps();

        this.metalnessMap = maps.metalnessMap;
        this.roughnessMap = maps.roughnessMap;
        this.aoMap = maps.aoMap;
        this.specularIntensityMap = maps.specularIntensityMap;
        this.specularColorMap = maps.specularColorMap;
        this.roughnessUrl = maps.roughnessUrl;
        this.metalnessUrl = maps.metalnessUrl;
        this.specularIntensityUrl = maps.specularIntensityUrl;
        this.specularColorUrl = maps.specularColorUrl;
    }

    /**
     * Check if this slot has a texture loaded
     */
    hasTexture(): boolean {
        return this.texture !== null;
    }

    /**
     * Check if this slot has SMDI-derived maps
     */
    hasSmdiMaps(): boolean {
        return !!(this.roughnessMap || this.metalnessMap || this.specularIntensityMap || this.specularColorMap);
    }

    /**
     * Dispose only the main texture
     */
    disposeTexture(): void {
        if (this.texture) {
            this.texture.dispose();
            this.texture = null;
        }
        if (this.url) {
            URL.revokeObjectURL(this.url);
            this.url = null;
        }
        this.file = null;
    }

    /**
     * Clear SMDI-derived maps
     */
    clearSmdiMaps(): void {
        if (this.metalnessMap) {
            this.metalnessMap.dispose();
            this.metalnessMap = null;
        }
        if (this.roughnessMap) {
            this.roughnessMap.dispose();
            this.roughnessMap = null;
        }
        if (this.aoMap) {
            this.aoMap.dispose();
            this.aoMap = null;
        }
        if (this.specularIntensityMap) {
            this.specularIntensityMap.dispose();
            this.specularIntensityMap = null;
        }
        if (this.specularColorMap) {
            this.specularColorMap.dispose();
            this.specularColorMap = null;
        }

        if (this.roughnessUrl) {
            URL.revokeObjectURL(this.roughnessUrl);
            this.roughnessUrl = null;
        }
        if (this.metalnessUrl) {
            URL.revokeObjectURL(this.metalnessUrl);
            this.metalnessUrl = null;
        }
        if (this.specularIntensityUrl) {
            URL.revokeObjectURL(this.specularIntensityUrl);
            this.specularIntensityUrl = null;
        }
        if (this.specularColorUrl) {
            URL.revokeObjectURL(this.specularColorUrl);
            this.specularColorUrl = null;
        }
    }

    /**
     * Clear all resources (texture and SMDI maps)
     */
    clear(): void {
        this.disposeTexture();
        this.clearSmdiMaps();
    }

    /**
     * Dispose all resources (alias for clear)
     */
    dispose(): void {
        this.clear();
    }
}

/**
 * Texture slots collection for managing multiple texture types
 */
export class TextureSlots {
    diffuse: TextureSlot;
    normal: TextureSlot;
    ao: TextureSlot;
    smdi: TextureSlot;
    environment: TextureSlot;

    constructor() {
        this.diffuse = new TextureSlot('Diffuse (_co)');
        this.normal = new TextureSlot('Normal (_nohq)');
        this.ao = new TextureSlot('Ambient Occlusion (_as)');
        this.smdi = new TextureSlot('SMDI (_smdi)');
        this.environment = new TextureSlot('Environment');
    }

    /**
     * Auto-detect texture slot from filename
     */
    autoDetectSlot(filename: string): keyof TextureSlots | 'diffuse' {
        const baseName = filename.replace(/\.[^.]+$/, '').toLowerCase();

        if (baseName.startsWith('env_') && baseName.endsWith('_co')) {
            return 'environment';
        } else if (baseName.endsWith('_co') || baseName.endsWith('_ca')) {
            return 'diffuse';
        } else if (baseName.endsWith('_nohq') || baseName.endsWith('_dt')) {
            return 'normal';
        } else if (baseName.endsWith('_as')) {
            return 'ao';
        } else if (baseName.endsWith('_smdi')) {
            return 'smdi';
        }

        return 'diffuse'; // Default
    }

    /**
     * Get a texture slot by key
     */
    getSlot(key: keyof TextureSlots): TextureSlot {
        switch (key) {
            case 'diffuse':
                return this.diffuse;
            case 'normal':
                return this.normal;
            case 'ao':
                return this.ao;
            case 'smdi':
                return this.smdi;
            case 'environment':
                return this.environment;
            default:
                throw new Error(`Unknown slot key: ${key}`);
        }
    }

    /**
     * Clear all texture slots
     */
    clearAll(): void {
        this.diffuse.clear();
        this.normal.clear();
        this.ao.clear();
        this.smdi.clear();
        this.environment.clear();
    }

    /**
     * Dispose all texture slots
     */
    dispose(): void {
        this.diffuse.dispose();
        this.normal.dispose();
        this.ao.dispose();
        this.smdi.dispose();
        this.environment.dispose();
    }

    /**
     * Load texture file to a specific slot with slot-specific processing
     * Handles normal map decoding, AO color space, and SMDI PBR map extraction
     */
    async loadToSlot(
        slotKey: keyof TextureSlots,
        file: File,
        rvmat: RvMat | null
    ): Promise<RvTexture> {
        const slot = this.getSlot(slotKey);

        // Clear SMDI maps if loading to SMDI slot
        if (slotKey === 'smdi') {
            slot.clearSmdiMaps();
        }

        const isNormalMap = slotKey === 'normal';
        const isAoMap = slotKey === 'ao';

        // Load texture using RvTexture instance
        const rvTexture = await RvTexture.fromFile(file, isNormalMap);

        // Set color space for AO maps
        if (isAoMap) {
            rvTexture.texture.colorSpace = THREE.LinearSRGBColorSpace;
        }

        // Derive PBR maps from SMDI if available
        if (slotKey === 'smdi') {
            const derived = rvTexture.deriveSmdiMaps(rvmat);
            slot.setSmdiMaps({
                roughnessMap: derived.roughnessMap,
                metalnessMap: derived.metalnessMap,
                specularIntensityMap: derived.specularIntensityMap,
                specularColorMap: derived.specularColorMap,
                roughnessUrl: derived.roughnessPreview,
                metalnessUrl: derived.metalnessPreview,
                specularIntensityUrl: derived.specularIntensityPreview,
                specularColorUrl: derived.specularColorPreview,
                aoMap: null
            });
        }

        // Set new texture (this will dispose the old one)
        slot.setTexture(rvTexture.texture, file, rvTexture.url);

        return rvTexture;
    }

    /**
     * Build a Three.js PBR material from texture slots
     */
    buildMaterial(options?: {
        wireframeEnabled?: boolean;
        normalStrength?: number;
        rvmat?: RvMat | null;
        /**
         * Override textures for per-face or custom material building.
         * If provided, these will be used instead of the texture slots.
         */
        textureOverrides?: {
            diffuse?: THREE.Texture | null;
            normal?: THREE.Texture | null;
            ao?: THREE.Texture | null;
            smdi?: THREE.Texture | null;
        };
    }): THREE.MeshPhysicalMaterial {
        const {
            wireframeEnabled = false,
            normalStrength = 1,
            rvmat = null,
            textureOverrides
        } = options || {};

        const hasDiffuseTexture = !!this.diffuse.texture;

        // Default material properties - tuned to match shader behavior
        const materialOptions: MeshPhysicalMaterialParameters = {
            color: hasDiffuseTexture ? 0xFFFFFF : 0x888888,
            metalness: 0.0, // Games rarely use metalness, mostly specular workflow
            roughness: 0.7, // Default moderate roughness
            side: THREE.DoubleSide,
            flatShading: false,
            wireframe: wireframeEnabled,
            // Shader uses Fresnel-modulated specular with cSpecular color
            specularIntensity: 0.5,
            specularColor: new THREE.Color(0.5, 0.5, 0.5),
            // Improved lighting response
            clearcoat: 0.0,
            clearcoatRoughness: 0.0,
        };

        // Apply RVMAT properties if available (this will override defaults with shader-accurate values)
        if (rvmat) {
            rvmat.applyToMaterial(materialOptions);
        }

        // Apply diffuse texture (use override if provided, else slot)
        const diffuseTexture = textureOverrides?.diffuse !== undefined ? textureOverrides.diffuse : this.diffuse.texture;
        if (diffuseTexture) {
            materialOptions.map = diffuseTexture;
        }

        // Apply normal map (shader transforms normals to world space for lighting)
        const normalTexture = textureOverrides?.normal !== undefined ? textureOverrides.normal : this.normal.texture;
        if (normalTexture) {
            materialOptions.normalMap = normalTexture;
            // Shader decodes normals with specific formula (see pixel shader lines 29-42)
            materialOptions.normalScale = new THREE.Vector2(normalStrength, -normalStrength);
            materialOptions.normalMapType = THREE.TangentSpaceNormalMap;
        }

        // Apply AO map (shader uses ao * 0.5 + 0.5 blending - see SHADER_CONSTANTS.AO_BLEND_FACTOR)
        // NOTE: Shader samples AS texture as .yz (G and B channels)
        // - G channel (asTexture.x in shader): Ambient occlusion
        // - B channel (asTexture.y in shader): Self-shadow factor
        const aoTexture = textureOverrides?.ao !== undefined ? textureOverrides.ao : this.ao.texture;
        if (aoTexture) {
            materialOptions.aoMap = aoTexture;
            // Adjust intensity to approximate shader's AO blending
            materialOptions.aoMapIntensity = 1.0;
        }

        // Apply SMDI maps (shader samples .yz: G=specular intensity, B=shininess)
        // After extraction: G channel → specularIntensity, B channel → roughness
        const smdiTexture = textureOverrides?.smdi !== undefined ? textureOverrides.smdi : this.smdi.texture;
        if (smdiTexture) {
            // When using override, we need to use the slot's extracted maps (if available)
            // because the override is the raw SMDI texture reference
            if (this.smdi.roughnessMap) {
                // This has been converted from shininess (B channel) to roughness
                materialOptions.roughnessMap = this.smdi.roughnessMap;
            }
            if (this.smdi.metalnessMap) {
                // R channel: Metalness (unused in shader, but available as fallback)
                materialOptions.metalnessMap = this.smdi.metalnessMap;
            }
            if (this.smdi.specularIntensityMap) {
                // G channel: used with Fresnel in shader (see pixel shader line 216)
                materialOptions.specularIntensityMap = this.smdi.specularIntensityMap;
                materialOptions.specularIntensity = 1.0;
            }
            if (this.smdi.specularColorMap) {
                // Specular color modulation (from G channel)
                materialOptions.specularColorMap = this.smdi.specularColorMap;
            }
        }

        // Apply environment map (shader samples reflection with mip level based on shininess)
        if (this.environment.texture) {
            materialOptions.envMap = this.environment.texture;
            // Shader applies reflection with Fresnel term
            materialOptions.envMapIntensity = 0.5;
        }

        // Enable transparency only if diffuse texture exists and might have alpha
        if (hasDiffuseTexture) {
            materialOptions.transparent = true;
            materialOptions.alphaTest = 0.5;
            materialOptions.depthWrite = true;
        }

        return new THREE.MeshPhysicalMaterial(materialOptions);
    }
}
