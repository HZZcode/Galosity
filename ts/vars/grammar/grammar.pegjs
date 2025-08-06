Root = Logical

Logical
    = head: Comparing tail: (_ ("&" / "|") _ Comparing)* {
        if (tail.length === 0) return head;
        let result = [head];
        for (let [_, op, __, value] of tail) {
            result.push(op);
            result.push(value);
        }
        return { type: "leftBinary", value: result };
    }

Comparing
    = head: Matching tail: (_ ("<=" / ">=" / "<" / ">" / "==" / "!=") _ Matching)* {
        if (tail.length === 0) return head;
        let result = [head];
        for (let [_, op, __, value] of tail) {
            result.push(op);
            result.push(value);
        }
        return { type: "comparing", value: result };
    }

Matching
    = value: Addition _ ("is" / "~") _ enumType: Identifier {
        return { type: "matching", value, enumType: enumType.value }
    }
    / value: Addition { return value; }

Addition
    = head: Multiplication tail: (_ ("+" / "-") _ Multiplication)* {
        if (tail.length === 0) return head;
        let result = [head];
        for (let [_, op, __, value] of tail) {
            result.push(op);
            result.push(value);
        }
        return { type: "leftBinary", value: result };
    }

Multiplication 
    = head: Power tail: (_ ("//" / "%" / "*" / "/") _ Power)* {
        if (tail.length === 0) return head;
        let result = [head];
        for (let [_, op, __, value] of tail) {
            result.push(op);
            result.push(value);
        }
        return { type: "leftBinary", value: result };
    }

Power
    = head: Factor tail: (_ "^" _ Factor)* {
        if (tail.length === 0) return head;
        let result = [head];
        for (let [_, op, __, value] of tail) {
            result.push(op);
            result.push(value);
        }
        return { type: "rightBinary", value: result };
    }

Factor
    = op: ("!" / "+" / "-") _ root: Root { return { type: "factor", operator: op, value: root }; }
    / value: Primary _ "[" index: Root "]" { return { type: "index", value, index }; }
    / value: Primary { return value; }

Primary
    = func: Identifier _ "(" _ root: Root _ ")" {
        return { type: "function", func, value: root };
    }
    / "(" _ root: Root _ ")" { return root; }
    / value: (Array / String / Number / Enum / Identifier) { return value; }

Array
    = _ "{" elements: (Root ("," _ Root)*)? ","? _ "}" {
        const array = [];
        if (elements !== null) {
            array.push(elements[0]);
            for (const [_, __, value] of elements[1])
                array.push(value);
        }
        return { type: "array", value: array };
    }

String
    = _ "'" string: ([^'\\] / '\\' .)* "'" _ {
        return {
            type: 'string',
            value: string.map(part => typeof part === 'string' ? part : part.join('')).join('')
        };
    }
    / _ '"' string: ([^"\\] / '\\' .)* '"' _ {
        return {
            type: 'string',
            value: string.map(part => typeof part === 'string' ? part : part.join('')).join('')
        };
    }

Number 
    = _ "0x" hexPart: HexDigits _ {
        return {
            type: 'hexNum',
            value: hexPart.join('')
        };
    }
    / _ intPart: Digits decimalPart: ("." Digits)? _ {
        return {
                type: 'num',
                value: intPart.join('') + (decimalPart === null ? '' : '.' + decimalPart[1].join(''))
            };
    }

Enum = _ enumType: Identifier "." value: Identifier _ {
        return { type: 'enum', enumType, value };
    }

Identifier = _ identifier: ([a-zA-Z_][a-zA-Z0-9_]*) _ {
	return { type: 'identifier', value: identifier[0] + identifier[1].join('') };
}

Digits = [0-9]+

HexDigits = [0-9A-Fa-f]+

_ = [ \t\n\r]* {
    return null;
}