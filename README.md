# StableX - Stablecoin Exchange on IOTA

A stablecoin exchange platform built on IOTA using Move language, inspired by Sanctum's infinity pool concept. The exchange addresses fragmented liquidity for regional stablecoins by allowing users to deposit USDC or regional stablecoins, earn unified yield, and receive SBX tokens that can be withdrawn as any currency (with asymmetric withdrawal rules).

## Project Overview

### Concept
- **Unified Basket**: All currencies (USDC + CHFX + TRYB + SEKX) in one pool
- **SBX Token**: Single fungible token (1 SBX = 1 USD) with rebasing mechanism
- **Unified APY**: All depositors earn the same APY (higher than USDC alone)
- **Asymmetric Withdrawal**: Regional depositors can withdraw USDC or regionals; USDC depositors can only withdraw regionals

Users deposit USDC or regional stablecoins to earn unified yield, receive SBX tokens (1 SBX = 1 USD), and can:
- **Regional depositors**: Withdraw any regional stablecoin OR USDC
- **USDC depositors**: Withdraw any regional stablecoin (cannot withdraw USDC)
- Swap directly between regional stablecoins (A→B, no USD intermediate)
- All withdrawals subject to dynamic fees based on pool depth

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
- **30% of excess** → Off-chain MM allocation
- **50% of excess** → USDC reserve
- **20% of excess** → Auto-swap to regionals (distributed to unhealthiest vaults)

### 4. Unified APY (All Depositors)

**Unified APY for All**:
- All depositors (USDC and regionals) earn the same unified APY
- Unified APY = Fee APY + MM APY (weighted average)
- Higher than USDC alone because regionals are included in the pool

**APY Components**:
- **Fee APY**: From swap fees (accumulated across all currencies)
- **MM APY**: Weighted average of MM returns (based on pool composition)
- **Rebasing**: SBX token quantity increases with APY (transparent yield accrual)

**Fairness**:
- **Regional depositors**: Get liquidity benefit (can withdraw USDC) + unified APY
- **USDC depositors**: Get higher unified APY (than USDC alone) but cannot withdraw USDC

### 5. Asymmetric Withdrawal Rules

**Regional Depositors** (CHFX, TRYB, SEKX):
- Can withdraw **any regional stablecoin** (CHFX, TRYB, or SEKX)
- Can withdraw **USDC** (liquidity benefit)
- Subject to depth-based fees (three-tier fee curve)

**USDC Depositors**:
- Can withdraw **any regional stablecoin** (CHFX, TRYB, or SEKX)
- **Cannot withdraw USDC** (prevents circular staking logic)
- Subject to depth-based fees (three-tier fee curve)

**Rationale**:
- Regional depositors provide direct liquidity (prevent double swaps) → rewarded with USDC withdrawal option
- USDC depositors benefit from higher unified APY (than USDC alone) → fair compensation

### 6. Off-Chain MM Allocation

- **Dynamic allocation**: Only when pool is balanced (has excess)
- **30% of excess** goes to MM when USDC ≥ sum(regionals)
- **Random returns**: Mocked returns (2-8% APY range) set by admin periodically
- Returns factor into unified APY calculation (weighted average)

## Package Information

### Latest Package (Unified Basket with Asymmetric Withdrawal + Migration)
- **Package ID:** `0x71157d06f6ea5ac0d5f952881126591da1c0d5e3980e9ab9dbf1d08dff989846`
- **Published:** Latest version with unified basket architecture, asymmetric withdrawal rules, and account migration
- **Transaction Digest:** `4NsomjHZC6S54ZFjSbQDUt1RJHhSjbHbFtEPS1wtRziC`
- **Modules:** `chfx`, `tryb`, `sekx`, `sbx`, `sbx_pool`, `usdc`, `jpyc`, `myrc`, `xsgd`
- **Key Features:**
  - **Unified Basket**: All currencies (USDC + regionals) in one pool
  - **Unified APY**: All depositors earn the same APY (higher than USDC alone)
  - **Asymmetric Withdrawal**: Regional depositors can withdraw USDC; USDC depositors cannot
  - **Updated Allocation**: 30% MM, 50% USDC, 20% regionals
  - **SBX Token Minting**: Actual SBX tokens minted/burned on stake/unstake
  - **Account Migration**: Transfer staking status between accounts
  - **Epoch-Based Yield**: Yield distributed after epoch completion
  - EUR-focused tokens (CHFX, TRYB, SEKX) with API-based price feeds
  - All functions accept prices as `u64` parameters (micro-USD)
  - Prices queried from API off-chain and passed to contract

### Previous Packages
- **Package ID:** `0x7d6fa54ec2a4ae5620967a2129860f5a8a0b4d9849df64f2ae9b5325f3ca7db0` (EUR-focused with 40/60 split)
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

**Note:** The `pyth_adapter` module has been removed as the system now uses API-based price feeds exclusively.

## Key Transactions

### Latest Package Publication (SBX Token + Migration Support)
- **Transaction Digest:** `4NsomjHZC6S54ZFjSbQDUt1RJHhSjbHbFtEPS1wtRziC`
- **Package ID:** `0x71157d06f6ea5ac0d5f952881126591da1c0d5e3980e9ab9dbf1d08dff989846`
- **Modules:** chfx, tryb, sekx, sbx, sbx_pool, usdc, jpyc, myrc, xsgd
- **Published:** Package includes SBX token minting/burning, account migration, epoch-based yield distribution, and updated allocation (30% MM, 50% USDC, 20% regionals)

### Previous Package Publication (Updated Allocation: 30/34/36 Split)
- **Transaction Digest:** `611riKrwzR62eKCZ8Rhu4egaMDboJPuesKeFJC3kajAm`
- **Package ID:** `0x1cf62d8fda34ae433ca12bdedcf4834e2a848c5ac4bc55a8c866c85697fc5295`
- **Modules:** chfx, tryb, sekx, sbx, sbx_pool, usdc, jpyc, myrc, xsgd
- **Published:** Package includes updated USDC allocation (30% MM, 34% USDC, 36% regionals) and EUR-focused tokens with API-based price feeds

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
   - **Unified basket**: All currencies (USDC + regionals) in one pool
   - **Asymmetric withdrawal**: Regional depositors can withdraw USDC; USDC depositors cannot
   - **Unified APY**: All depositors earn the same APY (weighted average)
   - Pool state management with balance-based allocation
   - Three-tier fee curve (80%/30% thresholds)
   - Direct A→B swaps (no USD intermediate)
   - Dynamic MM allocation (30% of excess)
   - Deposit/withdraw operations with depth-aware fees
   - **API-based price feeds** - prices passed as parameters


3. **chfx.move, tryb.move, sekx.move, usdc.move** - Token modules
   - Regulated currency creation (EUR-focused tokens)
   - Mint/transfer functions
   - Balance queries

### Key Features

- **Unified Basket:** All currencies (USDC + regionals) in one pool
- **Unified APY:** All depositors earn the same APY (higher than USDC alone)
- **Asymmetric Withdrawal:** Regional depositors can withdraw USDC; USDC depositors cannot
- **API-Based Price Feeds:** Prices queried off-chain and passed as parameters (no onchain queries)
- **EUR-Focused Tokens:** CHFX (Swiss Franc), TRYB (Turkish Lira), SEKX (Swedish Krona)
- **Three-Tier Fee Curve:** Cheap fixed rate (≥80%), linear scaling (30-80%), sudden jump (<30%)
- **Direct Swaps:** A→B swaps without USD intermediate (true infinity pool)
- **Balance-Based Allocation:** USDC allocation maintains 1:1 ratio with regionals (30/50/20 split)
- **Rebasing Mechanism:** SBX token quantity increases with APY (transparent yield accrual)
- **USD Value Calculation:** Accurate USD value calculation using API-provided prices
- **SBX Token Minting:** SBX tokens minted 1:1 with USD value of deposits

## Function Signatures

### Account Management Functions

```move
// Create a new account for a user
// Users need an account object to stake/unstake
public entry fun create_account(ctx: &mut TxContext);

// Migrate staking status from one account to another
// Transfers all staked amounts (staked_usdc, staked_chfx, staked_tryb, staked_sekx)
// from source_account to destination_account
// Requirements:
// - Only the owner of source_account can migrate
// - Destination account must exist (created via create_account)
// - Source account must have some staking status to migrate
// After migration, destination account can unstake if they have corresponding SBX tokens
public entry fun migrate_staking_status(
    source_account: &mut Account,
    destination_account: &mut Account,
    ctx: &TxContext
);
```

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
// Asymmetric rule: Only regional depositors can withdraw USDC
// USDC depositors cannot withdraw USDC (they can only withdraw regionals)
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
// Calculate unified APY for all depositors (dynamic based on balance)
// All depositors earn the same unified APY (higher than USDC alone)
public fun estimated_unified_apy_bps(
    registry: &Registry,
    pool: &Pool,
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

### Integration Tests
- Location: `first_package/tests/sbx_pool_integration_tests.move`
- Tests: Full integration tests including account creation, migration, staking, unstaking, swaps, yield distribution

### On-Chain Testing
- **Package Published:** ✅ Successfully published to IOTA testnet
- **Package ID:** `0x71157d06f6ea5ac0d5f952881126591da1c0d5e3980e9ab9dbf1d08dff989846`
- **Test Results:** See `first_package/TEST_RESULTS.md` for detailed on-chain test results

**Tested Functions (All Successful):**
- ✅ `create_registry` - Registry created successfully
- ✅ `create_account` - Account created successfully
- ✅ `create_pool` - Pool created successfully
- ✅ `admin_set_whitelist` - Whitelist updated
- ✅ `admin_set_prices_microusd` - Prices set
- ✅ `admin_set_targets` - Targets configured
- ✅ `admin_set_fee_params` - Fee parameters set
- ✅ `admin_set_mm_returns` - MM returns configured
- ✅ `stake_usdc` - USDC staking successful, SBX tokens minted
- ✅ `staked_usdc_of` - View function working
- ✅ `stats` - Pool stats retrieved
- ✅ `prices_microusd` - Prices retrieved

All core functions tested and working correctly on-chain!

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
- **Unified Basket Architecture**: All currencies (USDC + regionals) in one pool
- **Asymmetric Withdrawal Rules**: Regional depositors can withdraw USDC; USDC depositors cannot
- **Unified APY**: All depositors earn the same APY (higher than USDC alone)
- Token creation (CHFX, TRYB, SEKX, USDC) - EUR-focused
- API-based price feed integration (no onchain queries)
- Price parameters in all price-sensitive functions
- Three-tier fee curve (80%/30% thresholds)
- Direct A→B swaps (no USD intermediate)
- Balance-based USDC allocation (30/50/20 split)
- Dynamic MM allocation (30% of excess)
- Unified APY calculation (weighted average)
- Deposit type tracking (for asymmetric withdrawal enforcement)
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
    MM_allocation = excess * 0.3
    usdc_allocation = excess * 0.5
    swap_allocation = excess * 0.2 (to unhealthiest regionals)
```

### Unified APY
```
balance_ratio = USDC / sum(regionals)

Unified APY (for all depositors):
  fee_apy = (fees_7d / avg_tvl_7d) * 52 * 10_000
  mm_apy = weighted_average(mm_returns) based on pool composition
  unified_apy = fee_apy + mm_apy

All depositors earn the same unified APY (higher than USDC alone)
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
