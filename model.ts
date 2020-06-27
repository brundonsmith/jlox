import Interpreter from "./interpreter.ts";
import Environment from "./environment.ts";

// Runtime
export type LoxValue = number|string|boolean|null|LoxCallable;
export type LoxCallable = {
    readonly call: (interpreter: Interpreter, args: LoxValue[]) => LoxValue,
    readonly arity: number,
}

export function isCallable(val: LoxValue): val is LoxCallable {
    return typeof val === 'object' && val != null && typeof val.call === 'function';
}

export class LoxFunction implements LoxCallable {

    private readonly declaration: Func|AnonFunc;
    private readonly closure: Environment;

    constructor(declaration: Func|AnonFunc, closure: Environment) {
        this.declaration = declaration;
        this.closure = closure;
    }

    get arity(): number {
        return this.declaration.params.length;
    }

    call(interpreter: Interpreter, args: LoxValue[]) {
        let env = new Environment(this.closure);

        for(let i = 0; i < this.declaration.params.length; i++) {
            env.define(this.declaration.params[i].lexeme, args[i]);
        }

        try {
            interpreter.executeBlock(this.declaration.body, env);
        } catch(err) {
            if (err instanceof ReturnValue) {
                return err.value;
            } else {
                throw err;
            }
        }

        return null;
    }

    toString(): string {
        return JSON.stringify(this.declaration);
    }
}

export class ReturnValue {
    readonly value: LoxValue;
    constructor(value: LoxValue) {
        this.value = value;
    }
}


// AST
export type Stmt = 
    | ExprStatement
    | Print
    | Var
    | Block
    | IfStmt
    | While
    | Func
    | Return;

export type ExprStatement = {
    kind: 'expression-statement',
    expression: Expr
}

export type Print = {
    kind: 'print',
    expression: Expr
}

export type Var = {
    kind: 'var',
    name: Token,
    initializer?: Expr,
}

export type Block = {
    kind: 'block',
    statements: Stmt[],
}

export type IfStmt = {
    kind: 'if',
    cond: Expr,
    thenBranch: Stmt,
    elseBranch?: Stmt
}

export type While = {
    kind: 'while',
    cond: Expr,
    body: Stmt,
}

export type Func = {
    kind: 'func',
    name: Token,
    params: Token[],
    body: Stmt[],
}

export type Return = {
    kind: 'return',
    keyword: Token,
    value: Expr,
}


export type Expr = 
    | Ternary
    | Binary
    | Logical
    | Grouping
    | Unary
    | Literal
    | Variable
    | Assign
    | Call
    | AnonFunc;

export type Ternary = {
    kind: 'ternary',
    cond: Expr,
    case1: Expr,
    case2: Expr
};

export type Binary = {
    kind: 'binary',
    left: Expr,
    operator: Token,
    right: Expr
};

export type Logical = {
    kind: 'logical',
    left: Expr,
    operator: Token,
    right: Expr,
}

export type Grouping = {
    kind: 'grouping',
    expression: Expr
};

export type Unary = {
    kind: 'unary',
    operator: Token,
    right: Expr
};

export type Literal = {
    kind: 'literal',
    value: LiteralValue
};

export type Variable = {
    kind: 'variable',
    name: Token
};

export type Assign = {
    kind: 'assign',
    name: Token,
    value: Expr
};

export type Call = {
    kind: 'call',
    func: Expr,
    args: Expr[],
    paren: Token,
}

export type AnonFunc = {
    kind: 'anon-func',
    params: Token[],
    body: Stmt[],
}


// Tokens
export type Token = {
    type: TokenType,
    lexeme: string,
    literal: LiteralValue,
    line: number,
};

export type LiteralValue = number|string|boolean|null;

export type TokenType =
    | 'left_paren' | 'right_paren' | 'left_brace' | 'right_brace'
    | 'comma' | 'dot' | 'semicolon' | 'equal'

    | BinaryOpTokenType

    | UnaryOpTokenType

    | 'question_mark' | 'colon'

    | 'identifier' | 'string' | 'number'

    | 'and' | 'class' | 'else' | 'false' | 'fun' | 'for' | 'if' | 'nil' | 'or'
    | 'print' | 'return' | 'super' | 'this' | 'true' | 'var' | 'while'

    | 'eof';



export const NUMERIC_BINARY_OP_TOKENS = [
    'minus', 'plus', 'slash', 'star',
    'greater', 'greater_equal', 'less', 'less_equal',
] as const;

export const BINARY_OP_TOKENS = [
    'bang_equal', 'equal_equal',

    ...NUMERIC_BINARY_OP_TOKENS
] as const;

export type BinaryOpTokenType = typeof BINARY_OP_TOKENS[number];



export const NUMERIC_UNARY_OP_TOKENS = [
    'minus'
] as const;

export const UNARY_OP_TOKENS = [
    'bang',

    ...NUMERIC_UNARY_OP_TOKENS
] as const;

export type UnaryOpTokenType = typeof UNARY_OP_TOKENS[number];



export const KEYWORDS: {[key: string]: TokenType} = {
    'and': 'and',
    'class': 'class',
    'else': 'else',
    'false': 'false',
    'for': 'for',
    'fun': 'fun',
    'if': 'if',
    'nil': 'nil',
    'or': 'or',
    'print': 'print',
    'return': 'return',
    'super': 'super',
    'this': 'this',
    'true': 'true',
    'var': 'var',
    'while': 'while',
}


// errors
export function RuntimeError(operator: Token, message: string): RuntimeErrorObj {
    return { operator, message }
}

export type RuntimeErrorObj = { operator: Token, message: string }