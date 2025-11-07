# Token Transfer Guide

## Target Address
```
0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2
```

## Step 1: Publish the Package

First, publish the package to IOTA testnet:

```bash
cd /Users/hoshaomun/stablex/first_package
iota client publish .
```

**Important:** Save the output! You'll need:
- Package ID
- TreasuryCap object IDs for each token (XSGD, MYRC, JPYC, USDC)

After publishing, the `init` functions will automatically run and create TreasuryCap objects for each token. Look for lines like:
```
ObjectType: 0x2::coin::TreasuryCap<YOUR_PACKAGE_ID::xsgd::XSGD>
ObjectID: <TREASURY_CAP_ID>
```

## Step 2: Mint Tokens to Target Address

Once you have the TreasuryCap object IDs, mint tokens to the target address. Replace `<TREASURY_CAP_ID>` with the actual object IDs from the publish output.

### Mint XSGD
```bash
iota client call \
  --package <PACKAGE_ID> \
  --module xsgd \
  --function mint \
  --args object:<XSGD_TREASURY_CAP_ID> \
         address:0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2 \
         u64:1000000000
```

### Mint MYRC
```bash
iota client call \
  --package <PACKAGE_ID> \
  --module myrc \
  --function mint \
  --args object:<MYRC_TREASURY_CAP_ID> \
         address:0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2 \
         u64:1000000000
```

### Mint JPYC
```bash
iota client call \
  --package <PACKAGE_ID> \
  --module jpyc \
  --function mint \
  --args object:<JPYC_TREASURY_CAP_ID> \
         address:0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2 \
         u64:1000000000
```

### Mint USDC
```bash
iota client call \
  --package <PACKAGE_ID> \
  --module usdc \
  --function mint \
  --args object:<USDC_TREASURY_CAP_ID> \
         address:0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2 \
         u64:1000000000
```

**Note:** The amount `1000000000` represents 1000 tokens (with 6 decimals: 1000 * 10^6 = 1000000000). Adjust as needed.

## Step 3: Verify Transfer

You can verify the tokens were transferred by checking the target address on the IOTA testnet explorer or by querying the balance.

## Quick Script

After publishing, you can use this script (replace the IDs):

```bash
#!/bin/bash
PACKAGE_ID="<YOUR_PACKAGE_ID>"
TARGET="0xd4655ee4e9f16da4be0342c9e8e3729478be385c26caf43ec5e5a049198cb1a2"
AMOUNT=1000000000  # 1000 tokens with 6 decimals

# XSGD
iota client call --package $PACKAGE_ID --module xsgd --function mint \
  --args object:<XSGD_TREASURY> address:$TARGET u64:$AMOUNT

# MYRC
iota client call --package $PACKAGE_ID --module myrc --function mint \
  --args object:<MYRC_TREASURY> address:$TARGET u64:$AMOUNT

# JPYC
iota client call --package $PACKAGE_ID --module jpyc --function mint \
  --args object:<JPYC_TREASURY> address:$TARGET u64:$AMOUNT

# USDC
iota client call --package $PACKAGE_ID --module usdc --function mint \
  --args object:<USDC_TREASURY> address:$TARGET u64:$AMOUNT
```

