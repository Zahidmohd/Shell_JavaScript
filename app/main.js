const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// Autocomplete function for builtin commands
function completer(line) {
  const builtins = ["echo", "exit"];
  const hits = builtins.filter((c) => c.startsWith(line));
  
  // If there's exactly one match, add a space at the end
  if (hits.length === 1) {
    return [[hits[0] + ' '], line];
  }
  
  // If no matches, ring a bell
  if (hits.length === 0) {
    process.stdout.write('\x07');
  }
  
  // Show all hits if multiple matches or no match
  return [hits, line];
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: completer,
});

// Parse command line with quote support and redirection
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
  
  // Parse redirection operators
  let outputFile = null;
  let outputAppend = false;
  let errorFile = null;
  let errorAppend = false;
  const filteredArgs = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Check for >> or 1>> redirection (stdout append)
    if (arg === '>>' || arg === '1>>') {
      if (i + 1 < args.length) {
        outputFile = args[i + 1];
        outputAppend = true;
        i++; // Skip the filename
      }
    } else if (arg === '2>>') {
      // stderr append
      if (i + 1 < args.length) {
        errorFile = args[i + 1];
        errorAppend = true;
        i++; // Skip the filename
      }
    } else if (arg.startsWith('1>>')) {
      // Handle "1>>file" (no space)
      outputFile = arg.slice(3);
      outputAppend = true;
    } else if (arg.startsWith('2>>')) {
      // Handle "2>>file" (no space)
      errorFile = arg.slice(3);
      errorAppend = true;
    } else if (arg.startsWith('>>')) {
      // Handle ">>file" (no space)
      outputFile = arg.slice(2);
      outputAppend = true;
    } else if (arg === '>' || arg === '1>') {
      // Next argument is the output file (overwrite)
      if (i + 1 < args.length) {
        outputFile = args[i + 1];
        outputAppend = false;
        i++; // Skip the filename
      }
    } else if (arg === '2>') {
      // Next argument is the error file (stderr, overwrite)
      if (i + 1 < args.length) {
        errorFile = args[i + 1];
        errorAppend = false;
        i++; // Skip the filename
      }
    } else if (arg.startsWith('2>')) {
      // Handle "2>file" (no space)
      errorFile = arg.slice(2);
      errorAppend = false;
    } else if (arg.startsWith('1>')) {
      // Handle "1>file" (no space)
      outputFile = arg.slice(2);
      outputAppend = false;
    } else if (arg.startsWith('>') && !arg.startsWith('>>')) {
      // Handle ">file" (no space)
      outputFile = arg.slice(1);
      outputAppend = false;
    } else {
      filteredArgs.push(arg);
    }
  }
  
  return { args: filteredArgs, outputFile, outputAppend, errorFile, errorAppend };
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
    // Parse the command line into arguments and check for redirection
    const parsed = parseCommand(command);
    const args = parsed.args;
    const outputFile = parsed.outputFile;
    const outputAppend = parsed.outputAppend;
    const errorFile = parsed.errorFile;
    const errorAppend = parsed.errorAppend;
    
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
    
    // Helper function to write output (to file or console)
    const writeOutput = (text) => {
      if (outputFile) {
        if (outputAppend) {
          fs.appendFileSync(outputFile, text + '\n');
        } else {
          fs.writeFileSync(outputFile, text + '\n');
        }
      } else {
        console.log(text);
      }
    };
    
    // Create/append error file if specified (even if empty for builtins)
    if (errorFile) {
      if (errorAppend) {
        // Create if doesn't exist, don't modify if exists
        if (!fs.existsSync(errorFile)) {
          fs.writeFileSync(errorFile, '');
        }
      } else {
        // Overwrite with empty
        fs.writeFileSync(errorFile, '');
      }
    }
    
    // Handle echo builtin
    if (cmd === "echo") {
      writeOutput(cmdArgs.join(" "));
      repl();
      return;
    }
    
    // Handle type builtin
    if (cmd === "type") {
      const builtins = ["echo", "exit", "type", "pwd", "cd"];
      const arg = cmdArgs[0];
      
      let output;
      // Check if it's a builtin first
      if (builtins.includes(arg)) {
        output = `${arg} is a shell builtin`;
      } else {
        // Search for executable in PATH
        const executablePath = findExecutable(arg);
        if (executablePath) {
          output = `${arg} is ${executablePath}`;
        } else {
          output = `${arg}: not found`;
        }
      }
      writeOutput(output);
      repl();
      return;
    }
    
    // Handle pwd builtin
    if (cmd === "pwd") {
      writeOutput(process.cwd());
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
      const spawnOptions = {
        argv0: cmd, // Set argv[0] to program name, not full path
      };
      
      // Handle I/O redirection
      if (outputFile || errorFile) {
        const stdoutFd = outputFile ? fs.openSync(outputFile, outputAppend ? 'a' : 'w') : 'inherit';
        const stderrFd = errorFile ? fs.openSync(errorFile, errorAppend ? 'a' : 'w') : 'inherit';
        spawnOptions.stdio = ['inherit', stdoutFd, stderrFd]; // stdin, stdout, stderr
        
        spawnSync(executablePath, cmdArgs, spawnOptions);
        
        // Close file descriptors if they were opened
        if (typeof stdoutFd === 'number') fs.closeSync(stdoutFd);
        if (typeof stderrFd === 'number') fs.closeSync(stderrFd);
      } else {
        spawnOptions.stdio = "inherit";
        spawnSync(executablePath, cmdArgs, spawnOptions);
      }
      
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
