# StableX - Stablecoin Exchange on IOTA

A stablecoin exchange platform built on IOTA using Move language, inspired by Sanctum's infinity pool concept. The exchange addresses fragmented liquidity for regional stablecoins by allowing users to deposit regional stablecoins, earn yield, and receive SBX tokens that can be instantly exchanged for USDC or swapped directly between regional stablecoins.

## Project Overview

### Concept
- **Regional Stablecoins** (XSGD, MYRC, JPYC) → LST (Liquid Staking Tokens)
- **SBX Token** → INF (Infinity Token)
- **USDC Reserve Pool** → SOL Reserve Pool

Users deposit regional stablecoins to earn yield, receive SBX tokens (1 SBX = 1 USD), and can:
- Instantly exchange SBX for USDC from the reserve pool
- Swap directly between regional stablecoins (A→B, no USD intermediate)
- Withdraw regional stablecoins with dynamic fees based on pool depth

## Core Features

### 1. Three-Tier Fee Curve (80%/30% Thresholds)

**Tier 1 (≥80% coverage)**: Fixed cheap rate for stablecoins
- Fee = floor + base (no deviation penalty)
- Example: 7 bps (0.07%) - optimal for healthy pools

**Tier 2 (30-80% coverage)**: Linear/pricewise fee
- Fee = floor + base + k * deviation
- Scales linearly with deviation from target
- Example: 7-32 bps range

**Tier 3 (<30% coverage)**: Sudden jump - dramatic fee increase
- Fee = (floor + base) * 10x + exponential term
- **No cap** - fees can exceed 14%+ to discourage draining
- Example: 77 bps at 29%, up to 1432 bps at 1%

### 2. Direct A→B Swaps (Infinity Pool Core)

- **No USD intermediate** - direct exchange between regional stablecoins
- Rate calculation: `rate_A_to_B = price_B / price_A` (both in USD/[CURRENCY] format)
- Single fee applied based on target asset depth
- True infinity pool mechanics - all assets in one unified pool

### 3. Balance-Based USDC Allocation

**Balance Definition**: `balance_ratio = USDC / sum(regionals)`

**When Unbalanced** (USDC < regionals, ratio < 1.0):
- Keep ALL USDC in reserve (no allocation)
- Pool needs more USDC to reach balance

**When Balanced** (USDC ≥ regionals, ratio ≥ 1.0):
- Reserve = sum(regionals) (maintain 1:1 ratio)
- Excess = USDC - sum(regionals)
- **40% of excess** → Off-chain MM allocation
- **60% of excess** → Auto-swap to regionals (distributed to unhealthiest vaults)

### 4. Dynamic Per-Currency APY

**When Unbalanced** (USDC < regionals):
- **USDC**: Higher APY (bonus up to +300 bps) to encourage deposits
- **Regionals**: Higher APY (bonus up to +200 bps) to encourage deposits

**When Balanced** (USDC ≥ regionals):
- **USDC**: Base APY + MM returns
- **Regionals**: Base APY + MM returns + **150 bps bonus** (always higher than USDC)

APY includes:
- Swap fees (accumulated per currency)
- MM returns (mocked, 2-8% range, set by admin)
- Balance compensation (dynamic based on pool health)

### 5. Off-Chain MM Allocation

- **Dynamic allocation**: Only when pool is balanced (has excess)
- **40% of excess** goes to MM when USDC ≥ sum(regionals)
- **Random returns**: Mocked returns (2-8% APY range) set by admin periodically
- Returns factor into per-currency APY calculations

## Package Information

### Latest Package (with Infinity Pool Features)
- **Package ID:** `0x2506d448a995c8fd26f3e3a2276409b241fbb4aab54a93256c59670b946d46e0`
- **Published:** Latest version with three-tier fee curve, direct swaps, and balance-based allocation
- **Modules:** `jpyc`, `myrc`, `pyth_adapter`, `sbx_pool`, `usdc`, `xsgd`

### Previous Packages
- **Package ID:** `0xce5a8930723f277deb6d1b2d583e732b885458cb6452354c502cb70da8f7cff9` (with test_feed_from_state)
- **Package ID:** `0xca283c3f232d60738aac7003395391846ef0b4e2ec6af1558f5781eec1d9c4ef` (initial Pyth integration)
- **Package ID:** `0x95f3d3f7bd7b844205c5a71c7fc90e8152f8562817e6406ec3d8cfee2b5bba91` (placeholder implementation)
- **Package ID:** `0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d` (initial token creation)

## Token Information

### TreasuryCap Object IDs

All tokens are regulated currencies with 6 decimals:

1. **XSGD (Singapore Dollar)**
   - TreasuryCap ID: `0x89beb5ba6d155bb9075544e1e5033661b5e5f75b7389765a625bd2286fa27698`
   - Initial Mint: 1000 tokens (1000000000 with 6 decimals)
   - Recipient: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

2. **MYRC (Malaysian Ringgit)**
   - TreasuryCap ID: `0x07f70a073fb27c8499f3f9b09a3c270fef0687d6d49c96e6d860ec0f558c217d`
   - Initial Mint: 1000 tokens (1000000000 with 6 decimals)
   - Recipient: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

3. **USDC (USD Coin)**
   - TreasuryCap ID: `0x73651b6faf9fb4ab4d291fe755227c2e0987c2e0e12884021df4ca4d94531c65`
   - Initial Mint: 1000 tokens (1000000000 with 6 decimals)
   - Recipient: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

4. **JPYC (Japanese Yen Coin)**
   - TreasuryCap ID: `0xf71c021f65604289f037726e04c426621a0fbe875f492bf8b57c76a58fe95df4`
   - Initial Mint: 1000 tokens (1000000000 with 6 decimals)
   - Recipient: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

## Pyth Network Integration

### Pyth Configuration
- **Pyth State ID:** `0x68dda579251917b3db28e35c4df495c6e664ccc085ede867a9b773c8ebedc2c1`
- **Pyth Package ID:** `0x23994dd119480ea614f7623520337058dca913cb1bb6e5d8d51c7b067d3ca3bb`
- **Pyth Git Repository:** `https://github.com/pyth-network/pyth-crosschain.git`
- **Branch:** `iota-contract-testnet`
- **Subdirectory:** `target_chains/sui/contracts`

### Price Feed IDs

1. **USD/SGD (Singapore Dollar)**
   - Feed ID: `0x6256c91c19cfbbfc6f91e1fd15c028a26be1f78bb59ac9f7250cbb67f9e5b964`
   - Note: IOTA uses feed IDs without `0x` prefix in some contexts

2. **USD/MYR (Malaysian Ringgit)**
   - Feed ID: `0xb69ac34651e9f72e0be5bb4c6da5d7ddff38dc4ac1fb1528f7f8c579e42082f0`

3. **USD/JPY (Japanese Yen)**
   - Feed ID: `0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52`

### Pyth Integration Details

- **Implementation:** Based on official Pyth IOTA documentation
- **Price Fetching:** Uses `pyth::get_price_no_older_than()` for automatic freshness validation
- **Price Format:** Micro-USD (1e6 = $1.00)
- **Freshness Threshold:** 300 seconds (5 minutes)
- **I64 Handling:** Uses `get_is_negative()`, `get_magnitude_if_positive()`, `get_magnitude_if_negative()`

## Key Transactions

### Initial Package Publication
- **Transaction Digest:** `EiqcqVvk4gVvbS9rgumfiLLGTVaf3Nb8BTfx69rVwTgi`
- **Package ID:** `0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d`

## Target Address

All tokens were transferred to:
```
0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2
```

## Architecture

### Modules

1. **sbx_pool.move** - Core pool logic
   - Pool state management with balance-based allocation
   - Three-tier fee curve (80%/30% thresholds)
   - Direct A→B swaps (no USD intermediate)
   - Per-currency fee tracking and APY calculation
   - Dynamic MM allocation (40% of excess)
   - Deposit/withdraw operations with depth-aware fees

2. **pyth_adapter.move** - Pyth Network integration
   - Price fetching from Pyth
   - Price freshness validation
   - Micro-USD conversion
   - Helper functions for PriceInfoObject access

3. **xsgd.move, myrc.move, jpyc.move, usdc.move** - Token modules
   - Regulated currency creation
   - Mint/transfer functions
   - Balance queries

### Key Features

- **Live Price Integration:** All price-sensitive functions fetch real-time prices from Pyth
- **Three-Tier Fee Curve:** Cheap fixed rate (≥80%), linear scaling (30-80%), sudden jump (<30%)
- **Direct Swaps:** A→B swaps without USD intermediate (true infinity pool)
- **Balance-Based Allocation:** USDC allocation maintains 1:1 ratio with regionals
- **Dynamic APY:** Per-currency APY based on pool balance and MM returns
- **Automatic Freshness Validation:** Prices validated to be no older than 5 minutes
- **USD Value Calculation:** Accurate USD value calculation using live prices
- **SBX Token Minting:** SBX tokens minted 1:1 with USD value of deposits

## Function Signatures

### Deposit Functions

```move
// USDC deposit with balance-based allocation
public entry fun deposit_usdc(
    account: &mut Account,
    pool: &mut Pool,
    registry: &Registry,
    amount: u64,
    xsgd_price_info_obj: &PriceInfoObject,
    myrc_price_info_obj: &PriceInfoObject,
    jpyc_price_info_obj: &PriceInfoObject,
    clock: &Clock,
    ctx: &TxContext
)

// Regional stablecoin deposits (with live Pyth prices)
public entry fun deposit_xsgd(
    account: &mut Account,
    pool: &mut Pool,
    registry: &Registry,
    xsgd_price_info_obj: &PriceInfoObject,
    amount: u64,
    clock: &Clock,
    ctx: &TxContext
)

public entry fun deposit_myrc(...)
public entry fun deposit_jpyc(...)
```

### Withdrawal Functions

```move
// Withdraw USDC (applies three-tier fee curve)
public entry fun withdraw_usdc(
    account: &mut Account,
    pool: &mut Pool,
    registry: &mut Registry,
    sbx_amount: u64,
    clock: &Clock,
    ctx: &TxContext
)

// Withdraw regional stablecoins (applies three-tier fee curve)
public entry fun withdraw_xsgd(
    account: &mut Account,
    pool: &mut Pool,
    registry: &mut Registry,
    sbx_amount: u64,
    xsgd_price_info_obj: &PriceInfoObject,
    clock: &Clock,
    ctx: &TxContext
)

public entry fun withdraw_myrc(...)
public entry fun withdraw_jpyc(...)
```

### Swap Functions

```move
// Direct A→B swap (no USD intermediate)
public entry fun swap_regional(
    account: &mut Account,
    pool: &mut Pool,
    registry: &mut Registry,
    amount_in: u64,
    from_code: u8,  // 0=XSGD, 1=MYRC, 2=JPYC
    to_code: u8,
    price_from: &PriceInfoObject,
    price_to: &PriceInfoObject,
    clock: &Clock,
    ctx: &TxContext
)
```

### Admin Functions

```move
// Set three-tier fee curve parameters
public entry fun admin_set_tier_params(
    registry: &mut Registry,
    high_coverage_threshold_bps: u64,  // 80%
    low_coverage_threshold_bps: u64,   // 30%
    tier2_base_multiplier: u64,        // 10x
    tier2_exponential_factor: u64,     // 5x
    ctx: &TxContext
)

// Set MM returns (mocked, 2-8% range)
public entry fun admin_set_mm_returns(
    registry: &mut Registry,
    usdc_bps: u64,
    xsgd_bps: u64,
    myrc_bps: u64,
    jpyc_bps: u64,
    ctx: &TxContext
)

// Set coverage targets
public entry fun admin_set_targets(
    registry: &mut Registry,
    usdc_bps: u64,
    xsgd_bps: u64,
    myrc_bps: u64,
    jpyc_bps: u64,
    ctx: &TxContext
)

// Set fee parameters
public entry fun admin_set_fee_params(
    registry: &mut Registry,
    base_fee_bps: u64,
    depth_fee_k_bps: u64,
    withdraw_fee_floor_bps: u64,
    swap_fee_floor_bps: u64,
    max_fee_bps: u64,
    ctx: &TxContext
)
```

### View Functions

```move
// Calculate per-currency APY (dynamic based on balance)
public fun estimated_apy_bps_per_currency(
    registry: &Registry,
    pool: &Pool,
    currency_code: u8,  // 0=USDC, 1=XSGD, 2=MYRC, 3=JPYC
    fees_7d_mu: u128,
    avg_tvl_7d_mu: u128,
    xsgd_price_mu: u64,
    myrc_price_mu: u64,
    jpyc_price_mu: u64
): u64

// Get vault USD values
public fun vault_usd(
    pool: &Pool,
    xsgd_price_mu: u64,
    myrc_price_mu: u64,
    jpyc_price_mu: u64
): (u128, u128, u128, u128, u128)  // (usdc, xsgd, myrc, jpyc, total)

// Get coverage in basis points
public fun coverage_bps(
    usdc_mu: u128,
    xsgd_mu: u128,
    myrc_mu: u128,
    jpyc_mu: u128,
    total_mu: u128
): (u64, u64, u64, u64)  // (usdc, xsgd, myrc, jpyc)
```

## Fee Curve Details

### Three-Tier System

**Tier 1 (≥80% coverage)**:
- Fixed cheap rate: `fee = floor + base`
- No deviation penalty
- Optimal for healthy pools
- Example: 7 bps (0.07%)

**Tier 2 (30-80% coverage)**:
- Linear/pricewise: `fee = floor + base + k * deviation`
- Scales with deviation from target
- Example: 7-32 bps range

**Tier 3 (<30% coverage)**:
- Sudden jump: `fee = (floor + base) * 10x + exponential_term`
- No cap - fees can exceed 14%+
- Example: 77 bps at 29%, 1432 bps at 1%

### Fee Examples

| Coverage | Tier | Fee | Fee % |
|----------|------|-----|-------|
| 85% | 1 | 7 bps | 0.07% |
| 50% | 2 | 22 bps | 0.22% |
| 30% | 2 | 32 bps | 0.32% |
| 29% | 3 | 77 bps | 0.77% |
| 20% | 3 | 327 bps | 3.27% |
| 10% | 3 | 827 bps | 8.27% |
| 1% | 3 | 1432 bps | 14.32% |

## Testing

### Fuzz Tests
- Location: `first_package/tests/sbx_pool_fuzz_tests.move`
- Tests: Deposit calculations, swap fees, reserve ratios, price conversions, APY calculations

### On-Chain Testing
- Package published and ready for testing
- Feed connectivity tested (function executes correctly)
- Note: Feeds may need to be registered/updated in Pyth State before use

## Dependencies

### Move.toml
```toml
[package]
name = "first_package"
edition = "2024"

[dependencies]
Pyth = { git = "https://github.com/pyth-network/pyth-crosschain.git", subdir = "target_chains/sui/contracts", rev = "iota-contract-testnet" }

[addresses]
first_package = "0x0"
Pyth = "0x23994dd119480ea614f7623520337058dca913cb1bb6e5d8d51c7b067d3ca3bb"
```

## Development Status

✅ **Completed:**
- Token creation (XSGD, MYRC, JPYC, USDC)
- Pyth Network integration
- Live price fetching in all price-sensitive functions
- Three-tier fee curve (80%/30% thresholds)
- Direct A→B swaps (no USD intermediate)
- Balance-based USDC allocation (40/60 split)
- Dynamic MM allocation (40% of excess)
- Per-currency APY calculation (balance-based)
- Per-currency fee tracking
- Fuzz testing for core logic
- Package compilation and publishing

⚠️ **In Progress:**
- On-chain testing with actual PriceInfoObject references
- Feed registration verification

## Key Formulas

### Balance Ratio
```
balance_ratio = USDC / sum(regionals)
```

### USDC Allocation
```
if balance_ratio < 1.0:
    reserve = USDC (keep all)
else:
    reserve = sum(regionals)
    excess = USDC - sum(regionals)
    MM_allocation = excess * 0.4
    swap_allocation = excess * 0.6 (to unhealthiest regionals)
```

### Per-Currency APY
```
balance_ratio = USDC / sum(regionals)

USDC APY:
  if unbalanced (ratio < 1.0): base_fee_apy + compensation_bonus (higher than regionals)
  if balanced (ratio >= 1.0): base_fee_apy + MM_apy

Regional APY:
  if unbalanced (ratio < 1.0): base_fee_apy + compensation_bonus
  if balanced (ratio >= 1.0): base_fee_apy + MM_apy + 150_bps_bonus
```

### Three-Tier Fee Formula

**Tier 1 (≥80%)**:
```
fee = floor + base (fixed cheap rate)
```

**Tier 2 (30-80%)**:
```
fee = floor + base + k * (deviation / 10000) (linear/pricewise)
```

**Tier 3 (<30%)**:
```
fee = (floor + base) * tier2_base_multiplier + k * (deviation² * tier2_exponential_factor / threshold) / 10000
```

## References

- **Pyth IOTA Documentation:** https://docs.pyth.network/price-feeds/core/use-real-time-data/pull-integration/iota
- **Pyth Fetch Price Updates:** https://docs.pyth.network/price-feeds/core/fetch-price-updates
- **IOTA Documentation:** https://docs.iota.org/developer/getting-started/simple-token-transfer
- **IOTA Shared Objects:** https://docs.iota.org/developer/iota-101/objects/object-ownership/shared

## Network

- **Network:** IOTA Rebased Testnet
- **Explorer:** https://explorer.testnet.iota.cafe/

## Audit Trail

All package IDs, transaction IDs, and object IDs are documented above for future reference and audit purposes.
