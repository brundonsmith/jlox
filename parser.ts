import { parsingError } from "./main.ts";
import { BINARY_OP_TOKENS, Block, Expr, ExprStatement, Grouping, IfStmt, Literal, Print, Stmt, Token, TokenType, Unary, UNARY_OP_TOKENS, Var, Variable, While, Call, Func, Return, AnonFunc } from "./model.ts";
import { exists, given } from "./utils.ts";

export default class Parser {
    
    private tokens: Token[];
    private current: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    public parse(): Stmt[] {
        let statements: Stmt[] = [];

        while(!this.atEnd) {
            let statement = this.declaration();
            if(statement != null) {
                statements.push(statement);
            }
        }

        return statements;
    }

    private declaration(): Stmt|null {
        try {
            if (this.match('fun')) {
                return this.function("function");
            } else if (this.match('var')) {
                return this.varDeclaration();
            } else {
                return this.statement();
            }
        } catch (err) {
            this.synchronize();
            return null;
        }
    }

    private function(kind: "function"|"method"): Func {
        let name = this.consume('identifier', `Expect ${kind} name.`);

        this.consume('left_paren', `Expect '(' after ${kind} name.`);

        let params = [];

        if (!this.check('right_paren')) {
            do {
                if (params.length >= 255) {
                    this.error(this.peek, `Cannot have more than 255 parameters.`);
                }

                params.push(this.consume('identifier', "Expect parameter name."));
            } while (this.match('comma'))
        }

        this.consume('right_paren', `Expect ')' after parameters.`);

        this.consume('left_brace', `Expect '{' before ${kind} body.`);

        let body = this.block().statements;
        return { kind: 'func', name, params, body };
    }

    private varDeclaration(): Var {
        let name = this.consume('identifier', "Expected variable name.");

        let initializer;
        if (this.match('equal')) {
            initializer = this.expression();
        }

        this.consume('semicolon', "Expected ';' after variable declaration.");
        return { kind: 'var', name, initializer };
    }

    private statement(): Stmt {
        if (this.match('for')) {
            return this.forStatement();
        } else if (this.match('if')) {
            return this.ifStatement();
        } else if(this.match('while')) {
            return this.whileStatement();
        } else if (this.match('print')) {
            return this.printStatement();
        } else if (this.match('left_brace')) {
            return this.block();
        } else if (this.match('return')) {
            return this.returnStatement();
        } else {
            return this.expressionStatement();
        }
    }

    private forStatement(): Stmt {
        this.consume('left_paren', "Expect '(' after 'for'.");

        let init = this.match('semicolon') ? 
                undefined
            : this.match('var') ?
                this.varDeclaration() 
            :
                this.expressionStatement();

        let cond = this.check('semicolon')
            ? undefined
            : this.expression();

        this.consume('semicolon', "Expect ';' after 'for' condition.");

        let increment = this.check('right_paren')
            ? undefined
            : this.expression();

        this.consume('right_paren', "Expect ')' after 'for' statements.");

        let body = this.statement();

        return {
            kind: 'block',
            statements: [
                init,
                <While> { 
                    kind: 'while',
                    cond: cond ?? { kind: 'literal', value: true },
                    body: {
                        kind: 'block',
                        statements: [
                            body,
                            given(increment, (expression): ExprStatement => 
                                ({ kind: 'expression-statement', expression })),
                        ].filter(exists)
                    }
                }
            ].filter(exists),
        };
    }

    private ifStatement(): IfStmt {
        this.consume('left_paren', "Expect '(' after 'if'.");
        let cond = this.expression();
        this.consume('right_paren', "Expect closing ')' in if statement.");

        let thenBranch = this.statement();
        let elseBranch = this.match('else') ? this.statement() : undefined;

        return { kind: 'if', cond, thenBranch, elseBranch };
    }

    private whileStatement(): While {
        this.consume('left_paren', "Expect '(' after 'while'.");
        let cond = this.expression();
        this.consume('right_paren', "Expect ')' after condition.");
        let body = this.statement();

        return { kind: 'while', cond, body };
    }

    private printStatement(): Print {
        let expression = this.expression();
        this.consume('semicolon', "Expected ';' after value.");
        return { kind: 'print', expression };
    }

    private block(): Block {
        let statements: Stmt[] = [];

        while (!this.check('right_brace') && !this.atEnd) {
            const decl = this.declaration();

            if(decl != null) {
                statements.push(decl);
            }
        }

        this.consume('right_brace', `Expect '}' after block.`)
        return { kind: 'block', statements };
    }

    private returnStatement(): Return {
        let keyword = this.previous;
        let value = this.check('semicolon') 
            ? { kind: 'literal', value: null } as const
            : this.expression();
        this.consume('semicolon', `Expected ';' after return.`)

        return { kind: 'return', keyword, value };
    }

    private expressionStatement(): ExprStatement {
        let expression = this.expression();
        this.consume('semicolon', "Expected ';' after expression.");
        return { kind: 'expression-statement', expression };
    }

    public expression(): Expr {
        return this.assignment();
    }

    private assignment(): Expr {
        let expr = this.ternary();

        if (this.match("equal")) {
            let equals = this.previous;
            let value = this.assignment();

            //if (expr.ty)
            if (expr.kind === 'variable') {
                let name = expr.name;
                return { kind: 'assign', name, value };
            } else {
                this.error(equals, "Invalid assignment target.");
            }
        }

        return expr;
    }

    private ternary(): Expr {
        let expr = this.or();

        while (this.match('question_mark')) {
            let case1 = this.expression();

            if (this.match('colon')) {
                let case2 = this.expression();

                expr = { kind: 'ternary', cond: expr, case1, case2 };
            }
        }

        return expr;
    }

    private or(): Expr {
        let expr = this.and();

        while (this.match('or')) {
            let operator = this.previous;
            let right = this.and();
            expr = { kind: 'logical', left: expr, operator, right };
        }

        return expr;
    }

    private and(): Expr {
        let expr = this.equality();

        while (this.match('and')) {
            let operator = this.previous;
            let right = this.equality();
            expr = { kind: 'logical', left: expr, operator, right };
        }

        return expr;
    }

    private equality(): Expr {
        let expr = this.comparison();

        while (this.match('bang_equal', 'equal_equal')) {
            let operator = this.previous;
            let right = this.comparison();
            expr = { kind: 'binary', left: expr, operator, right };
        }

        return expr;
    }

    private comparison(): Expr {
        let expr = this.addition();

        while (this.match('greater', 'greater_equal', 'less', 'less_equal')) {
            let operator = this.previous;
            let right = this.addition();
            expr = { kind: 'binary', left: expr, operator, right };
        }

        return expr;
    }

    private addition(): Expr {
        let expr = this.multiplication();

        while (this.match('minus', 'plus')) {
            let operator = this.previous;
            let right = this.multiplication();
            expr = { kind: 'binary', left: expr, operator, right };
        }

        return expr;
    }

    private multiplication(): Expr {
        let expr: Expr = this.unary();

        while (this.match('slash', 'star')) {
            let operator = this.previous;
            let right = this.unary();
            expr = { kind: 'binary', left: expr, operator, right };
        }

        return expr;
    }

    private unary(): Unary|Call|Literal|Grouping|Variable|AnonFunc {
        if (this.match(...UNARY_OP_TOKENS, ...BINARY_OP_TOKENS)) {
            if (!(UNARY_OP_TOKENS as readonly TokenType[]).includes(this.previous.type)) {
                throw this.error(this.previous, "This operator requires two operands.");
            }

            let operator = this.previous;
            let right = this.unary();
            return { kind: 'unary', operator, right };
        } else {
            return this.functionExpression();
        }
    }

    private functionExpression(): Unary|Call|Literal|Grouping|Variable|AnonFunc {        
        if (this.match('fun')) {
            this.consume('left_paren', `Expect '(' after 'fun'.`);

            let params = [];

            if (!this.check('right_paren')) {
                do {
                    if (params.length >= 255) {
                        this.error(this.peek, `Cannot have more than 255 parameters.`);
                    }

                    params.push(this.consume('identifier', "Expect parameter name."));
                } while (this.match('comma'))
            }

            this.consume('right_paren', `Expect ')' after parameters.`);

            this.consume('left_brace', `Expect '{' before function body.`);

            let body = this.block().statements;
            return { kind: 'anon-func', params, body };
        } else {
            return this.call();
        }
    }

    private call(): Call|Literal|Grouping|Variable {
        let expr: Expr = this.primary();

        while (true) {
            if (this.match('left_paren')) {
                expr = this.finishCall(expr);
            } else {
                break;
            }
        }

        return expr;
    }

    private finishCall(func: Expr): Call {
        let args = [];

        if (!this.check('right_paren')) {
            do {
                if (args.length >= 255) {
                    this.error(this.peek, "Cannot have more than 255 arguments.");
                }
                
                args.push(this.expression());
            } while (this.match('comma'))
        }

        let paren = this.consume('right_paren', "Expect ')' after arguments.");

        return { kind: 'call', func, args, paren };
    }

    private primary(): Literal|Grouping|Variable {
        if (this.match('false')) return { kind: 'literal', value: false };
        if (this.match('true')) return { kind: 'literal', value: true };
        if (this.match('nil')) return { kind: 'literal', value: null };

        if (this.match('number', 'string')) return { kind: 'literal', value: this.previous.literal }

        if (this.match('left_paren')) {
            let expression = this.expression();
            this.consume('right_paren', "Expected ')' after expression.");
            return { kind: 'grouping', expression };
        }

        if (this.match('identifier')) return { kind: 'variable', name: this.previous };

        throw this.error(this.peek, "Expect expression.");
    }

    private match(...tokenTypes: TokenType[]): boolean {
        for (let tokenType of tokenTypes) {
            if (this.check(tokenType)) {
                this.advance();
                return true;
            }
        }

        return false;
    }

    private consume(tokenType: TokenType, errorMessage: string): Token {
        if(this.check(tokenType)) {
            return this.advance();
        } else {
            throw this.error(this.peek, errorMessage);
        }
    }

    private synchronize() {
        this.advance();

        while (!this.atEnd) {
            if (this.previous.type === 'semicolon') return;

            switch (this.peek.type) {
                case 'class':
                case 'fun':
                case 'var':
                case 'for':
                case 'if':
                case 'while':
                case 'print':
                case 'return':
                    return;
            }

            this.advance();
        }
    }

    private advance(): Token {
        if (!this.atEnd) {
            this.current++;
        }
        
        return this.previous;
    }

    private error(token: Token, message: string): SyntaxError {
        parsingError(token, message);
        return new SyntaxError();
    }

    private check(tokenType: TokenType): boolean {
        if (this.atEnd) {
            return false;
        } else {
            return this.peek.type === tokenType;
        }
    }

    get atEnd() {
        return this.peek.type === 'eof';
    }

    get peek(): Token {
        return this.tokens[this.current];
    }

    get peekNext(): Token {
        return this.tokens[this.current + 1];
    }

    get previous(): Token {
        return this.tokens[this.current - 1];
    }
}
