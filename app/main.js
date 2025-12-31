const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to find executable in PATH
function findExecutable(command) {
  const pathEnv = process.env.PATH || "";
  const directories = pathEnv.split(path.delimiter);
  
  for (const dir of directories) {
    const fullPath = path.join(dir, command);
    
    try {
      // Check if file exists and has execute permissions
      if (fs.existsSync(fullPath)) {
        fs.accessSync(fullPath, fs.constants.X_OK);
        return fullPath;
      }
    } catch (err) {
      // No execute permissions or other error, continue to next directory
      continue;
    }
  }
  
  return null;
}

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
      const builtins = ["echo", "exit", "type", "pwd", "cd"];
      
      // Check if it's a builtin first
      if (builtins.includes(arg)) {
        console.log(`${arg} is a shell builtin`);
      } else {
        // Search for executable in PATH
        const executablePath = findExecutable(arg);
        if (executablePath) {
          console.log(`${arg} is ${executablePath}`);
        } else {
          console.log(`${arg}: not found`);
        }
      }
      
      repl();
      return;
    }
    
    // Handle pwd builtin
    if (command === "pwd") {
      console.log(process.cwd());
      repl();
      return;
    }
    
    // Handle cd builtin
    if (command.startsWith("cd ")) {
      const dir = command.slice(3).trim(); // Remove "cd " prefix
      
      try {
        process.chdir(dir);
      } catch (err) {
        console.log(`cd: ${dir}: No such file or directory`);
      }
      
      repl();
      return;
    }
    
    // Try to execute as external program
    const parts = command.split(" ");
    const programName = parts[0];
    const args = parts.slice(1);
    
    const executablePath = findExecutable(programName);
    if (executablePath) {
      // Execute the external program
      const result = spawnSync(executablePath, args, {
        stdio: "inherit", // Inherit stdin, stdout, stderr
        argv0: programName, // Set argv[0] to program name, not full path
      });
      
      repl();
      return;
    }
    
    // Command not found
    console.log(`${command}: command not found`);
    repl(); // Loop back to prompt for next command
  });
}

// Start the REPL
repl();
