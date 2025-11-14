# StableX EVM Contracts

EVM contracts for StableX cross-chain bridge on IOTA EVM testnet.

## Contracts

### Token Contracts
- `CHFX.sol` - Swiss Franc token (ERC-20)
- `TRYB.sol` - Turkish Lira token (ERC-20)
- `SEKX.sol` - Swedish Krona token (ERC-20)
- `USDC.sol` - USD Coin token (ERC-20)
- `wSBX.sol` - Wrapped SBX token (ERC-20, mintable/burnable by bridge)

### Bridge Contract
- `EVMBridge.sol` - Bridge contract for cross-chain transfers
  - `mint()` - Mint wrapped tokens when L1 tokens are locked
  - `burn()` - Burn wrapped tokens to unlock on L1

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
export IOTA_EVM_RPC_URL=https://evm.wasp.sc.iota.org
export PRIVATE_KEY=your_private_key_here
```

3. Compile contracts:
```bash
npm run compile
```

4. Deploy contracts:
```bash
npm run deploy
```

## Network Configuration

- **Network**: IOTA EVM Testnet
- **Chain ID**: 1074
- **RPC URL**: https://evm.wasp.sc.iota.org

## Bridge Flow

### L1 → EVM (Lock → Mint)
1. User locks tokens on L1 bridge
2. L1 bridge emits `LockEvent`
3. Relayer watches L1 events
4. Relayer calls `EVMBridge::mint()` on EVM
5. EVM bridge mints wrapped tokens to user

### EVM → L1 (Burn → Unlock)
1. User burns wrapped tokens on EVM bridge
2. EVM bridge emits `BurnEvent`
3. Relayer watches EVM events
4. Relayer calls `bridge_l1::unlock()` on L1
5. L1 bridge unlocks tokens from escrow

## Security

- Nonce system prevents replay attacks
- Escrow ensures 1:1 token backing
- Event-based verification (POC)
- For production: implement merkle proof verification


