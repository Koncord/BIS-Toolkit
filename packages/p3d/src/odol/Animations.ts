import { Animation, AnimationDirect, AnimationHide, AnimationRotation, AnimationTranslation, AnimType, isAnimationDirect, isAnimationHide } from './Animation';
import { Vector3 } from './math';
import { OdolReader } from './OdolReader';

export class Animations {
    public animations: Animation[] = [];
    public bonesToAnims: number[][][] = [];
    public animsToBones: { boneIdx: number; axisData?: [Vector3, Vector3] }[][] = [];

    static fromReader(reader: OdolReader): Animations {
        const animations = new Animations();

        // Read animations
        const animationCount = reader.readInt32();

        if (animationCount < 0 || animationCount > 10000) {
            throw new Error(`Invalid animations count: ${animationCount}`);
        }

        animations.animations = new Array<Animation>(animationCount);
        for (let i = 0; i < animationCount; i++) {
            const kind = reader.readUInt32() as AnimType;
            switch (kind) {
                case AnimType.Rotation:
                case AnimType.RotationX:
                case AnimType.RotationY:
                case AnimType.RotationZ:
                    animations.animations[i] = AnimationRotation.fromReader(reader, kind);
                    break;
                case AnimType.Translation:
                case AnimType.TranslationX:
                case AnimType.TranslationY:
                case AnimType.TranslationZ:
                    animations.animations[i] = AnimationTranslation.fromReader(reader, kind);
                    break;
                case AnimType.Direct:
                    animations.animations[i] = AnimationDirect.fromReader(reader, kind);
                    break;
                case AnimType.Hide:
                    animations.animations[i] = AnimationHide.fromReader(reader, kind);
                    break;
                default:
                    throw new Error(`Unknown AnimType encountered: ${kind as number}`);
            }
        }

        // Read bones to anims mapping table
        const animLodsCount = reader.readInt32();
        animations.bonesToAnims = new Array<number[][]>(animLodsCount);
        for (let animLodIdx = 0; animLodIdx < animLodsCount; animLodIdx++) {
            const length = reader.readUInt32();
            animations.bonesToAnims[animLodIdx] = new Array<number[]>(length);
            for (let i = 0; i < length; i++) {
                const length2 = reader.readUInt32();
                animations.bonesToAnims[animLodIdx][i] = new Array<number>(length2);
                for (let j = 0; j < length2; j++) {
                    animations.bonesToAnims[animLodIdx][i][j] = reader.readUInt32();
                }
            }
        }

        // Read anims to bones mapping table and axis data
        animations.animsToBones = new Array<{ boneIdx: number; axisData?: [Vector3, Vector3] }[]>(animLodsCount);
        for (let lodIdx = 0; lodIdx < animLodsCount; lodIdx++) {
            animations.animsToBones[lodIdx] = new Array<{ boneIdx: number; axisData?: [Vector3, Vector3] }>(animationCount);
            for (let animIdx = 0; animIdx < animationCount; animIdx++) {
                const boneIdx = reader.readInt32();

                // Read axis data if needed
                if (boneIdx !== -1 &&
                    !isAnimationHide(animations.animations[animIdx]) &&
                    !isAnimationDirect(animations.animations[animIdx])
                ) {
                    const axisData: [Vector3, Vector3] = [
                        Vector3.fromReader(reader),
                        Vector3.fromReader(reader)
                    ];
                    animations.animsToBones[lodIdx][animIdx] = { boneIdx, axisData };
                } else {
                    animations.animsToBones[lodIdx][animIdx] = { boneIdx };
                }
            }
        }

        return animations;
    }
}
