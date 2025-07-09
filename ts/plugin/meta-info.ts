import { logger } from "../utils/logger.js";

export class MetaInfo {
    isDebug;
    version;
    versionName;

    constructor() {
        this.isDebug = logger.isDebug;
        [this.version, this.versionName] = Versions.latest();
    }
}

type VersionLike = string | Version;

export class Version {
    parts;

    constructor(parts: number[]) {
        this.parts = parts;
    }

    static fromString(str: string) {
        const parts = str.split('.').map(part => Number.parseInt(part));
        const nan = parts.findIndex(isNaN);
        if (nan !== -1) throw `Not a num: '${str.split('.')[nan]}'`;
        return new Version(parts);
    }

    static from(version: VersionLike) {
        return typeof version === 'string' ? Version.fromString(version) : version;
    }

    atLeast(other: VersionLike): boolean {
        other = Version.from(other);
        for (let i = 0; i < Math.max(this.parts.length, other.parts.length); i++) {
            const thisPart = this.parts[i] || 0;
            const otherPart = other.parts[i] || 0;

            if (thisPart < otherPart) return false;
            if (thisPart > otherPart) return true;
        }
        return true;
    }

    requires(other: VersionLike) {
        if (!this.atLeast(other)) throw `requires Galosity version >= ${other}; found version ${this}`;
    }

    toString() {
        return this.parts.join('.');
    }
}

class Versions {
    static versions: [Version, name: string][] = [
        [Version.fromString('2.0'), 'Pre-version'],
        [Version.fromString('2.1'), 'Plugin Dev'],
    ];

    private constructor() { }

    public static latest() {
        return this.versions.at(-1)!;
    }
}