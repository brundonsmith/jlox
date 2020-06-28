import { LoxValue, Token, RuntimeError } from "./model.ts";

export default class Environment {

    readonly enclosing?: Environment;
    private env: {[identifier: string]: LoxValue} = {};

    constructor(enclosing?: Environment) {
        this.enclosing = enclosing;
    }

    define(name: string, value: LoxValue) {
        this.env[name] = value;
    }

    assign(name: Token, value: LoxValue) {
        if (Object.keys(this.env).includes(name.lexeme)) {
            this.env[name.lexeme] = value;
        } else if(this.enclosing != null) {
            this.enclosing.assign(name, value);
        } else {
            throw RuntimeError(name, `Undefined variable '${name.lexeme}'.`);
        }
    }

    assignAt(distance: number, name: Token, value: LoxValue) {
        const ancestor = this.ancestor(distance);

        if (ancestor == null) {
            throw RuntimeError(name, `Failed to resolve environemnt for variable '${name.lexeme}' at depth ${distance}.`);
        } else {
            ancestor.env[name.lexeme] = value;
        }
    }

    get(name: Token): LoxValue {
        const identifier = name.lexeme;

        if(Object.keys(this.env).includes(identifier)) {
            return this.env[identifier];
        } else if(this.enclosing != null) {
            return this.enclosing.get(name);
        } else {
            throw RuntimeError(name, `Undefined variable '${name.lexeme}'.`);
        }
    }

    getAt(distance: number, name: Token) {
        const ancestor = this.ancestor(distance);

        if (ancestor == null) {
            throw RuntimeError(name, `Failed to resolve environemnt for variable '${name.lexeme}' at depth ${distance}.`);
        } else {
            return ancestor.env[name.lexeme];
        }
    }

    private ancestor(distance: number) {
        let env: Environment|undefined = this;

        for (let i = 0; i < distance; i++) {
            env = env?.enclosing;
        }

        return env;
    }
}