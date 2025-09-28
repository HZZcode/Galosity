const mod = (a: number, b: number) => (a % b + b) % b;

class RNG {
    static readonly a = 1664525;
    static readonly c = 1013904223;
    static readonly m = Math.pow(2, 32);
    private seed = mod(Date.now(), RNG.m);

    setSeed(seed: number) {
        this.seed = mod(seed, RNG.m);
    }

    get nextInt() {
        this.seed = (RNG.a * this.seed + RNG.c % RNG.m + RNG.m) % RNG.m;
        return this.seed;
    }

    get nextNum() {
        return this.nextInt / RNG.m;
    }

    get nextBool() {
        return 2 * this.nextInt < RNG.m;
    }
}

export const Random = new RNG();