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
    
    // Handle echo builtin
    if (command.startsWith("echo ")) {
      const args = command.slice(5); // Remove "echo " prefix
      console.log(args);
      repl();
      return;
    }
    
    console.log(`${command}: command not found`);
    repl(); // Loop back to prompt for next command
  });
}

// Start the REPL
repl();
