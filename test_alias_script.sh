#!/bin/sh
# Test script for alias functionality in scripts

echo "=== Testing Aliases in Scripts ==="
echo ""

# Test 1: Create aliases
echo "Test 1: Creating aliases"
alias ll='ls -la'
alias p='pwd'
alias e='echo'
alias greet='echo Hello'
echo "Aliases created"
echo ""

# Test 2: List aliases
echo "Test 2: Listing aliases"
alias
echo ""

# Test 3: Use aliases
echo "Test 3: Using aliases"
e "This is from alias 'e'"
greet World
p
echo ""

# Test 4: Check types
echo "Test 4: Checking types"
type ll
type p
type echo
echo ""

# Test 5: Remove alias
echo "Test 5: Removing alias"
unalias ll
echo "Alias 'll' removed"
alias
echo ""

# Test 6: Clean up
echo "Test 6: Cleaning up"
unalias p e greet
echo "All aliases removed"
alias
echo ""

echo "=== Alias tests completed ==="

