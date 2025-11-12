#!/bin/bash

# Script to complete deployment setup after package publish
# This script will:
# 1. Find treasury cap IDs
# 2. Mint tokens
# 3. Create Pool and Registry
# 4. Whitelist tokens

set -e

PACKAGE_ID="0xf2905beb640d56f936087f49a125b349db36c428608690133ad7c78024d19fcb"
DEPLOYER="0x32113604f66eaa7cace8b35b65d6ccaf6a7ee65be0345a3d1e33653fd113b274"
RECIPIENT="0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2"

echo "🔍 Finding Treasury Cap IDs..."
echo "Package ID: $PACKAGE_ID"
echo "Deployer: $DEPLOYER"
echo ""

# Get treasury cap IDs
echo "Querying objects for treasury caps..."
iota client objects $DEPLOYER > /tmp/objects.txt 2>&1 || true

# Extract treasury cap IDs (this is a manual step - user needs to provide them)
echo ""
echo "⚠️  Please extract treasury cap IDs from the objects list above"
echo "Look for lines containing: TreasuryCap<...::usdc::USDC>, etc."
echo ""
echo "Then run:"
echo "  ./scripts/mint-tokens.sh $PACKAGE_ID <USDC_TREASURY> <CHFX_TREASURY> <TRYB_TREASURY> <SEKX_TREASURY>"
echo ""
echo "Or manually mint tokens:"
echo "  iota client call --package $PACKAGE_ID --module usdc --function mint --args <TREASURY_USDC> $RECIPIENT 10000000000 --gas-budget 10000000"

