import { Comparism, falsy, greater, less, notEquals } from "../utils/comparing.js";
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

    compare(other: VersionLike, falseIf: Comparism<number>, trueIf: Comparism<number>,
        final: boolean): boolean {
        other = Version.from(other);
        for (let i = 0; i < Math.max(this.parts.length, other.parts.length); i++) {
            const thisPart = this.parts[i] || 0;
            const otherPart = other.parts[i] || 0;

            if (falseIf(thisPart, otherPart)) return false;
            if (trueIf(thisPart, otherPart)) return true;
        }
        return final;
    }

    greaterThan(other: VersionLike): boolean {
        return this.compare(other, less, greater, false);
    }

    equals(other: VersionLike): boolean {
        return this.compare(other, notEquals, falsy, true);
    }

    lessThan(other: VersionLike): boolean {
        return this.compare(other, greater, less, false);
    }

    expect(other: VersionLike, condition: boolean, operator: string) {
        if (!condition) throw `requires Galosity version ${operator} ${other}; found version ${this}`;
        return this;
    }

    atLeast(other: VersionLike) {
        return this.expect(other, this.greaterThan(other) || this.equals(other), '>=');
    }

    atMost(other: VersionLike) {
        return this.expect(other, this.lessThan(other) || this.equals(other), '<=');
    }

    exactly(other: VersionLike) {
        return this.expect(other, this.equals(other), '==');
    }

    toString() {
        return this.parts.join('.');
    }
}

class Versions {
    static versions: [Version, name: string][] = [
        [Version.fromString('2.0'), 'Pre-version'],
        [Version.fromString('2.1'), 'Plugin Dev'],
        [Version.fromString('2.2'), 'UI+S&L!!'],
    ];

    private constructor() { }

    public static latest() {
        return this.versions.at(-1)!;
    }
}