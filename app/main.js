const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { spawnSync, spawn } = require("child_process");
const { Readable } = require("stream");

// Get all executables from PATH that start with prefix
function getExecutablesFromPath(prefix) {
  const pathEnv = process.env.PATH || "";
  const directories = pathEnv.split(path.delimiter);
  const executables = new Set(); // Use Set to avoid duplicates
  
  for (const dir of directories) {
    try {
      // Check if directory exists
      if (!fs.existsSync(dir)) continue;
      
      // Read all files in the directory
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        // Check if filename starts with prefix
        if (file.startsWith(prefix)) {
          const fullPath = path.join(dir, file);
          try {
            // Check if file has execute permissions
            fs.accessSync(fullPath, fs.constants.X_OK);
            executables.add(file);
          } catch (err) {
            // No execute permissions, skip
            continue;
          }
        }
      }
    } catch (err) {
      // Directory doesn't exist or can't be read, skip
      continue;
    }
  }
  
  return Array.from(executables);
}

// Track last completion input for double-TAB detection
let lastCompletionInput = '';

// Find longest common prefix of an array of strings
function longestCommonPrefix(strings) {
  if (strings.length === 0) return '';
  if (strings.length === 1) return strings[0];
  
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (strings[i].indexOf(prefix) !== 0) {
      prefix = prefix.slice(0, -1);
      if (prefix === '') return '';
    }
  }
  return prefix;
}

// Autocomplete function for builtin commands and executables
function completer(line) {
  const builtins = ["echo", "exit"];
  
  // Get matches from builtins
  const builtinHits = builtins.filter((c) => c.startsWith(line));
  
  // Get matches from PATH executables
  const executableHits = getExecutablesFromPath(line);
  
  // Combine all hits, remove duplicates, and sort alphabetically
  const hits = [...new Set([...builtinHits, ...executableHits])].sort();
  
  // If there's exactly one match, add a space at the end
  if (hits.length === 1) {
    const completion = hits[0] + ' ';
    return [[completion], line];
  }
  
  // If no matches, ring a bell
  if (hits.length === 0) {
    process.stdout.write('\x07');
    return [[], line];
  }
  
  // Multiple matches - find longest common prefix
  const lcp = longestCommonPrefix(hits);
  
  // If LCP is longer than current input, complete to LCP (without space)
  if (lcp.length > line.length) {
    return [[lcp], line];
  }
  
  // LCP equals input - check if this is second TAB press
  if (line === lastCompletionInput) {
    // Second TAB - display completions and redraw prompt
    process.stdout.write('\n' + hits.join('  ') + '\n');
    rl.prompt(true);
    lastCompletionInput = '';
  } else {
    // First TAB - ring bell and save input
    process.stdout.write('\x07');
    lastCompletionInput = line;
  }
  
  // Return empty to prevent readline's own formatting
  return [[], line];
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: completer,
  prompt: '$ ',
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

// Track command history
const commandHistory = [];
// Track the last index written to file (for history -a)
let lastWrittenIndex = 0;

// Check if command is a builtin
function isBuiltin(cmd) {
  return ['echo', 'exit', 'type', 'pwd', 'cd', 'history'].includes(cmd);
}

// Execute builtin command and return output as string
function executeBuiltin(cmd, cmdArgs) {
  if (cmd === 'echo') {
    return cmdArgs.join(' ') + '\n';
  } else if (cmd === 'pwd') {
    return process.cwd() + '\n';
  } else if (cmd === 'type') {
    const arg = cmdArgs[0];
    const builtins = ['echo', 'exit', 'type', 'pwd', 'cd', 'history'];
    if (builtins.includes(arg)) {
      return `${arg} is a shell builtin\n`;
    }
    const executablePath = findExecutable(arg);
    if (executablePath) {
      return `${arg} is ${executablePath}\n`;
    }
    return `${arg}: not found\n`;
  } else if (cmd === 'history') {
    // Check for -r flag (read from file)
    if (cmdArgs[0] === '-r' && cmdArgs[1]) {
      const filePath = cmdArgs[1];
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            commandHistory.push(line);
          }
        }
        return '';
      } catch (err) {
        return `history: ${filePath}: No such file or directory\n`;
      }
    }
    
    // Check for -w flag (write to file)
    if (cmdArgs[0] === '-w' && cmdArgs[1]) {
      const filePath = cmdArgs[1];
      try {
        // Write all commands to file with trailing newline
        const content = commandHistory.join('\n') + '\n';
        fs.writeFileSync(filePath, content, 'utf8');
        lastWrittenIndex = commandHistory.length;
        return '';
      } catch (err) {
        return `history: ${filePath}: cannot write history file\n`;
      }
    }
    
    // Check for -a flag (append to file)
    if (cmdArgs[0] === '-a' && cmdArgs[1]) {
      const filePath = cmdArgs[1];
      try {
        // Only append commands since last write
        const newCommands = commandHistory.slice(lastWrittenIndex);
        if (newCommands.length > 0) {
          const content = newCommands.join('\n') + '\n';
          fs.appendFileSync(filePath, content, 'utf8');
          lastWrittenIndex = commandHistory.length;
        }
        return '';
      } catch (err) {
        return `history: ${filePath}: cannot append to history file\n`;
      }
    }
    
    // Normal history display
    const limit = cmdArgs[0] ? parseInt(cmdArgs[0]) : commandHistory.length;
    const startIndex = Math.max(0, commandHistory.length - limit);
    let result = '';
    for (let i = startIndex; i < commandHistory.length; i++) {
      result += `    ${i + 1}  ${commandHistory[i]}\n`;
    }
    return result;
  } else if (cmd === 'cd') {
    const dir = cmdArgs[0] === '~' ? process.env.HOME : cmdArgs[0];
    try {
      process.chdir(dir);
      return '';
    } catch (err) {
      return `cd: ${dir}: No such file or directory\n`;
    }
  }
  return '';
}

// Execute a pipeline of commands
function executePipeline(commands) {
  if (commands.length === 0) return;
  
  // Parse each command
  const parsedCommands = commands.map(cmd => parseCommand(cmd.trim()));
  
  if (parsedCommands.length === 1) {
    // No pipeline, handle normally (this shouldn't happen here)
    return false;
  }
  
  // Create processes/streams for pipeline
  const processes = [];
  
  for (let i = 0; i < parsedCommands.length; i++) {
    const parsed = parsedCommands[i];
    const cmd = parsed.args[0];
    const cmdArgs = parsed.args.slice(1);
    
    // Check if builtin
    if (isBuiltin(cmd)) {
      // Execute builtin and get output
      const output = executeBuiltin(cmd, cmdArgs);
      
      // Create a readable stream from the output
      const builtinStream = Readable.from([output]);
      
      // Create a mock process object with streams
      const mockProc = {
        stdout: builtinStream,
        stdin: null,
      };
      
      processes.push(mockProc);
    } else {
      // External command
      const executablePath = findExecutable(cmd);
      if (!executablePath) {
        console.log(`${cmd}: command not found`);
        return true;
      }
      
      const spawnOptions = {
        argv0: cmd,
        stdio: ['pipe', 'pipe', 'inherit'], // stdin, stdout, stderr
      };
      
      // First command: inherit stdin or use 'pipe'
      if (i === 0) {
        spawnOptions.stdio[0] = 'inherit';
      }
      
      // Last command: inherit stdout or use 'pipe'
      if (i === parsedCommands.length - 1) {
        spawnOptions.stdio[1] = 'inherit';
      }
      
      const proc = spawn(executablePath, cmdArgs, spawnOptions);
      processes.push(proc);
    }
  }
  
  // Connect pipes between processes
  for (let i = 1; i < processes.length; i++) {
    if (processes[i - 1].stdout && processes[i].stdin) {
      processes[i - 1].stdout.pipe(processes[i].stdin);
    } else if (processes[i - 1].stdout && !processes[i].stdin) {
      // Previous has stdout, current doesn't have stdin (builtin)
      // Do nothing - builtin doesn't read from stdin in our implementation
    }
  }
  
  // Handle last process/stream
  const lastProc = processes[processes.length - 1];
  
  // If last process is a builtin, pipe its output to stdout
  if (lastProc.stdout && !lastProc.on) {
    // It's a builtin (has stdout but no 'on' method)
    lastProc.stdout.pipe(process.stdout);
  }
  
  // Wait for the last process/stream to finish
  if (lastProc.on) {
    // Real process
    lastProc.on('close', () => {
      repl();
    });
  } else {
    // Builtin (mock process with stream)
    if (lastProc.stdout) {
      lastProc.stdout.on('end', () => {
        repl();
      });
    } else {
      repl();
    }
  }
  
  return true;
}

function repl() {
  rl.question("$ ", (command) => {
    // Add command to history (if not empty)
    if (command.trim()) {
      commandHistory.push(command);
    }
    
    // Check for pipeline
    if (command.includes('|')) {
      const commands = command.split('|');
      if (executePipeline(commands)) {
        return;
      }
    }
    
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
      const builtins = ["echo", "exit", "type", "pwd", "cd", "history"];
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
    
    // Handle history builtin
    if (cmd === "history") {
      // Check for -r flag (read from file)
      if (cmdArgs[0] === '-r' && cmdArgs[1]) {
        const filePath = cmdArgs[1];
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const lines = fileContent.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              commandHistory.push(line);
            }
          }
        } catch (err) {
          console.log(`history: ${filePath}: No such file or directory`);
        }
        repl();
        return;
      }
      
      // Check for -w flag (write to file)
      if (cmdArgs[0] === '-w' && cmdArgs[1]) {
        const filePath = cmdArgs[1];
        try {
          // Write all commands to file with trailing newline
          const content = commandHistory.join('\n') + '\n';
          fs.writeFileSync(filePath, content, 'utf8');
          lastWrittenIndex = commandHistory.length;
        } catch (err) {
          console.log(`history: ${filePath}: cannot write history file`);
        }
        repl();
        return;
      }
      
      // Check for -a flag (append to file)
      if (cmdArgs[0] === '-a' && cmdArgs[1]) {
        const filePath = cmdArgs[1];
        try {
          // Only append commands since last write
          const newCommands = commandHistory.slice(lastWrittenIndex);
          if (newCommands.length > 0) {
            const content = newCommands.join('\n') + '\n';
            fs.appendFileSync(filePath, content, 'utf8');
            lastWrittenIndex = commandHistory.length;
          }
        } catch (err) {
          console.log(`history: ${filePath}: cannot append to history file`);
        }
        repl();
        return;
      }
      
      // Normal history display
      const limit = cmdArgs[0] ? parseInt(cmdArgs[0]) : commandHistory.length;
      const startIndex = Math.max(0, commandHistory.length - limit);
      for (let i = startIndex; i < commandHistory.length; i++) {
        console.log(`    ${i + 1}  ${commandHistory[i]}`);
      }
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
