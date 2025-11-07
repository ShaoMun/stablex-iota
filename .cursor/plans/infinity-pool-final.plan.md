# Infinity Pool Final Refinement Plan

## Overview

Refine the SBX pool to implement true infinity pool mechanics with:
1. Direct A→B swaps (no USD intermediate)
2. Two-tier piecewise fee curves per currency (30% threshold, no cap)
3. Balance-based USDC allocation (USDC = sum of regionals, 40/60 split)
4. Dynamic MM allocation (40% of excess when balanced)
5. Dynamic per-currency APY based on pool balance (USDC higher when unbalanced)

---

## 1. Three-Tier Piecewise Fee Curve (80%/30% Thresholds)

### Fee Curve Design

**Three-Tier System**:
- **Tier 1 (≥80%)**: Fixed cheap rate for stablecoins (no deviation penalty)
- **Tier 2 (30-80%)**: Linear/pricewise fee (scales with deviation)
- **Tier 3 (<30%)**: Sudden jump - dramatic fee increase with **NO CAP**

**Parameters**:
- Base fee: 2 bps (0.02%) - **Cheaper for stablecoins**
- Floor fee: 5 bps (0.05%) - **Cheaper for stablecoins**
- Depth fee K: 50 bps (0.5%)
- Max fee: 500 bps (5%) - **Only applies to Tier 1 and Tier 2**
- High coverage threshold: 80% (8000 bps) - Fixed rate above this
- Low coverage threshold: 30% (3000 bps) - Sudden jump below this
- **Tier 3 base multiplier**: 10x (dramatic base increase)
- **Tier 3 exponential factor**: 5x (steep exponential curve)

### Fee Curve Examples

**Tier 1: Optimal State (≥80%)** - Fixed Cheap Rate:

| Coverage | Deviation | Fee | Fee % |
|----------|-----------|-----|-------|
| 85% | 0 bps | 7 bps | 0.07% |
| 80% | 0 bps | 7 bps | 0.07% |

**Tier 2: Normal Operation (30-80%)** - Linear/Pricewise:

| Coverage | Deviation | Fee | Fee % |
|----------|-----------|-----|-------|
| 75% | 500 bps | 9.5 bps | 0.095% |
| 50% | 3000 bps | 22 bps | 0.22% |
| 30% | 5000 bps | 32 bps | 0.32% |

**Tier 3: Beyond Tolerance (<30%)** - Sudden Jump (No Cap):

| Coverage | Deviation | Fee | Fee % | Multiplier vs Tier 1 |
|----------|-----------|-----|-------|----------------------|
| 29% | 100 bps | 77 bps | 0.77% | **11x** |
| 25% | 500 bps | 177 bps | 1.77% | **25x** |
| 20% | 1000 bps | 327 bps | 3.27% | **47x** |
| 15% | 1500 bps | 552 bps | 5.52% | **79x** |
| 10% | 2000 bps | 827 bps | 8.27% | **118x** |
| 5% | 2500 bps | 1152 bps | 11.52% | **165x** |
| 1% | 2900 bps | 1432 bps | 14.32% | **205x** |

**Key Insight**: 
- **At 80% threshold**: Fixed cheap rate (7 bps) - optimal for stablecoins
- **30-80% range**: Linear scaling (7-32 bps) - pricewise adjustment
- **At 30% threshold**: Sudden jump from ~32 bps to ~77 bps (**11x increase**)
- **Below 30%**: Fees are **25-205x higher** than optimal state
- **No cap for Tier 3**: Fees can exceed 14%+ to strongly discourage draining

### Implementation

**Add to `Registry` struct**:

```move
high_coverage_threshold_bps: u64,  // Default: 8000 (80%) - fixed rate above this
low_coverage_threshold_bps: u64,   // Default: 3000 (30%) - sudden jump below this
tier2_base_multiplier: u64,        // Default: 10x (dramatic base increase for tier 3)
tier2_exponential_factor: u64,     // Default: 5x (steep exponential curve for tier 3)
```

**Replace `compute_depth_fee_bps`**:

```move
public fun compute_depth_fee_bps(
    registry: &Registry,
    target_bps: u64,
    current_bps: u64,
    floor_bps: u64
): u64 {
    let base = registry.base_fee_bps;
    let dev_bps = if (current_bps < target_bps) { target_bps - current_bps } else { 0u64 };
    
    let fee_u128 = if (current_bps >= registry.high_coverage_threshold_bps) {
        // Tier 1 (≥80%): Fixed cheap rate for stablecoins
        // fee = floor + base (no deviation penalty, cheap for stablecoins)
        (floor_bps as u128) + (base as u128)
    } else if (current_bps >= registry.low_coverage_threshold_bps) {
        // Tier 2 (30-80%): Linear/pricewise fee
        // fee = floor + base + k * dev (linear scaling)
        let k = registry.depth_fee_k_bps as u128;
        let incremental = (k * (dev_bps as u128)) / 10_000u128;
        (floor_bps as u128) + (base as u128) + incremental
    } else {
        // Tier 3 (<30%): Sudden jump - DRAMATIC fee increase
        // Base fee is multiplied dramatically, then exponential curve applied
        // fee = (floor + base) * tier2_base_multiplier + k * dev^2 * tier2_exponential_factor / threshold
        
        let tier1_base = (floor_bps as u128) + (base as u128);
        let tier3_base = tier1_base * (registry.tier2_base_multiplier as u128);
        
        // Apply exponential curve on top of dramatic base
        let k = registry.depth_fee_k_bps as u128;
        let dev_sq = (dev_bps as u128) * (dev_bps as u128);
        let threshold = registry.low_coverage_threshold_bps as u128;
        let expo_factor = registry.tier2_exponential_factor as u128;
        let exponential_term = (k * dev_sq * expo_factor) / (threshold * 10_000u128);
        
        tier3_base + exponential_term
    };
    
    // No cap for Tier 3 - fees can grow unlimited to discourage draining
    // Only cap Tier 1 and Tier 2 fees if needed (optional safety)
    let fee = if (current_bps >= registry.low_coverage_threshold_bps && fee_u128 > (registry.max_fee_bps as u128)) {
        // Cap only applies to Tier 1 and Tier 2 (normal operation)
        registry.max_fee_bps
    } else {
        // Tier 3 has no cap - unlimited fee growth
        fee_u128 as u64
    };
    fee
}
```

---

## 2. Direct A→B Swap (Price Inversion)

### Current Issue
- `swap_regional` does A→USD→B (double fee)
- Price feeds are USD/[CURRENCY] format

### Solution
Calculate direct exchange rate: `rate_A_to_B = price_B_mu / price_A_mu`

**Example**: 
- USD/XSGD = 750,000 (0.75 in micro-USD)
- USD/MYRC = 250,000 (0.25)
- XSGD/MYRC = 250,000 / 750,000 = 0.333...

### Implementation

**Add helper function**:

```move
public fun compute_direct_swap_rate(
    price_from_mu: u64,  // USD/[FROM_CURRENCY]
    price_to_mu: u64,    // USD/[TO_CURRENCY]
    to_depth_bps: u64,
    to_target_bps: u64
): u128 {
    // Base rate: price_to / price_from
    let base_rate = ((price_to_mu as u128) * 1_000_000u128) / (price_from_mu as u128);
    
    // Apply depth penalty if target asset is scarce
    let depth_penalty_bps = if (to_depth_bps < to_target_bps) {
        ((to_target_bps - to_depth_bps) * 100u64) / to_target_bps
    } else {
        0u64
    };
    
    // Apply penalty: rate = base_rate * (1 - penalty/10000)
    let adjusted_rate = (base_rate * (10_000u128 - (depth_penalty_bps as u128))) / 10_000u128;
    adjusted_rate
}
```

**Refactor `swap_regional`**:
- Remove USD intermediate calculation
- Use `compute_direct_swap_rate` to get A→B rate
- Calculate `amount_out = (amount_in * rate) / 1_000_000`
- Apply single fee based on target asset depth

---

## 3. Dynamic USDC Allocation (Balance-Based)

### Balance Definition
```
balance_ratio = USDC_value / sum(regional_values)
target_balance = 1.0 (USDC = sum of regionals)
```

### Allocation Rules

**When Unbalanced** (USDC < regionals, ratio < 1.0):
- Keep ALL USDC in reserve (no allocation)
- Pool needs more USDC to reach balance

**When Balanced** (USDC >= regionals, ratio >= 1.0):
- Reserve = sum(regionals) (maintain 1:1 ratio)
- Excess = USDC - sum(regionals)
- **40% of excess** → Off-chain MM allocation
- **60% of excess** → Auto-swap to regionals (distributed to unhealthiest vaults)

### Implementation

```move
public fun compute_usdc_allocation(
    pool: &Pool,
    deposit_amount_mu: u64,
    xsgd_price_mu: u64,
    myrc_price_mu: u64,
    jpyc_price_mu: u64
): (u64, u64, u64, u64, u64) {
    // 1. Calculate current regional values
    let xsgd_mu = ((pool.xsgd_liability_units as u128) * (xsgd_price_mu as u128)) / 1_000_000u128;
    let myrc_mu = ((pool.myrc_liability_units as u128) * (myrc_price_mu as u128)) / 1_000_000u128;
    let jpyc_mu = ((pool.jpyc_liability_units as u128) * (jpyc_price_mu as u128)) / 1_000_000u128;
    let regionals_sum_mu = xsgd_mu + myrc_mu + jpyc_mu;
    
    // 2. Calculate new USDC total after deposit
    let new_usdc_mu = (pool.usdc_reserve as u128) + (deposit_amount_mu as u128);
    
    // 3. Check balance ratio
    if (new_usdc_mu <= regionals_sum_mu) {
        // Unbalanced: keep all USDC
        (new_usdc_mu as u64, 0u64, 0u64, 0u64, 0u64)
    } else {
        // Balanced: allocate excess
        let usdc_reserve = regionals_sum_mu as u64;
        let excess_mu = new_usdc_mu - regionals_sum_mu;
        
        // 40% of excess → MM
        let mm_allocation = ((excess_mu * 4u128) / 10u128) as u64;
        
        // 60% of excess → Auto-swap to regionals
        let swap_total = ((excess_mu * 6u128) / 10u128) as u64;
        
        // Distribute to unhealthiest vaults (inverse health weighting)
        let total_mu = regionals_sum_mu + new_usdc_mu;
        let xsgd_bps = if (total_mu > 0) { ((xsgd_mu * 10_000u128) / total_mu) as u64 } else { 0u64 };
        let myrc_bps = if (total_mu > 0) { ((myrc_mu * 10_000u128) / total_mu) as u64 } else { 0u64 };
        let jpyc_bps = if (total_mu > 0) { ((jpyc_mu * 10_000u128) / total_mu) as u64 } else { 0u64 };
        
        let xsgd_weight = if (xsgd_bps > 0) { 10_000u128 / (xsgd_bps as u128) } else { 100_000u128 };
        let myrc_weight = if (myrc_bps > 0) { 10_000u128 / (myrc_bps as u128) } else { 100_000u128 };
        let jpyc_weight = if (jpyc_bps > 0) { 10_000u128 / (jpyc_bps as u128) } else { 100_000u128 };
        
        let total_weight = xsgd_weight + myrc_weight + jpyc_weight;
        let xsgd_swap = ((swap_total as u128 * xsgd_weight) / total_weight) as u64;
        let myrc_swap = ((swap_total as u128 * myrc_weight) / total_weight) as u64;
        let jpyc_swap = swap_total - xsgd_swap - myrc_swap;
        
        (usdc_reserve, mm_allocation, xsgd_swap, myrc_swap, jpyc_swap)
    }
}
```

---

## 4. Off-Chain MM Allocation (Dynamic Based on Excess)

### Key Changes
- **No fixed 10%**: MM allocation only exists when pool is balanced (has excess)
- **40% of excess**: When USDC >= sum(regionals), 40% of excess goes to MM
- **Random returns**: Mocked returns (2-8% APY range) set by admin periodically

### Implementation

**Add to `Pool` struct**:

```move
mm_reserved_usdc: u64,  // Updated dynamically based on excess
```

**Add to `Registry` struct**:

```move
mm_return_min_bps: u64,  // Minimum return (e.g., 200 = 2% APY)
mm_return_max_bps: u64,  // Maximum return (e.g., 800 = 8% APY)
mm_return_usdc_bps: u64,
mm_return_xsgd_bps: u64,
mm_return_myrc_bps: u64,
mm_return_jpyc_bps: u64,
fee_accumulated_usdc_mu: u128,
fee_accumulated_xsgd_mu: u128,
fee_accumulated_myrc_mu: u128,
fee_accumulated_jpyc_mu: u128,
```

**Admin function**:

```move
public entry fun admin_set_mm_returns(
    registry: &mut Registry,
    usdc_bps: u64,
    xsgd_bps: u64,
    myrc_bps: u64,
    jpyc_bps: u64,
    ctx: &TxContext
) {
    assert!(registry.admin == tx_context::sender(ctx), E_NOT_ADMIN);
    // Validate all returns are within min/max range
    registry.mm_return_usdc_bps = usdc_bps;
    registry.mm_return_xsgd_bps = xsgd_bps;
    registry.mm_return_myrc_bps = myrc_bps;
    registry.mm_return_jpyc_bps = jpyc_bps;
}
```

---

## 5. Dynamic Per-Currency APY Calculation

### Balance-Based APY Logic

**Balance Definition**: `balance_ratio = USDC / sum(regionals)`

**APY Rules**:

1. **When Unbalanced** (USDC < regionals, ratio < 1.0):
   - **USDC**: Higher APY (bonus) to encourage deposits
   - **Regionals**: Higher APY (compensation bonus) to encourage deposits
   - Both get bonuses, with USDC getting higher bonus to restore balance

2. **When Balanced** (USDC >= regionals, ratio >= 1.0):
   - **USDC**: Base APY + MM returns (if MM allocation exists)
   - **Regionals**: Base APY + MM returns + **150 bps bonus** (always higher than USDC)

### Implementation

```move
public fun estimated_apy_bps_per_currency(
    registry: &Registry,
    pool: &Pool,
    currency_code: u8,  // 0=USDC, 1=XSGD, 2=MYRC, 3=JPYC
    fees_7d_mu: u128,
    avg_tvl_7d_mu: u128,
    xsgd_price_mu: u64,
    myrc_price_mu: u64,
    jpyc_price_mu: u64
): u64 {
    if (avg_tvl_7d_mu == 0u128) { return 0u64 };
    
    // 1. Calculate balance ratio
    let xsgd_mu = ((pool.xsgd_liability_units as u128) * (xsgd_price_mu as u128)) / 1_000_000u128;
    let myrc_mu = ((pool.myrc_liability_units as u128) * (myrc_price_mu as u128)) / 1_000_000u128;
    let jpyc_mu = ((pool.jpyc_liability_units as u128) * (jpyc_price_mu as u128)) / 1_000_000u128;
    let regionals_sum_mu = xsgd_mu + myrc_mu + jpyc_mu;
    let usdc_mu = pool.usdc_reserve as u128;
    
    let balance_ratio = if (regionals_sum_mu > 0) {
        (usdc_mu * 10_000u128) / regionals_sum_mu  // Scaled by 10_000 (1.0 = 10_000)
    } else {
        10_000u128
    };
    
    // 2. Base fee APY
    let fee_apy_bps = ((fees_7d_mu * 52u128 * 10_000u128) / avg_tvl_7d_mu) as u64;
    
    // 3. MM return APY (only if balanced and has MM allocation)
    let mm_apy_bps = if (balance_ratio >= 10_000u128 && pool.mm_reserved_usdc > 0) {
        let mm_return_bps = if (currency_code == 0u8) { registry.mm_return_usdc_bps }
            else if (currency_code == 1u8) { registry.mm_return_xsgd_bps }
            else if (currency_code == 2u8) { registry.mm_return_myrc_bps }
            else { registry.mm_return_jpyc_bps };
        mm_return_bps
    } else {
        0u64
    };
    
    // 4. Balance compensation factor
    let compensation_bps = if (currency_code == 0u8) {
        // USDC APY
        if (balance_ratio < 10_000u128) {
            // Unbalanced: USDC gets HIGHER APY to encourage deposits
            // Bonus = (1.0 - ratio) * 300 bps max (higher than regionals to restore balance)
            ((10_000u128 - balance_ratio) / 33u128) as u64  // Max +300 bps
        } else {
            0u64
        }
    } else {
        // Regional currency APY
        if (balance_ratio < 10_000u128) {
            // Unbalanced: Regionals get compensation bonus
            // Bonus = (1.0 - ratio) * 200 bps max
            ((10_000u128 - balance_ratio) / 50u128) as u64  // Max +200 bps
        } else {
            // Balanced: Regionals get higher APY than USDC
            150u64  // +1.5% bonus over USDC when balanced
        }
    };
    
    // 5. Total APY = fee APY + MM APY + compensation
    let total_apy = (fee_apy_bps as u128) + (mm_apy_bps as u128) + (compensation_bps as u128);
    if (total_apy > 10_000u128) { 10_000u64 } else { total_apy as u64 }
}
```

### APY Examples

**Scenario 1: Unbalanced Pool** (USDC = 500, Regionals = 1000, ratio = 0.5)
- USDC APY: Base (300 bps) + Bonus (150 bps) = **450 bps (4.5%)**
- Regional APY: Base (300 bps) + Bonus (100 bps) = **400 bps (4.0%)**

**Scenario 2: Balanced Pool** (USDC = 1000, Regionals = 1000, ratio = 1.0)
- USDC APY: Base (300 bps) + MM (400 bps) = **700 bps (7.0%)**
- Regional APY: Base (300 bps) + MM (400 bps) + Bonus (150 bps) = **850 bps (8.5%)**

**Scenario 3: Over-Balanced Pool** (USDC = 1500, Regionals = 1000, ratio = 1.5)
- USDC APY: Base (300 bps) + MM (400 bps) = **700 bps (7.0%)**
- Regional APY: Base (300 bps) + MM (400 bps) + Bonus (150 bps) = **850 bps (8.5%)**

---

## Summary of Key Formulas

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

### Compensation
- **Unbalanced**: USDC bonus = +(1.0 - ratio) * 300 bps max (higher to encourage deposits)
- **Unbalanced**: Regional bonus = +(1.0 - ratio) * 200 bps max
- **Balanced**: Regional bonus = +150 bps (always higher than USDC)

### Three-Tier Fee Formula Summary

**Tier 1 (≥80%)**:
```
fee = floor + base (fixed cheap rate, no deviation penalty)
```

**Tier 2 (30-80%)**:
```
fee = floor + base + k * (deviation / 10000) (linear/pricewise)
```

**Tier 3 (<30% - Beyond Tolerance)**:
```
fee = (floor + base) * tier2_base_multiplier + k * (deviation² * tier2_exponential_factor / threshold) / 10000
```

**Key Characteristics**:
- **80% threshold**: Fixed cheap rate (optimal for stablecoins)
- **30-80% range**: Linear scaling (pricewise adjustment)
- **30% threshold**: Sudden jump (10x base multiplier)
- **Below 30%**: Steep exponential curve (5x exponential factor)
- **No cap for Tier 3**: Fees can grow unlimited (14%+ possible) to strongly discourage draining
- **Purpose**: Cheap fees for healthy pools, unlimited fee growth prevents vault depletion

---

## Implementation Order

1. Add new struct fields to `Pool` and `Registry`
2. Implement two-tier piecewise fee curve function (30% threshold, no cap)
3. Implement direct swap rate calculation with price inversion
4. Refactor `swap_regional` to use direct A→B
5. Implement USDC allocation logic (balance-based, 40/60 split)
6. Add MM reserve mechanism (dynamic based on excess)
7. Implement per-currency APY calculation (balance-based, USDC higher when unbalanced)
8. Update fee tracking to accumulate per currency
9. Update all entry functions to use new fee curve
10. Add/update fuzz tests

---

## Files to Modify

- `first_package/sources/sbx_pool.move`: Main implementation
- `first_package/tests/sbx_pool_fuzz_tests.move`: Test updates
