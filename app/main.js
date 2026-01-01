const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { spawnSync, spawn } = require("child_process");
const { Readable } = require("stream");

// Constants
const BUILTIN_COMMANDS = ['echo', 'exit', 'type', 'pwd', 'cd', 'history'];

// Track command history
const commandHistory = [];
// Track the last index written to file (for history -a)
let lastWrittenIndex = 0;

// Track last completion input for double-TAB detection
let lastCompletionInput = '';

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
    lastCompletionInput = '';
    return [[completion], line];
  }
  
  // If no matches, ring a bell
  if (hits.length === 0) {
    process.stdout.write('\x07');
    lastCompletionInput = '';
    return [[], line];
  }
  
  // Multiple matches - find longest common prefix
  const lcp = longestCommonPrefix(hits);
  
  // If LCP is longer than current input, complete to LCP (without space)
  if (lcp.length > line.length) {
    lastCompletionInput = '';
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

// Check if command is a builtin
function isBuiltin(cmd) {
  return BUILTIN_COMMANDS.includes(cmd);
}

// Execute builtin command and return output as string
// This function is used by pipelines and internally, not by the main REPL
function executeBuiltin(cmd, cmdArgs) {
  if (cmd === 'echo') {
    return cmdArgs.join(' ') + '\n';
  } else if (cmd === 'pwd') {
    return process.cwd() + '\n';
  } else if (cmd === 'type') {
    const arg = cmdArgs[0];
    const builtins = ['echo', 'exit', 'type', 'pwd', 'cd', 'history', 'source', 'jobs', 'fg', 'bg', 'alias', 'unalias'];
    
    // Check if it's an alias first
    if (aliases.has(arg)) {
      return { exitCode: 0, output: `${arg} is aliased to '${aliases.get(arg)}'\n` };
    }
    
    if (builtins.includes(arg)) {
      return { exitCode: 0, output: `${arg} is a shell builtin\n` };
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
  if (commands.length === 0) return false;
  
  // Parse each command
  const parsedCommands = commands.map(cmd => parseCommand(cmd.trim()));
  
  if (parsedCommands.length === 1) {
    // No pipeline, handle normally
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
      
      // First command: inherit stdin
      if (i === 0) {
        spawnOptions.stdio[0] = 'inherit';
      }
      
      // Last command: inherit stdout
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

// Expand aliases in command line (with recursion detection)
function expandAliases(commandLine, expandedAliases = new Set()) {
  // Parse to get the first word (command)
  const trimmed = commandLine.trim();
  if (!trimmed) return commandLine;
  
  // Find the first word (command name)
  let firstWord = '';
  let i = 0;
  let inQuote = false;
  let quoteChar = '';
  
  while (i < trimmed.length) {
    const char = trimmed[i];
    
    if (!inQuote && (char === '"' || char === "'")) {
      inQuote = true;
      quoteChar = char;
      i++;
      continue;
    }
    
    if (inQuote && char === quoteChar) {
      inQuote = false;
      quoteChar = '';
      i++;
      continue;
    }
    
    if (!inQuote && (char === ' ' || char === '\t' || char === ';' || char === '|' || char === '&')) {
      break;
    }
    
    firstWord += char;
    i++;
  }
  
  // Check if the first word is an alias
  if (!aliases.has(firstWord)) {
    return commandLine;
  }
  
  // Prevent recursive alias expansion
  if (expandedAliases.has(firstWord)) {
    return commandLine;
  }
  
  // Get the alias value
  const aliasValue = aliases.get(firstWord);
  
  // Replace the first word with the alias value
  const restOfCommand = trimmed.substring(firstWord.length);
  const expandedCommand = aliasValue + restOfCommand;
  
  // Mark this alias as expanded
  const newExpandedAliases = new Set(expandedAliases);
  newExpandedAliases.add(firstWord);
  
  // Recursively expand aliases in the result
  return expandAliases(expandedCommand, newExpandedAliases);
}

function repl() {
  rl.question("$ ", (command) => {
    // Add command to history (if not empty)
    if (command.trim()) {
      commandHistory.push(command);
    }
    
    // Expand aliases
    command = expandAliases(command);
    
    // Check for semicolon-separated commands
    if (command.includes(';') && !command.match(/^[^'"]*;[^'"]*$/)) {
      // Has semicolon, need to check if it's outside quotes
      const commands = splitBySemicolon(command);
      if (commands.length > 1) {
        // Execute each command sequentially
        executeCommandsSequentially(commands, 0);
        return;
      }
    }
    
    // Check for background job (ends with &)
    const isBackground = command.trim().endsWith('&');
    if (isBackground) {
      command = command.trim().slice(0, -1).trim(); // Remove & from command
    }
    
    // Check for variable assignment (VAR=value)
    const varAssignMatch = command.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (varAssignMatch) {
      const varName = varAssignMatch[1];
      const varValue = varAssignMatch[2];
      // Parse the value to handle quotes and variables
      const parsed = parseCommand(varValue);
      const expandedValue = parsed.args.join(' ');
      process.env[varName] = expandedValue;
      lastExitCode = 0; // Variable assignment succeeds
      repl();
      return;
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
    
    // Handle exit builtin (special case - must be in REPL, not in executeBuiltin)
    if (cmd === "exit") {
      saveHistoryToFile();
      process.exit(0);
    }
    
    // Handle builtins that don't need special REPL treatment
    if (isBuiltin(cmd)) {
      // Execute the builtin
      const output = executeBuiltin(cmd, cmdArgs);
      
      // Handle output redirection for builtins
      if (outputFile) {
        const writeMode = outputAppend ? 'a' : 'w';
        try {
          if (output.endsWith('\n')) {
            fs.writeFileSync(outputFile, output, { encoding: 'utf8', flag: writeMode });
          } else {
            fs.writeFileSync(outputFile, output + '\n', { encoding: 'utf8', flag: writeMode });
          }
        } catch (err) {
          // Ignore write errors
        }
      } else {
        // Print to console (remove trailing newline since print adds one)
        if (output) {
          process.stdout.write(output);
        }
      }
      
      // Handle error redirection for builtins (create empty file)
      if (errorFile) {
        const writeMode = errorAppend ? 'a' : 'w';
        try {
          if (!fs.existsSync(errorFile) || !errorAppend) {
            fs.writeFileSync(errorFile, '', { encoding: 'utf8', flag: writeMode });
          }
        } catch (err) {
          // Ignore write errors
        }
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
    repl();
  });
}

// Load history from HISTFILE on startup
if (process.env.HISTFILE) {
  try {
    const fileContent = fs.readFileSync(process.env.HISTFILE, 'utf8');
    const lines = fileContent.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        commandHistory.push(line);
      }
    }
    // Mark these commands as already written (so history -a doesn't duplicate them)
    lastWrittenIndex = commandHistory.length;
  } catch (err) {
    // File doesn't exist or can't be read, start with empty history
  }
}

// Split command line by semicolons (respecting quotes)
function splitBySemicolon(commandLine) {
  const commands = [];
  let currentCommand = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;
  
  for (let i = 0; i < commandLine.length; i++) {
    const char = commandLine[i];
    
    if (escaped) {
      currentCommand += char;
      escaped = false;
      continue;
    }
    
    if (char === '\\' && !inSingleQuote) {
      escaped = true;
      currentCommand += char;
      continue;
    }
    
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      currentCommand += char;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      currentCommand += char;
    } else if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      if (currentCommand.trim()) {
        commands.push(currentCommand.trim());
      }
      currentCommand = '';
    } else {
      currentCommand += char;
    }
  }
  
  if (currentCommand.trim()) {
    commands.push(currentCommand.trim());
  }
  
  return commands;
}

// Execute multiple commands sequentially (for REPL with semicolons)
function executeCommandsSequentially(commands, index) {
  if (index >= commands.length) {
    repl();
    return;
  }
  
  let command = commands[index];
  
  // Expand aliases
  command = expandAliases(command);
  
  // Check for background job (ends with &)
  let isBackground = command.trim().endsWith('&');
  let cleanCommand = isBackground ? command.trim().slice(0, -1).trim() : command;
  
  // Check for variable assignment (VAR=value)
  const varAssignMatch = cleanCommand.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (varAssignMatch) {
    const varName = varAssignMatch[1];
    const varValue = varAssignMatch[2];
    const parsed = parseCommand(varValue);
    const expandedValue = parsed.args.join(' ');
    process.env[varName] = expandedValue;
    lastExitCode = 0;
    executeCommandsSequentially(commands, index + 1);
    return;
  }
  
  // Check for pipeline
  if (cleanCommand.includes('|')) {
    const pipeCommands = cleanCommand.split('|');
    if (executePipeline(pipeCommands)) {
      // Pipeline is async, so we need to modify executePipeline to call callback
      // For now, skip to next command after a short delay (not ideal but works)
      setTimeout(() => executeCommandsSequentially(commands, index + 1), 100);
      return;
    }
  }
  
  // Parse the command
  const parsed = parseCommand(cleanCommand);
  const args = parsed.args;
  
  if (args.length === 0) {
    executeCommandsSequentially(commands, index + 1);
    return;
  }
  
  const cmd = args[0];
  const cmdArgs = args.slice(1);
  
  // Handle exit
  if (cmd === 'exit') {
    if (process.env.HISTFILE) {
      try {
        const content = commandHistory.join('\n') + '\n';
        fs.writeFileSync(process.env.HISTFILE, content, 'utf8');
      } catch (err) {
        // Ignore
      }
    }
    process.exit(0);
  }
  
  // Execute builtin or external command
  if (isBuiltin(cmd)) {
    const result = executeBuiltin(cmd, cmdArgs);
    if (result.output) {
      process.stdout.write(result.output);
    }
    lastExitCode = result.exitCode;
    executeCommandsSequentially(commands, index + 1);
  } else {
    // External command
    const executablePath = findExecutable(cmd);
    if (executablePath) {
      const spawnOptions = {
        argv0: cmd,
        stdio: 'inherit',
      };
      
      if (isBackground) {
        const proc = spawn(executablePath, cmdArgs, spawnOptions);
        const job = addJob(cleanCommand, proc, true);
        console.log(`[${job.id}] ${proc.pid}`);
        proc.unref();
        proc.on('exit', () => {
          job.state = JOB_DONE;
        });
        lastExitCode = 0;
      } else {
        const result = spawnSync(executablePath, cmdArgs, spawnOptions);
        lastExitCode = result.status !== null ? result.status : 1;
      }
      executeCommandsSequentially(commands, index + 1);
    } else {
      console.log(`${cmd}: command not found`);
      lastExitCode = 127;
      executeCommandsSequentially(commands, index + 1);
    }
  }
}

// Execute a single command and return exit code
function executeCommand(command) {
  if (!command.trim()) return 0;
  
  // Expand aliases
  command = expandAliases(command);
  
  // Check for variable assignment (VAR=value)
  const varAssignMatch = command.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (varAssignMatch) {
    const varName = varAssignMatch[1];
    const varValue = varAssignMatch[2];
    const parsed = parseCommand(varValue);
    const expandedValue = parsed.args.join(' ');
    process.env[varName] = expandedValue;
    return 0;
  }
  
  // Check for pipeline
  if (command.includes('|')) {
    const commands = command.split('|');
    // For scripts, we need to execute pipeline synchronously
    // This is a simplified version - full implementation would need refactoring
    return executePipelineSync(commands);
  }
  
  // Parse the command
  const parsed = parseCommand(command);
  const args = parsed.args;
  const outputFile = parsed.outputFile;
  const outputAppend = parsed.outputAppend;
  const errorFile = parsed.errorFile;
  const errorAppend = parsed.errorAppend;
  const inputFile = parsed.inputFile;
  
  if (args.length === 0) return 0;
  
  const cmd = args[0];
  const cmdArgs = args.slice(1);
  
  // Handle exit specially - should terminate the script
  if (cmd === 'exit') {
    const exitCode = cmdArgs[0] ? parseInt(cmdArgs[0]) : 0;
    process.exit(exitCode);
  }
  
  // Handle builtins
  if (isBuiltin(cmd)) {
    const result = executeBuiltin(cmd, cmdArgs);
    
    // Handle output redirection for builtins
    if (outputFile) {
      try {
        if (outputAppend) {
          fs.appendFileSync(outputFile, result.output);
        } else {
          fs.writeFileSync(outputFile, result.output);
        }
      } catch (err) {
        process.stderr.write(`${cmd}: ${outputFile}: ${err.message}\n`);
        return 1;
      }
    } else {
      process.stdout.write(result.output);
    }
    
    return result.exitCode;
  }
  
  // Try to execute as external program
  const executablePath = findExecutable(cmd);
  if (executablePath) {
    const spawnOptions = {
      argv0: cmd,
    };
    
    // Handle I/O redirection
    if (outputFile || errorFile || inputFile) {
      try {
        const stdinFd = inputFile ? fs.openSync(inputFile, 'r') : 'inherit';
        const stdoutFd = outputFile ? fs.openSync(outputFile, outputAppend ? 'a' : 'w') : 'inherit';
        const stderrFd = errorFile ? fs.openSync(errorFile, errorAppend ? 'a' : 'w') : 'inherit';
        spawnOptions.stdio = [stdinFd, stdoutFd, stderrFd];
        
        const result = spawnSync(executablePath, cmdArgs, spawnOptions);
        
        if (typeof stdinFd === 'number') fs.closeSync(stdinFd);
        if (typeof stdoutFd === 'number') fs.closeSync(stdoutFd);
        if (typeof stderrFd === 'number') fs.closeSync(stderrFd);
        
        return result.status !== null ? result.status : 1;
      } catch (err) {
        process.stderr.write(`${cmd}: ${err.message}\n`);
        return 1;
      }
    } else {
      spawnOptions.stdio = 'inherit';
      const result = spawnSync(executablePath, cmdArgs, spawnOptions);
      return result.status !== null ? result.status : 1;
    }
  }
  
  // Command not found
  process.stderr.write(`${cmd}: command not found\n`);
  return 127;
}

// Execute pipeline synchronously (for scripts)
function executePipelineSync(commands) {
  // Simplified pipeline execution - just execute last command for now
  // Full implementation would require piping between commands
  if (commands.length === 0) return 0;
  
  const lastCommand = commands[commands.length - 1].trim();
  return executeCommand(lastCommand);
}

// Execute a script file
function executeScriptFile(scriptPath) {
  try {
    const content = fs.readFileSync(scriptPath, 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Split by semicolons
      const commands = splitBySemicolon(trimmedLine);
      
      for (const command of commands) {
        const exitCode = executeCommand(command);
        lastExitCode = exitCode;
        
        // If command failed and we want to stop on error, we could do that here
        // For now, continue executing all commands like bash does by default
      }
    }
    
    // Exit with the last command's exit code
    process.exit(lastExitCode);
  } catch (err) {
    if (err.code === 'ENOENT') {
      process.stderr.write(`${scriptPath}: No such file or directory\n`);
    } else {
      process.stderr.write(`${scriptPath}: ${err.message}\n`);
    }
    process.exit(1);
  }
}

// Load profile files on startup
function loadProfileFiles() {
  const homeDir = process.env.HOME;
  if (!homeDir) return;
  
  // Try loading profile files in order
  const profileFiles = [
    path.join(homeDir, '.shellrc'),
    path.join(homeDir, '.profile'),
  ];
  
  for (const profileFile of profileFiles) {
    if (fs.existsSync(profileFile)) {
      executeFile(profileFile);
      break; // Only load first found profile file
    }
  }
}

loadProfileFiles();

// Check if a script file is provided as an argument
const scriptFile = process.argv[2];
if (scriptFile) {
  // Execute the script file
  executeScriptFile(scriptFile);
} else {
  // Start the REPL
  repl();
}
