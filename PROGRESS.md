# Shell Implementation Progress

## Project Overview
Building a shell from scratch using JavaScript. The shell will include:
- Core features: REPL, input parsing, built-ins (pwd, cd), launching external programs
- Advanced features: piping, redirection, command history, autocompletion

---

## Completed Stages

### Stage 1: Print the Prompt
**Goal**: Print the shell prompt (`$`) to signal readiness for commands.

**Implementation**:
```javascript
rl.question("$ ", (command) => {
  // Handle command
});
```

---

### Stage 2: Handle Invalid Commands
**Goal**: Print error messages for invalid commands.

**Example**:
```
$ xyz
xyz: command not found
```

**Implementation**:
```javascript
console.log(`${command}: command not found`);
```

---

### Stage 3: Implement REPL (Read-Eval-Print Loop)
**Goal**: Create an interactive loop that continuously accepts commands.

**REPL Cycle**:
1. **Read**: Display prompt and wait for user input
2. **Eval**: Parse and execute the command
3. **Print**: Display output or error message
4. **Loop**: Return to step 1

**Implementation**:
```javascript
function repl() {
  rl.question("$ ", (command) => {
    console.log(`${command}: command not found`);
    repl(); // Loop back to prompt for next command
  });
}

// Start the REPL
repl();
```

**Behavior**:
- Loop runs indefinitely
- After each command, display a new prompt
- Tester will terminate the program when complete

---

### Stage 4: Implement `exit` Builtin
**Goal**: Terminate the shell when user types `exit`.

**Implementation**:
```javascript
if (command === "exit") {
  process.exit(0);
}
```

**Behavior**:
- Shell terminates immediately when `exit` is entered
- No output or prompt after exit

---

### Stage 5: Implement `echo` Builtin
**Goal**: Print arguments to stdout with spaces between them.

**Example**:
```
$ echo hello world
hello world
$ echo one two three
one two three
```

**Implementation**:
```javascript
if (command.startsWith("echo ")) {
  const args = command.slice(5); // Remove "echo " prefix
  console.log(args);
  repl();
  return;
}
```

**Behavior**:
- Extracts all text after "echo "
- Prints to stdout with newline (automatic with `console.log`)
- Returns to prompt after output

---

### Stage 6: Implement `type` Builtin
**Goal**: Determine how a command would be interpreted (builtin or not found).

**Example**:
```
$ type echo
echo is a shell builtin
$ type exit
exit is a shell builtin
$ type type
type is a shell builtin
$ type invalid_command
invalid_command: not found
```

**Implementation**:
```javascript
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
```

**Behavior**:
- Checks if command is in the list of builtins
- For builtins: prints `<command> is a shell builtin`
- For unrecognized: prints `<command>: not found`
- `type` itself is a builtin, so `type type` works

---

### Stage 7: Extend `type` to Search PATH
**Goal**: Search for executable files in PATH directories.

**The PATH Environment Variable**:
- Contains a list of directories separated by `:` (Unix) or `;` (Windows)
- Shell searches these directories to find executable programs
- Example: `/dir1:/dir2:/dir3`

**Search Algorithm**:
1. Check if command is a builtin → print `<command> is a shell builtin`
2. If not builtin, search through each directory in PATH:
   - Check if file exists
   - Check if file has execute permissions
   - If both true → print `<command> is <full_path>`
3. If not found in any directory → print `<command>: not found`

**Example**:
```
$ type grep
grep is /usr/bin/grep
$ type ls
ls is /usr/bin/ls
$ type invalid_command
invalid_command: not found
$ type echo
echo is a shell builtin
```

**Implementation**:
```javascript
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
      // No execute permissions or other error, continue
      continue;
    }
  }
  
  return null;
}
```

**Key Points**:
- Use `process.env.PATH` to access PATH variable
- Use `path.delimiter` for OS-agnostic path splitting (`:` or `;`)
- Use `fs.existsSync()` to check file existence
- Use `fs.accessSync(path, fs.constants.X_OK)` to check execute permissions
- Skip files without execute permissions

---

### Stage 8: Execute External Programs
**Goal**: Run external programs found in PATH with their arguments.

**How External Execution Works**:
When a command isn't a builtin:
1. Parse the command to extract program name and arguments
2. Search for the executable in PATH (using `findExecutable()`)
3. If found, execute it with its arguments
4. If not found, print `<command>: command not found`

**Example**:
```
$ custom_exe arg1 arg2
Program was passed 3 args (including program name).
Arg #0 (program name): custom_exe
Arg #1: arg1
Arg #2: arg2
```

**Implementation**:
```javascript
// Parse command into program name and arguments
const parts = command.split(" ");
const programName = parts[0];
const args = parts.slice(1);

// Find executable in PATH
const executablePath = findExecutable(programName);
if (executablePath) {
  // Execute with spawnSync
  const result = spawnSync(executablePath, args, {
    stdio: "inherit", // Inherit stdin, stdout, stderr
    argv0: programName, // Set argv[0] to program name, not full path
  });
  
  repl();
  return;
}

// If not found, show error
console.log(`${command}: command not found`);
```

**Key Points**:
- Use `child_process.spawnSync()` to execute programs synchronously
- `stdio: "inherit"` passes stdin/stdout/stderr to the child process
- `argv0: programName` sets `argv[0]` to just the program name (not full path)
- Arguments are passed as an array (excluding program name)
- The program's output automatically displays in the shell

**Node.js APIs Used**:
- `spawnSync(command, args, options)` - synchronously spawn child process
- `stdio: "inherit"` - child uses parent's stdio streams
- `argv0` - explicitly set `argv[0]` to program name (not full path)

---

### Stage 9: Implement `pwd` Builtin
**Goal**: Print the current working directory.

**The pwd Command**:
- Stands for "print working directory"
- Displays the full, absolute path of the current directory
- The shell's working directory is where it was started from
- Must be a builtin (not an external program)

**Example**:
```
$ pwd
/home/user/projects
$ pwd
/usr/local/bin
```

**Implementation**:
```javascript
if (command === "pwd") {
  console.log(process.cwd());
  repl();
  return;
}
```

**Key Points**:
- Use `process.cwd()` to get the current working directory
- Returns the absolute path as a string
- Simple one-line implementation
- Must also add "pwd" to the builtins list for the `type` command

**Node.js APIs Used**:
- `process.cwd()` - returns the current working directory of the Node.js process

---

### Stage 10: Implement `cd` Builtin (Absolute and Relative Paths)
**Goal**: Change the current working directory using absolute and relative paths.

**The cd Command**:
- Stands for "change directory"
- Changes the shell's current working directory
- Must be a builtin (affects the shell's own process)

**Path Types Supported**:
- **Absolute paths**: Start with `/` (e.g., `/usr/local/bin`)
- **Relative paths**: Like `./`, `../`, `./dir` (automatically handled by `process.chdir()`)
- **Home directory**: `~` (handled in Stage 11)

**Handling Absolute Paths**:
1. If directory exists → change to it
2. If directory doesn't exist → print error and stay in current directory

**Example**:
```
$ pwd
/home/user
$ cd /usr/local/bin
$ pwd
/usr/local/bin
$ cd /does_not_exist
cd: /does_not_exist: No such file or directory
$ pwd
/usr/local/bin
```

**Implementation**:
```javascript
if (command.startsWith("cd ")) {
  const dir = command.slice(3).trim();
  
  try {
    process.chdir(dir);
  } catch (err) {
    console.log(`cd: ${dir}: No such file or directory`);
  }
  
  repl();
  return;
}
```

**Key Points**:
- Use `process.chdir()` to change directory
- Wrap in try-catch to handle errors gracefully
- If error occurs, print error message but don't crash
- Current directory remains unchanged if change fails
- Must add "cd" to builtins list for `type` command

**Node.js APIs Used**:
- `process.chdir(directory)` - changes the current working directory
- Throws error if directory doesn't exist or can't be accessed

---

### Stage 11: Extend `cd` to Handle Home Directory (`~`)
**Goal**: Support the `~` character to navigate to the home directory.

**The ~ Character**:
- Shorthand for the user's home directory
- Specified by the `HOME` environment variable
- Convenient way to quickly return home from anywhere

**How It Works**:
1. User types `cd ~`
2. Shell reads `HOME` environment variable
3. Changes to that directory

**Example**:
```
$ pwd
/usr/local/bin
$ cd ~
$ pwd
/home/user
$ cd /var/log
$ pwd
/var/log
$ cd ~
$ pwd
/home/user
```

**Implementation**:
```javascript
if (command.startsWith("cd ")) {
  let dir = command.slice(3).trim();
  
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
```

**Key Points**:
- Check if directory is exactly `~`
- Replace with value from `process.env.HOME`
- Then proceed with normal directory change
- Works with error handling from previous stage

**Node.js APIs Used**:
- `process.env.HOME` - accesses the HOME environment variable
- Contains the absolute path to user's home directory

---

### Stage 12: Implement Single Quote Support
**Goal**: Parse commands with single quotes to preserve spaces and handle special characters literally.

**Single Quotes Behavior**:
- Disable all special meaning for characters inside them
- Every character between single quotes is treated literally
- Consecutive whitespace is preserved (not collapsed)
- Adjacent quoted strings are concatenated

**Examples**:
| Command | Output | Explanation |
|---------|--------|-------------|
| `echo 'hello    world'` | `hello    world` | Spaces preserved within quotes |
| `echo hello    world` | `hello world` | Consecutive spaces collapsed |
| `echo 'hello''world'` | `helloworld` | Adjacent quoted strings concatenated |
| `echo hello''world` | `helloworld` | Empty quotes ignored |
| `cat '/tmp/file name'` | (file content) | File names with spaces work |

**Implementation**:
```javascript
function parseCommand(commandLine) {
  const args = [];
  let currentArg = '';
  let inSingleQuote = false;
  
  for (let i = 0; i < commandLine.length; i++) {
    const char = commandLine[i];
    
    if (char === "'" && !inSingleQuote) {
      // Start single quote
      inSingleQuote = true;
    } else if (char === "'" && inSingleQuote) {
      // End single quote
      inSingleQuote = false;
    } else if (char === ' ' && !inSingleQuote) {
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
  
  // Add last argument
  if (currentArg.length > 0) {
    args.push(currentArg);
  }
  
  return args;
}
```

**Refactored Command Handling**:
Instead of parsing each command differently with `slice()` and `split()`, we now:
1. Parse entire command line into array of arguments
2. First element is the command name
3. Remaining elements are arguments
4. Each builtin uses the parsed arguments

**Key Changes**:
- `echo` now joins arguments with spaces: `cmdArgs.join(" ")`
- All commands now work with properly parsed arguments
- Quotes are stripped from the final arguments
- Spaces inside quotes are preserved

**Benefits**:
- File names with spaces work: `cat '/tmp/my file.txt'`
- Preserves formatting: `echo 'hello    world'`
- Concatenation: `'hello''world'` → `helloworld`
- Consistent parsing across all commands

---

### Stage 13: Implement Double Quote Support
**Goal**: Parse commands with double quotes to preserve spaces and handle most characters literally.

**Double Quotes Behavior**:
- Most characters inside double quotes are treated literally
- Consecutive whitespace is preserved (not collapsed)
- Adjacent quoted strings are concatenated
- Single quotes inside double quotes are literal
- (Variable expansion with `$` and escaping with `\` will be handled in later stages)

**Examples**:
| Command | Output | Explanation |
|---------|--------|-------------|
| `echo "hello    world"` | `hello    world` | Multiple spaces preserved |
| `echo "hello""world"` | `helloworld` | Adjacent strings concatenated |
| `echo "hello" "world"` | `hello world` | Separate arguments |
| `echo "shell's test"` | `shell's test` | Single quotes inside are literal |
| `cat "/tmp/file name"` | (file content) | File names with spaces work |

**Difference from Single Quotes**:
- Single quotes: Everything is literal (no exceptions)
- Double quotes: Most things literal, but allow `$` expansion and `\` escaping (future stages)

**Implementation**:
```javascript
function parseCommand(commandLine) {
  const args = [];
  let currentArg = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  
  for (let i = 0; i < commandLine.length; i++) {
    const char = commandLine[i];
    
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
  
  if (currentArg.length > 0) {
    args.push(currentArg);
  }
  
  return args;
}
```

**Key Changes**:
- Added `inDoubleQuote` state variable
- Double quotes toggle quote state (only when not in single quotes)
- Single quotes toggle quote state (only when not in double quotes)
- Spaces are separators only when outside both quote types
- Both quote types strip the quote characters from final output

**Quote Interaction Rules**:
- Inside single quotes: double quotes are literal
- Inside double quotes: single quotes are literal
- Example: `echo "it's"` → `it's`
- Example: `echo '"hello"'` → `"hello"`

---

## Current Code Structure

**File**: `app/main.js`

```javascript
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
    
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
      if (currentArg.length > 0) {
        args.push(currentArg);
        currentArg = '';
      }
    } else {
      currentArg += char;
    }
  }
  
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
      if (fs.existsSync(fullPath)) {
        fs.accessSync(fullPath, fs.constants.X_OK);
        return fullPath;
      }
    } catch (err) {
      continue;
    }
  }
  
  return null;
}

function repl() {
  rl.question("$ ", (command) => {
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
      
      if (builtins.includes(arg)) {
        console.log(`${arg} is a shell builtin`);
      } else {
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
      const result = spawnSync(executablePath, cmdArgs, {
        stdio: "inherit",
        argv0: cmd,
      });
      
      repl();
      return;
    }
    
    // Command not found
    console.log(`${cmd}: command not found`);
    repl();
  });
}

// Start the REPL
repl();
```

---

## Next Stages (To Be Implemented)

- [ ] Implement backslash escaping in double quotes
- [ ] Implement variable expansion (`$VAR`) in double quotes
- [ ] Implement command substitution (`` `cmd` ``)
- [ ] Implement piping (e.g., `cat file.txt | grep search`)
- [ ] Implement output redirection (e.g., `echo hello > file.txt`)
- [ ] Implement input redirection (e.g., `cat < file.txt`)
- [ ] Add command history
- [ ] Add autocompletion
- [ ] Handle command chaining (`;`, `&&`, `||`)
- [ ] Support wildcards/globbing (`*`, `?`)
- [ ] Implement job control (background processes with `&`)
- [ ] Implement piping
- [ ] Implement redirection
- [ ] Add command history
- [ ] Add autocompletion

---

## Key Concepts Learned

### What is a REPL?
A **Read-Eval-Print Loop** is an interactive programming environment that:
- Takes single user inputs (reads)
- Executes them (evaluates)
- Returns the result (prints)
- Repeats the process (loops)

### Builtin Commands vs External Programs
- **Builtins**: Commands executed directly by the shell (e.g., `exit`, `echo`, `cd`)
- **External**: Separate programs the shell must spawn (e.g., `ls`, `cat`, `node`)

### Why Some Commands Must Be Builtins
Commands like `exit` and `cd` **must** be builtins because they need to affect the shell's own process:
- `exit` - terminates the shell process itself
- `cd` - changes the shell's working directory (if external, would only change child process's directory)
- `pwd` - could be external, but is a builtin for efficiency
- `echo`, `type` - builtins for efficiency and consistency

### PATH Environment Variable
- **Purpose**: Tells the shell where to look for executable programs
- **Format**: Colon-separated list on Unix (`:`) or semicolon-separated on Windows (`;`)
- **Search Order**: Shell searches directories from left to right
- **Execute Permissions**: Files must be marked as executable to run
- **Node.js APIs**:
  - `process.env.PATH` - access PATH variable
  - `path.delimiter` - OS-agnostic path separator
  - `fs.existsSync()` - check if file exists
  - `fs.accessSync(path, fs.constants.X_OK)` - check execute permissions

### Process Spawning
- **What**: Creating a new process to run an external program
- **Why**: External programs run in separate processes from the shell
- **How**: Use OS APIs to spawn child processes
- **Node.js APIs**:
  - `child_process.spawnSync()` - synchronously create child process
  - `stdio: "inherit"` - child inherits parent's input/output streams
  - `argv0` option - explicitly sets `argv[0]` (program name) seen by child
  - Arguments passed as array to child process
- **Synchronous vs Asynchronous**: Using `spawnSync()` blocks the shell until program completes
- **Important**: By default, `argv[0]` would be the full path to the executable. Use `argv0` to set it to just the program name

### Working Directory Management
- **Current Working Directory (CWD)**: The directory the shell process is "in"
- **Why cd Must Be a Builtin**: If cd were external, it would only change the child process's directory, not the shell's
- **Node.js APIs**:
  - `process.cwd()` - returns current working directory as string
  - `process.chdir(path)` - changes current working directory
  - Throws error if directory doesn't exist or lacks permissions
- **Error Handling**: Use try-catch to gracefully handle invalid paths

### Environment Variables
- **What**: Key-value pairs that store configuration and system information
- **Purpose**: Pass information to programs, configure behavior, store paths
- **Common Variables**:
  - `PATH` - directories to search for executables
  - `HOME` - user's home directory path
  - `USER` - current username
  - `SHELL` - path to current shell
- **Node.js API**: `process.env` - object containing all environment variables
- **Usage**: `process.env.HOME`, `process.env.PATH`, etc.
- **Shell Expansion**: Shells often expand `~` to `$HOME` automatically

### Command Line Parsing
- **Challenge**: Properly tokenizing commands with quotes, spaces, and special characters
- **Simple Approach**: Split by spaces - fails with quoted strings containing spaces
- **Proper Approach**: Character-by-character parsing with state tracking
- **State Machine**:
  - Track whether we're inside single or double quotes
  - Spaces inside quotes → part of argument
  - Spaces outside quotes → argument separator
  - Quote characters → removed from final arguments
  - Quotes inside quotes → treated as literal characters
- **Edge Cases**:
  - Empty quotes: `echo ''world` → `world`
  - Adjacent quotes: `'hello''world'` → `helloworld`
  - Consecutive spaces: `echo  hello` → `hello` (collapsed)
  - Spaces in quotes: `echo 'hello  world'` → `hello  world` (preserved)
  - Mixed quotes: `echo "it's"` → `it's`
  - Nested quotes: `echo '"hello"'` → `"hello"`
- **Single vs Double Quotes**:
  - Single quotes (`'`): everything literal (no expansion, no escaping)
  - Double quotes (`"`): most things literal, but allow:
    - Variable expansion (`$VAR`) - future stage
    - Command substitution (`` `cmd` ``) - future stage
    - Backslash escaping (`\`) - future stage
  - Quote Interaction: Single quotes inside double quotes are literal, and vice versa
- **Why It Matters**: Enables file names with spaces, preserving formatting, literal strings, protecting special characters

---

## Notes
- Using Node.js `readline` module for input/output
- `console.log()` automatically adds newline character
- Shell continues running until explicitly terminated

