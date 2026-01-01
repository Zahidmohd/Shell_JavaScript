# Testing Your Shell on Windows

## The Problem

Your shell works perfectly! But on Windows, Unix commands like `cat`, `ls`, `grep` **don't exist** by default. That's why you see "command not found" errors.

## Solutions

### Option 1: Use Git Bash (RECOMMENDED ✅)

Since you already have Git installed (you cloned the repo), you have Git Bash which includes all Unix commands!

**How to use:**

1. **Open Git Bash** (search for "Git Bash" in Start menu)
2. Navigate to your project:
   ```bash
   cd /d/zahid-window-data/desktop/Project/Shell/codecrafters-shell-javascript
   ```
3. Run your shell:
   ```bash
   node app/main.js
   ```
4. Now all Unix commands work:
   ```bash
   $ ls
   app  PROGRESS.md  README.md  ...
   
   $ echo "test" > test.txt
   $ cat test.txt
   test
   
   $ ls | grep app
   app
   
   $ exit
   ```

**Run automated tests:**
```bash
bash test_shell.sh
```

---

### Option 2: Use Windows Commands in Your Shell

Your shell CAN execute Windows commands! You just need to know the Windows equivalents:

| Unix Command | Windows Equivalent | Example |
|--------------|-------------------|---------|
| `ls` | `dir` | `dir` |
| `cat file.txt` | `type file.txt` (external) | Won't work - "type" is shell builtin |
| `pwd` | `pwd` (builtin) | Works! ✅ |
| `echo` | `echo` (builtin) | Works! ✅ |
| `cd` | `cd` (builtin) | Works! ✅ |

**Testing in your shell with Windows commands:**

```bash
# Open PowerShell, then:
cd D:\zahid-window-data\desktop\Project\Shell\codecrafters-shell-javascript
node app/main.js

# In your shell:
$ echo hello world
hello world

$ pwd
D:\zahid-window-data\desktop\Project\Shell\codecrafters-shell-javascript

$ echo "test content" > test.txt
$ dir test.txt
 Volume in drive D is Data
 Directory of D:\zahid-window-data\desktop\Project\Shell\codecrafters-shell-javascript
test.txt

$ exit

# Then in PowerShell, verify the file:
type test.txt
```

**Run automated tests (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File test_shell.ps1
```

---

### Option 3: Install WSL (Windows Subsystem for Linux)

This gives you a full Linux environment on Windows.

1. Open PowerShell as Administrator
2. Run: `wsl --install`
3. Restart your computer
4. Open Ubuntu (from Start menu)
5. Navigate and test:
   ```bash
   cd /mnt/d/zahid-window-data/desktop/Project/Shell/codecrafters-shell-javascript
   node app/main.js
   ```

---

## Quick Test - Works on Windows RIGHT NOW

These commands work in your shell on Windows **right now**:

```bash
# Start your shell
node app/main.js

# Test builtins (these all work!)
$ echo hello world
hello world

$ pwd
D:\zahid-window-data\desktop\Project\Shell\codecrafters-shell-javascript

$ cd ..
$ pwd
D:\zahid-window-data\desktop\Project\Shell

$ cd codecrafters-shell-javascript
$ pwd
D:\zahid-window-data\desktop\Project\Shell\codecrafters-shell-javascript

$ type echo
echo is a shell builtin

$ type pwd
pwd is a shell builtin

$ cd ~
$ pwd
C:\Users\Zahid

# Test file redirection (this works!)
$ echo "my test content" > myfile.txt
$ echo "more content" >> myfile.txt

# Test history
$ history
    1  echo hello world
    2  pwd
    3  cd ..
    ...

$ exit
```

Then verify the file in PowerShell:
```powershell
type myfile.txt
```

---

## Understanding the Error

When you see:
```
$ cat test.txt
cat: command not found
```

This means:
1. ✅ Your shell is working correctly
2. ❌ `cat` command doesn't exist on Windows
3. ✅ Solution: Use Git Bash, or verify files outside your shell

---

## Automated Testing

### Git Bash (All Unix commands available):
```bash
bash test_shell.sh
```

### PowerShell (Windows native):
```powershell
powershell -ExecutionPolicy Bypass -File test_shell.ps1
```

---

## What Your Shell CAN Do (Without External Commands)

Your shell has these **built-in commands** that work everywhere:

1. ✅ `echo` - Print text
2. ✅ `exit` - Exit shell
3. ✅ `type` - Check command type
4. ✅ `pwd` - Show current directory
5. ✅ `cd` - Change directory
6. ✅ `history` - Show command history
7. ✅ File redirection (`>`, `>>`, `2>`, `2>>`)
8. ✅ Pipelines (`|`)
9. ✅ Quoting and escaping
10. ✅ Tab autocompletion

Plus it can run any executable found in your PATH!

---

## Best Practice for Testing

**For development and testing**: Use **Git Bash**
- All Unix commands work
- Tests match the Linux environment where your shell will be graded
- Same experience as Mac/Linux users

**For quick checks**: Use your shell's **built-in commands**
- Echo, pwd, cd, type, history all work perfectly
- File redirection works
- Verify created files in PowerShell after exiting

---

## Example Testing Session in Git Bash

```bash
# Open Git Bash
$ cd /d/zahid-window-data/desktop/Project/Shell/codecrafters-shell-javascript

# Start your shell
$ node app/main.js

# Now everything works!
$ echo "test" > test.txt
$ cat test.txt
test

$ ls *.txt
test.txt

$ echo "line 2" >> test.txt
$ cat test.txt
test
line 2

$ ls | grep test
test.txt

$ history
    1  echo "test" > test.txt
    2  cat test.txt
    ...

$ exit

# Back in Git Bash
$ echo "All tests passed!"
```

---

## Summary

- ✅ **Your shell works perfectly!**
- ❌ Windows doesn't have Unix commands like `cat`, `ls`
- ✅ **Solution**: Use Git Bash (you already have it!)
- ✅ **Alternative**: Test built-ins, verify files in PowerShell
- ✅ **Your shell can execute any Windows program** found in PATH

**Recommended**: Always use Git Bash for testing! 🚀

