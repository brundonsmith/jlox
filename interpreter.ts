
import { Expr, LoxValue, UnaryOpTokenType, BinaryOpTokenType, NUMERIC_BINARY_OP_TOKENS, RuntimeError, TokenType, NUMERIC_UNARY_OP_TOKENS, Stmt, LoxCallable, isCallable, LoxFunction, ReturnValue } from "./model.ts";
import { runtimeError } from "./main.ts";
import Environment from "./environment.ts";

export default class Interpreter {

    private readonly globals: Environment = new Environment();
    private env = this.globals;
    private locals = new Map<Expr, number>();

    constructor() {
        this.globals.define("clock", {
            arity: 0,
            call: (interpreter, args) => {
                return Date.now() / 1000;
            }
        });
    }

    public interpret(statements: Stmt[]) {
        try {
            for(const statement of statements) {
                this.execute(statement);
            }
        } catch (err) {
            runtimeError(err);
        }
    }
    
    public execute(statement: Stmt) {
        switch(statement.kind) {
            case 'expression-statement':
                this.evaluate(statement.expression);
                break;
            case 'print':
                console.log(stringify(this.evaluate(statement.expression)));
                break;
            case 'var':
                {
                    const val = statement.initializer !== undefined ? this.evaluate(statement.initializer) : null;
                    this.env.define(statement.name.lexeme, val);
                }
                break;
            case 'func':
                this.env.define(statement.name.lexeme, new LoxFunction(statement, this.env));
                break;
            case 'block':
                this.executeBlock(statement.statements, new Environment(this.env));
                break;
            case 'if':
                if (truthy(this.evaluate(statement.cond))) {
                    this.execute(statement.thenBranch);
                } else if (statement.elseBranch != null) {
                    this.execute(statement.elseBranch);
                }
                break;
            case 'while':
                while (truthy(this.evaluate(statement.cond))) {
                    this.execute(statement.body);
                }
                break;
            case 'return':
                throw new ReturnValue(this.evaluate(statement.value));
        }
    }
    
    public executeBlock(statements: Stmt[], blockEnv: Environment) {
        const outer = this.env;
    
        try {
            this.env = blockEnv;
    
            for (const statement of statements) {
                this.execute(statement);
            }
        } finally {
            this.env = outer;
        }
    }
    
    public evaluate(expression: Expr): LoxValue {
        switch(expression.kind) {
            case 'literal':
                return expression.value;
            case 'variable':
                {
                    const distance = this.locals.get(expression);

                    if (distance != null) {
                        return this.env.getAt(distance, expression.name);
                    } else {
                        return this.globals.get(expression.name);
                    }
                }
            case 'grouping':
                return this.evaluate(expression.expression);
            case 'unary':
                {
                    const func = UNARY_FUNCTIONS[expression.operator.type as UnaryOpTokenType];
                    const a = this.evaluate(expression.right);
    
                    if ((NUMERIC_UNARY_OP_TOKENS as readonly TokenType[]).includes(expression.operator.type)) {
                        if(typeof a !== 'number') {
                            throw RuntimeError(expression.operator, "Operand must be a number.");
                        }
                    }
    
                    return func(a);
                }
            case 'binary':
                {
                    const func = BINARY_FUNCTIONS[expression.operator.type as BinaryOpTokenType];
                    const a = this.evaluate(expression.left);
                    const b = this.evaluate(expression.right);
    
                    if(expression.operator.type === 'plus') {
                        if((typeof a !== 'string' && typeof a !== 'number') || (typeof b !== 'string' && typeof b !== 'number')) {
                            throw RuntimeError(expression.operator, "Each operand must be either a string or a number.");
                        }
                    } else if ((NUMERIC_BINARY_OP_TOKENS as readonly TokenType[]).includes(expression.operator.type)) {
                        if(typeof a !== 'number' || typeof b !== 'number') {
                            throw RuntimeError(expression.operator, "Operand must be a number.");
                        }
                    }
    
                    return func(a, b);
                }
            case 'logical':
                const leftResult = this.evaluate(expression.left);

                if (expression.operator.lexeme === 'and') {
                    return truthy(leftResult) ? this.evaluate(expression.right) : leftResult;
                } else { // 'or'
                    return truthy(leftResult) ? leftResult : this.evaluate(expression.right);
                }
            case 'ternary':
                return truthy(this.evaluate(expression.cond))
                    ? this.evaluate(expression.case1)
                    : this.evaluate(expression.case2)
            case 'assign':
                {
                    const value = this.evaluate(expression.value);
                    const distance = this.locals.get(expression);

                    if (distance != null) {
                        this.env.assignAt(distance, expression.name, value);
                    } else {
                        this.globals.assign(expression.name, value);
                    }

                    return value;
                }
            case 'anon-func':
                return new LoxFunction(expression, this.env);
            case 'call':
                const func = this.evaluate(expression.func);

                if (!isCallable(func)) {
                    throw RuntimeError(expression.paren, "Can only call functions and classes.");
                }

                if (expression.args.length !== func.arity) {
                    throw RuntimeError(expression.paren, `Expected ${func.arity} arguments but got ${expression.args.length}.`)
                }

                return func.call(this, expression.args.map(x => this.evaluate(x)));
        }
    }

    public resolve(expr: Expr, depth: number) {
        this.locals.set(expr, depth);
    }
}


function stringify(expression: LoxValue): string {
    let resultStr = JSON.stringify(expression);
    if (resultStr === 'null') resultStr = 'nil';

    return resultStr;
}

const BINARY_FUNCTIONS: {[key in BinaryOpTokenType]: (a: LoxValue, b: LoxValue) => LoxValue} = {
    'plus': (a: any, b: any) => a + b,
    'minus': (a: any, b: any) => a - b,
    'star': (a: any, b: any) => a * b,
    'slash': (a: any, b: any) => a / b,

    'greater': (a: any, b: any) => a > b,
    'greater_equal': (a: any, b: any) => a >= b,
    'less': (a: any, b: any) => a < b,
    'less_equal': (a: any, b: any) => a <= b,

    'equal_equal': (a: any, b: any) => equal(a, b),
    'bang_equal': (a: any, b: any) => !equal(a, b),
};

const UNARY_FUNCTIONS: {[key in UnaryOpTokenType]: (a: LoxValue) => LoxValue} = {
    'minus': (a: any) => -1 * a,
    'bang': (a) => !truthy(a),
};

function equal(a: LoxValue, b: LoxValue): boolean {
    return a === b;
}

function truthy(val: LoxValue): boolean {
    return val !== null && val !== false;
}
