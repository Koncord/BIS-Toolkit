
/**
 * Simple RVMAT (material) file parser
 * Extracts texture paths from Stage definitions
 */

import { CfgArrayVariable, CfgBaseType, CfgClass, CfgDocument, CfgSimpleVariable, CfgType } from "./ast";
import { Parser } from "./parser";

export interface RvmatStage {
    name: string;
    texture: string;
}

export interface RvmatData {
    stages: RvmatStage[];
    ambient?: number[];
    diffuse?: number[];
    forcedDiffuse?: number[];
    emmisive?: number[];
    specular?: number[];
    specularPower?: number;
    pixelShaderID?: string;
    vertexShaderID?: string;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RvmatParser {
    /**
     * Parse RVMAT file content
     */
    static parse(content: string, filename = '<rvmat>'): RvmatData {
        const parser = new Parser(content, filename);
        const document = parser.parse();
        const data: RvmatData = { stages: [] };

        data.ambient = this.readNumberArray(this.findVariable(document, 'ambient'));
        data.diffuse = this.readNumberArray(this.findVariable(document, 'diffuse'));
        data.forcedDiffuse = this.readNumberArray(this.findVariable(document, 'forcedDiffuse'));
        data.emmisive = this.readNumberArray(this.findVariable(document, 'emmisive'));
        data.specular = this.readNumberArray(this.findVariable(document, 'specular'));
        data.specularPower = this.readNumber(this.findVariable(document, 'specularPower'));
        data.pixelShaderID = this.readString(this.findVariable(document, 'PixelShaderID'));
        data.vertexShaderID = this.readString(this.findVariable(document, 'VertexShaderID'));

        this.extractStages(document, data);

        return data;
    }

    private static findVariable(document: CfgDocument, name: string): CfgSimpleVariable | CfgArrayVariable | undefined {
        const target = name.toLowerCase();
        for (let i = document.statements.length - 1; i >= 0; i--) {
            const statement = document.statements[i];
            if (this.isVariable(statement) && statement.name.toLowerCase() === target) {
                return statement;
            }
        }
        return undefined;
    }

    private static extractStages(document: CfgDocument, data: RvmatData): void {
        const collectFromClass = (cls: CfgClass): void => {
            if (/^stage\d+$/i.test(cls.name)) {
                const textureProp = this.findClassProperty(cls, 'texture');
                if (textureProp && this.isSimpleVariable(textureProp)) {
                    const texture = this.readString(textureProp);
                    // Include both file paths and procedural textures (starting with #)
                    if (texture && texture.trim() !== '') {
                        data.stages.push({ name: cls.name, texture });
                    }
                }
            }

            for (const property of cls.properties.values()) {
                if (this.isClass(property)) {
                    collectFromClass(property);
                }
            }
        };

        for (const statement of document.statements) {
            if (this.isClass(statement)) {
                collectFromClass(statement);
            }
        }
    }

    private static findClassProperty(cls: CfgClass, propertyName: string): CfgBaseType | undefined {
        const target = propertyName.toLowerCase();
        let match: CfgBaseType | undefined;
        for (const [name, property] of cls.properties) {
            if (name.toLowerCase() === target) {
                match = property;
            }
        }
        return match;
    }

    private static readNumberArray(node?: CfgSimpleVariable | CfgArrayVariable): number[] | undefined {
        if (!node) { return undefined; }
        const raw = node.kind === 'array' ? node.values : node.value;
        if (!Array.isArray(raw)) { return undefined; }

        const numbers = raw
            .map(value => this.toNumber(value))
            .filter((value): value is number => value !== undefined);

        return numbers.length > 0 ? numbers : undefined;
    }

    private static readNumber(node?: CfgSimpleVariable | CfgArrayVariable): number | undefined {
        if (!node) { return undefined; }
        if (node.kind === 'variable') {
            return this.toNumber(node.value);
        }
        return node.values.length === 1 ? this.toNumber(node.values[0]) : undefined;
    }

    private static readString(node?: CfgSimpleVariable | CfgArrayVariable): string | undefined {
        if (!node || !this.isSimpleVariable(node)) { return undefined; }
        const value = node.value;
        return typeof value === 'string' ? value : undefined;
    }

    private static toNumber(value: CfgType): number | undefined {
        if (typeof value === 'number') { return value; }
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return Number.isFinite(parsed) ? parsed : undefined;
        }
        return undefined;
    }

    private static isVariable(node: CfgBaseType): node is CfgSimpleVariable | CfgArrayVariable {
        return node.kind === 'variable' || node.kind === 'array';
    }

    private static isSimpleVariable(node: CfgBaseType): node is CfgSimpleVariable {
        return node.kind === 'variable';
    }

    private static isClass(node: CfgBaseType): node is CfgClass {
        return node.kind === 'class';
    }

    /**
     * Get all texture paths from parsed data
     */
    static getTexturePaths(data: RvmatData): string[] {
        return data.stages.map(stage => stage.texture);
    }

    /**
     * Get main diffuse/color texture (typically Stage1)
     */
    static getMainTexture(data: RvmatData): string | undefined {
        return data.stages.find(s => s.name === 'Stage1')?.texture;
    }
}
