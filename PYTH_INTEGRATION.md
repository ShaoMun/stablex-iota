# Pyth Network Integration Guide

## Current Status

✅ **Infrastructure Ready:**
- Pyth adapter module created (`pyth_adapter.move`)
- Test functions added to `sbx_pool` for feed verification
- Registry structure ready to store Pyth state and feed IDs

⚠️ **Pending Implementation:**
- Actual Pyth API integration (needs verification of module structure)
- Live price reading functions
- Price feed ID testing on IOTA testnet

## Pyth Network Details

**Pyth State ID (IOTA Testnet):**
```
0x68dda579251917b3db28e35c4df495c6e664ccc085ede867a9b773c8ebedc2c1
```

**Pyth Package ID (IOTA Testnet):**
```
0x23994dd119480ea614f7623520337058dca913cb1bb6e5d8d51c7b067d3ca3bb
```

## Price Feed IDs to Test

**USD/SGD:**
```
0x6256c91c19cfbbfc6f91e1fd15c028a26be1f78bb59ac9f7250cbb67f9e5b964
```

**USD/MYR:**
```
0xb69ac34651e9f72e0be5bb4c6da5d7ddff38dc4ac1fb1528f7f8c579e42082f0
```

**USD/JPY:**
```
0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52
```

## Testing Steps

### 1. Publish the Package
```bash
cd /Users/hoshaomun/stablex/first_package
iota client publish .
```

### 2. Initialize Pool and Registry
```bash
# Get the package ID from publish output
PACKAGE_ID=<your-package-id>

# Create pool
iota client call --package $PACKAGE_ID --module sbx_pool --function create_pool \
  --args u64:30 u64:1000

# Create registry with Pyth addresses
iota client call --package $PACKAGE_ID --module sbx_pool --function create_registry \
  --args address:0x68dda579251917b3db28e35c4df495c6e664ccc085ede867a9b773c8ebedc2c1 \
        address:0x23994dd119480ea614f7623520337058dca913cb1bb6e5d8d51c7b067d3ca3bb

# Set feed IDs
iota client call --package $PACKAGE_ID --module sbx_pool --function admin_set_feeds \
  --args <registry-object-id> \
        address:0x6256c91c19cfbbfc6f91e1fd15c028a26be1f78bb59ac9f7250cbb67f9e5b964 \
        address:0xb69ac34651e9f72e0be5bb4c6da5d7ddff38dc4ac1fb1528f7f8c579e42082f0 \
        address:0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52
```

### 3. Test Pyth Feed Connectivity

Test each feed ID to see if it responds on IOTA testnet:

```bash
# Test USD/SGD feed
iota client call --package $PACKAGE_ID --module sbx_pool --function test_pyth_feed \
  --args address:0x68dda579251917b3db28e35c4df495c6e664ccc085ede867a9b773c8ebedc2c1 \
        address:0x6256c91c19cfbbfc6f91e1fd15c028a26be1f78bb59ac9f7250cbb67f9e5b964

# Test USD/MYR feed
iota client call --package $PACKAGE_ID --module sbx_pool --function test_pyth_feed \
  --args address:0x68dda579251917b3db28e35c4df495c6e664ccc085ede867a9b773c8ebedc2c1 \
        address:0xb69ac34651e9f72e0be5bb4c6da5d7ddff38dc4ac1fb1528f7f8c579e42082f0

# Test USD/JPY feed
iota client call --package $PACKAGE_ID --module sbx_pool --function test_pyth_feed \
  --args address:0x68dda579251917b3db28e35c4df495c6e664ccc085ede867a9b773c8ebedc2c1 \
        address:0xef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52
```

## Important Notes

### Beta vs Stable Feeds
According to Pyth documentation, testnet users (Aptos, Sui, Near) should use **Beta price feed IDs** instead of stable ones. We need to verify if this applies to IOTA testnet as well.

### Next Steps

1. **Discover Pyth API Structure:**
   - Examine the Pyth package modules: `state`, `price_feed`, `price_identifier`
   - Identify the correct function signatures for reading prices
   - Understand how to pass feed IDs (bytes vs address)

2. **Implement Price Reading:**
   - Update `pyth_adapter::read_price_microusd()` with actual Pyth calls
   - Implement price validation (staleness, confidence)
   - Convert Pyth price format to micro-USD

3. **Integrate with Deposit Functions:**
   - Update `deposit_xsgd`, `deposit_myrc`, `deposit_jpyc` to read live prices
   - Add fallback to cached prices if Pyth read fails
   - Implement price refresh mechanism

4. **Testing:**
   - Verify all three feed IDs work on IOTA testnet
   - Test price reading accuracy
   - Validate price freshness checks
   - Test error handling (stale prices, missing feeds)

## Current Implementation

The current implementation includes:
- ✅ Placeholder functions for testing feed connectivity
- ✅ Registry structure to store Pyth state and feed IDs
- ✅ Test entry points for verifying feeds work
- ⏳ Actual Pyth API integration (pending API discovery)

## Resources

- [Pyth Network Documentation](https://docs.pyth.network/)
- [IOTA Pyth Integration](https://www.pyth.network/blog/pyth-price-feeds-launch-on-iota-evm)
- Pyth Package: `0x23994dd119480ea614f7623520337058dca913cb1bb6e5d8d51c7b067d3ca3bb`
- Pyth State: `0x68dda579251917b3db28e35c4df495c6e664ccc085ede867a9b773c8ebedc2c1`

