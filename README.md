
# What is this?

This is my implementation of "JLox", from following [Crafting Interpreters](https://craftinginterpreters.com/).
The book suggests using Java but I decided to use TypeScript, partly out of
preference and partly to make sure I'm engaging my brain and not just copying
and pasting code.

Beyond my language choice, I've taken several other small liberties in terms of 
architecture so as to make things, in my opinion, more elegant. But the overall
approach is still tied to the one in the book.

# Running the code

I've used [Deno](https://deno.land) instead of Node to avoid messing with a 
build step. Though I only actually use Deno APIs in `main.ts`, so it would be 
fairly easy to get this running on Node using `tsc` with just a few changes.

To run in Deno:
```bash
deno run main.ts  # This presents a REPL
deno run --allow-read main.ts ./test1.lox  # This parses and executes a Lox file
```

At time of writing, running any code will also print its AST. This is to help 
with debugging. As this is an educational project, I don't really plan to go 
through and sand off rough edges like this one.