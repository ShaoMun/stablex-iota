# StableX Deployment Guide

This guide documents the complete deployment cycle for the StableX pool contract on IOTA testnet. Follow these steps when redeploying the contract.

## Prerequisites

- IOTA CLI installed and configured
- Active wallet with sufficient IOTA for gas fees
- Admin address: `0x32113604f66eaa7cace8b35b65d6ccaf6a7ee65be0345a3d1e33653fd113b274`
- Recipient address for tokens: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

## Step 1: Build the Package

```bash
cd first_package
iota move build
```

This will compile the Move package and show any warnings. The build should complete successfully.

## Step 2: Deploy the Package

```bash
cd first_package
iota client publish --skip-fetch-latest-git-deps 2>&1 | tee /tmp/deploy_output.txt
```

**Important:** Save the output to a file (`/tmp/deploy_output.txt`) as we'll need it to extract treasury cap IDs.

**Note the Package ID** from the output. It will be shown in the "Published Objects" section:
```
PackageID: 0x...
```

## Step 3: Extract Treasury Cap IDs

This is the critical step that often gets stuck. Use the following method to reliably extract treasury cap IDs:

### Method: Search for TreasuryCap in deployment output

```bash
cd /Users/hoshaomun/stablex
for currency in usdc chfx tryb sekx jpyc myrc xsgd sbx; do
  echo "=== $currency ==="
  grep -B 5 "TreasuryCap.*::$currency::" /tmp/deploy_output.txt | grep "ObjectID" | head -1 | sed 's/.*ObjectID: //' | sed 's/ .*//'
done
```

This will output:
```
=== usdc ===
0x03a6fa165f3ce7c799852102b1bef32ef343d357cc552e3e6371de77dc8f09a2
=== chfx ===
0x80a756ae35cb277dc6528ce524cc83eff2da3bdc57116f5537a748c5e5f042ed
=== tryb ===
0x4b7f3eb1e1309102c149e99ec154b22b23e66ca0491842379d5bd096e4972b1b
=== sekx ===
0x31ba61b0c04983e3e6a7cc0c999c16c8bc6cf0b70ece41837b764ec46b1986b2
...
```

**Save these IDs** - you'll need them for minting tokens.

## Step 4: Mint Tokens to Recipient

Mint tokens to the recipient address. Default amounts are 10,000 tokens (10,000,000,000 micro-units) of each currency.

### Set Variables

```bash
PACKAGE_ID="0x..."  # Your new package ID from Step 2
USDC_TREASURY="0x..."  # From Step 3
CHFX_TREASURY="0x..."  # From Step 3
TRYB_TREASURY="0x..."  # From Step 3
SEKX_TREASURY="0x..."  # From Step 3
RECIPIENT="0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2"
```

### Mint Tokens

```bash
# Mint USDC
iota client call --package "$PACKAGE_ID" --module usdc --function mint \
  --args "$USDC_TREASURY" "$RECIPIENT" 10000000000 --gas-budget 10000000

# Mint CHFX
iota client call --package "$PACKAGE_ID" --module chfx --function mint \
  --args "$CHFX_TREASURY" "$RECIPIENT" 10000000000 --gas-budget 10000000

# Mint TRYB
iota client call --package "$PACKAGE_ID" --module tryb --function mint \
  --args "$TRYB_TREASURY" "$RECIPIENT" 10000000000 --gas-budget 10000000

# Mint SEKX
iota client call --package "$PACKAGE_ID" --module sekx --function mint \
  --args "$SEKX_TREASURY" "$RECIPIENT" 10000000000 --gas-budget 10000000
```

**Note:** SBX is not minted here - it's minted automatically during staking operations.

## Step 5: Create Registry

```bash
PACKAGE_ID="0x..."  # Your package ID
iota client call --package "$PACKAGE_ID" --module sbx_pool --function create_registry \
  --gas-budget 10000000
```

**Note the Registry Object ID** from the transaction output. It will be a Shared object.

## Step 6: Mint Initial Coins for Pool

The pool needs initial coins for CHFX, TRYB, and SEKX. Mint small amounts (1 token each) to the deployer:

```bash
PACKAGE_ID="0x..."
CHFX_TREASURY="0x..."
TRYB_TREASURY="0x..."
SEKX_TREASURY="0x..."
DEPLOYER="0x32113604f66eaa7cace8b35b65d6ccaf6a7ee65be0345a3d1e33653fd113b274"

# Mint 1 token (1,000,000 micro-units) of each to deployer
iota client call --package "$PACKAGE_ID" --module chfx --function mint \
  --args "$CHFX_TREASURY" "$DEPLOYER" 1000000 --gas-budget 10000000

iota client call --package "$PACKAGE_ID" --module tryb --function mint \
  --args "$TRYB_TREASURY" "$DEPLOYER" 1000000 --gas-budget 10000000

iota client call --package "$PACKAGE_ID" --module sekx --function mint \
  --args "$SEKX_TREASURY" "$DEPLOYER" 1000000 --gas-budget 10000000
```

**Note the Coin Object IDs** from each transaction - you'll need them for pool creation.

## Step 7: Create Pool

You need:
- SBX Treasury Cap ID (from Step 3)
- CHFX Coin Object ID (from Step 6)
- TRYB Coin Object ID (from Step 6)
- SEKX Coin Object ID (from Step 6)

```bash
PACKAGE_ID="0x..."
SBX_TREASURY="0x..."  # From Step 3
CHFX_COIN="0x..."     # From Step 6
TRYB_COIN="0x..."     # From Step 6
SEKX_COIN="0x..."     # From Step 6

iota client call --package "$PACKAGE_ID" --module sbx_pool --function create_pool \
  --args 30 1000 "$SBX_TREASURY" "$CHFX_COIN" "$TRYB_COIN" "$SEKX_COIN" \
  --gas-budget 10000000
```

Parameters:
- `30`: fee_bps (30 basis points = 0.3%)
- `1000`: min_reserve_bps (1000 basis points = 10%)

**Note the Pool Object ID** from the transaction output. It will be a Shared object.

## Step 8: Whitelist Tokens

Whitelist CHFX, TRYB, and SEKX in the registry:

```bash
PACKAGE_ID="0x..."
REGISTRY="0x..."  # Registry Object ID from Step 5

iota client call --package "$PACKAGE_ID" --module sbx_pool --function admin_set_whitelist \
  --args "$REGISTRY" true true true --gas-budget 10000000
```

Parameters: `true true true` = CHFX whitelisted, TRYB whitelisted, SEKX whitelisted

## Step 9: Update Frontend

Update all frontend files with the new IDs:

### Files to Update:

1. **Package ID** (update in all files):
   - `frontend/components/CurrencyModal.tsx` - `NEW_PACKAGE_ID`
   - `frontend/components/StakedCurrencyModal.tsx` - `POOL_PACKAGE_ID`
   - `frontend/pages/stake.tsx` - `POOL_PACKAGE_ID`
   - `frontend/pages/unstake.tsx` - `POOL_PACKAGE_ID`
   - `frontend/pages/withdraw.tsx` - `POOL_PACKAGE_ID`
   - `frontend/pages/swap.tsx` - `POOL_PACKAGE_ID`
   - `frontend/pages/api/unstake-rate.ts` - `POOL_PACKAGE_ID`
   - `frontend/pages/api/swap-rate.ts` - `POOL_PACKAGE_ID`
   - `frontend/pages/api/pool-apy.ts` - `POOL_PACKAGE_ID`
   - `frontend/pages/api/pool-fees.ts` - `POOL_PACKAGE_ID`

2. **Pool Object ID** (update in all files):
   - `frontend/components/StakedCurrencyModal.tsx` - `POOL_OBJECT_ID`
   - `frontend/pages/stake.tsx` - `POOL_OBJECT_ID`
   - `frontend/pages/unstake.tsx` - `POOL_OBJECT_ID`
   - `frontend/pages/withdraw.tsx` - `POOL_OBJECT_ID`
   - `frontend/pages/swap.tsx` - `POOL_OBJECT_ID`
   - `frontend/pages/api/unstake-rate.ts` - `POOL_OBJECT_ID`
   - `frontend/pages/api/swap-rate.ts` - `POOL_OBJECT_ID`
   - `frontend/pages/api/pool-apy.ts` - `POOL_OBJECT_ID`
   - `frontend/pages/api/pool-fees.ts` - `POOL_OBJECT_ID`

3. **Registry Object ID** (update in all files):
   - `frontend/pages/stake.tsx` - `REGISTRY_OBJECT_ID`
   - `frontend/pages/unstake.tsx` - `REGISTRY_OBJECT_ID`
   - `frontend/pages/withdraw.tsx` - `REGISTRY_OBJECT_ID`
   - `frontend/pages/swap.tsx` - `REGISTRY_OBJECT_ID`
   - `frontend/pages/api/unstake-rate.ts` - `REGISTRY_OBJECT_ID`
   - `frontend/pages/api/swap-rate.ts` - `REGISTRY_OBJECT_ID`
   - `frontend/pages/api/pool-apy.ts` - `REGISTRY_OBJECT_ID`
   - `frontend/pages/api/pool-fees.ts` - `REGISTRY_OBJECT_ID`

### Quick Update Script

You can use `sed` or search-replace in your editor to update all instances:

```bash
# Update Package ID (replace OLD_PACKAGE_ID with NEW_PACKAGE_ID)
OLD_PACKAGE_ID="0x05c4be9ea7e0ab044c923099fa41f94f524fd29339f0b2447373574377b2a20e"
NEW_PACKAGE_ID="0x..."  # Your new package ID

find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s/$OLD_PACKAGE_ID/$NEW_PACKAGE_ID/g" {} +

# Update Pool Object ID
OLD_POOL_ID="0xb727a10b1d354bd1f4b7f19152aee6fbf33bafcf9e741560a34bdaa0365fd189"
NEW_POOL_ID="0x..."  # Your new pool ID

find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s/$OLD_POOL_ID/$NEW_POOL_ID/g" {} +

# Update Registry Object ID
OLD_REGISTRY_ID="0x911ad622c7b733650e06a609ee8bb808d4a6ff184cd15ce731b5033c036e914d"
NEW_REGISTRY_ID="0x..."  # Your new registry ID

find frontend -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' "s/$OLD_REGISTRY_ID/$NEW_REGISTRY_ID/g" {} +
```

## Step 10: Verify Deployment

1. **Verify tokens were minted:**
   ```bash
   iota client objects 0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2
   ```

2. **Verify Pool object:**
   ```bash
   iota client object <POOL_OBJECT_ID>
   ```

3. **Verify Registry object:**
   ```bash
   iota client object <REGISTRY_OBJECT_ID>
   ```

4. **Test frontend:**
   - Start the frontend: `cd frontend && npm run dev`
   - Connect wallet and verify balances show correctly
   - Test staking/unstaking functionality

## Important IDs to Document

After each deployment, document these IDs:

```markdown
## Deployment Date: [DATE]

### Package
- **Package ID:** `0x...`
- **Transaction Digest:** `...`

### Treasury Caps
- **USDC Treasury:** `0x...`
- **CHFX Treasury:** `0x...`
- **TRYB Treasury:** `0x...`
- **SEKX Treasury:** `0x...`
- **SBX Treasury:** `0x...`
- **JPYC Treasury:** `0x...`
- **MYRC Treasury:** `0x...`
- **XSGD Treasury:** `0x...`

### Objects
- **Pool Object ID:** `0x...` (Shared)
- **Registry Object ID:** `0x...` (Shared)

### Transactions
- **Package Deployment:** `...`
- **USDC Mint:** `...`
- **CHFX Mint:** `...`
- **TRYB Mint:** `...`
- **SEKX Mint:** `...`
- **Registry Creation:** `...`
- **Pool Creation:** `...`
- **Whitelist:** `...`
```

## Troubleshooting

### Issue: Can't find Treasury Cap IDs

**Solution:** Use the grep method from Step 3. The key is to search backwards from the TreasuryCap ObjectType line to find the ObjectID.

```bash
grep -B 5 "TreasuryCap.*::usdc::" /tmp/deploy_output.txt | grep "ObjectID"
```

### Issue: Pool creation fails

**Check:**
1. Do you have the coin objects (not just treasury caps)?
2. Are the coin object IDs correct?
3. Is the SBX treasury cap ID correct?

### Issue: Frontend can't find objects

**Check:**
1. Are the Package ID, Pool ID, and Registry ID updated in all frontend files?
2. Are the objects actually created? Verify with `iota client object <ID>`
3. Check browser console for errors

### Issue: Tokens not showing in frontend

**Check:**
1. Is the Package ID correct in `CurrencyModal.tsx`?
2. Are the coin types using the correct package ID?
3. Check wallet connection and network (should be testnet)

## Notes

- **Treasury Caps:** These are owned by the deployer address and should be kept secure. They allow minting new tokens.
- **SBX Treasury:** This is wrapped inside the Pool object, so you won't see it as a separate owned object after pool creation.
- **Shared Objects:** Pool and Registry are created as shared objects, meaning multiple users can interact with them simultaneously.
- **Gas Budget:** If transactions fail with gas errors, increase the `--gas-budget` parameter (e.g., `20000000`).

## Quick Reference Commands

```bash
# Build
cd first_package && iota move build

# Deploy
cd first_package && iota client publish --skip-fetch-latest-git-deps 2>&1 | tee /tmp/deploy_output.txt

# Extract Treasury Caps
for currency in usdc chfx tryb sekx jpyc myrc xsgd sbx; do
  grep -B 5 "TreasuryCap.*::$currency::" /tmp/deploy_output.txt | grep "ObjectID" | head -1 | sed 's/.*ObjectID: //' | sed 's/ .*//'
done

# Mint tokens (set variables first)
iota client call --package "$PACKAGE_ID" --module usdc --function mint --args "$USDC_TREASURY" "$RECIPIENT" 10000000000 --gas-budget 10000000

# Create Registry
iota client call --package "$PACKAGE_ID" --module sbx_pool --function create_registry --gas-budget 10000000

# Create Pool
iota client call --package "$PACKAGE_ID" --module sbx_pool --function create_pool --args 30 1000 "$SBX_TREASURY" "$CHFX_COIN" "$TRYB_COIN" "$SEKX_COIN" --gas-budget 10000000

# Whitelist tokens
iota client call --package "$PACKAGE_ID" --module sbx_pool --function admin_set_whitelist --args "$REGISTRY" true true true --gas-budget 10000000
```

---

**Last Updated:** November 12, 2024  
**Network:** IOTA Testnet  
**Package Edition:** Move 2024

