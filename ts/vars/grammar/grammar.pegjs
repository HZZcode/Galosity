Root = Logical

Logical
    = head:Comparing tail:(_ ("&" / "|") _ Comparing)* {
        if (tail.length === 0) return head;
        let result = [head];
        for (let [_, op, __, value] of tail) {
            result.push(op);
            result.push(value);
        }
        return { type: "leftBinary", value: result };
    }

Comparing
    = head:Matching tail:(_ ("<=" / ">=" / "<" / ">" / "==" / "!=") _ Matching)* {
        if (tail.length === 0) return head;
        let result = [head];
        for (let [_, op, __, value] of tail) {
            result.push(op);
            result.push(value);
        }
        return { type: "comparing", value: result };
    }

Matching
    = value:Addition _ ("is" / "~") _ enumType:Identifier {
        return { type: "matching", value: value, enumType: enumType.value }
    }
    / value:Addition { return value; }

Addition
    = head:Multiplication tail:(_ ("+" / "-") _ Multiplication)* {
        if (tail.length === 0) return head;
        let result = [head];
        for (let [_, op, __, value] of tail) {
            result.push(op);
            result.push(value);
        }
        return { type: "leftBinary", value: result };
    }

Multiplication 
    = head:Power tail:(_ ("//" / "%" / "*" / "/") _ Power)* {
        if (tail.length === 0) return head;
        let result = [head];
        for (let [_, op, __, value] of tail) {
            result.push(op);
            result.push(value);
        }
        return { type: "leftBinary", value: result };
    }

Power
    = head:Factor tail:(_ "^" _ Factor)* {
        if (tail.length === 0) return head;
        let result = [head];
        for (let [_, op, __, value] of tail) {
            result.push(op);
            result.push(value);
        }
        return { type: "rightBinary", value: result };
    }

Factor
    = op:("!" / "+" / "-") _ root:Root { return { type: "factor", operator: op, value: root }; }
    / value:Primary { return value; }

Primary
    = func:Identifier _ "(" _ root:Root _ ")" {
        return { type: "function", func: func, value: root };
    }
    / "(" _ root:Root _ ")" { return root; }
    / value:Number { return value; }
    / value:Enum { return value; }
    / value:Identifier { return value; }

Number 
    = _ intPart:Digits decimalPart: ("." Digits)? _ {
        return {
                type: 'num',
                value: intPart.join('') + (decimalPart === null ? '' : '.' + decimalPart[1].join(''))
            };
    } 
    / _ '#' intPart:HexDigits _ {
        return {
                type: 'hexNum',
                value: intPart.join('').toLowerCase()
            };
    }

Enum = _ enumType:Identifier "." value:Identifier _ {
        return { type: 'enum', enumType: enumType, value: value };
    }

Identifier = _ identifier:([a-zA-Z_][a-zA-Z0-9_]*) _ {
	return { type: 'identifier', value: identifier[0] + identifier[1].join('') };
}

Digits = [0-9]+

HexDigits = [0-9A-Fa-f]+

_ = [ \t\n\r]* {
    return null;
}