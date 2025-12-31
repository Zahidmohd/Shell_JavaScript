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
    
    // Handle type builtin
    if (command.startsWith("type ")) {
      const arg = command.slice(5).trim(); // Remove "type " prefix
      const builtins = ["echo", "exit", "type"];
      
      if (builtins.includes(arg)) {
        console.log(`${arg} is a shell builtin`);
      } else {
        console.log(`${arg}: not found`);
      }
      
      repl();
      return;
    }
    
    console.log(`${command}: command not found`);
    repl(); // Loop back to prompt for next command
  });
}

// Start the REPL
repl();
