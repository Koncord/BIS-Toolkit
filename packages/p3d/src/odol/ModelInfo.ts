import { OdolReader } from './OdolReader';
import { Vector3, Matrix3 } from './math';
import { PackedColor } from './PackedColor';
import { ClipFlags, ShadowBufferSource, MapType } from './enums';
import { Skeleton } from './auxiliaryStructures';

/**
 * Model information (metadata and properties)
 */
export class ModelInfo {
    public special: number = 0;
    public boundingSphere: number = 0;
    public geometrySphere: number = 0;
    public remarks: number = 0;
    public andHints: ClipFlags = ClipFlags.None;
    public orHints: ClipFlags = ClipFlags.None;
    public aimingCenter: Vector3 = new Vector3();
    public color: PackedColor = new PackedColor();
    public colorType: PackedColor = new PackedColor();
    public viewDensity: number = 0;
    public bboxMin: Vector3 = new Vector3();
    public bboxMax: Vector3 = new Vector3();
    public bboxMinVisual: Vector3 = new Vector3();
    public bboxMaxVisual: Vector3 = new Vector3();
    public boundingCenter: Vector3 = new Vector3();
    public geometryCenter: Vector3 = new Vector3();
    public centerOfMass: Vector3 = new Vector3();
    public invInertia: Matrix3 = new Matrix3();
    public autoCenter: boolean = false;
    public lockAutoCenter: boolean = false;
    public canOcclude: boolean = false;
    public canBeOccluded: boolean = false;
    public unknownBool: boolean = false;
    public unknownFloat: number = 0;
    public forceNotAlphaModel: boolean = false;
    public sbSource: ShadowBufferSource = ShadowBufferSource.Visual;
    public preferShadowVolume: boolean = false;
    public shadowOffset: number = 0;
    public animated: boolean = false;
    public skeleton: Skeleton = new Skeleton();
    public mapType: MapType = MapType.Tree;
    public massArray: number[] = [0, 0, 0, 0];
    public mass: number = 0;
    public invMass: number = 0;
    public armor: number = 0;
    public invArmor: number = 0;

    public htMin: number = 0;
    public htMax: number = 0;
    public afMax: number = 0;
    public mfMax: number = 0;
    public mFact: number = 0;
    public tBody: number = 0;
    public minShadow: number = 0;
    public canBlend: boolean = false;
    public propertyClass: string = '';
    public propertyDamage: string = '';
    public propertyFrequent: boolean = false;

    public memoryIndex: number = 0;
    public geometryIndex: number = 0;
    public unkLodType1Index: number = 0;
    public geometryFireIndex: number = 0;
    public geometryViewIndex: number = 0
    public geometryViewPilotIndex: number = 0;
    public geometryViewGunnerIndex: number = 0;
    public unkLodType2Index: number = 0;
    public geometryViewCargoIndex: number = 0;
    public landContactIndex: number = 0;
    public roadwayIndex: number = 0;
    public pathsIndex: number = 0;
    public hitpointsIndex: number = 0;

    static fromReader(reader: OdolReader): ModelInfo {
        const info = new ModelInfo();

        info.special = reader.readInt32();
        info.boundingSphere = reader.readFloat();
        info.geometrySphere = reader.readFloat();
        info.remarks = reader.readInt32();
        info.andHints = reader.readUInt32() as ClipFlags;
        info.orHints = reader.readUInt32() as ClipFlags;
        info.aimingCenter = Vector3.fromReader(reader);
        info.color = PackedColor.fromReader(reader);
        info.colorType = PackedColor.fromReader(reader);
        info.viewDensity = reader.readFloat();
        info.bboxMin = Vector3.fromReader(reader);
        info.bboxMax = Vector3.fromReader(reader);
        info.bboxMinVisual = Vector3.fromReader(reader);
        info.bboxMaxVisual = Vector3.fromReader(reader);
        info.boundingCenter = Vector3.fromReader(reader);
        info.geometryCenter = Vector3.fromReader(reader);
        info.centerOfMass = Vector3.fromReader(reader);
        info.invInertia = Matrix3.fromReader(reader);
        info.autoCenter = reader.readBoolean();
        info.lockAutoCenter = reader.readBoolean();
        info.canOcclude = reader.readBoolean();
        info.canBeOccluded = reader.readBoolean();
        info.unknownBool = reader.readBoolean();
        info.unknownFloat = reader.readFloat();
        console.warn('Unknown ModelInfo values:', info.unknownBool, info.unknownFloat);

        info.htMin = reader.readFloat();
        info.htMax = reader.readFloat();
        info.afMax = reader.readFloat();
        info.mfMax = reader.readFloat();
        info.mFact = reader.readFloat();
        info.tBody = reader.readFloat();
        info.forceNotAlphaModel = reader.readBoolean();
        info.sbSource = reader.readInt32() as ShadowBufferSource;
        info.preferShadowVolume = reader.readBoolean();
        info.shadowOffset = reader.readFloat();
        info.animated = reader.readBoolean();
        info.skeleton = Skeleton.fromReader(reader);
        info.mapType = reader.readByte() as MapType;
        info.massArray = reader.readCompressedArray(r => r.readFloat(), 4);
        info.mass = reader.readFloat();
        info.invMass = reader.readFloat();
        info.armor = reader.readFloat();
        info.invArmor = reader.readFloat();

        info.memoryIndex = reader.readByte();
        info.geometryIndex = reader.readByte();
        if (reader.version >= 54) {
            info.unkLodType1Index = reader.readByte(); // unkLodType1 (seems always to be 255)
        }

        info.geometryFireIndex = reader.readByte(); // geometryFire
        info.geometryViewIndex = reader.readByte(); // geometryView
        info.geometryViewPilotIndex = reader.readByte(); // geometryViewPilot
        info.geometryViewGunnerIndex = reader.readByte(); // geometryViewGunner
        info.unkLodType2Index = reader.readByte(); // unkLodType2 (seems always to be 255)
        info.geometryViewCargoIndex = reader.readByte(); // geometryViewCargo
        info.landContactIndex = reader.readByte(); // landContact
        info.roadwayIndex = reader.readByte(); // roadway
        info.pathsIndex = reader.readByte(); // paths
        info.hitpointsIndex = reader.readByte(); // hitpoints
        info.minShadow = reader.readUInt32();
        info.canBlend = reader.readBoolean();
        info.propertyClass = reader.readCString();
        info.propertyDamage = reader.readCString();
        info.propertyFrequent = reader.readBoolean();

        return info;
    }
}
