# StableX - Stablecoin Exchange on IOTA

A stablecoin exchange platform built on IOTA using Move language, inspired by Sanctum's infinity pool concept. The exchange addresses fragmented liquidity for regional stablecoins by allowing users to deposit regional stablecoins, earn yield, and receive SBX tokens that can be instantly exchanged for USDC.

## Project Overview

### Concept
- **Regional Stablecoins** → LST (Liquid Staking Tokens)
- **SBX Token** → INF (Infinity Token)
- **USDC Reserve Pool** → SOL Reserve Pool

Users deposit regional stablecoins (XSGD, MYRC, JPYC) to earn yield, receive SBX tokens, and can instantly exchange SBX for USDC from the reserve pool or exchange back to regional stablecoins under certain conditions.

## Package Information

### Latest Package (with Pyth Integration)
- **Package ID:** `0x2506d448a995c8fd26f3e3a2276409b241fbb4aab54a93256c59670b946d46e0`
- **Published:** Latest version with Pyth price feed integration
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
   - Pool state management
   - User account management
   - Deposit/withdraw operations
   - Instant swap functionality
   - Pyth price integration

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

- **Live Price Integration:** Deposit functions fetch real-time prices from Pyth
- **Automatic Freshness Validation:** Prices are validated to be no older than 5 minutes
- **USD Value Calculation:** Accurate USD value calculation using live prices
- **SBX Token Minting:** SBX tokens minted based on USD value of deposits

## Function Signatures

### Deposit Functions (with Live Pyth Prices)

```move
public entry fun deposit_xsgd(
    account: &mut Account,
    pool: &mut Pool,
    registry: &Registry,
    xsgd_price_info_obj: &PriceInfoObject,
    amount: u64,
    clock: &Clock,
    ctx: &TxContext
)

public entry fun deposit_myrc(
    account: &mut Account,
    pool: &mut Pool,
    registry: &Registry,
    myrc_price_info_obj: &PriceInfoObject,
    amount: u64,
    clock: &Clock,
    ctx: &TxContext
)

public entry fun deposit_jpyc(
    account: &mut Account,
    pool: &mut Pool,
    registry: &Registry,
    jpyc_price_info_obj: &PriceInfoObject,
    amount: u64,
    clock: &Clock,
    ctx: &TxContext
)
```

### Price Management

```move
public entry fun refresh_prices_from_pyth(
    registry: &mut Registry,
    pyth_state: &State,
    xsgd_price_info_obj: &PriceInfoObject,
    myrc_price_info_obj: &PriceInfoObject,
    jpyc_price_info_obj: &PriceInfoObject,
    clock: &Clock,
    ctx: &TxContext
)

public entry fun test_pyth_feed(
    price_info_object: &PriceInfoObject,
    clock: &Clock,
    ctx: &TxContext
)
```

## Testing

### Fuzz Tests
- Location: `first_package/tests/sbx_pool_fuzz_tests.move`
- Tests: Deposit calculations, swap fees, reserve ratios, price conversions

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
- Live price fetching in deposit functions
- Fuzz testing for core logic
- Package compilation and publishing

⚠️ **In Progress:**
- On-chain testing with actual PriceInfoObject references
- Feed registration verification

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

