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

## Current Code Structure

**File**: `app/main.js`

```javascript
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
      const args = command.slice(5);
      console.log(args);
      repl();
      return;
    }
    
    // Handle invalid commands
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
- [ ] Implement `type` builtin (identify command type)
- [ ] Execute external programs
- [ ] Handle $PATH for finding executables
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

---

## Notes
- Using Node.js `readline` module for input/output
- `console.log()` automatically adds newline character
- Shell continues running until explicitly terminated

