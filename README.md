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

### 6. Flash Loan Vault (Replaces Mock MM Allocation)

- **Dynamic allocation**: Only when pool is balanced (has excess)
- **30% of excess** goes to flash loan vault when USDC ≥ sum(regionals)
- **Real use case**: Flash loans for arbitrage, liquidations, and other DeFi operations
- **Flash loan mechanism**: Borrow USDC, use it, and repay in the same transaction
- **No fees required**: Flash loans are repaid at face value (any excess is kept as fee)
- **Reentrancy protection**: Vault tracks `flashed` flag to prevent multiple simultaneous loans

## Package Information

### Latest Package (Unstake Coin Transfer - Production Ready)
- **Package ID:** `0x05c4be9ea7e0ab044c923099fa41f94f524fd29339f0b2447373574377b2a20e`
- **Published:** Latest version with unstake coin transfer logic (unstake functions properly transfer coins to users)
- **Network:** IOTA Testnet
- **Pool Object ID:** `0xb727a10b1d354bd1f4b7f19152aee6fbf33bafcf9e741560a34bdaa0365fd189` (Shared)
- **Registry Object ID:** `0x911ad622c7b733650e06a609ee8bb808d4a6ff184cd15ce731b5033c036e914d` (Shared)
- **Key Updates:**
  - ✅ **Unstake Coin Transfers**: Unstake functions now properly transfer coins from pool reserves to users
  - ✅ **USDC Reserve Balance**: Pool struct includes `usdc_reserve_balance: Balance<USDC>` for unstaking USDC
  - ✅ **Currency Whitelisting**: Regional currencies (CHFX, TRYB, SEKX) must be whitelisted via `admin_set_whitelist` before staking
  - ✅ **Price Setting**: Prices must be set in registry via `admin_set_prices_microusd` before staking
  - ✅ **Frontend Updates**: All frontend components updated with new package and object IDs
  - ✅ **Currency Modal**: Updated to fetch balances from new package
- **Previous Package ID:** `0xe917e90a0763a67851076f55ac8eda48a533b3ff6c1bb1d0774d10c6d8c40ca2` (Fee tolerance fix)
- **Modules:** `chfx`, `tryb`, `sekx`, `sbx`, `sbx_pool`, `usdc`, `flash_vault`, `jpyc`, `myrc`, `xsgd`
- **Key Features:**
  - **Shared Objects**: Pool and Registry are shared objects, enabling multi-user interaction
  - **Unified Basket**: All currencies (USDC + regionals) in one pool
  - **Unified APY**: All depositors earn the same APY (higher than USDC alone)
  - **Asymmetric Withdrawal**: Regional depositors can withdraw USDC; USDC depositors cannot
  - **Flash Loan Vault**: Real flash loan functionality (30% of excess USDC)
  - **Updated Allocation**: 30% Flash Vault, 50% USDC, 20% regionals
  - **SBX Token Minting**: Actual SBX tokens minted/burned on stake/unstake
  - **Account Management**: Automatic account creation for users
  - **Coin Transfers**: Coins are properly transferred to the pool during staking
  - **Epoch-Based Yield**: Yield distributed after epoch completion
  - **Frontend Integration**: Full dApp with wallet connection, staking UI, and transaction handling
  - EUR-focused tokens (CHFX, TRYB, SEKX) with API-based price feeds
  - All functions accept prices as `u64` parameters (micro-USD)
  - Prices queried from API off-chain and passed to contract

### Frontend dApp

The frontend is a Next.js application with full wallet integration:

- **Wallet Connection**: IOTA dApp Kit integration with wallet persistence
- **Staking Interface**: ✅ Full staking UI with currency selection, amount input, fee display
- **Swap Interface**: ✅ Direct A→B swaps between regional stablecoins with real-time rate calculation
- **Real-time Prices**: Fetches prices from Pyth Network Hermes API
- **Fee Calculation**: Real-time fee calculation from the pool contract with depth-aware fees
- **Transaction Handling**: Automatic account creation, coin transfers, and SBX minting
- **Transaction Explorer**: Success snackbar with link to IOTA explorer (fixed position overlay)
- **Network Support**: Testnet configuration with auto-connect and persistence

**Key Frontend Features:**
- ✅ **Staking**: Multi-currency support (USDC, CHFX, TRYB, SEKX, JPYC, MYRC, XSGD)
- ✅ **Swapping**: Direct swaps between regional stablecoins (CHFX, TRYB, SEKX)
- ✅ **Price Synchronization**: Exact price matching between frontend and on-chain transactions
- ✅ **BigInt Precision**: All calculations use BigInt to match Move contract integer arithmetic
- ✅ **USD Value Display**: Accurate USD value display for all currencies
- ✅ **Fee Breakdown**: Collapsible fee breakdown (network fee, deposit fee, swap fee)
- ✅ **Account Management**: Automatic account creation and caching
- ✅ **Shared Objects**: Proper handling of Pool and Registry shared objects
- ✅ **Coin Transfers**: Coins properly split and transferred to pool during staking
- ✅ **Transaction Status**: Snackbar notifications with explorer links for successful transactions

### Previous Packages
- **Package ID:** `0x82dbc84bde7f084cd91ff6d66a8c80fb7a569ba7d4fbe4b6dba5fa6a2223518d` (Coin Transfer Logic - swaps transfer from pool reserves)
- **Package ID:** `0x71157d06f6ea5ac0d5f952881126591da1c0d5e3980e9ab9dbf1d08dff989846` (Unified Basket with Migration - had owned objects issue)
- **Package ID:** `0x7d6fa54ec2a4ae5620967a2129860f5a8a0b4d9849df64f2ae9b5325f3ca7db0` (EUR-focused with 40/60 split)
- **Package ID:** `0xce5a8930723f277deb6d1b2d583e732b885458cb6452354c502cb70da8f7cff9` (with test_feed_from_state)
- **Package ID:** `0xca283c3f232d60738aac7003395391846ef0b4e2ec6af1558f5781eec1d9c4ef` (initial Pyth integration)
- **Package ID:** `0x95f3d3f7bd7b844205c5a71c7fc90e8152f8562817e6406ec3d8cfee2b5bba91` (placeholder implementation)
- **Package ID:** `0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d` (initial token creation)

## Token Information

### EUR-Focused Tokens

All tokens are regulated currencies with 6 decimals:

1. **CHFX (Swiss Franc)**
   - Package: `0x05c4be9ea7e0ab044c923099fa41f94f524fd29339f0b2447373574377b2a20e`
   - Coin Type: `0x05c4be9ea7e0ab044c923099fa41f94f524fd29339f0b2447373574377b2a20e::chfx::CHFX`
   - Initial Mint: 10,000 tokens (10,000,000,000 with 6 decimals)
   - Owner: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

2. **TRYB (Turkish Lira)**
   - Package: `0x05c4be9ea7e0ab044c923099fa41f94f524fd29339f0b2447373574377b2a20e`
   - Coin Type: `0x05c4be9ea7e0ab044c923099fa41f94f524fd29339f0b2447373574377b2a20e::tryb::TRYB`
   - Initial Mint: 10,000 tokens (10,000,000,000 with 6 decimals)
   - Owner: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

3. **SEKX (Swedish Krona)**
   - Package: `0x05c4be9ea7e0ab044c923099fa41f94f524fd29339f0b2447373574377b2a20e`
   - Coin Type: `0x05c4be9ea7e0ab044c923099fa41f94f524fd29339f0b2447373574377b2a20e::sekx::SEKX`
   - Initial Mint: 10,000 tokens (10,000,000,000 with 6 decimals)
   - Owner: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

4. **USDC (USD Coin)**
   - Package: `0x05c4be9ea7e0ab044c923099fa41f94f524fd29339f0b2447373574377b2a20e`
   - Coin Type: `0x05c4be9ea7e0ab044c923099fa41f94f524fd29339f0b2447373574377b2a20e::usdc::USDC`
   - Initial Mint: 10,000 tokens (10,000,000,000 with 6 decimals)
   - Owner: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

**Note:** SBX tokens are minted during staking and burned during unstaking. No initial mint required.

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

### Latest Package Publication (Unstake Coin Transfer - Production Ready)
- **Package ID:** `0x05c4be9ea7e0ab044c923099fa41f94f524fd29339f0b2447373574377b2a20e`
- **Modules:** chfx, tryb, sekx, sbx, sbx_pool, usdc, flash_vault, jpyc, myrc, xsgd
- **Published:** Latest version with unstake coin transfer logic, shared objects for multi-user access, unified basket architecture, and full frontend integration with staking, unstaking, and swapping
- **Key Features:**
  - ✅ Unstake functions properly transfer coins from pool reserves to users
  - ✅ Pool includes `usdc_reserve_balance: Balance<USDC>` for unstaking USDC
  - ✅ Currency whitelisting required before staking regional currencies
  - ✅ Price setting required in registry before staking
  - ✅ Frontend fully updated with new package and object IDs

### Previous Package Publication (SBX Token + Migration Support)
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
   - Flash loan vault integration (30% of excess)
   - Deposit/withdraw operations with depth-aware fees
   - **API-based price feeds** - prices passed as parameters

2. **flash_vault.move** - Flash loan vault module
   - **Flash loan mechanism**: Borrow USDC, use it, repay in same transaction
   - **Reentrancy protection**: `flashed` flag prevents multiple simultaneous loans
   - **Receipt system**: Tracks loan details for repayment validation
   - **Security features**: Zero amount protection, balance validation, state consistency
   - Shared object design for multi-user access
   - Admin functions for vault management
   - **Deployed**: Included in latest package `0x82dbc84bde7f084cd91ff6d66a8c80fb7a569ba7d4fbe4b6dba5fa6a2223518d`

3. **chfx.move, tryb.move, sekx.move, usdc.move** - Token modules
   - Regulated currency creation (EUR-focused tokens)
   - Mint/transfer functions
   - Balance queries

### Key Features

- **Unified Basket:** All currencies (USDC + regionals) in one pool
- **Unified APY:** All depositors earn the same APY (higher than USDC alone)
- **Asymmetric Withdrawal:** Regional depositors can withdraw USDC; USDC depositors cannot
- **Flash Loan Vault:** Real flash loan functionality replacing mock MM allocation (30% of excess) - **Deployed on IOTA Testnet**
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
// The frontend automatically creates accounts when needed
public entry fun create_account(ctx: &mut TxContext);

// Transfer all staking status from one account to a new account for destination address
// Transfers all staked amounts (staked_usdc, staked_chfx, staked_tryb, staked_sekx)
// from source_account to a new account created for destination_address
// Requirements:
// - Only the owner of source_account can migrate
// - Source account must have some staking status to migrate
// - Optionally transfers SBX tokens along with staking status
// After migration, the new account can unstake if they have corresponding SBX tokens
public entry fun transfer_account_and_staking(
    source_account: &mut Account,
    destination_address: address,
    transfer_sbx: bool,
    sbx_coin: Coin<SBX>,
    ctx: &mut TxContext
);

// Transfer partial staking status for a specific currency to a new account
// Only migrates the selected currency's staked amount (not all currencies)
// Currency type: 0 = USDC, 1 = CHFX, 2 = TRYB, 3 = SEKX
// Requirements:
// - Only the owner of source_account can migrate
// - Source account must have staking status for the selected currency
// - Optionally transfers SBX tokens along with staking status
// After migration, the new account can unstake the migrated currency if they have corresponding SBX tokens
public entry fun transfer_partial_staking(
    source_account: &mut Account,
    destination_address: address,
    currency_type: u8, // 0 = USDC, 1 = CHFX, 2 = TRYB, 3 = SEKX
    transfer_sbx: bool,
    sbx_coin: Coin<SBX>,
    ctx: &mut TxContext
);
```

### Staking Functions

```move
// Stake USDC - mints SBX tokens 1:1 with USD value
// Note: Coins must be transferred to pool before calling this function
// The frontend handles coin splitting and transfer automatically
public entry fun stake_usdc(
    account: &mut Account,
    pool: &mut Pool,
    registry: &Registry,
    amount: u64,
    chfx_price_microusd: u64,
    tryb_price_microusd: u64,
    sekx_price_microusd: u64,
    ctx: &mut TxContext
)

// Stake regional stablecoins - mints SBX based on USD value
// Note: Coins must be transferred to pool before calling this function
// The frontend handles coin splitting and transfer automatically
public entry fun stake_chfx(
    account: &mut Account,
    pool: &mut Pool,
    registry: &Registry,
    amount: u64,
    price_microusd: u64,
    ctx: &mut TxContext
)

public entry fun stake_tryb(...)
public entry fun stake_sekx(...)
```

**Frontend Integration:**
- Automatically splits coins to get exact amounts
- Transfers coins to pool object before staking
- Creates account objects if needed
- Fetches real-time prices from API
- Displays USD values and fees

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
// Applies depth-aware fees based on pool utilization and withdrawal percentage
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

**Frontend Integration:**
- ✅ Real-time swap rate calculation via `/api/swap-rate` endpoint
- ✅ Exact price synchronization between API and on-chain transaction
- ✅ BigInt precision matching Move contract integer arithmetic
- ✅ Depth-aware fee calculation with three-tier fee curve
- ✅ Coin splitting and transfer for exact amounts
- ✅ Transaction status snackbar with explorer link

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
// Required before staking regional currencies
public entry fun admin_set_prices_microusd(
    registry: &mut Registry,
    chfx: u64,
    tryb: u64,
    sekx: u64,
    ctx: &TxContext
)

// Whitelist currencies (required before staking)
// Regional currencies must be whitelisted before users can stake them
public entry fun admin_set_whitelist(
    registry: &mut Registry,
    chfx: bool,
    tryb: bool,
    sekx: bool,
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

// Deposit USDC to flash loan vault (for MM allocation)
public entry fun admin_deposit_vault_usdc(
    pool: &mut Pool,
    vault: &mut FlashVault,
    coin: Coin<USDC>,
    ctx: &TxContext
)

// Withdraw USDC from flash loan vault
// This is a regular function (not entry) - returns Coin that must be handled in PTB
public fun admin_withdraw_vault_usdc(
    pool: &mut Pool,
    vault: &mut FlashVault,
    amount: u64,
    ctx: &mut TxContext
): Coin<USDC>
```

### Flash Loan Functions

```move
// Create flash loan vault (shared object)
// Must be called once to initialize the vault
public entry fun create_vault(ctx: &mut TxContext)

// Flash loan: Borrow USDC from vault
// Returns: (borrowed_coin, receipt)
// Must be repaid in the same transaction via repay_flash_loan
// This is a regular function (not entry) - users must build PTBs to call it
public fun flash_loan(
    vault: &mut FlashVault,
    amount: u64,
    ctx: &mut TxContext
): (Coin<USDC>, Receipt)

// Repay flash loan
// Must repay at least the borrowed amount (can pay more as fee)
// This is a regular function (not entry) - users must build PTBs to call it
public fun repay_flash_loan(
    vault: &mut FlashVault,
    coin: Coin<USDC>,
    receipt: Receipt
)

// Get flash vault balance
public fun vault_balance(vault: &FlashVault): u64

// Check if vault is currently flashed (loan active)
public fun vault_is_flashed(vault: &FlashVault): bool
```

**Flash Loan Usage Pattern:**
Users must build a Programmable Transaction Block (PTB) that:
1. Calls `flash_loan()` to borrow USDC and get a receipt
2. Performs operations with the borrowed USDC (arbitrage, liquidations, etc.)
3. Calls `repay_flash_loan()` with the USDC (plus any fee) and receipt

The loan must be repaid in the same transaction. Any excess amount paid is kept as a fee by the vault.

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

### Production Status
- **Package Published:** ✅ Successfully published to IOTA testnet
- **Package ID:** `0x82dbc84bde7f084cd91ff6d66a8c80fb7a569ba7d4fbe4b6dba5fa6a2223518d`
- **Pool Object:** ✅ Created as shared object (multi-user access enabled)
- **Registry Object:** ✅ Created as shared object (multi-user access enabled)
- **Frontend Integration:** ✅ Fully functional with wallet connection, staking, and swapping
- **Test Results:** See `first_package/TEST_RESULTS.md` for detailed on-chain test results

**Production-Ready Features:**
- ✅ `create_registry` - Registry created as shared object
- ✅ `create_pool` - Pool created as shared object with `usdc_reserve_balance` for unstaking
- ✅ `create_account` - Automatic account creation for users
- ✅ `stake_usdc`, `stake_chfx`, `stake_tryb`, `stake_sekx` - All staking functions working
- ✅ `unstake_usdc`, `unstake_chfx`, `unstake_tryb`, `unstake_sekx` - All unstake functions working with coin transfers
- ✅ `swap_regional` - Direct A→B swaps between regional stablecoins working
- ✅ `transfer_account_and_staking` - Full account migration (all currencies) with optional SBX transfer
- ✅ `transfer_partial_staking` - Partial migration (single currency) with optional SBX transfer
- ✅ Coin transfers - Coins properly split, transferred to pool during staking, and transferred to users during unstaking
- ✅ SBX minting/burning - SBX tokens minted 1:1 with USD value on stake, burned on unstake
- ✅ Real-time fee calculation - Network fees, deposit fees, swap fees, and unstake fees with depth-aware pricing
- ✅ Price feeds - API-based price queries with exact synchronization between frontend and contract
- ✅ Currency whitelisting - Regional currencies must be whitelisted before staking
- ✅ Price setting - Prices must be set in registry before staking
- ✅ Transaction explorer integration - Success snackbar notifications with explorer links
- ✅ Balance refresh - CurrencyModal automatically refreshes balances after transactions

**Status:** ✅ Production-ready on IOTA Testnet - Stake, Unstake, and Swap fully operational

**Setup Requirements:**
1. Whitelist currencies: `admin_set_whitelist(registry, true, true, true)` - Enable CHFX, TRYB, SEKX
2. Set prices: `admin_set_prices_microusd(registry, chfx_price, tryb_price, sekx_price)` - Set current prices in micro-USD

## Dependencies

### Move.toml
```toml
[package]
name = "first_package"
edition = "2024"

[dependencies]

[addresses]
first_package = "0x0"
```

### Frontend Dependencies
- `@iota/dapp-kit`: IOTA dApp Kit for wallet integration
- `@iota/iota-sdk`: IOTA SDK for client operations
- `@tanstack/react-query`: Data fetching and state management
- `next`: Next.js framework
- `react`: React library

## Development Status

✅ **Production Ready - Stake & Swap Fully Functional:**

### Core Features (✅ Working)
- ✅ **Staking**: Multi-currency staking (USDC, CHFX, TRYB, SEKX, JPYC, MYRC, XSGD)
- ✅ **Unstaking**: Unstake SBX tokens to receive any supported currency with proper coin transfers
- ✅ **Swapping**: Direct A→B swaps between regional stablecoins with real-time rate calculation
- ✅ **Unified Basket Architecture**: All currencies (USDC + regionals) in one pool
- ✅ **Shared Objects**: Pool and Registry created as shared objects for multi-user access
- ✅ **Asymmetric Withdrawal Rules**: Regional depositors can withdraw USDC; USDC depositors cannot
- ✅ **Unified APY**: All depositors earn the same APY (higher than USDC alone)
- ✅ **Flash Loan Vault**: Real flash loan functionality deployed on IOTA Testnet
- ✅ **Frontend dApp**: Complete Next.js application with full wallet integration
- ✅ **Coin Management**: Proper coin splitting and transfer for exact amounts (staking and unstaking)
- ✅ **Price Synchronization**: Exact price matching between API calculations and on-chain transactions
- ✅ **BigInt Precision**: All calculations use BigInt to match Move contract integer arithmetic
- ✅ **Transaction Status**: Snackbar notifications with explorer links
- ✅ **Balance Refresh**: Automatic balance updates in CurrencyModal after transactions
- ✅ **Staked Amount Display**: StakedCurrencyModal shows staked amounts from user's Account object
- ✅ **Partial Migration**: Migrate individual currencies (USDC, CHFX, TRYB, SEKX) to different accounts
- ✅ **Full Migration**: Transfer all staking status to a new account (legacy function)

### Technical Implementation (✅ Complete)
- ✅ Token creation (CHFX, TRYB, SEKX, USDC, JPYC, MYRC, XSGD)
- ✅ API-based price feed integration (no onchain queries)
- ✅ Price parameters in all price-sensitive functions
- ✅ Three-tier fee curve (80%/30% thresholds) with depth-aware fees
- ✅ Direct A→B swaps (no USD intermediate)
- ✅ Balance-based USDC allocation (30/50/20 split)
- ✅ Flash loan vault allocation (30% of excess)
- ✅ Unified APY calculation (weighted average)
- ✅ Deposit type tracking (for asymmetric withdrawal enforcement)
- ✅ Package compilation and publishing
- ✅ Token minting (1000 tokens of each type)

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
    flash_vault_allocation = excess * 0.3  // Flash loan vault
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

## Network & Deployment

- **Network:** IOTA Testnet
- **Explorer:** https://explorer.iota.org/ (use `?network=testnet` parameter)
- **Latest Package ID:** `0x05c4be9ea7e0ab044c923099fa41f94f524fd29339f0b2447373574377b2a20e`
- **Pool Object:** `0xb727a10b1d354bd1f4b7f19152aee6fbf33bafcf9e741560a34bdaa0365fd189` (Shared)
- **Registry Object:** `0x911ad622c7b733650e06a609ee8bb808d4a6ff184cd15ce731b5033c036e914d` (Shared)
- **Admin Address:** `0x32113604f66eaa7cace8b35b65d6ccaf6a7ee65be0345a3d1e33653fd113b274`

## Quick Start

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The dApp will be available at `http://localhost:3000`

### Contract Development

```bash
cd first_package
iota move build
iota client publish
```

### Environment Variables

The frontend uses the following environment variables (optional):
- `NEXT_PUBLIC_POOL_OBJECT_ID`: Override default pool object ID
- `NEXT_PUBLIC_REGISTRY_OBJECT_ID`: Override default registry object ID

## Audit Trail

All package IDs, transaction IDs, and object IDs are documented above for future reference and audit purposes.
