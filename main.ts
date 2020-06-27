import { readFileStrSync } from "https://deno.land/std@0.53.0/fs/mod.ts";
import { readLines } from "https://deno.land/std@0.53.0/io/bufio.ts";

import Scanner from './scanner.ts';
import Parser from "./parser.ts";
import { Token, RuntimeErrorObj, ExprStatement } from "./model.ts";
import Interpreter from "./interpreter.ts";


const interpreter = new Interpreter();

// entry
function main() {
    if (Deno.args.length > 1) {
        throw Error(`Usage: jlox [script]`);
    } else if (Deno.args.length === 1) {
        runFile(Deno.args[0]);
    } else {
        runPrompt();
    }
}

// input
function runFile(path: string) {
    const code = readFileStrSync(path);
    run(code);

    if (hadError || hadRuntimeError) {
        throw Error();
    }
}

const prompt = new TextEncoder().encode("> ");
async function runPrompt() {

    Deno.stdout.writeSync(prompt);
    for await (const line of readLines(Deno.stdin)) {
        run(line);
        Deno.stdout.writeSync(prompt);
    }
}

function run(code: string) {
    let scanner = new Scanner(code);
    let tokens = scanner.scanTokens();

    try {
        suppressParseErrors = true;
        let parser = new Parser(tokens);
        let expression = parser.expression();
        console.log('\n' + JSON.stringify(expression, null, 2) + '\n');

        console.log(interpreter.evaluate(expression));
    } catch(e) {
        suppressParseErrors = false;
        let parser = new Parser(tokens);
        let statements = parser.parse();
        console.log('\n' + JSON.stringify(statements, null, 2) + '\n');
        interpreter.interpret(statements);
    }
}


// errors
let suppressParseErrors = false; // HACK
let hadError = false;
export function parsingError(tokenOrLineNumber: Token|number, message: string) {
    if(!suppressParseErrors) {
        if(typeof tokenOrLineNumber === 'number') {
            report(tokenOrLineNumber, "", message);
        } else {
            if (tokenOrLineNumber.type === 'eof') {
                report(tokenOrLineNumber.line, " at end", message);
            } else {
                report(tokenOrLineNumber.line, " at '" + tokenOrLineNumber.lexeme + "'", message);
            }
        }
    }
}

function report(line: number, where: string, message: string) {
    console.error(`[line ${line}] Error${where}: ${message}`);
    hadError = true;
}

let hadRuntimeError = false;
export function runtimeError(err: RuntimeErrorObj) {
    console.error(`${err.message}\n[line ${err.operator.line}]`);
    hadRuntimeError = true;
}


// start
main();
