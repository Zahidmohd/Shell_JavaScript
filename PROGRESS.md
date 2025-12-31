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
- Arguments are passed as an array (excluding program name)
- The program's output automatically displays in the shell

**Node.js APIs Used**:
- `spawnSync(command, args, options)` - synchronously spawn child process
- `stdio: "inherit"` - child uses parent's stdio streams

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
    // Handle exit builtin
    if (command === "exit") {
      process.exit(0);
    }
    
    // Handle echo builtin
    if (command.startsWith("echo ")) {
      const args = command.slice(5);
      console.log(args);
      repl();
      return;
    }
    
    // Handle type builtin
    if (command.startsWith("type ")) {
      const arg = command.slice(5).trim();
      const builtins = ["echo", "exit", "type"];
      
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
    
    // Try to execute as external program
    const parts = command.split(" ");
    const programName = parts[0];
    const args = parts.slice(1);
    
    const executablePath = findExecutable(programName);
    if (executablePath) {
      // Execute the external program
      const result = spawnSync(executablePath, args, {
        stdio: "inherit",
      });
      
      repl();
      return;
    }
    
    // Command not found
    console.log(`${command}: command not found`);
    repl();
  });
}

// Start the REPL
repl();
```

---

## Next Stages (To Be Implemented)

- [ ] Implement `pwd` builtin (print working directory)
- [ ] Implement `cd` builtin (change directory)
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
Commands like `exit` and `cd` must be builtins because they need to affect the shell's own process (exit the shell, change the shell's working directory).

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
  - Arguments passed as array to child process
- **Synchronous vs Asynchronous**: Using `spawnSync()` blocks the shell until program completes

---

## Notes
- Using Node.js `readline` module for input/output
- `console.log()` automatically adds newline character
- Shell continues running until explicitly terminated

