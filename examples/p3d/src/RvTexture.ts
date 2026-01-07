import * as THREE from 'three';
import { Paa } from '@bis-toolkit/paa';
import type { RvMat } from './RvMat';

/**
 * SMDI-derived PBR maps
 */
export interface SmdiDerivedMaps {
    metalnessMap: THREE.DataTexture;
    roughnessMap: THREE.DataTexture;
    specularIntensityMap: THREE.DataTexture;
    specularColorMap: THREE.DataTexture | null;
    metalnessPreview: string | null;
    roughnessPreview: string | null;
    specularIntensityPreview: string | null;
    specularColorPreview: string | null;
}

/**
 * RvTexture - Real Virtuality Texture Handler
 * 
 * Handles loading and conversion of Arma 3 textures (PAA format) and standard formats,
 * with support for shader-accurate PBR material map extraction from SMDI textures.
 */
export class RvTexture {
    /** The source file */
    readonly file: File;

    /** The THREE.js texture */
    readonly texture: THREE.Texture;

    /** Data URL for the texture */
    readonly url: string;

    /** Canvas (only for PAA textures) */
    readonly canvas?: HTMLCanvasElement;

    /** Texture type */
    readonly type: 'paa' | 'standard';

    /** SMDI-derived maps (populated when deriveSmdiMaps is called) */
    derivedMaps?: SmdiDerivedMaps;

    /**
     * Private constructor - use factory methods to create instances
     */
    private constructor(
        file: File,
        texture: THREE.Texture,
        url: string,
        type: 'paa' | 'standard',
        canvas?: HTMLCanvasElement
    ) {
        this.file = file;
        this.texture = texture;
        this.url = url;
        this.type = type;
        this.canvas = canvas;
    }

    /**
     * Load PAA file and create RvTexture instance
     */
    static async fromPaaFile(file: File, isNormalMap: boolean = false): Promise<RvTexture> {
        const buffer = await file.arrayBuffer();
        const uint8Buffer = new Uint8Array(buffer);
        const paa = new Paa();
        paa.read(uint8Buffer);
        let canvas = RvTexture.paaToCanvas(paa, uint8Buffer);

        // Decode Arma's custom normal map encoding to standard tangent-space
        if (isNormalMap) {
            canvas = RvTexture.decodeArmaNormalMap(canvas);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.flipY = false;

        if (isNormalMap) {
            texture.colorSpace = THREE.LinearSRGBColorSpace; // Normal maps are linear data
        }

        texture.needsUpdate = true;

        const url = canvas.toDataURL();

        return new RvTexture(file, texture, url, 'paa', canvas);
    }

    /**
     * Load standard image file and create RvTexture instance
     */
    static async fromStandardFile(file: File, isNormalMap: boolean = false): Promise<RvTexture> {
        const imageUrl = URL.createObjectURL(file);
        const textureLoader = new THREE.TextureLoader();

        const texture = await new Promise<THREE.Texture>((resolve, reject) => {
            textureLoader.load(
                imageUrl,
                (tex) => {
                    tex.wrapS = THREE.RepeatWrapping;
                    tex.wrapT = THREE.RepeatWrapping;
                    tex.flipY = false;
                    if (isNormalMap) {
                        tex.colorSpace = THREE.LinearSRGBColorSpace; // linear data, no sRGB gamma
                    }
                    resolve(tex);
                },
                undefined,
                (error: any) => {
                    URL.revokeObjectURL(imageUrl);
                    reject(error);
                }
            );
        });

        return new RvTexture(file, texture, imageUrl, 'standard');
    }

    /**
     * Auto-detect file type and load texture
     */
    static async fromFile(file: File, isNormalMap: boolean = false): Promise<RvTexture> {
        const isPaa = file.name.toLowerCase().endsWith('.paa');
        return isPaa
            ? RvTexture.fromPaaFile(file, isNormalMap)
            : RvTexture.fromStandardFile(file, isNormalMap);
    }

    /**
     * Derive PBR maps from SMDI texture
     * 
     * SMDI channel usage from shader (samples .yz - G and B channels):
     * - smdi.x (G channel, index 1): Specular intensity for Fresnel
     * - smdi.y (B channel, index 2): Shininess (converted to roughness)
     * - R channel (index 0): Unused in shader
     */
    deriveSmdiMaps(material?: RvMat | null): SmdiDerivedMaps {
        // Get canvas from PAA or create from standard texture
        let canvas: HTMLCanvasElement;
        if (this.canvas) {
            canvas = this.canvas;
        } else {
            const img = this.texture.image as HTMLImageElement;
            canvas = RvTexture.imageToCanvas(img);
        }

        // G channel (specular → metalness approx)
        const metalnessMap = RvTexture.createGrayTextureFromChannel(canvas, 1, false);
        // B channel (shininess → roughness, inverted)
        const roughnessMap = RvTexture.createGrayTextureFromChannel(canvas, 2, true);
        // Specular intensity from G channel
        const specularIntensityMap = RvTexture.createGrayTextureFromChannel(canvas, 1, false);

        let specularColorMap: THREE.DataTexture | null = null;

        const specHex = material?.getSpecularHex();
        if (specHex) {
            const color = new THREE.Color(specHex);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
                const { width, height } = canvas;
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                const out = new Uint8Array(width * height * 4); // RGBA needs 4 components

                for (let i = 0, j = 0; i < data.length; i += 4, j += 4) {
                    const g = data[i + 1] / 255; // spec level
                    out[j] = Math.round(color.r * g * 255);
                    out[j + 1] = Math.round(color.g * g * 255);
                    out[j + 2] = Math.round(color.b * g * 255);
                    out[j + 3] = 255; // Alpha
                }

                specularColorMap = new THREE.DataTexture(
                    out,
                    width,
                    height,
                    THREE.RGBAFormat,
                    THREE.UnsignedByteType
                );
                specularColorMap.colorSpace = THREE.LinearSRGBColorSpace;
                specularColorMap.wrapS = THREE.RepeatWrapping;
                specularColorMap.wrapT = THREE.RepeatWrapping;
                specularColorMap.flipY = false;
                specularColorMap.needsUpdate = true;
            }
        }

        // Optionally modulate by RVMAT material properties
        if (material) {
            // Use average specular color as scalar for metalness
            if (Array.isArray(material.specular) && material.specular.length >= 3) {
                const s = Math.max(
                    0,
                    Math.min(1, (material.specular[0] + material.specular[1] + material.specular[2]) / 3)
                );
                const mData = metalnessMap.image.data;
                if (mData !== null) {
                    for (let i = 0; i < mData.length; i++) {
                        mData[i] = Math.max(0, Math.min(255, Math.round(mData[i] * s)));
                    }
                    metalnessMap.needsUpdate = true;
                }
            }

            // Use specularPower to bias roughness (high power => lower roughness)
            if (typeof material.specularPower === 'number') {
                const normalized = Math.log(material.specularPower + 1) / Math.log(1001);
                const roughnessScale = Math.max(0.1, 1 - normalized);
                const rData = roughnessMap.image.data;
                if (rData !== null) {
                    for (let i = 0; i < rData.length; i++) {
                        rData[i] = Math.max(0, Math.min(255, Math.round(rData[i] * roughnessScale)));
                    }
                }
                roughnessMap.needsUpdate = true;
            }
        }

        this.derivedMaps = {
            metalnessMap,
            roughnessMap,
            specularIntensityMap,
            specularColorMap,
            metalnessPreview: RvTexture.dataTextureToDataUrl(metalnessMap),
            roughnessPreview: RvTexture.dataTextureToDataUrl(roughnessMap),
            specularIntensityPreview: RvTexture.dataTextureToDataUrl(specularIntensityMap),
            specularColorPreview: specularColorMap ? RvTexture.dataTextureToDataUrl(specularColorMap) : null
        };

        return this.derivedMaps;
    }

    /**
     * Get canvas - creates one from image if needed
     */
    getCanvas(): HTMLCanvasElement {
        if (this.canvas) {
            return this.canvas;
        }
        const img = this.texture.image as HTMLImageElement;
        return RvTexture.imageToCanvas(img);
    }

    /**
     * Dispose of texture resources
     */
    dispose(): void {
        this.texture.dispose();
        if (this.type === 'standard') {
            URL.revokeObjectURL(this.url);
        }
        if (this.derivedMaps) {
            this.derivedMaps.metalnessMap.dispose();
            this.derivedMaps.roughnessMap.dispose();
            this.derivedMaps.specularIntensityMap.dispose();
            this.derivedMaps.specularColorMap?.dispose();
        }
    }

    // Static utility methods

    /**
     * Convert PAA file to Canvas
     */
    private static paaToCanvas(paa: Paa, buffer: Uint8Array): HTMLCanvasElement {
        if (!paa.mipmaps || paa.mipmaps.length === 0) {
            throw new Error('PAA file has no mipmaps');
        }

        const canvas = document.createElement('canvas');
        const mipmap = paa.mipmaps[0];
        canvas.width = mipmap.width;
        canvas.height = mipmap.height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Failed to get 2D context');

        const imageData = ctx.createImageData(mipmap.width, mipmap.height);

        // Get RGBA pixel data from PAA
        const rgbaData = mipmap.getRgba32PixelData(buffer);
        // Some PAA sources come out as BGRA; swap R/B to match canvas expectation
        for (let i = 0; i < rgbaData.length; i += 4) {
            const r = rgbaData[i];
            rgbaData[i] = rgbaData[i + 2];
            rgbaData[i + 2] = r;
        }
        imageData.data.set(rgbaData);

        ctx.putImageData(imageData, 0, 0);

        return canvas;
    }

    /**
     * Load an image element from a URL
     */
    static loadImageElement(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    /**
     * Convert image element to canvas
     */
    static imageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Failed to get 2D context');
        ctx.drawImage(img, 0, 0);
        return canvas;
    }

    /**
     * Create a grayscale texture from a specific channel
     */
    static createGrayTextureFromChannel(
        canvas: HTMLCanvasElement,
        channelIndex: number,
        invert = false
    ): THREE.DataTexture {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Failed to get 2D context');

        const { width, height } = canvas;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const out = new Uint8Array(width * height);

        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            const v = data[i + channelIndex];
            out[j] = invert ? 255 - v : v;
        }

        const tex = new THREE.DataTexture(out, width, height, THREE.RedFormat, THREE.UnsignedByteType);
        tex.colorSpace = THREE.LinearSRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.flipY = false;
        tex.needsUpdate = true;

        return tex;
    }

    /**
     * Decode Arma normal map to standard tangent-space format
     * 
     * Arma uses a custom encoding (from shader lines 151-164):
     * normalXY = sample.xy + (sample.x - sample.z, 0) + (1, 0)
     * tangentNormal.xy = normalXY * 2 - 1
     * tangentNormal.z = sqrt(1 - dot(xy, xy))
     * 
     * This converts Arma's format to standard Three.js tangent-space normals.
     * 
     * @param canvas - Canvas with Arma normal map data
     * @returns Canvas with standard tangent-space normals
     */
    static decodeArmaNormalMap(canvas: HTMLCanvasElement): HTMLCanvasElement {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Failed to get 2D context');

        const { width, height } = canvas;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = width;
        outputCanvas.height = height;
        const outputCtx = outputCanvas.getContext('2d')!;
        const outputImageData = outputCtx.createImageData(width, height);
        const outData = outputImageData.data;

        for (let i = 0; i < data.length; i += 4) {
            // Read RGB values [0, 255]
            const sampleX = data[i] / 255;
            const sampleY = data[i + 1] / 255;
            const sampleZ = data[i + 2] / 255;

            // Apply Arma's decoding formula
            // normalXY = sample.xy + (sample.x - sample.z, 0) + (1, 0)
            let normalX = sampleX + (sampleX - sampleZ) + 1.0;
            let normalY = sampleY + 1.0;

            // Convert to [-1, 1] range
            normalX = normalX * 2.0 - 1.0;
            normalY = normalY * 2.0 - 1.0;

            // Reconstruct Z (pointing outward)
            const normalLenSq = normalX * normalX + normalY * normalY;
            const normalZ = Math.sqrt(Math.max(1.0 - normalLenSq, 0.0));

            // Convert back to [0, 1] for standard tangent-space storage
            // Three.js expects: R=X*0.5+0.5, G=Y*0.5+0.5, B=Z*0.5+0.5
            outData[i] = Math.round((normalX * 0.5 + 0.5) * 255);
            outData[i + 1] = Math.round((normalY * 0.5 + 0.5) * 255);
            outData[i + 2] = Math.round((normalZ * 0.5 + 0.5) * 255);
            outData[i + 3] = 255; // Alpha
        }

        outputCtx.putImageData(outputImageData, 0, 0);
        return outputCanvas;
    }

    /**
     * Convert DataTexture to data URL for preview
     */
    static dataTextureToDataUrl(tex: THREE.DataTexture): string | null {
        if (!tex || !tex.image || !tex.image.data || !tex.image.width || !tex.image.height) {
            return null;
        }

        const { data, width, height } = tex.image;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;

        const imageData = ctx.createImageData(width, height);

        // Support single-channel (RedFormat) and 4-channel (RGBAFormat) DataTextures
        if (tex.format === THREE.RGBAFormat || data.length === width * height * 4) {
            // RGBA data - direct copy
            imageData.data.set(data);
        } else if (data.length === width * height * 3) {
            // Legacy RGB data (deprecated format) - add alpha
            for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
                imageData.data[j] = data[i];
                imageData.data[j + 1] = data[i + 1];
                imageData.data[j + 2] = data[i + 2];
                imageData.data[j + 3] = 255;
            }
        } else {
            // Assume single channel
            for (let i = 0, j = 0; i < data.length; i++, j += 4) {
                const v = data[i];
                imageData.data[j] = v;
                imageData.data[j + 1] = v;
                imageData.data[j + 2] = v;
                imageData.data[j + 3] = 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL();
    }
}
