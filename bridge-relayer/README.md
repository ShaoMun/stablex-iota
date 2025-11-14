# StableX Bridge Relayer

Bridge relayer service for cross-chain token transfers between IOTA L1 and EVM.

## Overview

The relayer watches events on both chains and submits corresponding transactions:
- Watches L1 `LockEvent` → calls EVM `mint()`
- Watches EVM `BurnEvent` → calls L1 `unlock()`

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (copy `.env.example` to `.env`):
```bash
# IOTA L1 Configuration
L1_RPC_URL=https://api.testnet.shimmer.network
L1_BRIDGE_PACKAGE_ID=0x...
L1_BRIDGE_OBJECT_ID=0x...
L1_PRIVATE_KEY=your_l1_private_key_here

# IOTA EVM Configuration
EVM_RPC_URL=https://evm.wasp.sc.iota.org
EVM_BRIDGE_ADDRESS=0x...
EVM_PRIVATE_KEY=your_evm_private_key_here
```

3. Run relayer:
```bash
npm start
```

Or run watchers separately:
```bash
npm run watch-l1  # Watch L1 events
npm run watch-evm  # Watch EVM events
```

## Architecture

- `l1-watcher.ts` - Watches L1 bridge events, submits EVM mint transactions
- `evm-watcher.ts` - Watches EVM bridge events, submits L1 unlock transactions
- `index.js` - Main entry point, runs both watchers

## POC Implementation

For POC, the relayer:
- Uses simple event polling (not production-ready)
- Relies on event-based verification (no merkle proofs)
- Requires manual configuration of contract addresses

For production:
- Use proper event indexing service
- Implement merkle proof verification
- Add retry logic and error handling
- Use proper wallet management


