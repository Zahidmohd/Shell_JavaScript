const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Parse command line with quote support
function parseCommand(commandLine) {
  const args = [];
  let currentArg = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  
  for (let i = 0; i < commandLine.length; i++) {
    const char = commandLine[i];
    
    // Handle backslash escaping outside quotes
    if (char === '\\' && !inSingleQuote && !inDoubleQuote) {
      // Skip the backslash and take the next character literally
      i++;
      if (i < commandLine.length) {
        currentArg += commandLine[i];
      }
      continue;
    }
    
    // Handle backslash escaping inside double quotes
    if (char === '\\' && inDoubleQuote && !inSingleQuote) {
      // Inside double quotes, backslash escapes: \, ", $
      i++;
      if (i < commandLine.length) {
        const nextChar = commandLine[i];
        if (nextChar === '\\' || nextChar === '"' || nextChar === '$') {
          // Escape these characters - remove backslash
          currentArg += nextChar;
        } else {
          // For other characters, keep both backslash and character
          currentArg += '\\' + nextChar;
        }
      }
      continue;
    }
    
    if (char === "'" && !inDoubleQuote) {
      // Toggle single quote (only if not in double quote)
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote) {
      // Toggle double quote (only if not in single quote)
      inDoubleQuote = !inDoubleQuote;
    } else if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
      // Space outside quotes - separator
      if (currentArg.length > 0) {
        args.push(currentArg);
        currentArg = '';
      }
    } else {
      // Regular character or space inside quotes
      currentArg += char;
    }
  }
  
  // Don't forget the last argument
  if (currentArg.length > 0) {
    args.push(currentArg);
  }
  
  return args;
}

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
    // Parse the command line into arguments
    const args = parseCommand(command);
    
    if (args.length === 0) {
      repl();
      return;
    }
    
    const cmd = args[0];
    const cmdArgs = args.slice(1);
    
    // Handle exit builtin
    if (cmd === "exit") {
      process.exit(0);
    }
    
    // Handle echo builtin
    if (cmd === "echo") {
      console.log(cmdArgs.join(" "));
      repl();
      return;
    }
    
    // Handle type builtin
    if (cmd === "type") {
      const builtins = ["echo", "exit", "type", "pwd", "cd"];
      const arg = cmdArgs[0];
      
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
    if (cmd === "pwd") {
      console.log(process.cwd());
      repl();
      return;
    }
    
    // Handle cd builtin
    if (cmd === "cd") {
      let dir = cmdArgs[0];
      
      // Handle ~ (home directory)
      if (dir === "~") {
        dir = process.env.HOME;
      }
      
      try {
        process.chdir(dir);
      } catch (err) {
        console.log(`cd: ${dir}: No such file or directory`);
      }
      
      repl();
      return;
    }
    
    // Try to execute as external program
    const executablePath = findExecutable(cmd);
    if (executablePath) {
      // Execute the external program
      const result = spawnSync(executablePath, cmdArgs, {
        stdio: "inherit", // Inherit stdin, stdout, stderr
        argv0: cmd, // Set argv[0] to program name, not full path
      });
      
      repl();
      return;
    }
    
    // Command not found
    console.log(`${cmd}: command not found`);
    repl(); // Loop back to prompt for next command
  });
}

// Start the REPL
repl();
