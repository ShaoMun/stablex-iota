# Testing Guide for StableX Pool

This document describes how to test all functions of the StableX pool on-chain.

## Test Files

1. **`tests/sbx_pool_fuzz_tests.move`** - Unit tests for calculation logic
2. **`tests/sbx_pool_integration_tests.move`** - Integration tests (test environment)
3. **`sources/test_script.move`** - On-chain test script (for deployed contracts)

## Running Unit Tests

Run the Move unit tests using the Move CLI:

```bash
cd first_package
sui move test
```

This will run all `#[test]` functions in the test modules.

## On-Chain Testing

After deploying the package, use the test script functions to verify each function works correctly.

### Prerequisites

1. Deploy the package to IOTA testnet
2. Initialize SBX token, Pool, and Registry objects
3. Have test accounts with necessary permissions

### Test Sequence

#### 1. Setup Test Environment

```bash
# Call test_setup to create initial objects
sui client call --package <PACKAGE_ID> \
  --module test_script \
  --function test_setup \
  --gas-budget 10000000
```

#### 2. Test Stake Functions

**Test Stake USDC:**
```bash
sui client call --package <PACKAGE_ID> \
  --module test_script \
  --function test_stake_usdc \
  --args <POOL_OBJECT_ID> <REGISTRY_OBJECT_ID> <ACCOUNT_OBJECT_ID> 1000000 \
  --gas-budget 10000000
```

**Test Stake CHFX:**
```bash
sui client call --package <PACKAGE_ID> \
  --module test_script \
  --function test_stake_chfx \
  --args <POOL_OBJECT_ID> <REGISTRY_OBJECT_ID> <ACCOUNT_OBJECT_ID> 1000000 \
  --gas-budget 10000000
```

#### 3. Test Unstake Functions

**Test Unstake USDC (Regional Staker):**
```bash
# First, get SBX coin object ID
sui client call --package <PACKAGE_ID> \
  --module test_script \
  --function test_unstake_usdc_regional \
  --args <POOL_OBJECT_ID> <REGISTRY_OBJECT_ID> <ACCOUNT_OBJECT_ID> <SBX_COIN_OBJECT_ID> \
  --gas-budget 10000000
```

**Test Unstake CHFX:**
```bash
sui client call --package <PACKAGE_ID> \
  --module test_script \
  --function test_unstake_chfx \
  --args <POOL_OBJECT_ID> <REGISTRY_OBJECT_ID> <ACCOUNT_OBJECT_ID> <SBX_COIN_OBJECT_ID> \
  --gas-budget 10000000
```

#### 4. Test Swap

```bash
sui client call --package <PACKAGE_ID> \
  --module test_script \
  --function test_swap_regional \
  --args <POOL_OBJECT_ID> <REGISTRY_OBJECT_ID> <ACCOUNT_OBJECT_ID> 1000000 0 1 \
  --gas-budget 10000000
```

Where:
- `0` = CHFX (from)
- `1` = TRYB (to)
- `2` = SEKX

#### 5. Test Yield Distribution

```bash
# Get current timestamp in milliseconds
sui client call --package <PACKAGE_ID> \
  --module test_script \
  --function test_yield_distribution \
  --args <POOL_OBJECT_ID> <REGISTRY_OBJECT_ID> <ACCOUNT_OBJECT_ID> <TIMESTAMP_MS> \
  --gas-budget 10000000
```

#### 6. Test Admin Functions

```bash
sui client call --package <PACKAGE_ID> \
  --module test_script \
  --function test_admin_functions \
  --args <POOL_OBJECT_ID> <REGISTRY_OBJECT_ID> \
  --gas-budget 10000000
```

#### 7. Test View Functions

**Test Unified APY:**
```bash
sui client call --package <PACKAGE_ID> \
  --module test_script \
  --function test_unified_apy \
  --args <POOL_OBJECT_ID> <REGISTRY_OBJECT_ID> 1000000000 100000000000 \
  --gas-budget 10000000
```

**Test Vault USD:**
```bash
sui client call --package <PACKAGE_ID> \
  --module test_script \
  --function test_vault_usd \
  --args <POOL_OBJECT_ID> \
  --gas-budget 10000000
```

**Test Coverage BPS:**
```bash
sui client call --package <PACKAGE_ID> \
  --module test_script \
  --function test_coverage_bps \
  --args <POOL_OBJECT_ID> \
  --gas-budget 10000000
```

#### 8. Test Account Creation

```bash
sui client call --package <PACKAGE_ID> \
  --module test_script \
  --function test_create_account \
  --gas-budget 10000000
```

#### 9. Test Migrate Staking Status

```bash
sui client call --package <PACKAGE_ID> \
  --module test_script \
  --function test_migrate_staking_status \
  --args <SOURCE_ACCOUNT_OBJECT_ID> <DESTINATION_ACCOUNT_OBJECT_ID> \
  --gas-budget 10000000
```

#### 10. End-to-End Test

```bash
sui client call --package <PACKAGE_ID> \
  --module test_script \
  --function test_end_to_end \
  --args <POOL_OBJECT_ID> <REGISTRY_OBJECT_ID> <ACCOUNT_OBJECT_ID> \
  --gas-budget 10000000
```

## Test Checklist

### Core Functions

- [ ] `test_setup` - Initialize SBX token, Pool, Registry
- [ ] `test_stake_usdc` - Stake USDC and mint SBX
- [ ] `test_stake_chfx` - Stake CHFX and mint SBX
- [ ] `test_stake_tryb` - Stake TRYB and mint SBX
- [ ] `test_stake_sekx` - Stake SEKX and mint SBX
- [ ] `test_unstake_usdc_regional` - Regional staker withdraws USDC
- [ ] `test_unstake_chfx` - Unstake CHFX
- [ ] `test_unstake_tryb` - Unstake TRYB
- [ ] `test_unstake_sekx` - Unstake SEKX
- [ ] `test_swap_regional` - Swap between regional stablecoins

### Admin Functions

- [ ] `test_admin_functions` - All admin operations
- [ ] Pause/Unpause pool
- [ ] Set whitelist
- [ ] Set prices
- [ ] Set targets
- [ ] Set fee parameters
- [ ] Set MM returns
- [ ] Set epoch duration
- [ ] Add yield

### View Functions

- [ ] `test_unified_apy` - Calculate unified APY
- [ ] `test_vault_usd` - Calculate vault USD values
- [ ] `test_coverage_bps` - Calculate coverage percentages

### Account Management

- [ ] `test_create_account` - Create new account
- [ ] `test_migrate_staking_status` - Migrate staking status between accounts

### Edge Cases

- [ ] USDC staker cannot withdraw USDC (should fail)
- [ ] Unstake before epoch completion (no yield)
- [ ] Zero amount validation
- [ ] Insufficient balance validation
- [ ] Paused pool validation
- [ ] Migrate empty staking status (should fail)

## Expected Results

### Stake Functions
- SBX tokens minted and transferred to user
- Staked amounts recorded in account
- Pool supply and liabilities updated correctly

### Unstake Functions
- SBX tokens burned
- Staked amounts reduced
- Pool reserves/liabilities updated
- Fees applied correctly

### Swap Functions
- From currency liability increased
- To currency liability decreased
- Fees applied correctly

### Yield Distribution
- Epoch advanced if complete
- SBX tokens minted for yield
- User's last_yield_epoch updated

### Account Migration
- Source account staked amounts reset to 0
- Destination account receives all staked amounts
- last_yield_epoch transferred (uses later epoch)
- Destination can unstake if they have corresponding SBX tokens

## Debugging

All test functions use `debug::print` to output test progress. Check transaction logs to see:
- Test name
- Input values
- Intermediate calculations
- Success/failure messages

## Notes

1. **Object IDs**: Replace `<POOL_OBJECT_ID>`, `<REGISTRY_OBJECT_ID>`, etc. with actual object IDs from deployment
2. **Gas Budget**: Adjust `--gas-budget` based on function complexity
3. **Prices**: Test prices are:
   - CHFX: 750,000 micro-USD (0.75 USD)
   - TRYB: 250,000 micro-USD (0.25 USD)
   - SEKX: 900,000 micro-USD (0.90 USD)
4. **Token Objects**: Some tests require actual token coin objects, which must be created separately

## Troubleshooting

### "Object not found"
- Ensure objects are created and transferred correctly
- Check object IDs are correct

### "Insufficient balance"
- Ensure test account has sufficient tokens
- Check staked amounts match expectations

### "Epoch not complete"
- Wait for epoch duration or manually advance timestamp
- Check `epoch_duration_ms` setting

### "Not whitelisted"
- Call `admin_set_whitelist` first
- Verify registry whitelist flags

