import * as THREE from 'three';
import { TextureSlots } from './textureSlots';
import { RvMat } from './RvMat';
import { P3D } from '../../../packages/p3d/src/shared/P3d';
import { dataTextureToDataUrl } from './proceduralTextures';


export interface MaterialData {
    path: string;
    loaded: boolean;
    rvmat: RvMat | null;
}

export interface LoadedTexture {
    texture: THREE.Texture;
    file: File;
    url: string;
}

export class FileHandler {
    materialLibrary: Map<string, MaterialData> = new Map();
    loadedTextures: Map<string, LoadedTexture> = new Map();
    currentModel: P3D | null = null;
    currentRvmat: RvMat | null = null;
    textureSlots: TextureSlots = new TextureSlots();


    onError?: (message: string) => void;
    onSuccess?: (model: P3D) => Promise<void>;
    modelParser?: (buffer: Uint8Array) => P3D;
    updateMaterialList?: () => void;
    modelReload?: () => void;
    renderTextureSlots?: () => void;


    /**
     * Handle multiple files with automatic type detection
     */
    handleFiles = async (files: FileList | File[]): Promise<void> => {
        if (!files || files.length === 0) return;
        const fileArray = Array.from(files);

        const modelFiles: File[] = [];
        const textureFiles: File[] = [];
        const rvmatFiles: File[] = [];

        for (const file of fileArray) {
            const ext = file.name.toLowerCase().split('.').pop();

            if (ext === 'p3d') {
                modelFiles.push(file);
            } else if (ext === 'rvmat') {
                rvmatFiles.push(file);
            } else if (ext === 'paa' || ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
                textureFiles.push(file);
            }
        }

        // Load model file first if present (only first one)
        if (modelFiles.length > 0) {
            await this.handleFile(modelFiles[0]);
        }

        // Then load RVMAT files (material definitions)
        for (const rvmatFile of rvmatFiles) {
            await this.handleRvmatFile(rvmatFile);
        }

        // Finally load texture files
        if (textureFiles.length > 0) {
            await this.handleTextureFiles(textureFiles);
        }
    };

    /**
     * Generic model file handler
     */
    handleFile = async (file: File): Promise<void> => {
        if (!file) {
            this.currentModel = null;
            return;
        }

        if (this.modelParser === undefined || this.onError === undefined || this.onSuccess === undefined) {
            throw new Error('Model parser is not set');
        }
        try {
            const buffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);

            console.log(`Loading P3D file: ${file.name} (${buffer.byteLength} bytes)`);

            const model = this.modelParser(uint8Array);
            console.log(`P3D parsed successfully`);

            await this.onSuccess(model);
            this.currentModel = model;
        } catch (error) {
            console.error(`Error loading P3D:`, error);
            this.onError((error as Error).message)
            this.currentModel = null;
        }
    };

    /**
     * Generic RVMAT file handler
     */
    handleRvmatFile = async (file: File): Promise<void> => {
        if (this.updateMaterialList === undefined || this.modelReload === undefined || this.onError === undefined) {
            throw new Error('RVMAT handler is not set');
        }

        try {
            const rvmat = await RvMat.fromFile(file);

            console.log('RVMAT parsed:', rvmat.toJSON());
            console.log('Found textures:', rvmat.stages.map(s => s.texture));

            // Update material library if this matches a model material
            const materialEntry = this.materialLibrary.get(file.name);
            if (materialEntry) {
                materialEntry.loaded = true;
                materialEntry.rvmat = rvmat;
            }

            this.updateMaterialList();

            // Store RVMAT for material properties
            this.currentRvmat = rvmat;

            // Generate and load procedural textures from RVMAT
            const proceduralTextures = rvmat.generateProceduralTextures();
            if (proceduralTextures.size > 0) {
                console.log(`Generated ${proceduralTextures.size} procedural textures from RVMAT`);

                // Map texture types to slots
                const typeToSlot: Record<string, keyof TextureSlots> = {
                    'CO': 'diffuse',
                    'NOHQ': 'normal',
                    'NO': 'normal',
                    'DT': 'normal',  // Detail normal map
                    'SMDI': 'smdi',
                    'AS': 'ao',
                    // MC (Macro texture) is not mapped - it's a detail/macro color texture not supported by current slots
                };

                for (const [textureType, texture] of proceduralTextures) {
                    const slotKey = typeToSlot[textureType];
                    if (slotKey && slotKey !== 'autoDetectSlot' && slotKey !== 'getSlot' &&
                        slotKey !== 'clearAll' && slotKey !== 'dispose' &&
                        slotKey !== 'loadToSlot' && slotKey !== 'buildMaterial') {
                        const slot = this.textureSlots.getSlot(slotKey);
                        // Create a fake file for tracking
                        const fileName = `${file.name}_${textureType}.generated`;
                        const fakeFile = new File([], fileName, { type: 'image/png' });

                        // Generate data URL from texture data for preview
                        const dataUrl = dataTextureToDataUrl(texture);
                        slot.setTexture(texture, fakeFile, dataUrl);
                        this.loadedTextures.set(fileName, {
                            texture,
                            file: fakeFile,
                            url: dataUrl
                        });

                        console.log(`Loaded procedural ${textureType} texture to ${slotKey} slot`);
                    }
                }

                if (this.renderTextureSlots) {
                    this.renderTextureSlots();
                }
            }

            // Reload model with new shader properties if available
            this.modelReload();

            // Show info message
            console.log(`Loaded RVMAT file with ${rvmat.stages.length} texture references`);
            console.log('RVMAT shader properties:', {
                specular: rvmat.specular,
                specularPower: rvmat.specularPower,
                pixelShaderID: rvmat.pixelShaderID,
                vertexShaderID: rvmat.vertexShaderID
            });
        } catch (error) {
            console.error(`Error loading RVMAT file ${file.name}:`, error);
            this.onError((error as Error).message);
        }
    };

    handleTextureFiles = async (files: FileList | File[]): Promise<void> => {
        if (!files || files.length === 0) return;
        if (this.onError === undefined) {
            throw new Error('Texture handler is not set');
        }
        const onError = this.onError;
        const fileArray = Array.from(files);
        for (const file of fileArray) {
            try {
                const targetSlot = this.textureSlots.autoDetectSlot(file.name);
                console.log(`Auto-detected ${file.name} → ${targetSlot} slot`);
                await this.loadTextureToSlot(targetSlot, file);
            } catch (error: any) {
                console.error(`Error loading texture ${file.name}:`, error);
                onError(`Failed to load texture ${file.name}: ${error.message}`);
            }
        }
    };

    /**
     * Generic texture slot loader
     * Handles PAA and standard image formats, with SMDI PBR map extraction
     */
    loadTextureToSlot = async (slotKey: string, file: File): Promise<void> => {
        if (this.modelReload === undefined || this.onError === undefined || this.renderTextureSlots === undefined) {
            throw new Error('Required callbacks are not set');
        }

        try {
            const rvTexture = await this.textureSlots.loadToSlot(
                slotKey as keyof TextureSlots,
                file,
                this.currentRvmat
            );

            // Track in loaded textures
            this.loadedTextures.set(file.name, { texture: rvTexture.texture, file, url: rvTexture.url });

            console.log(`Loaded ${file.name} to ${slotKey} slot`);

            this.renderTextureSlots();
            this.modelReload();
        } catch (error) {
            console.error(`Error loading texture to ${slotKey}:`, error);
            this.onError(`Failed to load texture: ${(error as Error).message}`);
        }
    };
}
