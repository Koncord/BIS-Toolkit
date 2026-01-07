import { Matrix4 } from './math';
import { OdolReader } from './OdolReader';


/**
 * Color with RGBA float components
 */
export class Color {
    public r: number = 0;
    public g: number = 0;
    public b: number = 0;
    public a: number = 0;

    static fromReader(reader: OdolReader): Color {
        const color = new Color();
        color.r = reader.readFloat();
        color.g = reader.readFloat();
        color.b = reader.readFloat();
        color.a = reader.readFloat();
        return color;
    }
}

export class StageTexture {
    public textureFilter: number = 0; // TextureFilterType enum
    public texture: string = '';
    public stageId: number = 0;
    public useWorldEnvMap: boolean = false;

    static fromReader(reader: OdolReader): StageTexture {
        const stage = new StageTexture();
        stage.textureFilter = reader.readUInt32();
        stage.texture = reader.readCString();
        stage.stageId = reader.readUInt32();
        stage.useWorldEnvMap = reader.readBoolean();
        return stage;
    }
}

export class StageTransform {
    public uvSource: number = 0; // UVSource enum
    public transformation: Matrix4 = new Matrix4();

    static fromReader(reader: OdolReader): StageTransform {
        const transform = new StageTransform();
        transform.uvSource = reader.readUInt32();
        transform.transformation = Matrix4.fromReader(reader);
        return transform;
    }
}

export class EmbeddedMaterial {
    public materialName: string = '';
    public version: number = 0;

    // Color properties (RGBA floats)
    public emissive: Color = new Color();
    public ambient: Color = new Color();
    public diffuse: Color = new Color();
    public forcedDiffuse: Color = new Color();
    public specular: Color = new Color();
    public emissive2: Color = new Color();
    public specular2: Color = new Color();
    public unkCol1: Color = new Color();
    public unkCol2: Color = new Color();

    // Material properties
    public specularPower: number = 0;
    public pixelShaderId: number = 0;
    public vertexShaderId: number = 0;
    public mainLight: number = 0;
    public fogMode: number = 0;
    public surfaceFile: string = '';
    public nRenderFlags: number = 0;
    public renderFlags: number = 0;

    // Stage data
    public stageTextures: StageTexture[] = [];
    public stageTransforms: StageTransform[] = [];
    public stageTI: StageTexture | null = null;

    // Unknown fields
    public unk2: number = 0;
    public unk3: number = 0;

    static fromReader(reader: OdolReader): EmbeddedMaterial {
        const material = new EmbeddedMaterial();

        material.materialName = reader.readCString();
        material.version = reader.readUInt32();

        material.emissive = Color.fromReader(reader);
        material.ambient = Color.fromReader(reader);
        material.diffuse = Color.fromReader(reader);
        material.forcedDiffuse = Color.fromReader(reader);
        material.specular = Color.fromReader(reader);
        material.emissive2 = Color.fromReader(reader);
        material.unkCol1 = Color.fromReader(reader);
        material.specular2 = Color.fromReader(reader);
        material.specularPower = reader.readFloat();
        material.unk2 = reader.readInt32(); // 0 usually
        material.unk3 = reader.readInt32(); // 0 usually

        //console.log(`Unknown material values: unk2=${material.unk2}, unk3=${material.unk3}`);
        material.unkCol2 = Color.fromReader(reader);

        if (material.version >= 20) {
            const _unk1 = reader.readInt32(); // 0
            const _unk2 = reader.readInt32(); // 0
            const _unk3 = reader.readInt32(); // -1
            const _unk4 = reader.readFloat(); // 30.0
            const _unk5 = reader.readFloat(); // 45.0
            const _unk6 = reader.readInt32(); // 0
            const _unk7 = reader.readInt32(); // -1
            const _unk8 = reader.readInt32(); // 0
            const _unk9 = reader.readFloat(); // 1.0
            const _unk10 = reader.readInt32(); // 0
            const _unk11 = reader.readInt32(); // 0
            const _unk12 = reader.readInt32(); // 0

            //console.log(`Unknown material values: Unk1=${unk1}, Unk2=${unk2}, Unk3=${unk3}, Unk4=${unk4}, Unk5=${unk5}, Unk6=${unk6}, Unk7=${unk7}, Unk8=${unk8}, Unk9=${unk9}, Unk10=${unk10}, Unk11=${unk11}, Unk12=${unk12}`);
        }

        material.pixelShaderId = reader.readUInt32();
        material.vertexShaderId = reader.readUInt32();
        material.mainLight = reader.readUInt32();
        material.fogMode = reader.readUInt32();
        material.surfaceFile = reader.readCString();
        material.nRenderFlags = reader.readUInt32();
        material.renderFlags = reader.readUInt32();

        const nStages = reader.readInt32();
        const nTexGens = reader.readInt32();

        material.stageTextures = new Array<StageTexture>(nStages);
        for (let i = 0; i < nStages; i++) {
            material.stageTextures[i] = StageTexture.fromReader(reader);
        }

        material.stageTransforms = new Array<StageTransform>(nTexGens);
        for (let i = 0; i < nTexGens; i++) {
            material.stageTransforms[i] = StageTransform.fromReader(reader);
        }

        material.stageTI = StageTexture.fromReader(reader);

        return material;
    }
}
