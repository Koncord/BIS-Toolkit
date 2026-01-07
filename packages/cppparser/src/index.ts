/**
 * RAP/CPP parser utilities
 */

export {
  type CfgType,
  type CfgBaseType,
  type CfgDocument,
  type CfgSimpleVariable,
  type CfgArrayVariable,
  type CfgArrayExtend,
  type CfgArrayShrink,
  type CfgEnum,
  type CfgClass,
  type CfgPrototype,
  type CfgDelete,
  type CfgNodeType,
} from './ast';

export {
  lex,
  TokenKind,
  isCfgKeyword,
  isCfgPunctuation,
  CfgKeywords,
  CfgPunctuations,
  CfgOperators,
  type CfgToken,
} from './lexer';

export { Parser } from './parser';
export { Preprocessor, type PreprocessorOptions } from './preprocessor';

export {
  type CfgPatch,
  type ScriptModule,
  type CfgMod,
  type CfgMods,
  type CfgPatches,
  type ProjectFile,
} from './project';

export { RvmatParser, type RvmatData, type RvmatStage } from './RvmatParser';