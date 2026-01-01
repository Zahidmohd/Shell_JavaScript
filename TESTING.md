# Local Testing Guide

## Important Note for Windows Users

**⚠️ Windows users: Commands like `cat`, `ls`, `grep` don't exist on Windows by default!**

**SOLUTION**: Use **Git Bash** (you already have it since you cloned the repo!)
- Open Git Bash from Start menu
- Navigate to your project directory
- Run `node app/main.js`
- All Unix commands will work! ✅

**See [WINDOWS_TESTING.md](WINDOWS_TESTING.md) for detailed Windows instructions and alternatives.**

Quick notes for Windows:
- `/tmp` directory doesn't exist → use current directory instead
- `cat` doesn't exist → use Git Bash or verify files in PowerShell after exiting
- `ls` doesn't exist → use Git Bash or `dir` command (but `dir` output differs)
- Your shell's **built-in commands** (echo, pwd, cd, type, history) work everywhere ✅

## Quick Start

### 1. Basic Shell Launch

```bash
# Navigate to the project directory
cd codecrafters-shell-javascript

# Run the shell
node app/main.js
```

You should see the prompt:
```
$ 
```

### 2. Exit the Shell

```bash
$ exit
```

## Testing Features

### Basic Commands

#### Test Echo
```bash
$ echo hello world
hello world
$ echo 'hello    world'
hello    world
$ echo "test"
test
```

#### Test PWD
```bash
$ pwd
/your/current/directory
```

#### Test Type
```bash
$ type echo
echo is a shell builtin
$ type ls
ls is /usr/bin/ls
$ type nonexistent
nonexistent: not found
```

#### Test CD
```bash
$ pwd
/home/user
$ cd /tmp
$ pwd
/tmp
$ cd ~
$ pwd
/home/user
```

### Quoting and Escaping

#### Single Quotes
```bash
$ echo 'hello    world'
hello    world
$ echo 'it'\''s test'
it's test
```

#### Double Quotes
```bash
$ echo "hello    world"
hello    world
$ echo "test \"quoted\" text"
test "quoted" text
```

#### Backslash Escaping
```bash
$ echo hello\ world
hello world
$ echo test\\test
test\test
$ echo \'test\'
'test'
```

### I/O Redirection

#### Output Redirection

**Unix/Linux/Mac:**
```bash
$ echo "test output" > /tmp/test.txt
$ cat /tmp/test.txt
test output

$ echo "line 1" > /tmp/test.txt
$ echo "line 2" >> /tmp/test.txt
$ cat /tmp/test.txt
line 1
line 2
```

**Windows:**
```bash
$ echo "test output" > test.txt
$ type test.txt
test output

$ echo "line 1" > test.txt
$ echo "line 2" >> test.txt
$ type test.txt
line 1
line 2

# Clean up
$ del test.txt
```

#### Error Redirection

**Unix/Linux/Mac:**
```bash
$ ls nonexistent 2> /tmp/error.txt
$ cat /tmp/error.txt
ls: nonexistent: No such file or directory
```

**Windows:**
```bash
$ dir nonexistent 2> error.txt
$ type error.txt
# (error message from dir command)
```

### Pipelines

```bash
$ echo hello | cat
hello

$ ls /tmp | grep test
test.txt

$ echo "line1\nline2\nline3" | cat | cat
line1
line2
line3
```

### Command History

#### Basic History
```bash
$ echo command1
command1
$ echo command2
command2
$ history
    1  echo command1
    2  echo command2
    3  history
```

#### Limited History
```bash
$ history 2
    2  echo command2
    3  history
```

#### History Write
```bash
$ echo test1
test1
$ echo test2
test2
$ history -w /tmp/history.txt
$ cat /tmp/history.txt
echo test1
echo test2
history -w /tmp/history.txt
cat /tmp/history.txt

```

#### History Append
```bash
$ echo new_command
new_command
$ history -a /tmp/history.txt
$ cat /tmp/history.txt
echo test1
echo test2
history -w /tmp/history.txt
cat /tmp/history.txt
echo new_command
history -a /tmp/history.txt
cat /tmp/history.txt

```

#### History Read
```bash
$ history -r /tmp/history.txt
$ history
    1  echo test1
    2  echo test2
    ...
```

### HISTFILE Environment Variable

#### Test HISTFILE Loading
```bash
# First, create a history file
$ echo "echo from_history" > /tmp/my_history.txt
$ echo "pwd" >> /tmp/my_history.txt

# Start shell with HISTFILE
$ HISTFILE=/tmp/my_history.txt node app/main.js
$ history
    1  echo from_history
    2  pwd
$ exit
```

#### Test HISTFILE Saving on Exit
```bash
$ HISTFILE=/tmp/my_history.txt node app/main.js
$ echo new command
new command
$ exit

# Check the file was updated
$ cat /tmp/my_history.txt
echo from_history
pwd
echo new command
exit

```

### Tab Autocompletion

#### Single Match
```bash
$ ech<TAB>
$ echo 
```

#### No Match (Bell Rings)
```bash
$ xyz<TAB>
$ xyz  # (bell sound, no change)
```

#### Multiple Matches
```bash
$ ec<TAB>  # (bell sound)
$ ec<TAB>  # (shows all matches)
echo  exit
$ ec
```

## Advanced Testing

### Test External Programs

```bash
$ ls
app  PROGRESS.md  README.md  ...

$ cat README.md
[content of README.md]

$ which node
/usr/bin/node
```

### Test with Arguments

```bash
$ ls -la /tmp
[detailed listing]

$ echo arg1 arg2 arg3
arg1 arg2 arg3
```

### Test Error Handling

```bash
$ nonexistent_command
nonexistent_command: command not found

$ cd /nonexistent/directory
cd: /nonexistent/directory: No such file or directory
```

## Testing Script

Create a test script to automate testing:

```bash
# test.sh
#!/bin/bash

echo "=== Testing Basic Commands ==="
echo "echo hello" | node app/main.js
echo "pwd" | node app/main.js
echo "type echo" | node app/main.js

echo "=== Testing Redirection ==="
echo 'echo test > /tmp/shell_test.txt' | node app/main.js
cat /tmp/shell_test.txt
rm /tmp/shell_test.txt

echo "=== Testing History ==="
HISTFILE=/tmp/test_history.txt node app/main.js << EOF
echo command1
echo command2
exit
EOF
cat /tmp/test_history.txt
rm /tmp/test_history.txt

echo "All tests completed!"
```

Run it:
```bash
chmod +x test.sh
./test.sh
```

## Interactive Testing Session

Here's a complete interactive testing session:

```bash
# Start the shell
$ node app/main.js

# Test basic commands
$ echo "Hello Shell!"
Hello Shell!

$ pwd
/home/user/projects/shell

$ type pwd
pwd is a shell builtin

$ type ls
ls is /usr/bin/ls

# Test quoting
$ echo 'single   quotes'
single   quotes

$ echo "double   quotes"
double   quotes

$ echo escaped\ space
escaped space

# Test cd
$ cd /tmp
$ pwd
/tmp

$ cd ~
$ pwd
/home/user

# Test redirection
$ echo "file content" > /tmp/test.txt
$ cat /tmp/test.txt
file content

$ echo "appended" >> /tmp/test.txt
$ cat /tmp/test.txt
file content
appended

# Test pipelines
$ echo "test" | cat
test

$ ls | grep shell
# (filtered output)

# Test history
$ history
    1  echo "Hello Shell!"
    2  pwd
    ...

$ history 3
   (last 3 commands)

# Test history file operations
$ history -w /tmp/my_history.txt
$ cat /tmp/my_history.txt
# (shows all commands)

$ echo "new command"
new command

$ history -a /tmp/my_history.txt
# (appends only new command)

# Exit
$ exit
```

## Troubleshooting

### Shell doesn't start
```bash
# Check Node.js is installed
node --version

# Check the file exists
ls -l app/main.js

# Check for syntax errors
node -c app/main.js
```

### Commands not working
```bash
# Check PATH
$ echo $PATH

# Test specific executables
$ which ls
$ which cat
```

### History not saving
```bash
# Check HISTFILE is set
$ echo $HISTFILE

# Check file permissions
$ ls -l $HISTFILE

# Check directory exists
$ ls -ld $(dirname $HISTFILE)
```

### Tab completion not working
```bash
# Make sure you're using a terminal that supports readline
# Try in different terminals: bash, zsh, etc.
```

## Performance Testing

Test with large files:
```bash
# Create a large file
$ seq 1 10000 > /tmp/large.txt

# Test with redirection
$ cat /tmp/large.txt > /tmp/copy.txt

# Test with pipelines
$ cat /tmp/large.txt | grep 5000
```

Test history with many commands:
```bash
# Generate many commands
$ for i in {1..1000}; do echo "echo command$i"; done | node app/main.js
$ history | tail -n 20
```

## Comparison with Bash

Test the same commands in both shells to compare:

```bash
# In bash
$ echo "test" | cat
test

# In your shell
$ echo "test" | cat
test

# They should produce identical output!
```

## Tips

1. **Use `Ctrl+C`** to interrupt long-running commands
2. **Use `Ctrl+D`** on empty line to send EOF (though your shell might not handle this)
3. **Use arrow keys** for readline history navigation
4. **Use `Tab`** for autocompletion
5. **Test edge cases**: empty strings, special characters, very long commands
6. **Compare with bash**: Run same command in bash to verify expected behavior

## Automated Test Runner

For comprehensive testing, you can use the CodeCrafters test runner:

```bash
# Run all tests
./your_program.sh

# Or if you have the test harness
codecrafters test
```

Happy testing! 🚀

