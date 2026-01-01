#!/bin/sh
# Test script for brace expansion functionality

echo "=== Testing Brace Expansion ==="
echo ""

# Test 1: Basic comma-separated list
echo "Test 1: Basic comma list"
echo {a,b,c}
echo ""

# Test 2: With prefix and suffix
echo "Test 2: Prefix and suffix"
echo file{1,2,3}.txt
echo ""

# Test 3: Numeric sequence
echo "Test 3: Numeric sequence"
echo Numbers: {1..10}
echo ""

# Test 4: Reverse numeric sequence
echo "Test 4: Reverse sequence"
echo Countdown: {10..1}
echo ""

# Test 5: Character sequence
echo "Test 5: Character sequence"
echo Letters: {a..z}
echo ""

# Test 6: Uppercase sequence
echo "Test 6: Uppercase sequence"
echo Letters: {A..Z}
echo ""

# Test 7: Leading zeros
echo "Test 7: Leading zeros"
echo Files: file{01..05}.txt
echo ""

# Test 8: Multiple expansions
echo "Test 8: Multiple expansions"
echo {x,y}{1,2}
echo ""

# Test 9: Complex pattern
echo "Test 9: Complex pattern"
echo server_{web,db,cache}_{prod,dev}.conf
echo ""

# Test 10: No expansion in quotes
echo "Test 10: Quoted (no expansion)"
echo '{a,b,c}'
echo ""

# Test 11: Real-world example
echo "Test 11: Backup files"
echo backup_{2024..2026}_{01..12}.tar.gz
echo ""

# Test 12: Combined with echo
echo "Test 12: Message with expansion"
echo "Creating files:" file{A,B,C}.txt
echo ""

echo "=== Brace expansion tests completed ==="

