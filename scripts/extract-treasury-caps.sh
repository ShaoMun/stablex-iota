#!/bin/bash

# Extract treasury cap IDs from deployment output
# This script parses the deployment transaction output to find all treasury caps

DEPLOY_OUTPUT="/tmp/deploy_output.txt"
PACKAGE_ID="0xf2905beb640d56f936087f49a125b349db36c428608690133ad7c78024d19fcb"

echo "🔍 Extracting Treasury Cap IDs from deployment output..."
echo "Package ID: $PACKAGE_ID"
echo ""

# Extract treasury caps with their currency types
echo "Treasury Caps found:"
echo "===================="

# Method 1: Extract from ObjectType lines
grep -A 1 "TreasuryCap.*$PACKAGE_ID" "$DEPLOY_OUTPUT" | while IFS= read -r line; do
    if [[ $line =~ TreasuryCap.*::([a-z]+):: ]]; then
        currency="${BASH_REMATCH[1]}"
        # Get the ObjectID from the previous line
        prev_line=$(grep -B 1 "$line" "$DEPLOY_OUTPUT" | grep "ObjectID" | head -1)
        if [[ $prev_line =~ ObjectID:\ ([0-9a-fx]+) ]]; then
            object_id="${BASH_REMATCH[1]}"
            echo "${currency^^}: $object_id"
        fi
    fi
done

echo ""
echo "Alternative method - searching for all TreasuryCap entries:"
grep "TreasuryCap.*$PACKAGE_ID" "$DEPLOY_OUTPUT" | while IFS= read -r line; do
    if [[ $line =~ ::([a-z]+):: ]]; then
        currency="${BASH_REMATCH[1]}"
        echo "Found: ${currency^^}"
    fi
done

