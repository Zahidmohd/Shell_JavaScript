
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
  const isWindows = process.platform === 'win32';
  
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
          
          // On Windows, check differently
          let isExecutable = false;
          if (isWindows) {
            // On Windows, ONLY consider files with executable extensions
            const execExtensions = ['.exe', '.cmd', '.bat', '.com'];
            const hasExecExt = execExtensions.some(ext => file.toLowerCase().endsWith(ext));
            isExecutable = hasExecExt && fs.existsSync(fullPath);
          } else {
            // On Unix, check execute permissions
            try {
              fs.accessSync(fullPath, fs.constants.X_OK);
              isExecutable = true;
            } catch (err) {
              isExecutable = false;
            }
          }
          
          if (isExecutable) {
            // On Windows, strip .exe/.cmd/.bat/.com extension for display
            if (isWindows) {
              if (file.endsWith('.exe')) {
                executables.add(file.slice(0, -4));
              } else if (file.endsWith('.cmd')) {
                executables.add(file.slice(0, -4));
              } else if (file.endsWith('.bat')) {
                executables.add(file.slice(0, -4));
              } else if (file.endsWith('.com')) {
                executables.add(file.slice(0, -4));
              } else {
                executables.add(file);
              }
            } else {
              executables.add(file);
            }
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

// Get file/directory completions for path
function getPathCompletions(inputPath) {
  try {
    // Determine directory and prefix
    let dir, prefix;
    
    if (inputPath.includes('/') || inputPath.includes('\\')) {
      // Path contains directory separator
      const lastSep = Math.max(inputPath.lastIndexOf('/'), inputPath.lastIndexOf('\\'));
      dir = inputPath.substring(0, lastSep + 1) || '.';
      prefix = inputPath.substring(lastSep + 1);
    } else {
      // No separator, search in current directory
      dir = '.';
      prefix = inputPath;
    }
    
    // Expand ~ to home directory
    if (dir.startsWith('~')) {
      dir = dir.replace('~', process.env.HOME || '');
    }
    
    // Read directory contents
    if (!fs.existsSync(dir)) {
      return [];
    }
    
    const entries = fs.readdirSync(dir);
    const matches = [];
    
    for (const entry of entries) {
      if (entry.startsWith(prefix)) {
        const fullPath = path.join(dir, entry);
        const stats = fs.statSync(fullPath);
        
        // Build completion path
        let completion;
        if (inputPath.includes('/') || inputPath.includes('\\')) {
          const basePath = inputPath.substring(0, inputPath.lastIndexOf('/') >= 0 ? inputPath.lastIndexOf('/') + 1 : inputPath.lastIndexOf('\\') + 1);
          completion = basePath + entry;
        } else {
          completion = entry;
        }
        
        // Add / for directories
        if (stats.isDirectory()) {
          completion += '/';
        }
        
        matches.push(completion);
      }
    }
    
    return matches;
  } catch (err) {
    return [];
  }
}

// Check if input looks like a path
function isPathLike(input) {
  return input.includes('/') || input.includes('\\') || input.startsWith('.') || input.startsWith('~');
}

// Autocomplete function for builtin commands and executables
function completer(line) {
  // Check if we're completing a path
  const words = line.split(/\s+/);
  const lastWord = words[words.length - 1];
  
  // If we have multiple words (command + arguments) or last word looks like a path
  // do path completion
  if (lastWord && (words.length > 1 || isPathLike(lastWord))) {
    const hits = getPathCompletions(lastWord).sort();
    
    if (hits.length === 0) {
      process.stdout.write('\x07');
      lastCompletionInput = '';
      return [[], line];
    }
    
    if (hits.length === 1) {
      // Single match - replace last word
      const prefix = words.slice(0, -1).join(' ');
      const completion = (prefix ? prefix + ' ' : '') + hits[0];
      lastCompletionInput = '';
      return [[completion], line];
    }
    
    // Multiple matches
    const lcp = longestCommonPrefix(hits);
    const prefix = words.slice(0, -1).join(' ');
    const fullLcp = (prefix ? prefix + ' ' : '') + lcp;
    
    if (lcp.length > lastWord.length) {
      lastCompletionInput = '';
      return [[fullLcp], line];
    }
    
    // Show completions on second TAB
    if (line === lastCompletionInput) {
      process.stdout.write('\n' + hits.join('  ') + '\n');
      rl.prompt(true);
      lastCompletionInput = '';
      return [[], line];
    } else {
      process.stdout.write('\x07');
      lastCompletionInput = line;
      return [[], line];
    }
  }
  
  // Command completion (original behavior)
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
    lastCompletionInput = ''; // Reset for next completion
    return [[lcp], line];
  }
  
  // LCP equals input - check if this is second TAB press
  if (line === lastCompletionInput) {
    // Second TAB - display completions and redraw prompt
    process.stdout.write('\n' + hits.join('  ') + '\n');
    rl.prompt(true);
    lastCompletionInput = '';
    return [[], line];
  } else {
    // First TAB - ring bell and save input
    process.stdout.write('\x07');
    lastCompletionInput = line;
    return [[], line];
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: completer,
  prompt: '$ ',
});

// Brace expansion functions
function expandBraces(str) {
  // Find the first brace pattern
  const braceMatch = findBracePattern(str);
  
  if (!braceMatch) {
    return [str]; // No braces found, return as-is
  }
  
  const { prefix, pattern, suffix, start, end } = braceMatch;
  
  // Expand the brace pattern
  let expansions = [];
  
  // Check if it's a sequence pattern {x..y}
  const seqMatch = pattern.match(/^(\w+)\.\.(\w+)$/);
  if (seqMatch) {
    expansions = expandSequence(seqMatch[1], seqMatch[2]);
  } else {
    // It's a comma-separated list {a,b,c}
    expansions = pattern.split(',');
  }
  
  // Combine prefix + expansion + suffix
  const results = [];
  for (const expansion of expansions) {
    const newStr = prefix + expansion + suffix;
    // Recursively expand any remaining braces
    const subExpansions = expandBraces(newStr);
    results.push(...subExpansions);
  }
  
  return results;
}

function findBracePattern(str) {
  // Find the first complete brace pattern, handling nesting
  let braceDepth = 0;
  let braceStart = -1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    // Handle quotes (braces inside quotes are not expanded)
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    
    if (inSingleQuote || inDoubleQuote) {
      continue;
    }
    
    if (char === '{') {
      if (braceDepth === 0) {
        braceStart = i;
      }
      braceDepth++;
    } else if (char === '}' && braceDepth > 0) {
      braceDepth--;
      if (braceDepth === 0) {
        // Found a complete brace pattern
        const prefix = str.substring(0, braceStart);
        const pattern = str.substring(braceStart + 1, i);
        const suffix = str.substring(i + 1);
        
        // Validate the pattern (must contain comma or ..)
        if (pattern.includes(',') || pattern.includes('..')) {
          return { prefix, pattern, suffix, start: braceStart, end: i };
        }
        // Not a valid brace expansion, continue searching
        braceStart = -1;
      }
    }
  }
  
  return null;
}

function expandSequence(start, end) {
  const results = [];
  
  // Check if both are numbers
  const startNum = parseInt(start, 10);
  const endNum = parseInt(end, 10);
  
  if (!isNaN(startNum) && !isNaN(endNum)) {
    // Numeric sequence
    const step = startNum <= endNum ? 1 : -1;
    for (let i = startNum; step > 0 ? i <= endNum : i >= endNum; i += step) {
      // Preserve leading zeros
      if (start.length > 1 && start[0] === '0') {
        results.push(String(i).padStart(start.length, '0'));
      } else {
        results.push(String(i));
      }
    }
  } else if (start.length === 1 && end.length === 1) {
    // Character sequence
    const startCode = start.charCodeAt(0);
    const endCode = end.charCodeAt(0);
    const step = startCode <= endCode ? 1 : -1;
    
    for (let i = startCode; step > 0 ? i <= endCode : i >= endCode; i += step) {
      results.push(String.fromCharCode(i));
    }
  } else {
    // Invalid sequence, return as-is
    results.push(`${start}..${end}`);
  }
  
  return results;
}

function expandBracesInCommand(commandLine) {
  // Split command line by spaces while respecting quotes
  const tokens = [];
  let currentToken = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;
  
  for (let i = 0; i < commandLine.length; i++) {
    const char = commandLine[i];
    
    if (escaped) {
      currentToken += char;
      escaped = false;
      continue;
    }
    
    if (char === '\\' && !inSingleQuote) {
      escaped = true;
      currentToken += char;
      continue;
    }
    
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      currentToken += char;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      currentToken += char;
    } else if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
      if (currentToken) {
        tokens.push(currentToken);
        currentToken = '';
      }
    } else {
      currentToken += char;
    }
  }
  
  if (currentToken) {
    tokens.push(currentToken);
  }
  
  // Expand braces in each token
  const expandedTokens = [];
  for (const token of tokens) {
    const expanded = expandBraces(token);
    expandedTokens.push(...expanded);
  }
  
  return expandedTokens.join(' ');
}

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
    
    // Handle variable interpolation (outside single quotes)
    if (char === '$' && !inSingleQuote) {
      // Check for $? (exit code)
      if (i + 1 < commandLine.length && commandLine[i + 1] === '?') {
        currentArg += String(lastExitCode);
        i++; // Skip the ?
      } else if (i + 1 < commandLine.length && commandLine[i + 1] === '{') {
        // ${VAR} syntax
        i += 2; // Skip ${ 
        let varName = '';
        while (i < commandLine.length && commandLine[i] !== '}') {
          varName += commandLine[i];
          i++;
        }
        // i is now at } or end of string
        // Expand variable
        if (varName === '?') {
          // ${?} syntax for exit code
          currentArg += String(lastExitCode);
        } else {
          const value = process.env[varName] || '';
          currentArg += value;
        }
      } else if (i + 1 < commandLine.length) {
        // $VAR syntax - read alphanumeric and underscore
        i++; // Skip $
        let varName = '';
        while (i < commandLine.length && /[A-Za-z0-9_]/.test(commandLine[i])) {
          varName += commandLine[i];
          i++;
        }
        i--; // Back up one since loop will increment
        // Expand variable
        const value = process.env[varName] || '';
        currentArg += value;
      } else {
        // Just $ at end of string
        currentArg += char;
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
    } else if ((char === '<' || char === '>') && !inSingleQuote && !inDoubleQuote) {
      // Redirection operator outside quotes - split as separate token
      if (currentArg.length > 0) {
        args.push(currentArg);
        currentArg = '';
      }
      // Check for >> or 2>> or 1>> or 2>
      if (char === '>') {
        if (i + 1 < commandLine.length && commandLine[i + 1] === '>') {
          // >> found
          // Check if preceded by 1 or 2
          if (args.length > 0 && (args[args.length - 1] === '1' || args[args.length - 1] === '2')) {
            const num = args.pop();
            args.push(num + '>>');
          } else {
            args.push('>>');
          }
          i++; // Skip the second >
        } else {
          // Single >
          // Check if preceded by 1 or 2
          if (args.length > 0 && (args[args.length - 1] === '1' || args[args.length - 1] === '2')) {
            const num = args.pop();
            args.push(num + '>');
          } else {
            args.push('>');
          }
        }
      } else {
        // < found
        args.push('<');
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
  let inputFile = null;
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
    } else if (arg === '<') {
      // stdin redirection
      if (i + 1 < args.length) {
        inputFile = args[i + 1];
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
    } else if (arg.startsWith('<')) {
      // Handle "<file" (no space)
      inputFile = arg.slice(1);
    } else {
      filteredArgs.push(arg);
    }
  }
  
  return { args: filteredArgs, outputFile, outputAppend, errorFile, errorAppend, inputFile };
}

// Helper function to find executable in PATH
function findExecutable(command) {
  const pathEnv = process.env.PATH || "";
  const directories = pathEnv.split(path.delimiter);
  
  // On Windows, try both with and without .exe extension
  const isWindows = process.platform === 'win32';
  const extensions = isWindows ? ['', '.exe', '.cmd', '.bat', '.com'] : [''];
  
  for (const dir of directories) {
    for (const ext of extensions) {
      const fullPath = path.join(dir, command + ext);
      
      try {
        // Check if file exists
        if (fs.existsSync(fullPath)) {
          // On Windows, just check if it exists (permissions work differently)
          // On Unix, check execute permissions
          if (isWindows) {
            // On Windows, if it has executable extension or no extension, it's good
            return fullPath;
          } else {
            // On Unix, check execute permissions
            try {
              fs.accessSync(fullPath, fs.constants.X_OK);
              return fullPath;
            } catch (err) {
              continue;
            }
          }
        }
      } catch (err) {
        // File doesn't exist or can't be accessed, continue to next
        continue;
      }
    }
  }
  
  return null;
}

// Track command history
const commandHistory = [];
// Track the last index written to file (for history -a)
let lastWrittenIndex = 0;

// Track last exit code for $? variable
let lastExitCode = 0;

// Store command aliases
const aliases = new Map();

// Job control
const jobs = [];
let nextJobId = 1;

// Job states
const JOB_RUNNING = 'Running';
const JOB_STOPPED = 'Stopped';
const JOB_DONE = 'Done';

// Add a job
function addJob(command, process, isBackground) {
  const job = {
    id: nextJobId++,
    command: command,
    process: process,
    pid: process.pid,
    state: JOB_RUNNING,
    background: isBackground
  };
  jobs.push(job);
  return job;
}

// Remove completed jobs
function cleanupJobs() {
  for (let i = jobs.length - 1; i >= 0; i--) {
    if (jobs[i].state === JOB_DONE) {
      jobs.splice(i, 1);
    }
  }
}

// Get job by ID
function getJob(jobId) {
  return jobs.find(j => j.id === jobId);
}

// Update job states
function updateJobStates() {
  jobs.forEach(job => {
    if (job.process && job.process.exitCode !== null) {
      job.state = JOB_DONE;
    }
  });
}

// Execute commands from a file (for source builtin and profile loading)
function executeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Execute the command (without adding to history)
      // We'll process it directly here to avoid REPL recursion
      executeCommand(trimmedLine, false);
    }
    return true;
  } catch (err) {
    return false;
  }
}

// Execute a single command (helper for source and profile loading)
function executeCommand(command, addToHistory = true) {
  if (!command.trim()) return;
  
  // Add to history if requested
  if (addToHistory && command.trim()) {
    commandHistory.push(command);
  }
  
  // Check for variable assignment (VAR=value)
  const varAssignMatch = command.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (varAssignMatch) {
    const varName = varAssignMatch[1];
    const varValue = varAssignMatch[2];
    const parsed = parseCommand(varValue);
    const expandedValue = parsed.args.join(' ');
    process.env[varName] = expandedValue;
    return;
  }
  
  // Parse the command
  const parsed = parseCommand(command);
  const args = parsed.args;
  
  if (args.length === 0) return;
  
  const cmd = args[0];
  const cmdArgs = args.slice(1);
  
  // Handle builtins that need special handling
  if (cmd === 'cd') {
    const dir = cmdArgs[0] === '~' ? process.env.HOME : cmdArgs[0];
    try {
      process.chdir(dir);
    } catch (err) {
      // Silently ignore errors in profile files
    }
  } else if (cmd === 'source' && cmdArgs[0]) {
    executeFile(cmdArgs[0]);
  } else if (isBuiltin(cmd)) {
    // Execute other builtins
    const result = executeBuiltin(cmd, cmdArgs);
    if (result.output) {
      process.stdout.write(result.output);
    }
  }
  // For non-builtins in profile files, we skip them (don't execute external commands during profile load)
}

// Check if command is a builtin
function isBuiltin(cmd) {
  return ['echo', 'exit', 'type', 'pwd', 'cd', 'history', 'source', 'jobs', 'fg', 'bg', 'alias', 'unalias'].includes(cmd);
}

// Execute builtin command and return { exitCode, output }
function executeBuiltin(cmd, cmdArgs) {
  if (cmd === 'echo') {
    return { exitCode: 0, output: cmdArgs.join(' ') + '\n' };
  } else if (cmd === 'pwd') {
    return { exitCode: 0, output: process.cwd() + '\n' };
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
      return { exitCode: 0, output: `${arg} is ${executablePath}\n` };
    }
    return { exitCode: 1, output: `${arg}: not found\n` };
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
        return { exitCode: 0, output: '' };
      } catch (err) {
        return { exitCode: 1, output: `history: ${filePath}: No such file or directory\n` };
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
        return { exitCode: 0, output: '' };
      } catch (err) {
        return { exitCode: 1, output: `history: ${filePath}: cannot write history file\n` };
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
        return { exitCode: 0, output: '' };
      } catch (err) {
        return { exitCode: 1, output: `history: ${filePath}: cannot append to history file\n` };
      }
    }
    
    // Normal history display
    const limit = cmdArgs[0] ? parseInt(cmdArgs[0]) : commandHistory.length;
    const startIndex = Math.max(0, commandHistory.length - limit);
    let result = '';
    for (let i = startIndex; i < commandHistory.length; i++) {
      result += `    ${i + 1}  ${commandHistory[i]}\n`;
    }
    return { exitCode: 0, output: result };
  } else if (cmd === 'cd') {
    const dir = cmdArgs[0] === '~' ? process.env.HOME : cmdArgs[0];
    try {
      process.chdir(dir);
      return { exitCode: 0, output: '' };
    } catch (err) {
      return { exitCode: 1, output: `cd: ${dir}: No such file or directory\n` };
    }
  } else if (cmd === 'source') {
    if (!cmdArgs[0]) {
      return { exitCode: 1, output: 'source: filename required\n' };
    }
    const filePath = cmdArgs[0].replace(/^~/, process.env.HOME || '');
    const success = executeFile(filePath);
    if (!success) {
      return { exitCode: 1, output: `source: ${cmdArgs[0]}: No such file or directory\n` };
    }
    return { exitCode: 0, output: '' };
  } else if (cmd === 'jobs') {
    // Update job states first
    updateJobStates();
    
    let result = '';
    jobs.forEach(job => {
      const sign = job.background ? '&' : '';
      result += `[${job.id}]  ${job.state}  ${job.command}${sign}\n`;
    });
    return { exitCode: 0, output: result };
  } else if (cmd === 'fg') {
    // Bring job to foreground
    const jobId = cmdArgs[0] ? parseInt(cmdArgs[0]) : jobs.length;
    const job = getJob(jobId);
    
    if (!job) {
      return { exitCode: 1, output: `fg: ${jobId}: no such job\n` };
    }
    
    if (job.state === JOB_DONE) {
      return { exitCode: 1, output: `fg: ${jobId}: job has terminated\n` };
    }
    
    // Note: Full fg implementation requires process group management
    // which is complex in Node.js. This is a basic implementation.
    return { exitCode: 0, output: `[${job.id}]  ${job.command}\n` };
  } else if (cmd === 'bg') {
    // Continue job in background
    const jobId = cmdArgs[0] ? parseInt(cmdArgs[0]) : jobs.length;
    const job = getJob(jobId);
    
    if (!job) {
      return { exitCode: 1, output: `bg: ${jobId}: no such job\n` };
    }
    
    if (job.state === JOB_DONE) {
      return { exitCode: 1, output: `bg: ${jobId}: job has terminated\n` };
    }
    
    job.state = JOB_RUNNING;
    job.background = true;
    
    // Note: Full bg implementation requires sending SIGCONT signal
    // This is a basic implementation
    return { exitCode: 0, output: `[${job.id}]  ${job.command} &\n` };
  } else if (cmd === 'alias') {
    // Handle alias builtin
    if (cmdArgs.length === 0) {
      // List all aliases
      let result = '';
      const sortedAliases = Array.from(aliases.entries()).sort();
      for (const [name, value] of sortedAliases) {
        result += `alias ${name}='${value}'\n`;
      }
      return { exitCode: 0, output: result };
    }
    
    // Check if it's alias name='value' format
    const fullArg = cmdArgs.join(' ');
    const aliasMatch = fullArg.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    
    if (aliasMatch) {
      // Setting an alias
      const name = aliasMatch[1];
      let value = aliasMatch[2];
      
      // Remove surrounding quotes if present
      if ((value.startsWith("'") && value.endsWith("'")) || 
          (value.startsWith('"') && value.endsWith('"'))) {
        value = value.slice(1, -1);
      }
      
      aliases.set(name, value);
      return { exitCode: 0, output: '' };
    } else {
      // Show specific alias(es)
      let result = '';
      let hasError = false;
      for (const name of cmdArgs) {
        if (aliases.has(name)) {
          result += `alias ${name}='${aliases.get(name)}'\n`;
        } else {
          result += `alias: ${name}: not found\n`;
          hasError = true;
        }
      }
      return { exitCode: hasError ? 1 : 0, output: result };
    }
  } else if (cmd === 'unalias') {
    // Handle unalias builtin
    if (cmdArgs.length === 0) {
      return { exitCode: 1, output: 'unalias: usage: unalias name [name ...]\n' };
    }
    
    let hasError = false;
    let result = '';
    for (const name of cmdArgs) {
      if (aliases.has(name)) {
        aliases.delete(name);
      } else {
        result += `unalias: ${name}: not found\n`;
        hasError = true;
      }
    }
    return { exitCode: hasError ? 1 : 0, output: result };
  }
  return { exitCode: 0, output: '' };
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
  const fdToClose = [];
  
  for (let i = 0; i < parsedCommands.length; i++) {
    const parsed = parsedCommands[i];
    const cmd = parsed.args[0];
    const cmdArgs = parsed.args.slice(1);
    
    // Check if builtin
    if (isBuiltin(cmd)) {
      // Execute builtin and get output
      const result = executeBuiltin(cmd, cmdArgs);
      
      // Create a readable stream from the output
      const builtinStream = Readable.from([result.output]);
      
      // Create a mock process object with streams
      const mockProc = {
        stdout: builtinStream,
        stdin: null,
        exitCode: result.exitCode,
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
      
      // First command: check for input redirection
      if (i === 0) {
        if (parsed.inputFile) {
          try {
            const inputFd = fs.openSync(parsed.inputFile, 'r');
            spawnOptions.stdio[0] = inputFd;
            fdToClose.push(inputFd);
          } catch (err) {
            console.log(`${cmd}: ${parsed.inputFile}: No such file or directory`);
            return true;
          }
        } else {
          spawnOptions.stdio[0] = 'inherit';
        }
      }
      
      // Last command: check for output/error redirection
      if (i === parsedCommands.length - 1) {
        if (parsed.outputFile) {
          try {
            const outputFd = fs.openSync(parsed.outputFile, parsed.outputAppend ? 'a' : 'w');
            spawnOptions.stdio[1] = outputFd;
            fdToClose.push(outputFd);
          } catch (err) {
            console.log(`${cmd}: ${parsed.outputFile}: ${err.message}`);
            return true;
          }
        } else {
          spawnOptions.stdio[1] = 'inherit';
        }
        
        if (parsed.errorFile) {
          try {
            const errorFd = fs.openSync(parsed.errorFile, parsed.errorAppend ? 'a' : 'w');
            spawnOptions.stdio[2] = errorFd;
            fdToClose.push(errorFd);
          } catch (err) {
            console.log(`${cmd}: ${parsed.errorFile}: ${err.message}`);
            return true;
          }
        }
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
    lastProc.on('close', (code) => {
      // Update last exit code from the last process in the pipeline
      lastExitCode = code !== null ? code : 0;
      
      // Close any file descriptors that were opened
      fdToClose.forEach(fd => {
        try {
          fs.closeSync(fd);
        } catch (err) {
          // Ignore errors when closing
        }
      });
      repl();
    });
  } else {
    // Builtin (mock process with stream)
    if (lastProc.stdout) {
      lastProc.stdout.on('end', () => {
        // Update last exit code from builtin
        lastExitCode = lastProc.exitCode || 0;
        
        // Close any file descriptors that were opened
        fdToClose.forEach(fd => {
          try {
            fs.closeSync(fd);
          } catch (err) {
            // Ignore errors when closing
          }
        });
        repl();
      });
    } else {
      // Update last exit code from builtin
      lastExitCode = lastProc.exitCode || 0;
      
      // Close any file descriptors that were opened
      fdToClose.forEach(fd => {
        try {
          fs.closeSync(fd);
        } catch (err) {
          // Ignore errors when closing
        }
      });
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
    // Update job states at each prompt
    updateJobStates();
    
    // Add command to history (if not empty)
    if (command.trim()) {
      commandHistory.push(command);
    }
    
    // Expand braces
    command = expandBracesInCommand(command);
    
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
    const inputFile = parsed.inputFile;
    
    if (args.length === 0) {
      repl();
      return;
    }
    
    const cmd = args[0];
    const cmdArgs = args.slice(1);
    
    // Handle exit builtin
    if (cmd === "exit") {
      // Save history to HISTFILE before exiting
      if (process.env.HISTFILE) {
        try {
          const content = commandHistory.join('\n') + '\n';
          fs.writeFileSync(process.env.HISTFILE, content, 'utf8');
        } catch (err) {
          // Silently ignore errors when saving history on exit
        }
      }
      process.exit(0);
    }
    
    // Helper function to write output (to file or console)
    const writeOutput = (text) => {
      if (outputFile) {
        try {
          if (outputAppend) {
            fs.appendFileSync(outputFile, text + '\n');
          } else {
            fs.writeFileSync(outputFile, text + '\n');
          }
        } catch (err) {
          console.error(`${cmd}: ${outputFile}: ${err.message}`);
        }
      } else {
        console.log(text);
      }
    };
    
    // Create/append error file if specified (even if empty for builtins)
    if (errorFile) {
      try {
        if (errorAppend) {
          // Create if doesn't exist, don't modify if exists
          if (!fs.existsSync(errorFile)) {
            fs.writeFileSync(errorFile, '');
          }
        } else {
          // Overwrite with empty
          fs.writeFileSync(errorFile, '');
        }
      } catch (err) {
        console.error(`${cmd}: ${errorFile}: ${err.message}`);
      }
    }
    
    // Handle echo builtin
    if (cmd === "echo") {
      writeOutput(cmdArgs.join(" "));
      lastExitCode = 0;
      repl();
      return;
    }
    
    // Handle type builtin
    if (cmd === "type") {
      const result = executeBuiltin(cmd, cmdArgs);
      const output = result.output.trim(); // Remove trailing newline for writeOutput
      writeOutput(output);
      lastExitCode = result.exitCode;
      repl();
      return;
    }
    
    // Handle pwd builtin
    if (cmd === "pwd") {
      const result = executeBuiltin(cmd, cmdArgs);
      const output = result.output.trim(); // Remove trailing newline for writeOutput
      writeOutput(output);
      lastExitCode = result.exitCode;
      repl();
      return;
    }
    
    // Handle history builtin
    if (cmd === "history") {
      const result = executeBuiltin(cmd, cmdArgs);
      if (result.output) {
        process.stdout.write(result.output);
      }
      lastExitCode = result.exitCode;
      repl();
      return;
    }
    
    // Handle cd builtin
    if (cmd === "cd") {
      const result = executeBuiltin(cmd, cmdArgs);
      if (result.output) {
        process.stdout.write(result.output);
      }
      lastExitCode = result.exitCode;
      repl();
      return;
    }
    
    // Handle source builtin
    if (cmd === "source") {
      const result = executeBuiltin(cmd, cmdArgs);
      if (result.output) {
        process.stdout.write(result.output);
      }
      lastExitCode = result.exitCode;
      repl();
      return;
    }
    
    // Handle jobs builtin
    if (cmd === "jobs") {
      const result = executeBuiltin(cmd, cmdArgs);
      if (result.output) {
        process.stdout.write(result.output);
      }
      lastExitCode = result.exitCode;
      repl();
      return;
    }
    
    // Handle fg builtin
    if (cmd === "fg") {
      const result = executeBuiltin(cmd, cmdArgs);
      if (result.output) {
        process.stdout.write(result.output);
      }
      lastExitCode = result.exitCode;
      repl();
      return;
    }
    
    // Handle bg builtin
    if (cmd === "bg") {
      const result = executeBuiltin(cmd, cmdArgs);
      if (result.output) {
        process.stdout.write(result.output);
      }
      lastExitCode = result.exitCode;
      repl();
      return;
    }
    
    // Handle alias builtin
    if (cmd === "alias") {
      const result = executeBuiltin(cmd, cmdArgs);
      if (result.output) {
        process.stdout.write(result.output);
      }
      lastExitCode = result.exitCode;
      repl();
      return;
    }
    
    // Handle unalias builtin
    if (cmd === "unalias") {
      const result = executeBuiltin(cmd, cmdArgs);
      if (result.output) {
        process.stdout.write(result.output);
      }
      lastExitCode = result.exitCode;
      repl();
      return;
    }
    
    // Try to execute as external program
    const executablePath = findExecutable(cmd);
    if (executablePath) {
      // Execute the external program
      const spawnOptions = {
        argv0: cmd, // Set argv[0] to program name, not full path
        detached: isBackground, // Detach if background job
      };
      
      // Handle I/O redirection
      if (outputFile || errorFile || inputFile) {
        try {
          const stdinFd = inputFile ? fs.openSync(inputFile, 'r') : 'inherit';
          const stdoutFd = outputFile ? fs.openSync(outputFile, outputAppend ? 'a' : 'w') : 'inherit';
          const stderrFd = errorFile ? fs.openSync(errorFile, errorAppend ? 'a' : 'w') : 'inherit';
          spawnOptions.stdio = [stdinFd, stdoutFd, stderrFd]; // stdin, stdout, stderr
          
          if (isBackground) {
            // Spawn background process
            const proc = spawn(executablePath, cmdArgs, spawnOptions);
            const job = addJob(command, proc, true);
            console.log(`[${job.id}] ${proc.pid}`);
            
            // Don't wait for background jobs
            proc.unref();
            
            // Monitor job completion
            proc.on('exit', () => {
              job.state = JOB_DONE;
            });
            
            // Close file descriptors
            if (typeof stdinFd === 'number') fs.closeSync(stdinFd);
            if (typeof stdoutFd === 'number') fs.closeSync(stdoutFd);
            if (typeof stderrFd === 'number') fs.closeSync(stderrFd);
          } else {
            // Foreground execution
            const result = spawnSync(executablePath, cmdArgs, spawnOptions);
            lastExitCode = result.status !== null ? result.status : 1;
            
            // Close file descriptors if they were opened
            if (typeof stdinFd === 'number') fs.closeSync(stdinFd);
            if (typeof stdoutFd === 'number') fs.closeSync(stdoutFd);
            if (typeof stderrFd === 'number') fs.closeSync(stderrFd);
          }
        } catch (err) {
          console.error(`${cmd}: ${err.message}`);
          lastExitCode = 1;
        }
      } else {
        if (isBackground) {
          // Background job without redirection
          spawnOptions.stdio = "inherit";
          const proc = spawn(executablePath, cmdArgs, spawnOptions);
          const job = addJob(command, proc, true);
          console.log(`[${job.id}] ${proc.pid}`);
          
          // Don't wait for background jobs
          proc.unref();
          
          // Monitor job completion
          proc.on('exit', () => {
            job.state = JOB_DONE;
          });
          // Background jobs don't update lastExitCode immediately
          lastExitCode = 0;
        } else {
          // Foreground execution
          spawnOptions.stdio = "inherit";
          const result = spawnSync(executablePath, cmdArgs, spawnOptions);
          lastExitCode = result.status !== null ? result.status : 1;
        }
      }
      
      repl();
      return;
    }
    
    // Command not found
    console.log(`${cmd}: command not found`);
    lastExitCode = 127; // Command not found exit code
    repl(); // Loop back to prompt for next command
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
  
  // Expand braces
  command = expandBracesInCommand(command);
  
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
  
  // Expand braces
  command = expandBracesInCommand(command);
  
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
