Root = Logical

Logical
    = head:Comparing tail:(("&" / "|") Comparing)* {
        if (tail.length === 0) return head;
        let result = [head];
        for (let [op, value] of tail) {
            result.push(op);
            result.push(value);
        }
        return { type: "leftBinary", value: result };
    }

Comparing
    = head:Addition tail:(("<=" / ">=" / "<" / ">" / "==" / "!=") Addition)* {
        if (tail.length === 0) return head;
        let result = [head];
        for (let [op, value] of tail) {
            result.push(op);
            result.push(value);
        }
        return { type: "comparing", value: result };
    }

Addition
    = head:Multiplication tail:(("+" / "-") Multiplication)* {
        if (tail.length === 0) return head;
        let result = [head];
        for (let [op, value] of tail) {
            result.push(op);
            result.push(value);
        }
        return { type: "leftBinary", value: result };
    }

Multiplication 
    = head:Power tail:(("//" / "%" / "*" / "/") Power)* {
        if (tail.length === 0) return head;
        let result = [head];
        for (let [op, value] of tail) {
            result.push(op);
            result.push(value);
        }
        return { type: "leftBinary", value: result };
    }

Power
    = head:Factor tail:("^" Factor)* {
        if (tail.length === 0) return head;
        let result = [head];
        for (let [op, value] of tail) {
            result.push(op);
            result.push(value);
        }
        return { type: "rightBinary", value: result };
    }

Factor
    = op:("!" / "+" / "-") root:Root { return { type: "factor", operator: op, value: root }; }
    / value:Primary { return value; }

Primary
    = "(" root:Root ")" { return root; }
    / value:Number { return value; }
    / value:Enum { return value; }
    / value:Identifier { return value; }

Number = intPart:Digits decimalPart: ("." Digits)? {
    return {
            type: 'num',
            value: intPart.join('') + (decimalPart === null ? '' : '.' + decimalPart[1].join(''))
        };
}

Enum = enumType:Identifier "." value:Identifier {
        return { type: 'enum', enumType: enumType, value: value };
    }

Identifier = identifier:([a-zA-Z_][a-zA-Z0-9_]*) {
	return { type: 'identifier', value: identifier[0] + identifier[1].join('') };
}

Digits = [0-9]+
