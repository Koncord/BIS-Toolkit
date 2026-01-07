
export function getLodName(resolution: number): string {
    if (approxEqual(resolution, 1000)) return 'View-Gunner';
    if (approxEqual(resolution, 1100)) return 'View-Pilot';
    if ((resolution > 1200 || approxEqual(resolution, 1200)) && resolution < 1300) {
        return `View-Cargo ${toFixedNumber(resolution, 1200)}`;
    }

    if (approxEqual(resolution, 1300)) return 'View-Cargo Fire Geom. [obsolete]';
    if ((resolution > 10000 || approxEqual(resolution, 10000)) && resolution < 20000) {
        return `ShadowVolume ${toFixedNumber(resolution, 10000)}`;
    }

    if ((resolution > 20000 || approxEqual(resolution, 20000)) && resolution < 30000) {
        return `Edit ${toFixedNumber(resolution, 20000)}`;
    }

    if (approxEqual(resolution, 1e13)) return 'Geometry';
    if (approxEqual(resolution, 2e13)) return 'Geometry Buoyancy';
    if (approxEqual(resolution, 3e13)) return 'Geometry Phys Old';
    if (approxEqual(resolution, 4e13)) return 'Geometry Phys';
    if (approxEqual(resolution, 100e13)) return 'Memory';
    if (approxEqual(resolution, 200e13)) return 'LandContact';
    if (approxEqual(resolution, 300e13)) return 'RoadWay';
    if (approxEqual(resolution, 400e13)) return 'Paths';
    if (approxEqual(resolution, 500e13)) return 'Hit-Points';
    if (approxEqual(resolution, 600e13)) return 'View Geometry';
    if (approxEqual(resolution, 700e13)) return 'Fire Geometry';
    if ((resolution > 800e13 || approxEqual(resolution, 800e13)) && resolution < 900e13) {
        return `View-Cargo Geom. ${toFixedNumber(resolution, 800e13)}`;
    }

    if (approxEqual(resolution, 900e13)) return 'View-Cargo Fire Geom. [obsolete]';
    if (approxEqual(resolution, 1000e13)) return 'View-Commander [obsolete]';
    if (approxEqual(resolution, 1100e13)) return 'View-Commander Geom. [obsolete]';
    if (approxEqual(resolution, 1200e13)) return 'View-Commander Fire Geom. [obsolete]';
    if (approxEqual(resolution, 1300e13)) return 'View-Pilot Geom.';
    if (approxEqual(resolution, 1400e13)) return 'View-Pilot Fire Geom. [obsolete]';
    if (approxEqual(resolution, 1500e13)) return 'View-Gunner Geom.';
    if (approxEqual(resolution, 1600e13)) return 'View-Gunner Fire Geom. [obsolete]';
    if (approxEqual(resolution, 1700e13)) return 'Sub Parts [obsolete]';
    if ((resolution > 1800e13 || approxEqual(resolution, 1800e13)) && resolution < 1900e13) {
        return `ShadowVolume - View Cargo ${toFixedNumber(resolution, 1800e13)}`;
    }

    if (approxEqual(resolution, 1900e13)) return 'ShadowVolume - View Pilot';
    if (approxEqual(resolution, 2000e13)) return 'ShadowVolume - View Gunner';
    if (approxEqual(resolution, 2100e13)) return 'Wreck';

    return resolution.toFixed(3);

    function toFixedNumber(value: number, subtract: number): string {
        return Math.max(0, value - subtract).toFixed(3)
    }

    function approxEqual(a: number, b: number, tolerance: number = 1e-5): boolean {
        if (Math.abs(a) > 1e10 || Math.abs(b) > 1e10) {
            const maxVal = Math.max(Math.abs(a), Math.abs(b));
            return Math.abs(a - b) <= maxVal * tolerance;
        }
        // For smaller numbers
        return Math.abs(a - b) <= tolerance;
    }
}
