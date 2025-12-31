const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function repl() {
  rl.question("$ ", (command) => {
    // Handle exit builtin
    if (command === "exit") {
      process.exit(0);
    }
    
    console.log(`${command}: command not found`);
    repl(); // Loop back to prompt for next command
  });
}

// Start the REPL
repl();
