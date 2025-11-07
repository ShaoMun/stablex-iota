# Token Transfer Results

## Package Published Successfully ✅

**Package ID:** `0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d`

**Transaction Digest:** `EiqcqVvk4gVvbS9rgumfiLLGTVaf3Nb8BTfx69rVwTgi`

## Target Address
```
0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2
```

## TreasuryCap Object IDs

### ✅ XSGD TreasuryCap
```
0x89beb5ba6d155bb9075544e1e5033661b5e5f75b7389765a625bd2286fa27698
```

### ✅ MYRC TreasuryCap
```
0x07f70a073fb27c8499f3f9b09a3c270fef0687d6d49c96e6d860ec0f558c217d
```

### ✅ USDC TreasuryCap
```
0x73651b6faf9fb4ab4d291fe755227c2e0987c2e0e12884021df4ca4d94531c65
```

### ✅ JPYC TreasuryCap
```
0xf71c021f65604289f037726e04c426621a0fbe875f492bf8b57c76a58fe95df4
```

## Tokens Minted Successfully ✅

### ✅ XSGD - Minted
- Amount: 1000000000 (1000 tokens with 6 decimals)
- Recipient: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

### ✅ MYRC - Minted
- Amount: 1000000000 (1000 tokens with 6 decimals)
- Recipient: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

### ✅ USDC - Minted
- Amount: 1000000000 (1000 tokens with 6 decimals)
- Recipient: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

### ✅ JPYC - Minted
- Amount: 1000000000 (1000 tokens with 6 decimals)
- Recipient: `0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

## Finding JPYC TreasuryCap

To find the JPYC TreasuryCap, you can:

1. **Check your wallet objects:**
```bash
iota client objects 0xf49272345fe42917915a658bc5650f20c2e0699cccb66383ee315e1c4b0e670b
```
Look for objects with type containing `jpyc::JPYC` and `TreasuryCap`

2. **Check the transaction:**
```bash
iota client tx EiqcqVvk4gVvbS9rgumfiLLGTVaf3Nb8BTfx69rVwTgi
```
Look for `TreasuryCap` objects with `jpyc::JPYC` in the type

3. **Once found, mint JPYC:**
```bash
PACKAGE_ID="0xa5afd11d15dfa90e5ac47ac1a2a74b810b6d0d3c00df8c35c33b90c44e32931d"
TARGET="0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2"
JPYC_TREASURY="<JPYC_TREASURY_CAP_ID>"

iota client call --package $PACKAGE_ID --module jpyc --function mint \
  --args "$JPYC_TREASURY" "0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2" "1000000000"
```

## Verification

To verify tokens were received, check the target address on IOTA testnet explorer:
```
https://explorer.testnet.iota.cafe/address/0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2
```

## Summary

✅ **All 4 tokens successfully minted and transferred:**
- XSGD: ✅ Transferred (1000 tokens)
- MYRC: ✅ Transferred (1000 tokens)
- USDC: ✅ Transferred (1000 tokens)
- JPYC: ✅ Transferred (1000 tokens)

**JPYC TreasuryCap ID:** `0xf71c021f65604289f037726e04c426621a0fbe875f492bf8b57c76a58fe95df4`

All tokens are minted with amount `1000000000` (1000 tokens with 6 decimals) to the target address:
`0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2`

