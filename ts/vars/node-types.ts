export type NodeType = TriConditionNode | ComparingNode | MatchingNode
    | MultiplicationNode | PowerNode | FactorNode;
export type NodeTag = NodeType['type'];

export type TriConditionNode = TriConditionOpNode | LogicalNode;

export type NodeOf<Tag extends NodeTag> = NodeType & { type: Tag };

export type LeftBinaryNode = NodeOf<'leftBinary'>;
export type RightBinaryNode = NodeOf<'rightBinary'>;

export interface TriConditionOpNode {
    type: 'triCondition';
    condition: LogicalNode;
    left: NodeType;
    right: NodeType;
}

export interface LogicalNode {
    type: 'leftBinary';
    value: AlterArray<ComparingNode, '&' | '|'>;
}

export interface ComparingNode {
    type: 'comparing';
    value: AlterArray<MatchingNode, '<=' | '>=' | '<' | '>' | '==' | '!='>;
}

export type MatchingNode = MatchingOpNode | AdditionNode;

export interface MatchingOpNode {
    type: 'matching';
    value: AdditionNode;
    typeName: IdentifierNode;
}

export interface AdditionNode {
    type: 'leftBinary';
    value: AlterArray<MultiplicationNode, '+' | '-'>;
}

export interface MultiplicationNode {
    type: 'leftBinary';
    value: AlterArray<PowerNode, '//' | '%' | '*' | '/'>;
}

export interface PowerNode {
    type: 'rightBinary';
    value: AlterArray<FactorNode, '^'>;
}

export type FactorNode = FactorOpNode | IndexNode | PrimaryNode;

export interface FactorOpNode {
    type: 'factor';
    operator: '!' | '+' | '-';
    value: NodeType;
}

export interface IndexNode {
    type: 'index';
    value: PrimaryNode;
    index: NodeType;
}

export type PrimaryNode = FunctionNode | ArrayNode | StringNode | NumberNode | EnumNode | IdentifierNode;

export interface FunctionNode {
    type: 'function';
    func: IdentifierNode;
    value: NodeType;
}

export interface ArrayNode {
    type: 'array';
    value: NodeType[];
}

export interface StringNode {
    type: 'string';
    value: string;
}

export type NumberNode = HexNumNode | DecNumNode;

export interface HexNumNode {
    type: 'hexNum';
    value: string;
}

export interface DecNumNode {
    type: 'num';
    value: string;
}

export interface EnumNode {
    type: 'enum';
    enumType: IdentifierNode;
    value: IdentifierNode;
}

export interface IdentifierNode {
    type: 'identifier';
    value: string;
}

type EvenKey = 0 | 'even';
type OddKey = 1 | 'odd';
type AlterKey = EvenKey | OddKey;
type AlterMap<Even, Odd> = Record<EvenKey, Even> & Record<OddKey, Odd>;
export interface AlterArray<Even, Odd> extends Array<Even | Odd> {
    at<Key extends AlterKey = AlterKey>(index: number): AlterMap<Even, Odd>[Key];
}