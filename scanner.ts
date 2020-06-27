
import { parsingError } from './main.ts';
import { Token, LiteralValue, KEYWORDS, TokenType } from './model.ts';

export default class Scanner {
    private source: string;

    constructor(source: string) {
        this.source = source;
    }

    private start = 0;
    private current = 0;
    private line = 1;

    private tokens: Token[] = [];

    scanTokens(): Token[] {
        while(!this.atEnd) {
            this.start = this.current;
            this.scanToken();
        }

        this.tokens.push({ type: 'eof', lexeme: "", literal: null, line: this.line });
        return this.tokens;
    }

    private scanToken() {
        let c = this.advance();

        switch(c) {
            case ' ':
            case '\r':
            case '\t':
                break;
            case '\n':
                this.line++;
                break;
            case '(': this.addToken('left_paren'); break;
            case ')': this.addToken('right_paren'); break;
            case '{': this.addToken('left_brace'); break;
            case '}': this.addToken('right_brace'); break;
            case ',': this.addToken('comma'); break;
            case '.': this.addToken('dot'); break;
            case '-': this.addToken('minus'); break;
            case '+': this.addToken('plus'); break;
            case ';': this.addToken('semicolon'); break;
            case '*': this.addToken('star'); break;
            case '?': this.addToken('question_mark'); break;
            case ':': this.addToken('colon'); break;
            case '!': this.addToken(this.match('=') ? 'bang_equal' : 'bang'); break;
            case '=': this.addToken(this.match('=') ? 'equal_equal' : 'equal'); break;
            case '<': this.addToken(this.match('=') ? 'less_equal' : 'less'); break;
            case '>': this.addToken(this.match('=') ? 'greater_equal' : 'greater'); break;
            case '/':
                if (this.match('/')) {
                    while (this.peek !== '\n' && !this.atEnd) this.advance();
                } else if(this.match('*')) {
                    while ((this.peek !== '*' || this.peekNext !== '/') && !this.atEnd) this.advance();
                    this.advance();
                    this.advance();
                } else {
                    this.addToken('slash');
                }
            break;
            case '"': this.string(); break;
            default:
                if (isDigit(c)) {
                    this.number();
                } else if(isAlpha(c)) {
                    this.identifier();
                } else {
                    parsingError(this.line, "Unexpected character.");
                }
            break;
        }
    }

    // check-and-consume
    private match(expected: string): boolean {
        if (this.peek === expected) {
            this.advance();
            return true;
        } else {
            return false;
        }
    }

    private string() {
        while (this.peek !== '"' && !this.atEnd) {
            if (this.peek === '\n') this.line++;
            this.advance();
        }

        if (this.atEnd) {
            parsingError(this.line, "unterminated string.");
        } else {
            this.advance();

            let value = this.source.substring(this.start + 1, this.current - 1);
            this.addToken('string', value);
        }
    }

    private number() {
        while (isDigit(this.peek)) this.advance();

        if (this.peek === '.' && isDigit(this.peekNext)) {
            this.advance();
            while(isDigit(this.peek)) this.advance();
        }

        this.addToken('number', Number(this.currentToken));
    }

    private identifier() {
        while (isAlphaNumeric(this.peek)) this.advance();

        let text = this.currentToken;

        let type = KEYWORDS[text] ?? 'identifier';
        this.addToken(type);
    }


    // computed properties
    get peek(): string {
        if (this.atEnd) {
            return '\0';
        } else {
            return this.source[this.current];
        }
    }

    get peekNext(): string {
        if (this.current + 1 >= this.source.length) {
            return '\0';
        } else {
            return this.source[this.current + 1];
        }
    }

    get currentToken(): string {
        return this.source.substring(this.start, this.current);
    }

    get atEnd(): boolean {
        return this.current >= this.source.length;
    }

    // basic operations
    private advance(): string {
        this.current++;
        return this.source[this.current - 1];
    }

    private addToken(type: TokenType, literal: LiteralValue = null) {
        let lexeme = this.currentToken;
        this.tokens.push({ type, lexeme, literal, line: this.line });
    }
}

function isDigit(char: string): boolean {
    return char.match(/^[0-9]$/) != null;
}

function isAlpha(char: string): boolean {
    return char.match(/^[_a-zA-Z]$/) != null;
}

function isAlphaNumeric(char: string): boolean {
    return char.match(/^[_a-zA-Z0-9]$/) != null;
}
