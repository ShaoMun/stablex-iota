# Whitepaper Charts Required

This document outlines all the charts and diagrams needed for the StableX Whitepaper.

## Total Charts Required: **9**

---

## Chart 1: System Architecture Overview
**Location:** Architecture Section → System Overview

**Purpose:** High-level diagram showing the relationship between all system components

**Should Include:**
- IOTA L1 layer (Move contracts)
- IOTA EVM layer (Solidity contracts)
- Bridge relayer service
- User interactions (wallets, frontend)
- Price feed API integration
- Connections and data flow between components

**Style:** High-level system diagram, can be simplified/abstracted

---

## Chart 2: Component Diagram
**Location:** Architecture Section → Component Diagram

**Purpose:** Detailed breakdown of all system components and their interactions

**Should Include:**
- Pool contracts (sbx_pool.move, StableXPool.sol)
- Bridge contracts (bridge_l1.move, EVMBridge.sol)
- Token contracts (all currencies on both chains)
- Flash vault (flash_vault.move)
- Registry/Shared objects
- Data flow between components
- Function call relationships

**Style:** Detailed technical diagram showing all contracts and their relationships

---

## Chart 3: Data Flow Diagram
**Location:** Architecture Section → Data Flow

**Purpose:** How data and transactions flow through the system

**Should Include:**
- Staking flow (user → pool → SBX mint)
- Swapping flow (A → pool → B)
- Bridging flow (L1 → EVM and vice versa)
- Price feed integration
- Event emission and relayer processing
- Sequence of operations

**Style:** Flowchart or sequence diagram showing transaction flows

---

## Chart 4: Multi-Chain Architecture
**Location:** Multi-Chain Architecture Section → Unified Liquidity

**Purpose:** Visual representation of the dual-chain setup

**Should Include:**
- IOTA L1 layer with Move contracts
- IOTA EVM layer with Solidity contracts
- Bridge connection between chains
- Token wrapping/unwrapping mechanism
- Unified liquidity concept
- Side-by-side comparison of L1 vs EVM components

**Style:** Side-by-side or layered diagram showing both chains

---

## Chart 5: Pool Architecture
**Location:** Pool Mechanics Section → Unified Basket

**Purpose:** Diagram showing the unified pool structure

**Should Include:**
- Unified basket with all currencies (USDC, CHFX, TRYB, SEKX)
- SBX token minting/burning mechanism
- Deposit/withdrawal flows
- Asymmetric withdrawal rules (visual indication)
- Yield distribution mechanism
- Pool balance representation

**Style:** Pool structure diagram, possibly circular or box-based

---

## Chart 6: Three-Tier Fee Curve
**Location:** Fee Structure Section → Three-Tier System

**Purpose:** Graph showing the fee structure based on pool coverage

**Should Include:**
- X-axis: Pool coverage percentage (0-100%)
- Y-axis: Fee in basis points
- Three distinct tiers with thresholds at 30% and 80%
- Tier 1: Flat low fee (≥80%) - horizontal line
- Tier 2: Linear increase (30-80%) - diagonal line
- Tier 3: Exponential increase (<30%) - curved line
- Threshold markers at 30% and 80%
- Example fee values at key points

**Style:** Line graph with clear tier divisions and annotations

---

## Chart 7: Direct A→B Swap Flow
**Location:** Swapping Mechanism Section → Direct A→B Swaps

**Purpose:** Diagram showing the swap process without intermediate steps

**Should Include:**
- User initiates swap (Currency A → Currency B)
- Price feed provides exchange rate
- Fee calculation based on pool depth
- Direct transfer from pool (no intermediate token)
- Pool balance updates
- SBX token involvement (if any)
- Comparison to traditional DEX routing (optional)

**Style:** Flowchart or sequence diagram showing swap process

---

## Chart 8: Cross-Chain Bridge Flow
**Location:** Cross-Chain Bridge Section → Bridge Flow

**Purpose:** Diagram showing bridge operations in both directions

**Should Include:**
- L1 → EVM: Lock → Event → Relayer → Mint
- EVM → L1: Burn → Event → Relayer → Unlock
- Nonce system for replay protection
- Event verification mechanism
- Token wrapping/unwrapping
- Relayer service position
- Time sequence of operations

**Style:** Bidirectional flow diagram or two separate flowcharts

---

## Chart 9: Price Feed Architecture
**Location:** Price Feed Architecture Section → API-Based Price Feeds

**Purpose:** Diagram showing how prices are integrated into the system

**Should Include:**
- API endpoint for price queries
- Frontend price fetching
- Price parameter passing to contracts
- Price format conversion (micro-USD)
- Transaction flow with prices
- Off-chain vs on-chain distinction
- Price validation (if any)

**Style:** Integration diagram showing external API → frontend → contracts

---

## Chart Specifications

### Recommended Formats
- **Vector formats preferred:** SVG, PDF, or high-resolution PNG
- **Style:** Professional, consistent with dark theme (matches frontend)
- **Colors:** Use purple/white theme to match the dApp design
- **Size:** Optimized for web display, scalable for print

### Design Guidelines
- Use consistent color scheme (purple accents, white text, dark backgrounds)
- Include clear labels and annotations
- Use arrows to show direction of flow
- Group related components visually
- Maintain professional appearance suitable for whitepaper

### Technical Requirements
- All charts should be accessible (alt text descriptions)
- Charts should be responsive (work on mobile and desktop)
- Consider creating interactive versions (optional, for web)

---

## Summary

**Total Charts: 9**

1. System Architecture Overview
2. Component Diagram
3. Data Flow Diagram
4. Multi-Chain Architecture
5. Pool Architecture
6. Three-Tier Fee Curve
7. Direct A→B Swap Flow
8. Cross-Chain Bridge Flow
9. Price Feed Architecture

Each chart has a placeholder in the whitepaper with detailed requirements and descriptions. Replace the placeholder divs with actual chart images or components once the charts are ready.

