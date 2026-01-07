// Export MLOD functionality under MLOD namespace
export * as MLOD from './mlod/index';

// Export ODOL functionality under ODOL namespace
export * as ODOL from './odol/index';

// Re-export common types that don't conflict
export { Mlod, MlodLod } from './mlod/index';
export { Odol, OdolLod, ModelInfo, OdolReader } from './odol/index';
