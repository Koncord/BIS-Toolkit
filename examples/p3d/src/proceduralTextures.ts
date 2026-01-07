import * as THREE from 'three';

/**
 * Parsed procedural texture data
 */
export interface ProceduralTextureData {
    format: 'color' | 'fresnel';
    width: number;
    height: number;
    // Color format
    r?: number;
    g?: number;
    b?: number;
    a?: number;
    type?: string;  // CO, NOHQ, DT, SMDI, AS, MC, etc.
    // Fresnel format
    N?: number;  // Index of refraction
    K?: number;  // Extinction coefficient
}

/**
 * Parse procedural texture definition from RVMAT
 * 
 * Formats:
 *   - Color: #(argb,width,height,mips)color(r,g,b,a,type)
 *   - Fresnel: #(ai,width,height,mips)fresnel(N,K)
 * 
 * @param textureString - The texture definition string from RVMAT
 * @returns Parsed data or null if not a procedural texture
 */
export function parseProceduralTexture(textureString: string): ProceduralTextureData | null {
    if (!textureString || typeof textureString !== 'string') return null;
    if (!textureString.startsWith('#(')) return null;

    // Try color format first
    const colorMatch = textureString.match(/#\(argb,(\d+),(\d+),(\d+)\)color\(([\d.]+),([\d.]+),([\d.]+),([\d.]+)(?:,(\w+))?\)/);
    if (colorMatch) {
        const width = parseInt(colorMatch[1]) || 8;
        const height = parseInt(colorMatch[2]) || 8;
        const r = parseFloat(colorMatch[4]);
        const g = parseFloat(colorMatch[5]);
        const b = parseFloat(colorMatch[6]);
        const a = parseFloat(colorMatch[7]);
        const type = colorMatch[8] || '';
        return { width, height, r, g, b, a, type, format: 'color' };
    }

    // Try fresnel format
    const fresnelMatch = textureString.match(/#\(ai,(\d+),(\d+),(\d+)\)fresnel\(([\d.]+),([\d.]+)\)/);
    if (fresnelMatch) {
        const width = parseInt(fresnelMatch[1]) || 64;
        const height = parseInt(fresnelMatch[2]) || 64;
        const N = parseFloat(fresnelMatch[4]); // Index of refraction
        const K = parseFloat(fresnelMatch[5]); // Extinction coefficient
        return { width, height, N, K, format: 'fresnel' };
    }

    return null;
}

/**
 * Generate a Fresnel lookup texture
 */
function generateFresnelTexture(data: ProceduralTextureData): THREE.DataTexture {
    const width = data.width || 64;
    const height = 1; // 1D lookup stored as 2D texture
    const pixels = new Uint8Array(width * 4);

    const n = data.N || 1.5;
    const k = data.K || 0.0;

    // Calculate F0 (reflectance at normal incidence)
    // For conductors: F = ((n-1)^2 + k^2) / ((n+1)^2 + k^2)
    const F0 = ((n - 1) * (n - 1) + k * k) / ((n + 1) * (n + 1) + k * k);

    for (let x = 0; x < width; x++) {
        const cosTheta = x / (width - 1); // 0 to 1 (cos of angle)

        // Schlick's approximation: F(θ) = F0 + (1 - F0) * (1 - cos(θ))^5
        const fresnel = F0 + (1.0 - F0) * Math.pow(1.0 - cosTheta, 5.0);
        const value = Math.floor(Math.min(fresnel, 1.0) * 255);

        pixels[x * 4] = value;     // R
        pixels[x * 4 + 1] = value; // G
        pixels[x * 4 + 2] = value; // B
        pixels[x * 4 + 3] = 255;   // A
    }

    const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
    texture.needsUpdate = true;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    console.log(`Generated fresnel texture: ${width}x${height} - N=${n}, K=${k}, F0=${F0.toFixed(3)}`);

    return texture;
}

/**
 * Generate a solid color texture
 */
function generateColorTexture(data: ProceduralTextureData): THREE.DataTexture {
    const width = data.width || 8;
    const height = data.height || 8;
    const size = width * height * 4;
    const pixels = new Uint8Array(size);

    const rByte = Math.floor((data.r || 0) * 255);
    const gByte = Math.floor((data.g || 0) * 255);
    const bByte = Math.floor((data.b || 0) * 255);
    const aByte = Math.floor((data.a || 1) * 255);

    for (let i = 0; i < size; i += 4) {
        pixels[i] = rByte;
        pixels[i + 1] = gByte;
        pixels[i + 2] = bByte;
        pixels[i + 3] = aByte;
    }

    const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
    texture.needsUpdate = true;

    console.log(`Generated procedural texture: ${data.type} - ${width}x${height} - rgba(${rByte},${gByte},${bByte},${aByte})`);

    return texture;
}

/**
 * Generate a THREE.js texture from procedural texture data
 * 
 * @param data - Parsed procedural texture data
 * @returns THREE.js DataTexture
 */
export function generateProceduralTexture(data: ProceduralTextureData): THREE.DataTexture {
    if (data.format === 'fresnel') {
        return generateFresnelTexture(data);
    }
    return generateColorTexture(data);
}

/**
 * Create a texture from an RVMAT texture string
 * Handles both procedural textures and file paths
 * 
 * @param textureString - Texture definition from RVMAT
 * @returns THREE.js texture if procedural, null if file path
 */
export function createTextureFromRvmatString(textureString: string): THREE.DataTexture | null {
    const procData = parseProceduralTexture(textureString);
    if (procData) {
        return generateProceduralTexture(procData);
    }
    // Not a procedural texture - caller should load from file
    return null;
}

/**
 * Check if a texture string is a procedural texture definition
 */
export function isProceduralTexture(textureString: string): boolean {
    return !!textureString && textureString.startsWith('#(');
}

/**
 * Convert a DataTexture to a data URL for preview purposes
 * Creates a canvas and draws the texture data to it
 */
export function dataTextureToDataUrl(texture: THREE.DataTexture): string {
    const canvas = document.createElement('canvas');
    const width = texture.image.width;
    const height = texture.image.height;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return '';
    }

    // Create ImageData from texture's pixel data
    const imageData = ctx.createImageData(width, height);
    const data = texture.image.data;

    if (data) {
        // Copy pixel data
        for (let i = 0; i < data.length; i++) {
            imageData.data[i] = data[i];
        }
    }

    // Put image data on canvas
    ctx.putImageData(imageData, 0, 0);

    // Convert to data URL
    return canvas.toDataURL('image/png');
}
