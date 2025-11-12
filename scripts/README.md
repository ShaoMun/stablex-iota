# Token Minting Script

Script to mint and transfer tokens to a specific address after package deployment.

## Recipient Address

All tokens will be minted and transferred to:
```
0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2
```

## Prerequisites

After deploying the package, you need to:

1. **Get the Package ID** from the deployment transaction
2. **Find Treasury Cap Object IDs** for each currency:
   - USDC TreasuryCap
   - CHFX TreasuryCap
   - TRYB TreasuryCap
   - SEKX TreasuryCap
   - ~~SBX TreasuryCap~~ (Not needed - SBX is minted during staking)

### Finding Treasury Cap IDs

After deployment, the treasury caps are owned by the deployer address. Find them using:

```bash
# Get your deployer address
iota client active-address

# List all owned objects
iota client objects <deployer-address>

# Or query by type (if supported)
iota client objects <deployer-address> --json | grep -i treasury
```

The treasury caps will have types like:
- `TreasuryCap<USDC>`
- `TreasuryCap<CHFX>`
- `TreasuryCap<TRYB>`
- `TreasuryCap<SEKX>`
- ~~`TreasuryCap<SBX>`~~ (Not needed - SBX is minted during staking)

## Method 1: Using IOTA CLI (Recommended)

The simplest way is to use the IOTA CLI directly:

```bash
# Mint USDC (1 token = 1,000,000 micro-units)
iota client call \
  --package <PACKAGE_ID> \
  --module usdc \
  --function mint \
  --args <TREASURY_USDC_ID> 0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2 1000000 \
  --gas-budget 10000000

# Mint CHFX
iota client call \
  --package <PACKAGE_ID> \
  --module chfx \
  --function mint \
  --args <TREASURY_CHFX_ID> 0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2 1000000 \
  --gas-budget 10000000

# Mint TRYB
iota client call \
  --package <PACKAGE_ID> \
  --module tryb \
  --function mint \
  --args <TREASURY_TRYB_ID> 0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2 1000000 \
  --gas-budget 10000000

# Mint SEKX
iota client call \
  --package <PACKAGE_ID> \
  --module sekx \
  --function mint \
  --args <TREASURY_SEKX_ID> 0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2 1000000 \
  --gas-budget 10000000

# Note: SBX is excluded - it's minted during staking operations
```

## Method 2: Using Bash Script (Recommended)

```bash
# Make script executable
chmod +x scripts/mint-tokens.sh

# Run with treasury cap IDs (SBX excluded - it's minted during staking)
./scripts/mint-tokens.sh \
  <PACKAGE_ID> \
  <TREASURY_USDC_ID> \
  <TREASURY_CHFX_ID> \
  <TREASURY_TRYB_ID> \
  <TREASURY_SEKX_ID>

# Or with custom amounts (in micro-units)
USDC_AMOUNT=10000000000 \
CHFX_AMOUNT=10000000000 \
TRYB_AMOUNT=10000000000 \
SEKX_AMOUNT=10000000000 \
./scripts/mint-tokens.sh \
  <PACKAGE_ID> \
  <TREASURY_USDC_ID> \
  <TREASURY_CHFX_ID> \
  <TREASURY_TRYB_ID> \
  <TREASURY_SEKX_ID>
```

**Note:** SBX treasury is not needed as SBX tokens are minted during staking operations.

## Default Amounts

Default amounts are set to **10,000 tokens** of each currency (10,000,000,000 micro-units):
- USDC: 10,000,000,000 (10,000 USDC)
- CHFX: 10,000,000,000 (10,000 CHFX)
- TRYB: 10,000,000,000 (10,000 TRYB)
- SEKX: 10,000,000,000 (10,000 SEKX)
- SBX: Excluded (minted during staking)

## Verifying Minted Tokens

After minting, verify the tokens were transferred:

```bash
# Check recipient's objects
iota client objects 0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2

# Or check specific coin type
iota client objects 0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2 \
  --json | grep -i "<PACKAGE_ID>::usdc::USDC"
```

## Troubleshooting

### "Object not found" error
- Make sure the treasury cap IDs are correct
- Verify the treasury caps are owned by the signer address
- Check that the package ID is correct

### "Insufficient gas" error
- Increase the `--gas-budget` parameter
- Default is 10,000,000, try 20,000,000 or higher

### "Module not found" error
- Verify the package ID is correct
- Check that the package was deployed successfully
- Ensure you're using the correct network (testnet/mainnet)

