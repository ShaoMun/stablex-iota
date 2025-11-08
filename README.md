# StableX - Stablecoin Exchange on IOTA

A stablecoin exchange platform built on IOTA using Move language, inspired by Sanctum's infinity pool concept. The exchange addresses fragmented liquidity for regional stablecoins by allowing users to deposit regional stablecoins, earn yield, and receive SBX tokens that can be instantly exchanged for USDC or swapped directly between regional stablecoins.

## Project Overview

### Concept
- **Regional Stablecoins** (CHFX, TRYB, SEKX) → EUR-focused stablecoins
- **SBX Token** → INF (Infinity Token)
- **USDC Reserve Pool** → SOL Reserve Pool

Users deposit regional stablecoins to earn yield, receive SBX tokens (1 SBX = 1 USD), and can:
- Instantly exchange SBX for USDC from the reserve pool
- Swap directly between regional stablecoins (A→B, no USD intermediate)
- Withdraw regional stablecoins with dynamic fees based on pool depth

### Price Feed Architecture
- **API-Based Price Feeds**: Prices are queried off-chain via API and passed as parameters to contract functions
- **No Onchain Queries**: Removed dependency on Pyth Network onchain queries for better flexibility and lower gas costs
- **Price Format**: All prices in micro-USD (1e6 = $1.00)

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
- **Prices passed as parameters** - queried from API off-chain before transaction

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

### Latest Package (EUR-Focused with API-Based Price Feeds)
- **Package ID:** `0x7d6fa54ec2a4ae5620967a2129860f5a8a0b4d9849df64f2ae9b5325f3ca7db0`
- **Published:** Latest version with EUR-focused tokens (CHFX, TRYB, SEKX) and API-based price feeds
- **Transaction Digest:** `Dt1ehGfCWB2edad7ae61z25WJUcoUN3vD7K7vjqthvn3`
- **Modules:** `chfx`, `tryb`, `sekx`, `sbx_pool`, `usdc`, `jpyc`, `myrc`, `xsgd`, `pyth_adapter`
- **Key Changes:**
  - Switched from XSGD/MYRC/JPYC to CHFX/TRYB/SEKX (EUR-focused)
  - Removed onchain Pyth price queries
  - All functions now accept prices as `u64` parameters (micro-USD)
  - Prices queried from API off-chain and passed to contract

### Previous Packages
- **Package ID:** `0xce5a8930723f277deb6d1b2d583e732b885458cb6452354c502cb70da8f7cff9` (with test_feed_from_state)
- **Package ID:** `0xca283c3f232d60738aac7003395391846ef0b4e2ec6af1558f5781eec1d9c4ef` (initial Pyth integration)
- **Package ID:** `0x95f3d3f7bd7b844205c5a71c7fc90e8152f8562817e6406ec3d8cfee2b5bba91` (placeholder implementation)
- **Package ID:** `0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d` (initial token creation)

## Token Information

### EUR-Focused Tokens

All tokens are regulated currencies with 6 decimals:

1. **CHFX (Swiss Franc)**
   - TreasuryCap ID: `0xc7eccd077937ab60fe9526b2572841e2a5ef57a0a2b0489b2b38854fddfd0f69`
   - Address: `0x0b1e3297e69f162877b577b0d6a47a0d63b2392bc8499e6540da4187a63e28f8`
   - Initial Mint: 1000 tokens (1000000000 with 6 decimals)
   - Owner: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

2. **TRYB (Turkish Lira)**
   - TreasuryCap ID: `0x96df069dcd39491066552d780ef9e942bd47fd45185fb96a66fadfa0515c510a`
   - Address: `0x032a2eba1c2635bf973e95fb62b2c0705c1be2603b9572cc8d5edeaf8744e058`
   - Initial Mint: 1000 tokens (1000000000 with 6 decimals)
   - Owner: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

3. **SEKX (Swedish Krona)**
   - TreasuryCap ID: `0x8b1b78eb006b50015b04727d2e50149401dec7125ee0aa1eecdf3070540a6e18`
   - Address: `0x8ccb376aa871517e807358d4e3cf0bc7fe4950474dbe6c9ffc21ef64e43fc676`
   - Initial Mint: 1000 tokens (1000000000 with 6 decimals)
   - Owner: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

4. **USDC (USD Coin)**
   - TreasuryCap ID: Available in package
   - Initial Mint: 1000 tokens (1000000000 with 6 decimals)
   - Owner: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

## Price Feed Architecture

### API-Based Price Feeds

**Current Implementation:**
- **No Onchain Queries**: Removed dependency on Pyth Network onchain queries
- **API Integration**: Prices are queried from external API off-chain
- **Parameter Passing**: All prices passed as `u64` parameters (micro-USD format)
- **Price Format**: Micro-USD (1e6 = $1.00)

**Benefits:**
- Lower gas costs (no onchain price queries)
- More flexible price sources
- Faster transaction execution
- Easier integration with multiple price providers

### Price Feed Requirements

All functions that require prices now accept them as direct parameters:
- `deposit_usdc()`: Requires `chfx_price_microusd`, `tryb_price_microusd`, `sekx_price_microusd`
- `deposit_chfx()`, `deposit_tryb()`, `deposit_sekx()`: Require `price_microusd`
- `swap_regional()`: Requires `price_from_microusd`, `price_to_microusd`
- `withdraw_usdc()`, `withdraw_chfx()`, `withdraw_tryb()`, `withdraw_sekx()`: Require price parameters

**Note:** The `pyth_adapter` module is still included in the package but is no longer used by `sbx_pool`. It remains for potential future use or reference.

## Key Transactions

### Latest Package Publication (EUR-Focused)
- **Transaction Digest:** `Dt1ehGfCWB2edad7ae61z25WJUcoUN3vD7K7vjqthvn3`
- **Package ID:** `0x7d6fa54ec2a4ae5620967a2129860f5a8a0b4d9849df64f2ae9b5325f3ca7db0`
- **Modules:** chfx, tryb, sekx, sbx_pool, usdc, jpyc, myrc, xsgd, pyth_adapter
- **Published:** Package includes all EUR-focused tokens and updated sbx_pool with API-based price feeds

### Token Minting Transactions
- **CHFX Mint:** `5NBUC3AFmHaV13sWstrZJBKDvnqs2MqmXAjVwfe8NLtK` (1000 tokens)
- **TRYB Mint:** `5rdtAyD8rf31ZAdjFaSMPi5bdkrFrCFgCpS37kQ2e3PR` (1000 tokens)
- **SEKX Mint:** `BodSbjyPCfngsKphgTguAJZXid8brfNj9ykLQXYzH8Vd` (1000 tokens)

## Wallet Address

All tokens and treasury caps are owned by:
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
   - **API-based price feeds** - prices passed as parameters

2. **pyth_adapter.move** - Pyth Network integration (legacy, not used by sbx_pool)
   - Price fetching from Pyth (for reference)
   - Price freshness validation
   - Micro-USD conversion
   - Helper functions for PriceInfoObject access

3. **chfx.move, tryb.move, sekx.move, usdc.move** - Token modules
   - Regulated currency creation (EUR-focused tokens)
   - Mint/transfer functions
   - Balance queries

### Key Features

- **API-Based Price Feeds:** Prices queried off-chain and passed as parameters (no onchain queries)
- **EUR-Focused Tokens:** CHFX (Swiss Franc), TRYB (Turkish Lira), SEKX (Swedish Krona)
- **Three-Tier Fee Curve:** Cheap fixed rate (≥80%), linear scaling (30-80%), sudden jump (<30%)
- **Direct Swaps:** A→B swaps without USD intermediate (true infinity pool)
- **Balance-Based Allocation:** USDC allocation maintains 1:1 ratio with regionals
- **Dynamic APY:** Per-currency APY based on pool balance and MM returns
- **USD Value Calculation:** Accurate USD value calculation using API-provided prices
- **SBX Token Minting:** SBX tokens minted 1:1 with USD value of deposits

## Function Signatures

### Deposit Functions

```move
// USDC deposit with balance-based allocation
// Prices queried from API and passed as parameters
public entry fun deposit_usdc(
    account: &mut Account,
    pool: &mut Pool,
    registry: &Registry,
    amount: u64,
    chfx_price_microusd: u64,
    tryb_price_microusd: u64,
    sekx_price_microusd: u64,
    ctx: &TxContext
)

// Regional stablecoin deposits (prices from API)
public entry fun deposit_chfx(
    account: &mut Account,
    pool: &mut Pool,
    registry: &Registry,
    amount: u64,
    price_microusd: u64,
    ctx: &TxContext
)

public entry fun deposit_tryb(...)
public entry fun deposit_sekx(...)
```

### Withdrawal Functions

```move
// Withdraw USDC (applies three-tier fee curve)
// Prices queried from API and passed as parameters
public entry fun withdraw_usdc(
    account: &mut Account,
    pool: &mut Pool,
    registry: &mut Registry,
    sbx_amount: u64,
    chfx_price_microusd: u64,
    tryb_price_microusd: u64,
    sekx_price_microusd: u64,
    ctx: &TxContext
)

// Withdraw regional stablecoins (applies three-tier fee curve)
public entry fun withdraw_chfx(
    account: &mut Account,
    pool: &mut Pool,
    registry: &mut Registry,
    sbx_amount: u64,
    chfx_price_microusd: u64,
    tryb_price_microusd: u64,
    sekx_price_microusd: u64,
    ctx: &TxContext
)

public entry fun withdraw_tryb(...)
public entry fun withdraw_sekx(...)
```

### Swap Functions

```move
// Direct A→B swap (no USD intermediate)
// Prices queried from API and passed as parameters
public entry fun swap_regional(
    account: &mut Account,
    pool: &mut Pool,
    registry: &mut Registry,
    amount_in: u64,
    from_code: u8,  // 0=CHFX, 1=TRYB, 2=SEKX
    to_code: u8,
    price_from_microusd: u64,
    price_to_microusd: u64,
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
    chfx_bps: u64,
    tryb_bps: u64,
    sekx_bps: u64,
    ctx: &TxContext
)

// Set coverage targets
public entry fun admin_set_targets(
    registry: &mut Registry,
    usdc_bps: u64,
    chfx_bps: u64,
    tryb_bps: u64,
    sekx_bps: u64,
    ctx: &TxContext
)

// Set prices (cached for coverage calculations)
public entry fun admin_set_prices_microusd(
    registry: &mut Registry,
    chfx: u64,
    tryb: u64,
    sekx: u64,
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
    currency_code: u8,  // 0=USDC, 1=CHFX, 2=TRYB, 3=SEKX
    fees_7d_mu: u128,
    avg_tvl_7d_mu: u128,
    chfx_price_mu: u64,
    tryb_price_mu: u64,
    sekx_price_mu: u64
): u64

// Get vault USD values
public fun vault_usd(
    pool: &Pool,
    chfx_price_mu: u64,
    tryb_price_mu: u64,
    sekx_price_mu: u64
): (u128, u128, u128, u128, u128)  // (usdc, chfx, tryb, sekx, total)

// Get coverage in basis points
public fun coverage_bps(
    usdc_mu: u128,
    chfx_mu: u128,
    tryb_mu: u128,
    sekx_mu: u128,
    total_mu: u128
): (u64, u64, u64, u64)  // (usdc, chfx, tryb, sekx)
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
- Token creation (CHFX, TRYB, SEKX, USDC) - EUR-focused
- API-based price feed integration (no onchain queries)
- Price parameters in all price-sensitive functions
- Three-tier fee curve (80%/30% thresholds)
- Direct A→B swaps (no USD intermediate)
- Balance-based USDC allocation (40/60 split)
- Dynamic MM allocation (40% of excess)
- Per-currency APY calculation (balance-based)
- Per-currency fee tracking
- Package compilation and publishing
- Token minting (1000 tokens of each type)

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

## API Integration Guide

### Price Query Requirements

Before calling any price-sensitive function, query prices from your API and convert to micro-USD format:

```javascript
// Example: Query prices from API
const prices = await fetchPrices(['CHFX', 'TRYB', 'SEKX']);

// Convert to micro-USD (1e6 = $1.00)
// If price is $0.75, then micro-USD = 750000
const chfxPriceMicroUSD = Math.floor(prices.CHFX * 1_000_000);
const trybPriceMicroUSD = Math.floor(prices.TRYB * 1_000_000);
const sekxPriceMicroUSD = Math.floor(prices.SEKX * 1_000_000);

// Pass to contract function
await contract.deposit_usdc({
  amount: 1000000,
  chfx_price_microusd: chfxPriceMicroUSD,
  tryb_price_microusd: trybPriceMicroUSD,
  sekx_price_microusd: sekxPriceMicroUSD
});
```

### Price Update Frequency

- Prices should be queried fresh for each transaction
- Consider caching prices for coverage calculations (via `admin_set_prices_microusd`)
- Update cached prices periodically (e.g., every 5 minutes)

## References

- **IOTA Documentation:** https://docs.iota.org/developer/getting-started/simple-token-transfer
- **IOTA Shared Objects:** https://docs.iota.org/developer/iota-101/objects/object-ownership/shared
- **Move Language:** https://move-language.github.io/move/

## Network

- **Network:** IOTA Rebased Testnet
- **Explorer:** https://explorer.testnet.iota.cafe/

## Audit Trail

All package IDs, transaction IDs, and object IDs are documented above for future reference and audit purposes.
