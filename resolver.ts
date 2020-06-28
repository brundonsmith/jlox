import Interpreter from "./interpreter.ts";
import { Stmt, Block, Expr, Token, Func, AnonFunc } from "./model.ts";
import { parsingError } from "./main.ts";

type Scope = {[key: string]: boolean};

type FuncType = 'func' | 'anon-func';

export default class Resolver {

    private readonly interpreter: Interpreter;
    private scopes: Scope[] = [];
    private currentFunctionType: FuncType|undefined;

    get currentScope(): Scope|undefined {
        return this.scopes[this.scopes.length - 1];
    }

    constructor(interpreter: Interpreter) {
        this.interpreter = interpreter;
    }

    public resolve(node: Stmt|Expr) {
        this.walk(node);
    }

    private walk(node: Stmt|Expr) {
        switch(node.kind) {
            case 'var':
                this.declare(node.name, false);
                if(node.initializer != null) {
                    this.walk(node.initializer);
                }
                this.define(node.name);
                break;
            case 'variable':
                if(this.currentScope?.[node.name.lexeme] === false) {
                    parsingError(node.name, `Cannot read local variable in its own initializer.`);
                }

                this.resolveReference(node, node.name);
                break;
            case 'assign':
                this.walk(node.value);
                this.resolveReference(node, node.name);
                break;
            case 'func':
                this.declare(node.name, true);
                this.walkFunction(node);
                break;
            case 'anon-func':
                this.walkFunction(node);
                break;
            case 'block':
                this.beginScope();
                for (const statement of node.statements) {
                    this.walk(statement);
                }
                this.endScope();
                break;

            // nothing to declare or resolve; just recurse
            case 'expression-statement':
                this.walk(node.expression);
                break;
            case 'if':
                this.walk(node.cond);
                this.walk(node.thenBranch);
                if (node.elseBranch != null) {
                    this.walk(node.elseBranch);
                }
                break;
            case 'print':
                this.walk(node.expression);
                break;
            case 'return':
                if (this.currentFunctionType == null) {
                    parsingError(node.keyword, `Cannot return from top-level code.`);
                }
                this.walk(node.value);
                break;
            case 'while':
                this.walk(node.cond);
                this.walk(node.body);
                break;
            case 'binary':
            case 'logical':
                this.walk(node.left);
                this.walk(node.right);
                break;
            case 'call':
                this.walk(node.func);
                node.args.forEach(arg => this.walk(arg));
                break;
            case 'grouping':
                this.walk(node.expression);
                break;
            case 'unary':
                this.walk(node.right);
            case 'literal':
                break;
        }
    }

    private walkFunction(func: Func|AnonFunc) { // anonymous or non-anonymous
        const enclosingFunctionType = this.currentFunctionType;
        this.currentFunctionType = func.kind;

        this.beginScope();

        for (const param of func.params) {
            this.declare(param, true);
        }

        for (const statement of func.body) {
            this.walk(statement);
        }

        this.endScope();
        this.currentFunctionType = enclosingFunctionType;
    }

    private resolveReference(expr: Expr, name: Token) {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            const scope = this.scopes[i];
            if (Object.keys(scope).includes(name.lexeme)) {
                this.interpreter.resolve(expr, this.scopes.length - 1 - i);
                return;
            }
        }

        // Not found. Assume it is global.
    }

    private declare(name: Token, defined: boolean) {
        if (this.currentScope != null) {
            if (Object.keys(this.currentScope).includes(name.lexeme)) {
                parsingError(name, `Variable with this name already declared in this scope.`);
            } else {
                this.currentScope[name.lexeme] = defined;
            }
        }
    }

    private define(name: Token) {
        if (this.currentScope != null) {
            this.currentScope[name.lexeme] = true;
        }
    }

    private beginScope() {
        this.scopes.push({ });
    }
    private endScope() {
        this.scopes.pop();
    }


}