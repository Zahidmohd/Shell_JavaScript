# 🚀 Quick Reference Guide

## Start the Shell

```bash
node app/main.js
```

With history:
```bash
HISTFILE=~/.shell_history node app/main.js
```

## Built-in Commands

| Command | Description | Example |
|---------|-------------|---------|
| `echo [text]` | Print text | `echo hello world` |
| `exit` | Exit shell | `exit` |
| `pwd` | Show current directory | `pwd` |
| `cd [dir]` | Change directory | `cd /tmp` or `cd ~` |
| `type [cmd]` | Show command type | `type echo` |
| `history` | Show all commands | `history` |
| `history [N]` | Show last N commands | `history 10` |
| `history -r [file]` | Read from file | `history -r ~/.history` |
| `history -w [file]` | Write to file | `history -w ~/.history` |
| `history -a [file]` | Append to file | `history -a ~/.history` |

## Quoting & Escaping

```bash
# Single quotes - everything literal
$ echo 'hello    world'
hello    world

# Double quotes - allows escaping
$ echo "hello \"world\""
hello "world"

# Backslash escaping
$ echo hello\ world
hello world

$ echo it\'s\ working
it's working
```

## I/O Redirection

```bash
# Redirect stdout (overwrite)
$ echo "test" > file.txt
$ command > output.txt
$ command 1> output.txt

# Redirect stdout (append)
$ echo "more" >> file.txt
$ command >> output.txt
$ command 1>> output.txt

# Redirect stderr (overwrite)
$ command 2> error.txt

# Redirect stderr (append)
$ command 2>> error.txt

# Both can be used together
$ command > output.txt 2> error.txt
```

## Pipelines

```bash
# Basic pipeline
$ echo "test" | cat

# Multiple stages
$ cat file.txt | grep pattern | wc -l

# With built-ins and external commands
$ echo "data" | cat | grep "da"
```

## Tab Completion

- Type partial command and press `TAB`
- Single match → auto-completes with space
- No match → bell sound
- Multiple matches → press `TAB` twice to see all options

## Common Workflows

### File Management

```bash
$ pwd
$ cd /path/to/directory
$ echo "content" > newfile.txt
$ cat newfile.txt
```

### Command History

```bash
# View history
$ history

# Save for next session
$ history -w ~/.shell_history

# Load in next session
$ history -r ~/.shell_history

# Or use HISTFILE (automatic)
$ HISTFILE=~/.shell_history node app/main.js
```

### Working with External Programs

```bash
# Check if command exists
$ type ls
ls is /usr/bin/ls

# Run with arguments
$ ls -la /tmp

# Redirect output
$ ls > files.txt

# Use in pipeline
$ ls | grep test
```

## Keyboard Shortcuts

- `TAB` - Autocomplete command
- `TAB TAB` - Show all matches
- `Ctrl+C` - Interrupt current operation
- `Arrow Up/Down` - Navigate command history (readline feature)

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `PATH` | Command search paths | `/usr/bin:/bin` |
| `HOME` | Home directory | `/home/user` |
| `HISTFILE` | History file location | `~/.shell_history` |

## Exit Codes

```bash
# Exit successfully
$ exit

# Exit with code (usually 0 for success)
$ exit 0
```

## Tips & Tricks

### 1. Use `~` for Home Directory
```bash
$ cd ~
$ cd ~/Documents
```

### 2. Chain Commands with Pipelines
```bash
$ cat file.txt | grep error | wc -l
```

### 3. Combine Redirection
```bash
$ command > output.txt 2> error.txt
```

### 4. Preserve Spaces in Quotes
```bash
$ echo "multiple    spaces    preserved"
```

### 5. Check Command Type First
```bash
$ type unknown_command
unknown_command: not found
```

## Testing Commands

```bash
# Test echo
$ echo "Hello Shell"

# Test cd and pwd
$ pwd
$ cd /tmp
$ pwd
$ cd ~
$ pwd

# Test type
$ type echo
$ type cd
$ type ls

# Test redirection
$ echo "test" > test.txt
$ cat test.txt

# Test pipeline
$ echo "data" | cat

# Test history
$ history
$ history 5
```

## Troubleshooting

### Command Not Found on Windows?
→ Use **Git Bash** instead of PowerShell/CMD
→ See [WINDOWS_TESTING.md](WINDOWS_TESTING.md)

### Tab Completion Not Working?
→ Ensure you're in a readline-compatible terminal
→ Try in Git Bash or standard terminal

### History Not Saving?
→ Check if HISTFILE is set: `echo $HISTFILE`
→ Ensure directory exists and is writable

### Can't Write File?
→ Check directory exists
→ Check write permissions
→ Use full path or current directory

## For More Information

- **Full Guide**: [TESTING.md](TESTING.md)
- **Windows Guide**: [WINDOWS_TESTING.md](WINDOWS_TESTING.md)
- **Development Log**: [PROGRESS.md](PROGRESS.md)
- **Code Quality**: [REFACTORING.md](REFACTORING.md)

---

**Quick help inside shell:**
```bash
$ type echo      # Check if command exists
$ history        # See what you've done
$ pwd            # Know where you are
$ exit           # Leave gracefully
```

