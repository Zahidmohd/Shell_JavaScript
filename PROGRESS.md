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

### Stage 14: Implement Backslash Escaping (Outside Quotes)
**Goal**: Support backslash escaping to treat special characters literally outside quotes.

**Backslash Escaping Rules**:
- Backslash `\` outside quotes acts as an escape character
- It removes the special meaning of the next character
- The backslash itself is removed from the output
- Works for ANY character (special or regular)

**Examples**:
| Command | Output | Explanation |
|---------|--------|-------------|
| `echo three\ \ \ spaces` | `three   spaces` | Each `\ ` creates a literal space |
| `echo before\     after` | `before  after` | First space escaped, others collapsed |
| `echo test\nexample` | `testnexample` | `\n` becomes just `n` (no special meaning) |
| `echo hello\\world` | `hello\world` | `\\` becomes single literal backslash |
| `echo \'hello\'` | `'hello'` | `\'` makes single quotes literal |
| `echo \"hello\"` | `"hello"` | `\"` makes double quotes literal |

**Use Cases**:
- Escaping spaces: `cat /tmp/file\ name` → treats as single filename
- Literal quotes: `echo \'quoted\'` → includes quotes in output
- Literal backslash: `echo \\` → outputs single backslash
- Any special character: `\$`, `\*`, `\?`, etc.

**Implementation**:
```javascript
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
    
    // ... rest of parsing logic
  }
  
  return args;
}
```

**Key Points**:
- Check for backslash BEFORE other conditions
- Only apply outside quotes (inside single quotes, backslash is literal)
- Skip the backslash character (increment `i`)
- Add the next character directly to currentArg (treating it literally)
- Use `continue` to skip normal processing of that character

**Backslash in Different Contexts**:
| Context | Behavior |
|---------|----------|
| `\x` (outside quotes) | Escape next character, backslash removed |
| `'\x'` (inside single quotes) | Backslash is literal, `\x` → `\x` |
| `"\x"` (inside double quotes) | Special (handled in future stage) |

---

### Stage 15: Implement Backslash Escaping (Inside Double Quotes)
**Goal**: Support backslash escaping within double quotes for specific characters.

**Backslash in Double Quotes Rules**:
- Inside double quotes, backslash escapes **only specific characters**
- Escapeable characters: `\`, `"`, `$`
- For these: backslash is removed, next character is literal
- For other characters: both backslash and character are kept

**Examples**:
| Command | Output | Explanation |
|---------|--------|-------------|
| `echo "hello\\"world"` | `hello\world` | `\\` → `\` (escaped backslash) |
| `echo "say \"hi\""` | `say "hi"` | `\"` → `"` (escaped double quote) |
| `echo "cost \$5"` | `cost $5` | `\$` → `$` (escaped dollar sign) |
| `echo "test\nexample"` | `test\nexample` | `\n` → `\n` (backslash kept, not escapeable) |
| `echo "hello'script'\\'test"` | `hello'script'\'test` | `\\` escaped, single quotes literal |

**Comparison of Escaping in Different Contexts**:
| Context | `\\` | `\"` | `\'` | `\n` |
|---------|------|------|------|------|
| Outside quotes | `\` | `"` | `'` | `n` |
| Inside single quotes | `\\` | `\"` | `\'` | `\n` |
| Inside double quotes | `\` | `"` | `\"` | `\n` |

**Implementation**:
```javascript
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
```

**Key Points**:
- Check for backslash AND `inDoubleQuote` state
- Look at next character
- If next character is `\`, `"`, or `$`: remove backslash, add character only
- Otherwise: keep backslash + character (not escapeable in double quotes)
- This is why `\n` stays as `\n` inside double quotes

**Why Only These Characters?**:
- `\\` - to allow literal backslashes in double-quoted strings
- `\"` - to allow literal double quotes without ending the string
- `\$` - to allow literal dollar signs (prevents variable expansion)

---

### Stage 16: Implement Output Redirection (`>` and `1>`)
**Goal**: Redirect standard output of commands to files using `>` or `1>`.

**Output Redirection Rules**:
- `>` redirects standard output (stdout) to a file
- `1>` is equivalent to `>` (1 = file descriptor for stdout)
- If file doesn't exist → created
- If file exists → overwritten (old contents replaced)
- Only stdout is redirected, stderr still goes to terminal

**Examples**:
```bash
$ echo hello > output.txt
$ cat output.txt
hello

$ echo hello 1> file.txt  # Same as >
$ cat file.txt
hello

$ cat nonexistent > output.txt
cat: nonexistent: No such file or directory  # Error on terminal
$ cat output.txt
                                              # File is empty (no stdout)
```

**File Descriptors**:
- `0` = stdin (standard input)
- `1` = stdout (standard output)
- `2` = stderr (standard error)
- `>` is shorthand for `1>`

**Implementation**:

1. **Parse redirection in `parseCommand`**:
```javascript
// After parsing arguments, look for redirection operators
let outputFile = null;
const filteredArgs = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '>' || arg === '1>') {
    // Next argument is the output file
    if (i + 1 < args.length) {
      outputFile = args[i + 1];
      i++; // Skip the filename
    }
  } else if (arg.startsWith('>') || arg.startsWith('1>')) {
    // Handle ">file" or "1>file" (no space)
    if (arg.startsWith('1>')) {
      outputFile = arg.slice(2);
    } else {
      outputFile = arg.slice(1);
    }
  } else {
    filteredArgs.push(arg);
  }
}

return { args: filteredArgs, outputFile };
```

2. **Handle redirection for builtins**:
```javascript
const writeOutput = (text) => {
  if (outputFile) {
    fs.writeFileSync(outputFile, text + '\n');
  } else {
    console.log(text);
  }
};

// Use writeOutput instead of console.log
if (cmd === "echo") {
  writeOutput(cmdArgs.join(" "));
}
```

3. **Handle redirection for external programs**:
```javascript
if (outputFile) {
  // Redirect stdout to file
  const fd = fs.openSync(outputFile, 'w');
  spawnOptions.stdio = ['inherit', fd, 'inherit']; // stdin, stdout, stderr
  
  spawnSync(executablePath, cmdArgs, spawnOptions);
  fs.closeSync(fd);
} else {
  spawnOptions.stdio = "inherit";
  spawnSync(executablePath, cmdArgs, spawnOptions);
}
```

**Key Points**:
- Parse `>` and `1>` as redirection operators, not regular arguments
- Remove redirection operators and filename from command arguments
- For builtins: write to file instead of console
- For external commands: open file descriptor and redirect in `stdio` option
- `stdio: ['inherit', fd, 'inherit']` means: inherit stdin, redirect stdout to fd, inherit stderr
- Always close file descriptor after use

**Node.js APIs Used**:
- `fs.writeFileSync(file, data)` - synchronously write to file (for builtins)
- `fs.openSync(file, 'w')` - open file for writing, return file descriptor
- `fs.closeSync(fd)` - close file descriptor
- `stdio: [stdin, stdout, stderr]` - array form to specify individual file descriptors

---

### Stage 17: Implement Error Redirection (`2>`)
**Goal**: Redirect standard error (stderr) of commands to files using `2>`.

**Error Redirection Rules**:
- `2>` redirects standard error (stderr) to a file
- `2` = file descriptor for stderr
- If file doesn't exist → created
- If file exists → overwritten
- Only stderr is redirected, stdout still goes to terminal
- Can combine with stdout redirection: `command > out.txt 2> err.txt`

**Examples**:
```bash
$ cat nonexistent 2> errors.txt
$ cat errors.txt
cat: nonexistent: No such file or directory

$ cat existing_file nonexistent 2> errors.txt
contents of existing file       # stdout on terminal
$ cat errors.txt
cat: nonexistent: No such file or directory

$ echo hello 2> errors.txt
hello                           # stdout on terminal
$ cat errors.txt
                                # File is empty (no stderr)

$ cat file1 nonexistent > out.txt 2> err.txt
$ cat out.txt
contents of file1               # stdout in out.txt
$ cat err.txt
cat: nonexistent: No such file or directory  # stderr in err.txt
```

**Implementation**:

1. **Parse `2>` redirection**:
```javascript
let outputFile = null;
let errorFile = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '2>') {
    if (i + 1 < args.length) {
      errorFile = args[i + 1];
      i++;
    }
  } else if (arg.startsWith('2>')) {
    errorFile = arg.slice(2);
  }
  // ... handle > and 1> as before
}

return { args: filteredArgs, outputFile, errorFile };
```

2. **Handle stderr for builtins** (create file even if empty):
```javascript
// Create error file if specified (even if empty for builtins)
if (errorFile) {
  fs.writeFileSync(errorFile, '');
}
```

3. **Handle both stdout and stderr redirection for external programs**:
```javascript
if (outputFile || errorFile) {
  const stdoutFd = outputFile ? fs.openSync(outputFile, 'w') : 'inherit';
  const stderrFd = errorFile ? fs.openSync(errorFile, 'w') : 'inherit';
  spawnOptions.stdio = ['inherit', stdoutFd, stderrFd];
  
  spawnSync(executablePath, cmdArgs, spawnOptions);
  
  if (typeof stdoutFd === 'number') fs.closeSync(stdoutFd);
  if (typeof stderrFd === 'number') fs.closeSync(stderrFd);
}
```

**Key Points**:
- Parse both `>` (or `1>`) and `2>` operators
- For builtins: Create errorFile even if empty (to match shell behavior)
  - Most builtins don't produce stderr, but file should still exist
  - Example: `echo hello 2> err.txt` creates empty err.txt
- For external programs: Open file descriptors for both if specified
- Use `'inherit'` for streams that aren't redirected
- `stdio: ['inherit', stdoutFd, stderrFd]` sets stdin, stdout, stderr independently
- Close all opened file descriptors after command completes
- Check `typeof fd === 'number'` to know if it's a file descriptor vs `'inherit'`

**Redirection Combinations**:
| Command | stdout | stderr |
|---------|--------|--------|
| `cmd` | terminal | terminal |
| `cmd > out.txt` | out.txt | terminal |
| `cmd 2> err.txt` | terminal | err.txt |
| `cmd > out.txt 2> err.txt` | out.txt | err.txt |
| `cmd > out.txt 2> out.txt` | out.txt | out.txt (both to same file) |

---

### Stage 18: Implement Append Redirection (`>>`, `1>>`, `2>>`)
**Goal**: Append output to files instead of overwriting them.

**Append Redirection Rules**:
- `>>` or `1>>` appends stdout to file (preserves existing content)
- `2>>` appends stderr to file (preserves existing content)
- If file doesn't exist → created (same as `>`)
- If file exists → new output added to end (not overwritten)
- Can combine: `command >> out.txt 2>> err.txt`

**Difference from `>` and `2>`**:
| Operator | Overwrites | Appends |
|----------|------------|---------|
| `>` or `1>` | Yes | No |
| `>>` or `1>>` | No | Yes |
| `2>` | Yes | No |
| `2>>` | No | Yes |

**Examples**:
```bash
$ echo first >> output.txt
$ echo second >> output.txt
$ cat output.txt
first
second

$ echo Hello 1>> file.txt  # Same as >>
$ echo World 1>> file.txt
$ cat file.txt
Hello
World

$ echo "List of files: " > list.txt   # Overwrite
$ ls /tmp >> list.txt                 # Append
$ cat list.txt
List of files:
file1
file2
file3
```

**Implementation**:

1. **Track append vs overwrite mode**:
```javascript
let outputFile = null;
let outputAppend = false;  // Track if append mode
let errorFile = null;
let errorAppend = false;   // Track if append mode

// Parse >> before > to avoid confusion
if (arg === '>>' || arg === '1>>') {
  outputFile = args[i + 1];
  outputAppend = true;
  i++;
} else if (arg === '2>>') {
  errorFile = args[i + 1];
  errorAppend = true;
  i++;
}
// ... then handle > and 2> with append = false

return { args: filteredArgs, outputFile, outputAppend, errorFile, errorAppend };
```

2. **Use append mode for builtins**:
```javascript
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
```

3. **Use append mode for external programs**:
```javascript
const stdoutFd = outputFile ? fs.openSync(outputFile, outputAppend ? 'a' : 'w') : 'inherit';
const stderrFd = errorFile ? fs.openSync(errorFile, errorAppend ? 'a' : 'w') : 'inherit';
```

**Key Points**:
- **Order matters in parsing**: Check `>>` before `>` to avoid matching `>` twice
- **File open modes**:
  - `'w'` = write (create/overwrite)
  - `'a'` = append (create/append)
- **For builtins**: 
  - Use `fs.appendFileSync()` for append mode
  - Use `fs.writeFileSync()` for overwrite mode
- **For external programs**:
  - Pass `'a'` or `'w'` flag to `fs.openSync()`
- **Error file handling**: In append mode, create empty file only if it doesn't exist

**Node.js APIs Used**:
- `fs.appendFileSync(file, data)` - append data to file (or create if doesn't exist)
- `fs.openSync(file, 'a')` - open file in append mode
- `fs.existsSync(file)` - check if file exists (for error file append logic)

---

### Stage 19: Implement Tab Autocompletion
**Goal**: Autocomplete builtin commands when the user presses TAB.

**Autocompletion Behavior**:
- User types partial command and presses TAB
- Shell checks if partial text matches beginning of builtin commands
- If match found, complete the command
- Add trailing space after completion so user can type arguments

**Supported Completions**:
- `ech` + TAB → `echo ` (with space)
- `exi` + TAB → `exit ` (with space)

**Examples**:
```
$ ech<TAB>
$ echo 

$ exi<TAB>
$ exit 
```

**Implementation** (basic version, improved in Stage 20):
```javascript
// Autocomplete function for builtin commands
function completer(line) {
  const builtins = ["echo", "exit"];
  const hits = builtins.filter((c) => c.startsWith(line));
  
  // If there's exactly one match, add a space at the end
  if (hits.length === 1) {
    return [[hits[0] + ' '], line];
  }
  
  // Show all hits if multiple matches or no match
  return [hits, line];
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: completer,  // Add completer function
});
```

**Note**: This basic version doesn't ring a bell for invalid completions. That's added in Stage 20.

**How It Works**:
1. User presses TAB while typing
2. Readline calls `completer` function with current line
3. Function filters builtins that start with the typed text
4. If exactly one match, return it with a trailing space
5. Readline automatically completes the text

**Node.js readline completer API**:
- **Function signature**: `completer(line, callback)` or `completer(line)` (sync)
- **Returns**: `[[completions], substring]`
  - First element: array of completion strings
  - Second element: the substring that was matched
- **Behavior**:
  - If one completion: replaces line with that completion
  - If multiple: shows all options to user
  - If none: no change

**Key Points**:
- Add space after completion for better UX
- Filter based on `startsWith()` for prefix matching
- Return empty array if no matches
- For this stage, only complete `echo` and `exit`

**Future Enhancements** (not in this stage):
- Complete all builtins (`pwd`, `cd`, `type`)
- Complete executable names from PATH
- Complete file names for arguments
- Complete directory names for `cd` command

---

### Stage 20: Handle Invalid Completions
**Goal**: Ring a bell when TAB completion finds no matches.

**Invalid Completion Behavior**:
- User types command that doesn't match any builtin
- Presses TAB
- Shell leaves input unchanged
- Rings a bell to indicate no valid completions

**The Bell Character**:
- Character: `\x07` (ASCII BEL)
- Effect: Produces audible beep or visual flash
- Depends on terminal settings

**Example**:
```
$ xyz<TAB>
[bell rings]
$ xyz         # Input unchanged
```

**Implementation**:
```javascript
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
```

**Key Points**:
- Check `hits.length === 0` for no matches
- Print `\x07` directly to stdout
- Return empty array `[]` to indicate no completions
- Input remains unchanged (readline handles this)

**Completion Behavior Summary**:
| Scenario | Example | Action |
|----------|---------|--------|
| One match | `ech` + TAB | Complete to `echo ` |
| Multiple matches | `e` + TAB | Show all options |
| No matches | `xyz` + TAB | Ring bell, leave unchanged |

**Why Ring a Bell?**:
- Provides immediate feedback to user
- Standard shell behavior (Bash, Zsh, etc.)
- Indicates "no completions available" without error message
- Doesn't interrupt user's workflow

---

### Stage 21: Tab Completion for PATH Executables
**Goal**: Extend tab completion to include external executables from PATH.

**Extended Completion Behavior**:
- Complete builtin commands (`echo`, `exit`)
- Complete external executables found in PATH directories
- Single match → complete with trailing space
- Multiple matches → show all options
- No matches → ring bell

**Examples**:
```bash
$ custom<TAB>
$ custom_executable 

$ ec<TAB>
echo                 # If only builtin 'echo' matches
echo_tool            # If external 'echo_tool' also exists
$ ec
```

**Implementation**:
```javascript
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

// Autocomplete function for builtin commands and executables
function completer(line) {
  const builtins = ["echo", "exit"];
  
  // Get matches from builtins
  const builtinHits = builtins.filter((c) => c.startsWith(line));
  
  // Get matches from PATH executables
  const executableHits = getExecutablesFromPath(line);
  
  // Combine all hits
  const hits = [...builtinHits, ...executableHits];
  
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
```

**Key Points**:
- **Parse PATH**: Split by `path.delimiter` (`:` on Unix, `;` on Windows)
- **Handle missing directories**: Use try-catch, skip if doesn't exist
- **Check execute permissions**: Use `fs.accessSync(path, fs.constants.X_OK)`
- **Avoid duplicates**: Use `Set` in case same executable exists in multiple PATH directories
- **Combine sources**: Merge builtin and executable matches
- **Graceful handling**: Skip directories that can't be read

**Performance Considerations**:
- Reading all PATH directories can be slow with many directories/files
- Could cache results and invalidate on PATH change
- For now, simple approach works for typical PATH sizes

**Node.js APIs Used**:
- `fs.readdirSync(dir)` - read all files in directory synchronously
- `fs.existsSync(path)` - check if path exists
- `fs.accessSync(path, mode)` - check file permissions
- `Set` - avoid duplicate entries

---

### Stage 22: Multiple Match Completion
**Goal**: Handle tab completion when multiple executables share a common prefix.

**Multiple Match Behavior**:
- User types prefix that matches multiple executables
- First TAB press: Ring bell (indicates multiple matches)
- Second TAB press:
  - Print all matches on new line
  - Matches in alphabetical order
  - Separated by two spaces
  - Show prompt again with original input preserved

**Example**:
```bash
$ xyz_<TAB>        # First TAB - rings bell
$ xyz_<TAB>        # Second TAB - shows matches
xyz_bar  xyz_baz  xyz_quz
$ xyz_             # Prompt reappears with original input
```

**Implementation**:
```javascript
// Track last completion input for double-TAB detection
let lastCompletionInput = '';

function completer(line) {
  const builtins = ["echo", "exit"];
  const builtinHits = builtins.filter((c) => c.startsWith(line));
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
  
  // Multiple matches - check if this is second TAB press
  if (line === lastCompletionInput) {
    // Second TAB - display completions and redraw prompt
    process.stdout.write('\n' + hits.join('  ') + '\n');
    rl.prompt(true);  // true preserves current line
    lastCompletionInput = '';
  } else {
    // First TAB - ring bell and save input
    process.stdout.write('\x07');
    lastCompletionInput = line;
  }
  
  // Return empty to prevent readline's own formatting
  return [[], line];
}
```

**Key Points**:
- **Sort alphabetically**: Use `.sort()` on the hits array
- **Deduplicate first**: Use `Set` before sorting
- **Manually ring bell for multiple matches**: Use `process.stdout.write('\x07')`
- **Let readline handle display**: Node.js readline automatically:
  - Shows all matches on second TAB
  - Preserves original input after showing matches
- **Ring bell for both zero matches and multiple matches**

**Completion Behavior Summary**:
| Scenario | First TAB | Second TAB |
|----------|-----------|------------|
| One match | Complete with space | - |
| Multiple matches | Bell 🔔 | Show all matches |
| No matches | Bell 🔔 | - |

**How readline Handles Multiple Matches**:
1. First TAB: readline detects multiple completions, rings bell
2. Second TAB: readline displays all completions in a formatted list
3. After display: re-shows prompt with original input
4. Spacing and formatting: handled by readline library

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
    
    // Handle backslash escaping outside quotes
    if (char === '\\' && !inSingleQuote && !inDoubleQuote) {
      i++;
      if (i < commandLine.length) {
        currentArg += commandLine[i];
      }
      continue;
    }
    
    // Handle backslash escaping inside double quotes
    if (char === '\\' && inDoubleQuote && !inSingleQuote) {
      i++;
      if (i < commandLine.length) {
        const nextChar = commandLine[i];
        if (nextChar === '\\' || nextChar === '"' || nextChar === '$') {
          currentArg += nextChar;
        } else {
          currentArg += '\\' + nextChar;
        }
      }
      continue;
    }
    
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

- [ ] Extend autocompletion to all builtins (`pwd`, `cd`, `type`)
- [ ] Autocomplete file/directory names for arguments
- [ ] Context-aware completion (e.g., only directories for `cd`)
- [ ] Implement input redirection (`<`)
- [ ] Implement piping (e.g., `cat file.txt | grep search`)
- [ ] Implement variable expansion (`$VAR`) in double quotes
- [ ] Implement command substitution (`` `cmd` ``)
- [ ] Add command history (up/down arrow navigation)
- [ ] Handle command chaining (`;`, `&&`, `||`)
- [ ] Support wildcards/globbing (`*`, `?`)
- [ ] Implement job control (background processes with `&`)
- [ ] Implement `&>` and `&>>` (redirect both stdout and stderr to same file)
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

### Node.js readline Module
- **What**: Built-in module for reading input from readable streams (like stdin)
- **Use Case**: Building interactive command-line programs and REPLs
- **Key Features**:
  - Line-by-line input reading
  - TAB autocompletion via `completer` function
  - Command history navigation
  - Emacs/Vi key bindings
- **Basic Usage**:
  ```javascript
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: completionFunction
  });
  
  rl.question("$ ", (answer) => {
    // Handle answer
  });
  ```
- **Completer Function**:
  - Called when user presses TAB
  - Returns `[[completions], substring]`
  - Can provide command, file, or argument completions
- **Why Use It**: Instead of raw stdin reading, readline handles:
  - Cursor movement, line editing
  - Backspace, delete keys
  - TAB completion
  - History management

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

### I/O Redirection
- **What**: Changing where a program's input comes from or output goes to
- **Standard Streams**:
  - **stdin (0)**: Standard input - where program reads from (default: keyboard)
  - **stdout (1)**: Standard output - where program writes normal output (default: terminal)
  - **stderr (2)**: Standard error - where program writes error messages (default: terminal)
- **Output Redirection**:
  - `>` or `1>` - redirect stdout to file (overwrite)
  - `>>` or `1>>` - redirect stdout to file (append)
  - `2>` - redirect stderr to file (overwrite)
  - `2>>` - redirect stderr to file (append)
  - `&>` - redirect both stdout and stderr to file (overwrite)
  - `&>>` - redirect both stdout and stderr to file (append)
- **Input Redirection**:
  - `<` - redirect stdin from file
- **Overwrite vs Append**:
  - **Overwrite (`>`, `2>`)**: Creates new file or replaces existing content
  - **Append (`>>`, `2>>`)**: Creates new file or adds to end of existing content
  - Both create the file if it doesn't exist
- **Why Separate stdout and stderr**:
  - Allows filtering normal output vs errors
  - Example: `command > output.txt 2> errors.txt` separates output and errors
  - Example: `command >> log.txt` appends to existing log
- **File Descriptors**: Numbers that identify open files
  - Programs inherit 0, 1, 2 from parent process
  - Shell can change where these point before running programs
- **Node.js Implementation**:
  - `fs.openSync(file, 'w')` - open for writing (overwrite)
  - `fs.openSync(file, 'a')` - open for appending
  - `fs.writeFileSync()` - write/overwrite file
  - `fs.appendFileSync()` - append to file
  - `stdio` option in `spawnSync()` - array of [stdin, stdout, stderr]
  - `'inherit'` - use parent's stream
  - file descriptor number - redirect to that file

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
  - Backslash outside quotes → escape next character
- **Edge Cases**:
  - Empty quotes: `echo ''world` → `world`
  - Adjacent quotes: `'hello''world'` → `helloworld`
  - Consecutive spaces: `echo  hello` → `hello` (collapsed)
  - Spaces in quotes: `echo 'hello  world'` → `hello  world` (preserved)
  - Mixed quotes: `echo "it's"` → `it's`
  - Nested quotes: `echo '"hello"'` → `"hello"`
  - Escaped spaces: `echo hello\ world` → `hello world` (single argument)
  - Escaped backslash: `echo \\` → `\`
  - Escaped quotes: `echo \'hello\'` → `'hello'`
- **Escape Mechanisms**:
  - **Backslash (`\`)** outside quotes: Escapes next character, backslash removed
    - Works on ANY character: `\n` → `n`, `\ ` → space, `\\` → `\`
  - **Single quotes (`'`)**: Everything literal (no escaping possible)
    - `'\n'` → `\n` (backslash is literal)
    - `'\\'` → `\\` (backslash is literal)
  - **Double quotes (`"`)**: Most things literal, special handling:
    - Backslash escaping: Only for `\`, `"`, and `$`
      - `"\\"` → `\`, `"\""` → `"`, `"\$"` → `$`
      - Other: `"\n"` → `\n` (both backslash and n kept)
    - Variable expansion (`$VAR`) - future stage
    - Command substitution (`` `cmd` ``) - future stage
- **Quote Interaction**: Single quotes inside double quotes are literal, and vice versa
- **Why It Matters**: Enables file names with spaces, preserving formatting, literal strings, protecting special characters, precise control over interpretation

---

## Notes
- Using Node.js `readline` module for input/output
- `console.log()` automatically adds newline character
- Shell continues running until explicitly terminated

