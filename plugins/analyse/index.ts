// This file was /utils/analyse.ts, but later unused in Galosity, so we moved it here.

/// <reference path='../../dts/exports.d.ts' />

// These were import statements.
const { notUndefined } = galosity.utils.assert;
const { Files } = galosity.runtime.files;
const { TypeDispatch } = galosity.utils.typeDispatch;
const { Runtime } = galosity.runtime.runtime;
const { logger } = galosity.runtime.logger;
const dataTypes = galosity.parser.dataTypes;
const { Paragraph } = galosity.parser.parser;
const { file } = galosity.editor.fileManager;
const { manager } = galosity.engine.manager;

// We need to do this due to an issue; see https://github.com/microsoft/TypeScript/issues/41047.
const assert: (condition: boolean, error?: Error | string)
    => asserts condition = galosity.utils.assert.assert;

type Files = InstanceType<typeof Files>;
type GalData = InstanceType<typeof dataTypes.GalData>;

class FileCache {
    private fileContent?: string;

    constructor(public filename: string) { }

    async getContent(files: Files) {
        const path = await files.resolve(this.filename, await files.getPath());
        return this.fileContent ??= await files.readFileDecrypted(path);
    }
}

class FileCaches {
    private files?: Files;
    private caches: FileCache[] = [];

    private getCache(filename: string) {
        return this.caches.filter(cache => cache.filename === filename).first()
            ?? this.caches.pushAndReturn(new FileCache(filename));
    }

    async getContent(filename: string) {
        return await this.getCache(filename).getContent(this.files ??= new Files(filename));
    }
}

class Position {
    nexts = Set.of<Position>();

    constructor(public files: FileCaches, public filename: string,
        public line: number, public callStack: Position[] = []) { }

    with(line: number, filename?: string) {
        return new Position(this.files, filename ?? this.filename, line, this.callStack);
    }
    push(top: Position) {
        return new Position(this.files, this.filename, this.line, [...this.callStack, top]);
    }
    top() {
        assert(this.callStack.length !== 0, 'Call stack is empty');
        return this.callStack.at(-1)!;
    }

    downstreams(founds = Set.of<Position>()): Set<Position> {
        if (founds.has(this)) return Set.of();
        founds.add(this);
        return Set.of(this, ...this.nexts.toArray().map(pos => pos.downstreams(founds))
            .reduce((x, y) => x.union(y), Set.of()));
    }

    equals(other: Position): boolean {
        return this.filename === other.filename && this.line === other.line
            && this.callStack.length === other.callStack.length
            && this.callStack.map((value, index) => value.equals(other.callStack[index])).all();
    }

    toString() {
        return `[${this.line}] @${this.filename} +${this.debugNextsString()}`
            + ` [${this.callStack.map(pos => pos.line).toSorted().join(', ')}]`;
    }
    debugNextsString() {
        return '{' + [...this.nexts].map(pos => pos.line).toSorted().join(', ') + '}';
    }
    debugString() {
        return [...this.downstreams()].toSorted((x, y) => x.line - y.line)
            .map(pos => pos.toString()).join('\n');
    }

    async getContent() {
        return await this.files.getContent(this.filename);
    }
    async getParagraph() {
        return new Paragraph((await this.getContent()).splitLine());
    }
    async getDataList() {
        return (await this.getParagraph()).dataList;
    }
    async getDataLength() {
        return (await this.getDataList()).length;
    }
    async getData() {
        return (await this.getDataList())[this.line];
    }

    nextLine() {
        return this.with(this.line + 1);
    }

    findIn(founds: Set<Position>) {
        return [...founds].filter(found => this.equals(found)).first();
    }
    private mapIn(allFounds: Set<Position>) {
        return this.findIn(allFounds) ?? this;
    }
    async findNexts(founds: Set<Position>, allFounds: Set<Position>): Promise<Set<Position>> {
        if (this.findIn(founds) !== undefined) return Set.of();
        const length = (await this.getDataList()).length;
        if (this.line >= length) return Set.of();
        const result = await analyseNext.call(await this.getData(), this);
        return new Set((result instanceof Position ? [result] : [...result])
            .map(pos => pos.mapIn(allFounds)));
    }
}

export const analyseNext = new TypeDispatch<[pos: Position],
    Iterable<Position> | Position, GalData>();
analyseNext.register(dataTypes.GalData, async (_, pos) =>
    pos.line >= await pos.getDataLength() - 1 ? [] : pos.nextLine());
analyseNext.register(dataTypes.JumpData, async (data, pos) => {
    switch (data.type) {
        case dataTypes.JumpType.Anchor:
            return pos.with((await pos.getParagraph()).findAnchorPos(data.anchor));
        case dataTypes.JumpType.File: return pos.with(0, data.anchor);
        case dataTypes.JumpType.Link: return [];
    }
});
analyseNext.register(dataTypes.ControlStartData, async (_, pos) => (await pos.getParagraph())
    .findStartControlBlock(pos.line)!.casesPosList.map(casePos => pos.with(casePos + 1)));
analyseNext.register(dataTypes.CaseData, async (_, pos) =>
    pos.with((await pos.getParagraph()).findCaseControlBlock(pos.line).next(pos.line)));
analyseNext.register(dataTypes.FuncData, async (_, pos) =>
    pos.with((await pos.getParagraph()).findReturnPosAfter(pos.line) + 1));
analyseNext.register(dataTypes.CallData, async (data, pos) =>
    pos.with((await pos.getParagraph()).findFuncPos(data.name) + 1).push(pos));
analyseNext.register(dataTypes.ReturnData, (_, pos) => pos.top().nextLine());

class Analyser {
    root: Position;
    unresolveds: Set<Position>;
    files = new FileCaches();

    get positions() {
        return this.root.downstreams();
    }
    get founds() {
        return new Set([...this.positions].filter(pos => pos.findIn(this.unresolveds) === undefined));
    }

    constructor(public rootFile: string) {
        this.root = new Position(this.files, rootFile, 0);
        this.unresolveds = Set.of(this.root);
    }

    isDone() {
        return this.unresolveds.size === 0;
    }

    async next() {
        let next = Set.of<Position>();
        for (const unresolved of this.unresolveds) {
            const nexts = await unresolved.findNexts(this.founds, this.positions);
            const unioned = unresolved.nexts.union(nexts);
            if (unioned.size === unresolved.nexts.size) continue;
            next = next.union(nexts);
            unresolved.nexts = unioned;
        }
        this.unresolveds = next;
    }
}

export async function analyse(filename?: string) {
    switch (Runtime.environment) {
        case 'editor': filename ??= file.filename; break;
        case 'engine': filename ??= manager.resources.filename; break;
    }
    const analyser = new Analyser(notUndefined(filename));
    while (!analyser.isDone()) await analyser.next();
    return analyser;
} // Analysing tutorial files of 300+ lines cost ~1000ms

export async function analyseLog(filename?: string) {
    logger.log((await analyse(filename)).root.debugString());
}

export const setup = (info: galosity.plugin.metaInfo.MetaInfo) => {
    info.version.atLeast('2.4');
    return true;
};