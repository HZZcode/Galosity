import { assert } from "../utils/assert.js";
import { Files } from "../utils/files.js";
import { TypeDispatch } from "../utils/type-dispatch.js";
import * as dataTypes from "./data-types.js";
import { Paragraph } from "./parser.js";

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
    nexts = new Set<Position>();

    constructor(public files: FileCaches, public filename: string,
        public line: number, public callStack: Position[] = []) { }

    with(line: number, filename?: string) {
        return new Position(this.files, filename ?? this.filename, line, this.callStack);
    }
    push(top: Position) {
        return new Position(this.files, this.filename, this.line, [...this.callStack, top]);
    }
    top() {
        assert(this.callStack.length !== 0);
        return this.callStack.at(-1)!;
    }

    downstreams(founds = new Set<Position>()): Set<Position> {
        if (founds.has(this)) return new Set();
        founds.add(this);
        return new Set([this, ...[...this.nexts].map(pos =>
            pos.downstreams(founds)).reduce((x, y) => x.union(y), new Set())]);
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
        if (this.findIn(founds) !== undefined) return new Set();
        const length = (await this.getDataList()).length;
        if (this.line >= length) return new Set();
        const result = await analyseNext.call(await this.getData(), this);
        return new Set((result instanceof Position ? [result] : [...result])
            .map(pos => pos.mapIn(allFounds)));
    }
}

export const analyseNext = new TypeDispatch<[pos: Position],
    Iterable<Position> | Position, dataTypes.GalData>();
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
        this.unresolveds = new Set([this.root]);
    }

    isDone() {
        return this.unresolveds.size === 0;
    }

    async next() {
        let next = new Set<Position>();
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

export async function analyse(filename: string) {
    const analyser = new Analyser(filename);
    while (!analyser.isDone()) await analyser.next();
    return analyser;
} // Analysing tutorial files of 300+ lines cost ~1000ms