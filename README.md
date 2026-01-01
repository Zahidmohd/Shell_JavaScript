# 🐚 Custom Shell - Feature-Complete POSIX Shell in JavaScript

[![progress-banner](https://backend.codecrafters.io/progress/shell/21789c76-5d31-49d3-9641-601471432949)](https://app.codecrafters.io/users/codecrafters-bot?r=2qF)

A fully-featured, POSIX-compliant shell built from scratch in JavaScript. This implementation includes all standard shell features plus advanced capabilities like brace expansion, job control, aliases, and more.

## 🌟 Features

### Core Features
- ✅ **Builtin Commands**: `echo`, `exit`, `type`, `pwd`, `cd`, `history`, `source`, `jobs`, `fg`, `bg`, `alias`, `unalias`
- ✅ **External Commands**: Execute any program in PATH
- ✅ **Quote Handling**: Single quotes, double quotes, and backslash escaping
- ✅ **I/O Redirection**: `>`, `>>`, `2>`, `2>>`, `<`
- ✅ **Pipelines**: Multi-command pipelines with `|`

### Advanced Features
- ✅ **Tab Autocompletion**: Builtins, executables, and file paths with LCP logic
- ✅ **Command History**: Full history with file persistence and navigation
- ✅ **Variable Interpolation**: `$VAR`, `${VAR}`, and `$?` for exit codes
- ✅ **Aliases**: Create command shortcuts with `alias` and `unalias`
- ✅ **Brace Expansion**: `{a,b,c}`, `{1..10}`, `{a..z}` patterns
- ✅ **Job Control**: Background jobs with `&`, `jobs`, `fg`, `bg`
- ✅ **Script Execution**: Semicolon-separated commands and script files
- ✅ **Profile Loading**: Auto-load `~/.shellrc` or `~/.profile` on startup
- ✅ **Cross-Platform**: Works on Windows, macOS, and Linux

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed

### Installation
```bash
git clone <repository-url>
cd codecrafters-shell-javascript
```

### Run the Shell
```bash
# Interactive mode
node app/main.js

# Execute a script
node app/main.js script.sh

# Or use the wrapper script
./your_program.sh
```

## 📖 Documentation

- **[FEATURE_TESTING_CHECKLIST.md](FEATURE_TESTING_CHECKLIST.md)** - Comprehensive testing checklist (150+ tests)
- **[test_aliases.txt](test_aliases.txt)** - Alias feature examples
- **[test_braces.txt](test_braces.txt)** - Brace expansion examples

## 🎯 Usage Examples

### Basic Commands
```bash
$ echo "Hello World"
Hello World

$ pwd
/current/directory

$ cd /tmp
$ type echo
echo is a shell builtin
```

### I/O Redirection
```bash
$ echo "data" > output.txt
$ cat output.txt
data

$ ls nonexistent 2> error.log
$ cat < input.txt
```

### Pipelines
```bash
$ ls | grep txt
$ cat file.txt | grep "pattern" | wc -l
```

### Variables
```bash
$ MY_VAR=hello
$ echo $MY_VAR
hello

$ echo ${MY_VAR}_world
hello_world

$ false; echo $?
1
```

### Aliases
```bash
$ alias ll='ls -la'
$ alias p='pwd'
$ ll
# Shows detailed listing

$ type ll
ll is aliased to 'ls -la'

$ unalias ll
```

### Brace Expansion
```bash
$ echo {a,b,c}
a b c

$ echo {1..5}
1 2 3 4 5

$ echo file{1,2,3}.txt
file1.txt file2.txt file3.txt

$ echo {a..z}
a b c d e f g h i j k l m n o p q r s t u v w x y z

$ echo backup_{2024..2026}_{01..12}.tar.gz
# Generates 36 filenames
```

### Job Control
```bash
$ sleep 30 &
[1] 12345

$ jobs
[1]  Running    sleep 30 &

$ fg 1
# Brings job to foreground
```

### Script Execution
```bash
# Multiple commands
$ echo "First"; echo "Second"; echo "Third"
First
Second
Third

# From file
$ node app/main.js script.sh
```

### History
```bash
$ history
    1  echo "test"
    2  pwd
    3  ls

$ history -w myhistory.txt
$ history -r myhistory.txt
```

### Autocompletion
```bash
$ ech<TAB>
$ echo          # Autocompletes

$ cd ~/Doc<TAB>
$ cd ~/Documents/   # Path completion
```

## 🧪 Testing

### Quick Test
```bash
# Run through the test examples
cat test_braces.txt     # View brace expansion tests
cat test_aliases.txt    # View alias tests

# Run example scripts
node app/main.js test_brace_script.sh
node app/main.js test_alias_script.sh
```

### Full Testing
See [FEATURE_TESTING_CHECKLIST.md](FEATURE_TESTING_CHECKLIST.md) for comprehensive testing guide with 150+ test cases.

## 🏗️ Architecture

### Main Components
- **Parser** (`parseCommand`): Handles quotes, escapes, variables, and redirection
- **Brace Expander** (`expandBraces`): Implements `{a,b,c}` and `{1..10}` patterns
- **Alias System** (`expandAliases`): Recursive alias expansion with loop prevention
- **Job Controller**: Background process management
- **Autocompleter**: TAB completion with LCP logic
- **History Manager**: Command history with file persistence
- **REPL**: Main read-eval-print loop

### Key Features
- **Robust Parsing**: Handles complex quoting, escaping, and nesting
- **Cross-Platform**: Platform-specific logic for Windows vs Unix
- **Error Handling**: Graceful error messages and recovery
- **State Management**: Global state for history, jobs, aliases, and exit codes

## 🔧 Configuration

### Profile Files
Create `~/.shellrc` or `~/.profile` for automatic configuration:

```bash
# ~/.shellrc
alias ll='ls -la'
alias ..='cd ..'
export EDITOR=vim
export PATH=$PATH:~/bin

echo "Shell initialized!"
```

### History File
- Default location: `~/.shell_history`
- Set custom location: `export HISTFILE=~/my_history.txt`

## 🐛 Troubleshooting

### Commands Not Found (Windows)
Ensure you're using Git Bash or have proper PATH configuration. The shell supports `.exe`, `.cmd`, `.bat`, and `.com` extensions on Windows.

### Autocompletion Not Working
- Verify executables have proper permissions
- Check PATH environment variable
- Try typing full command name first

### History Not Persisting
- Check `HISTFILE` environment variable
- Ensure home directory is writable
- Use `history -w` to manually save

## 📝 Development

### Project Structure
```
codecrafters-shell-javascript/
├── app/
│   └── main.js                 # Main shell implementation (1800+ lines)
├── FEATURE_TESTING_CHECKLIST.md# Testing checklist
├── test_aliases.txt            # Alias examples
├── test_braces.txt             # Brace expansion examples
├── test_alias_script.sh        # Alias test script
├── test_brace_script.sh        # Brace expansion test script
└── README.md                   # This file
```

### Contributing
This is a learning project from [CodeCrafters](https://codecrafters.io). Feel free to fork and extend!

## 📄 License

MIT License - See the challenge terms at [codecrafters.io](https://codecrafters.io)

## 🙏 Acknowledgments

Built as part of the ["Build Your Own Shell" Challenge](https://app.codecrafters.io/courses/shell/overview) from CodeCrafters.

---

**Ready to try it?** Run `node app/main.js` and start exploring! 🚀
