#!/bin/sh
# Test script for shell script execution

# Test 1: Simple echo commands
echo "Test 1: Simple commands"
echo "Hello from script"

# Test 2: Semicolon-separated commands
echo "Test 2: Semicolon-separated commands"; echo "Second command"; echo "Third command"

# Test 3: Variable assignment and usage
TEST_VAR="Hello World"
echo "Test 3: Variable TEST_VAR = $TEST_VAR"

# Test 4: Exit codes
echo "Test 4: Exit codes"
echo "Success command"
echo "Exit code: $?"

# Test 5: pwd and cd
echo "Test 5: pwd"
pwd

# Test 6: type command
echo "Test 6: type"
type echo

# Test 7: Multiple commands on multiple lines
echo "Line 1"
echo "Line 2"
echo "Line 3"

# Test 8: Comments are ignored
# This is a comment
echo "Comments work"

echo "Script completed successfully!"

