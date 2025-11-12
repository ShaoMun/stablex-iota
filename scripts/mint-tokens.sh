#!/bin/bash

# Script to mint and transfer tokens after package deployment
# 
# Usage:
#   ./scripts/mint-tokens.sh <package-id> <treasury-cap-usdc> <treasury-cap-chfx> <treasury-cap-tryb> <treasury-cap-sekx> <treasury-cap-sbx>
#
# Example:
#   ./scripts/mint-tokens.sh 0x123... 0xabc... 0xdef... 0xghi... 0xjkl... 0xmno...

set -e

RECIPIENT="0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2"

# Default amounts in micro-units (6 decimals)
# 1,000,000 = 1 token
# 10,000 tokens = 10,000,000,000 micro-units
USDC_AMOUNT=${USDC_AMOUNT:-10000000000}  # 10,000 USDC
CHFX_AMOUNT=${CHFX_AMOUNT:-10000000000}  # 10,000 CHFX
TRYB_AMOUNT=${TRYB_AMOUNT:-10000000000}  # 10,000 TRYB
SEKX_AMOUNT=${SEKX_AMOUNT:-10000000000}  # 10,000 SEKX
# SBX is excluded - it's minted during staking
SBX_AMOUNT=${SBX_AMOUNT:-0}  # 0 SBX (excluded)

if [ $# -lt 5 ]; then
    echo "Usage: $0 <package-id> <treasury-usdc> <treasury-chfx> <treasury-tryb> <treasury-sekx>"
    echo "Note: SBX treasury is not needed (SBX is minted during staking)"
    echo ""
    echo "Environment variables (optional):"
    echo "  USDC_AMOUNT - Amount in micro-units (default: 10000000000 = 10,000 USDC)"
    echo "  CHFX_AMOUNT - Amount in micro-units (default: 10000000000 = 10,000 CHFX)"
    echo "  TRYB_AMOUNT - Amount in micro-units (default: 10000000000 = 10,000 TRYB)"
    echo "  SEKX_AMOUNT - Amount in micro-units (default: 10000000000 = 10,000 SEKX)"
    echo "  SBX_AMOUNT  - Amount in micro-units (default: 0, excluded)"
    echo ""
    echo "Example:"
    echo "  $0 0x123... 0xabc... 0xdef... 0xghi... 0xjkl..."
    echo ""
    echo "Or with custom amounts:"
    echo "  USDC_AMOUNT=5000000000 CHFX_AMOUNT=5000000000 $0 0x123... 0xabc... 0xdef... 0xghi... 0xjkl..."
    exit 1
fi

PACKAGE_ID=$1
TREASURY_USDC=$2
TREASURY_CHFX=$3
TREASURY_TRYB=$4
TREASURY_SEKX=$5
# TREASURY_SBX not needed - SBX is minted during staking

echo "🚀 Minting Tokens"
echo "================="
echo "Package ID: $PACKAGE_ID"
echo "Recipient: $RECIPIENT"
echo ""
echo "Amounts:"
echo "  USDC: $((USDC_AMOUNT / 1000000)) tokens ($USDC_AMOUNT micro-units)"
echo "  CHFX: $((CHFX_AMOUNT / 1000000)) tokens ($CHFX_AMOUNT micro-units)"
echo "  TRYB: $((TRYB_AMOUNT / 1000000)) tokens ($TRYB_AMOUNT micro-units)"
echo "  SEKX: $((SEKX_AMOUNT / 1000000)) tokens ($SEKX_AMOUNT micro-units)"
echo "  SBX:  Excluded (minted during staking)"
echo ""

# Mint USDC
if [ "$USDC_AMOUNT" -gt 0 ]; then
    echo "📦 Minting USDC..."
    iota client call \
        --package "$PACKAGE_ID" \
        --module usdc \
        --function mint \
        --args "$TREASURY_USDC" "$RECIPIENT" "$USDC_AMOUNT" \
        --gas-budget 10000000 || echo "⚠️  USDC minting failed"
fi

# Mint CHFX
if [ "$CHFX_AMOUNT" -gt 0 ]; then
    echo "📦 Minting CHFX..."
    iota client call \
        --package "$PACKAGE_ID" \
        --module chfx \
        --function mint \
        --args "$TREASURY_CHFX" "$RECIPIENT" "$CHFX_AMOUNT" \
        --gas-budget 10000000 || echo "⚠️  CHFX minting failed"
fi

# Mint TRYB
if [ "$TRYB_AMOUNT" -gt 0 ]; then
    echo "📦 Minting TRYB..."
    iota client call \
        --package "$PACKAGE_ID" \
        --module tryb \
        --function mint \
        --args "$TREASURY_TRYB" "$RECIPIENT" "$TRYB_AMOUNT" \
        --gas-budget 10000000 || echo "⚠️  TRYB minting failed"
fi

# Mint SEKX
if [ "$SEKX_AMOUNT" -gt 0 ]; then
    echo "📦 Minting SEKX..."
    iota client call \
        --package "$PACKAGE_ID" \
        --module sekx \
        --function mint \
        --args "$TREASURY_SEKX" "$RECIPIENT" "$SEKX_AMOUNT" \
        --gas-budget 10000000 || echo "⚠️  SEKX minting failed"
fi

# Mint SBX (excluded - SBX is minted during staking)
# if [ "$SBX_AMOUNT" -gt 0 ]; then
#     echo "📦 Minting SBX..."
#     iota client call \
#         --package "$PACKAGE_ID" \
#         --module sbx \
#         --function mint \
#         --args "$TREASURY_SBX" "$RECIPIENT" "$SBX_AMOUNT" \
#         --gas-budget 10000000 || echo "⚠️  SBX minting failed"
# fi
echo "ℹ️  SBX excluded - it's minted during staking"

echo ""
echo "✅ Minting complete!"
echo ""
echo "To verify, check the recipient's balance:"
echo "  iota client objects $RECIPIENT"

