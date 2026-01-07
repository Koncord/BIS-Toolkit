import * as THREE from 'three';
import { RvmatData, RvmatParser } from '@bis-toolkit/cppparser';
import { createTextureFromRvmatString, isProceduralTexture, parseProceduralTexture } from './proceduralTextures';

/**
 * RVMAT texture stage
 */
export interface RvMatStage {
    name: string;
    texture: string;
}

/**
 * RvMat - Real Virtuality Material
 * 
 * Represents an Arma 3 RVMAT material with shader properties and texture stages.
 * Provides methods to apply shader-accurate PBR material properties.
 * 
 * @example
 * ```typescript
 * // Load RVMAT from file
 * const rvmat = await RvMat.fromFile(file);
 * 
 * // Get material properties
 * console.log(rvmat.getSpecularHex()); // e.g., "#ff8800"
 * console.log(rvmat.getRoughness()); // e.g., 0.25
 * 
 * // Apply to THREE.js material
 * const material = rvmat.createMaterial({
 *   color: 0xffffff,
 *   metalness: 0.5
 * });
 * 
 * // Find textures
 * const diffuseTexture = rvmat.getTexture('_co');
 * const normalTexture = rvmat.getTexture('_nohq');
 * 
 * // Use with RvTexture for SMDI processing
 * const smdiFile = new File([...], '1r_smdi.paa');
 * const smdiTexture = await RvTexture.fromFile(smdiFile);
 * const pbrMaps = smdiTexture.deriveSmdiMaps(rvmat);
 * ```
 */
export class RvMat {
    /** The source file */
    readonly file: File;

    /** Parsed RVMAT data */
    readonly data: RvmatData;

    /** Material filename */
    readonly filename: string;

    /** Generated fresnel texture (if any) */
    private _fresnelTexture: THREE.DataTexture | null = null;

    /** Fresnel parameters (N and K) if fresnel texture exists */
    private _fresnelParams: { N: number; K: number } | null = null;

    /** Texture stages */
    get stages(): RvMatStage[] {
        return this.data.stages;
    }

    /** Ambient color [r, g, b, a] */
    get ambient(): number[] | undefined {
        return this.data.ambient;
    }

    /** Diffuse color [r, g, b, a] */
    get diffuse(): number[] | undefined {
        return this.data.diffuse;
    }

    /** Forced diffuse color [r, g, b, a] */
    get forcedDiffuse(): number[] | undefined {
        return this.data.forcedDiffuse;
    }

    /** Emissive color [r, g, b, a] */
    get emissive(): number[] | undefined {
        return this.data.emmisive;
    }

    /** Specular color [r, g, b, specularPower] */
    get specular(): number[] | undefined {
        return this.data.specular;
    }

    /** Specular power */
    get specularPower(): number | undefined {
        return this.data.specularPower;
    }

    /** Pixel shader ID */
    get pixelShaderID(): string | undefined {
        return this.data.pixelShaderID;
    }

    /** Vertex shader ID */
    get vertexShaderID(): string | undefined {
        return this.data.vertexShaderID;
    }

    /**
     * Private constructor - use factory methods to create instances
     */
    private constructor(file: File, data: RvmatData) {
        this.file = file;
        this.data = data;
        this.filename = file.name;
    }

    /**
     * Load RVMAT from file
     */
    static async fromFile(file: File): Promise<RvMat> {
        const text = await file.text();
        const data = RvmatParser.parse(text, file.name);
        return new RvMat(file, data);
    }

    /**
     * Parse RVMAT from string
     */
    static fromString(content: string, filename: string = '<rvmat>'): RvMat {
        const data = RvmatParser.parse(content, filename);
        // Create a synthetic File object
        const blob = new Blob([content], { type: 'text/plain' });
        const file = new File([blob], filename, { type: 'text/plain' });
        return new RvMat(file, data);
    }

    /**
     * Get specular color as THREE.Color
     */
    getSpecularColor(): THREE.Color | null {
        if (!this.specular || this.specular.length < 3) {
            return null;
        }
        return new THREE.Color(this.specular[0], this.specular[1], this.specular[2]);
    }

    /**
     * Get specular color as hex string
     */
    getSpecularHex(): string | null {
        if (!this.specular || this.specular.length < 3) {
            return null;
        }
        const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
        const [r, g, b] = this.specular;
        const toHex = (v: number) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    /**
     * Get average specular intensity
     */
    getSpecularIntensity(): number {
        if (!this.specular || this.specular.length < 3) {
            return 0;
        }
        return (this.specular[0] + this.specular[1] + this.specular[2]) / 3;
    }

    /**
     * Get emissive color as THREE.Color
     */
    getEmissiveColor(): THREE.Color | null {
        if (!this.emissive || this.emissive.length < 3) {
            return null;
        }
        return new THREE.Color(this.emissive[0], this.emissive[1], this.emissive[2]);
    }

    /**
     * Get emissive intensity (max component)
     */
    getEmissiveIntensity(): number {
        if (!this.emissive || this.emissive.length < 3) {
            return 0;
        }
        return Math.max(this.emissive[0], this.emissive[1], this.emissive[2]);
    }

    /**
     * Get ambient color as THREE.Color
     */
    getAmbientColor(): THREE.Color | null {
        if (!this.ambient || this.ambient.length < 3) {
            return null;
        }
        return new THREE.Color(this.ambient[0], this.ambient[1], this.ambient[2]);
    }

    /**
     * Get diffuse color as THREE.Color
     */
    getDiffuseColor(): THREE.Color | null {
        if (!this.diffuse || this.diffuse.length < 3) {
            return null;
        }
        return new THREE.Color(this.diffuse[0], this.diffuse[1], this.diffuse[2]);
    }

    /**
     * Get forced diffuse color as THREE.Color
     */
    getForcedDiffuseColor(): THREE.Color | null {
        if (!this.forcedDiffuse || this.forcedDiffuse.length < 3) {
            return null;
        }
        return new THREE.Color(this.forcedDiffuse[0], this.forcedDiffuse[1], this.forcedDiffuse[2]);
    }

    /**
     * Calculate roughness from specular power
     * Based on shader formula: shininess = smdi.y * specularPower
     */
    getRoughness(): number {
        if (!this.specularPower || this.specularPower <= 0) {
            return 0.5; // Default mid-range roughness
        }
        return RvMat.shininessToRoughness(this.specularPower);
    }

    /**
     * Find texture stage by name pattern
     */
    findStage(pattern: string | RegExp): RvMatStage | undefined {
        if (typeof pattern === 'string') {
            return this.stages.find(s => s.texture.toLowerCase().includes(pattern.toLowerCase()));
        }
        return this.stages.find(s => pattern.test(s.texture));
    }

    /**
     * Find all texture stages matching a pattern
     */
    findStages(pattern: string | RegExp): RvMatStage[] {
        if (typeof pattern === 'string') {
            return this.stages.filter(s => s.texture.toLowerCase().includes(pattern.toLowerCase()));
        }
        return this.stages.filter(s => pattern.test(s.texture));
    }

    /**
     * Get texture filename for a specific suffix (e.g., '_co', '_nohq', '_smdi')
     */
    getTexture(suffix: string): string | null {
        const stage = this.findStage(suffix);
        return stage ? stage.texture : null;
    }

    /**
     * Get all texture filenames
     */
    getAllTextures(): string[] {
        return this.stages.map(s => s.texture);
    }

    /**
     * Get the generated fresnel texture
     */
    getFresnelTexture(): THREE.DataTexture | null {
        return this._fresnelTexture;
    }

    /**
     * Get fresnel parameters (N = IOR, K = extinction coefficient)
     */
    getFresnelParams(): { N: number; K: number } | null {
        return this._fresnelParams;
    }

    /**
     * Apply material properties to THREE.js MeshPhysicalMaterial parameters
     * Uses shader-accurate calculations from reversed HLSL
     */
    applyToMaterial(materialOptions: THREE.MeshPhysicalMaterialParameters): void {
        // Apply fresnel IOR if available
        if (this._fresnelParams) {
            // Use the refractive index from fresnel texture
            materialOptions.ior = this._fresnelParams.N;

            // K (extinction coefficient) suggests metallic/conductive material
            // In THREE.js, we approximate this using metalness
            // High K values (> 0.5) typically indicate metals
            if (this._fresnelParams.K > 0.5) {
                materialOptions.metalness = Math.min(this._fresnelParams.K, 1.0);
                console.log(`Applied fresnel IOR: ${this._fresnelParams.N}, metalness from K: ${materialOptions.metalness.toFixed(3)}`);
            } else {
                console.log(`Applied fresnel IOR: ${this._fresnelParams.N}`);
            }
        }

        // Specular properties (from Mat.cSpecular in shader)
        if (this.specular && this.specular.length >= 3) {
            const [r, g, b, specularPower] = this.specular;
            materialOptions.specularColor = new THREE.Color(r, g, b);

            // The shader multiplies specular by Fresnel term
            // Use specular intensity weighted by RGB average
            materialOptions.specularIntensity = this.getSpecularIntensity();

            // Convert specular power (w component) to roughness
            // Shader: shininess = smdi.y * specularPower
            if (specularPower !== undefined && specularPower > 0) {
                materialOptions.roughness = RvMat.shininessToRoughness(specularPower);
            }
        }

        // Emissive properties (from Mat.cEmission in shader)
        if (this.emissive && this.emissive.length >= 3) {
            const [r, g, b] = this.emissive;
            const intensity = Math.max(r, g, b);
            if (intensity > 0.01) {
                materialOptions.emissive = new THREE.Color(r, g, b);
                materialOptions.emissiveIntensity = intensity;
            }
        }

        // Forced diffuse (additive diffuse lighting in shader)
        if (this.forcedDiffuse && this.forcedDiffuse.length >= 3) {
            const [r, g, b] = this.forcedDiffuse;
            const intensity = Math.max(r, g, b);
            if (intensity > 0.01) {
                // This is added to diffuse in shader, could brighten base color slightly
                // For PBR, we can blend it into emissive as ambient lighting
                if (!materialOptions.emissive) {
                    materialOptions.emissive = new THREE.Color(r * 0.5, g * 0.5, b * 0.5);
                    materialOptions.emissiveIntensity = intensity * 0.5;
                }
            }
        }
    }

    /**
     * Create a THREE.js MeshPhysicalMaterial with RVMAT properties applied
     */
    createMaterial(baseOptions?: THREE.MeshPhysicalMaterialParameters): THREE.MeshPhysicalMaterial {
        const options: THREE.MeshPhysicalMaterialParameters = baseOptions || {};
        this.applyToMaterial(options);
        return new THREE.MeshPhysicalMaterial(options);
    }

    /**
     * Get summary of material properties
     */
    getSummary(): string {
        const lines: string[] = [];
        lines.push(`Material: ${this.filename}`);
        lines.push(`Textures: ${this.stages.length} stages`);

        if (this.pixelShaderID) {
            lines.push(`Pixel Shader: ${this.pixelShaderID}`);
        }

        if (this.vertexShaderID) {
            lines.push(`Vertex Shader: ${this.vertexShaderID}`);
        }

        if (this.specular) {
            const hex = this.getSpecularHex();
            lines.push(`Specular: ${hex} (intensity: ${this.getSpecularIntensity().toFixed(3)})`);
        }

        if (this.specularPower !== undefined) {
            lines.push(`Specular Power: ${this.specularPower} (roughness: ${this.getRoughness().toFixed(3)})`);
        }

        if (this.emissive) {
            lines.push(`Emissive: intensity ${this.getEmissiveIntensity().toFixed(3)}`);
        }

        return lines.join('\n');
    }

    /**
     * Convert to JSON-serializable object
     */
    toJSON(): Record<string, any> {
        return {
            filename: this.filename,
            stages: this.stages,
            ambient: this.ambient,
            diffuse: this.diffuse,
            forcedDiffuse: this.forcedDiffuse,
            emissive: this.emissive,
            specular: this.specular,
            specularPower: this.specularPower,
            pixelShaderID: this.pixelShaderID,
            vertexShaderID: this.vertexShaderID
        };
    }

    /**
     * Generate procedural textures from RVMAT texture definitions
     * Returns a map of texture type to THREE.js texture
     * Also stores fresnel texture internally if found
     * 
     * @returns Map of texture types (e.g., 'CO', 'NOHQ', 'SMDI') to generated textures
     */
    generateProceduralTextures(): Map<string, THREE.DataTexture> {
        const textures = new Map<string, THREE.DataTexture>();

        for (const stage of this.stages) {
            if (isProceduralTexture(stage.texture)) {
                // Parse to check if it's fresnel
                const procData = parseProceduralTexture(stage.texture);
                const texture = createTextureFromRvmatString(stage.texture);

                if (texture) {
                    // Store fresnel texture separately
                    if (procData && procData.format === 'fresnel') {
                        this._fresnelTexture = texture;
                        this._fresnelParams = { N: procData.N || 1.5, K: procData.K || 0.0 };
                        console.log(`Generated fresnel texture from ${stage.name} - N=${this._fresnelParams.N}, K=${this._fresnelParams.K}`);
                    } else {
                        // Extract type from texture string if available
                        // e.g., "#(argb,8,8,3)color(0.5,0.5,1,1,NOHQ)" -> "NOHQ"
                        const typeMatch = stage.texture.match(/,([A-Z]+)\)/);
                        const textureType = typeMatch ? typeMatch[1] : stage.name;
                        textures.set(textureType, texture);
                        console.log(`Generated procedural texture for ${textureType} from ${stage.name}`);
                    }
                }
            }
        }

        return textures;
    }

    /**
     * Get procedural texture by type (CO, NOHQ, SMDI, DT, AS, MC, etc.)
     * 
     * @param type - Texture type suffix
     * @returns Generated texture or null if not procedural
     */
    getProceduralTexture(type: string): THREE.DataTexture | null {
        const upperType = type.toUpperCase();

        // Find stage with matching type
        for (const stage of this.stages) {
            if (isProceduralTexture(stage.texture)) {
                const typeMatch = stage.texture.match(/,([A-Z]+)\)/);
                const textureType = typeMatch ? typeMatch[1] : '';

                if (textureType === upperType) {
                    return createTextureFromRvmatString(stage.texture);
                }
            }
        }

        return null;
    }


    /**
     * Convert shader shininess to PBR roughness
     * Based on shader formula: shininess = smdi.y * specularPower
     * where specularPower is typically in range [1, 128]
     */
    static shininessToRoughness(shininess: number): number {
        // Shader uses pow(NdotH, shininess) for specular
        // Three.js roughness is approximately: roughness = sqrt(2 / (shininess + 2))
        // Clamp shininess to reasonable range
        const clampedShininess = Math.max(1, Math.min(shininess, 256));
        return Math.sqrt(2 / (clampedShininess + 2));
    }
}
