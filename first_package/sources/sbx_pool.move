module first_package::sbx_pool {
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;

    const E_ALREADY_INITIALIZED: u64 = 1;
    const E_NOT_ADMIN: u64 = 2;
    const E_PAUSED: u64 = 3;
    const E_ZERO_AMOUNT: u64 = 4;
    const E_INSUFFICIENT_SBX: u64 = 5;
    const E_INSUFFICIENT_DEPOSIT: u64 = 6;
    const E_BAD_PARAMS: u64 = 7;
    const E_RESERVE_BREACH: u64 = 8;
    const E_NOT_WHITELISTED: u64 = 9;
    const E_PRICE_NOT_SET: u64 = 10;

    /// Global pool state
    public struct Pool has key, store {
        id: UID,
        admin: address,
        paused: bool,
        fee_bps: u64,
        min_reserve_bps: u64,
        usdc_reserve: u64,
        total_sbx_supply: u64,
        total_rc_liability: u64,
        /// Per-asset regional liabilities in native units (token minimal units)
        chfx_liability_units: u64,
        tryb_liability_units: u64,
        sekx_liability_units: u64,
        /// Actual USDC reserved for MM (updated dynamically based on excess)
        mm_reserved_usdc: u64
    }

    /// Per-user account state
    public struct Account has key, store {
        id: UID,
        sbx: u64,
        rc_deposit: u64,
        usdc_owed: u64
    }

    /// Oracle and whitelist registry
    public struct Registry has key, store {
        id: UID,
        admin: address,
        chfx_whitelisted: bool,
        tryb_whitelisted: bool,
        sekx_whitelisted: bool,
        chfx_price_microusd: u64,
        tryb_price_microusd: u64,
        sekx_price_microusd: u64,
        /// Controller targets (basis points of total USD exposure)
        target_usdc_bps: u64,
        target_chfx_bps: u64,
        target_tryb_bps: u64,
        target_sekx_bps: u64,
        /// Fee parameters (basis points)
        base_fee_bps: u64,
        depth_fee_k_bps: u64,
        withdraw_fee_floor_bps: u64,
        swap_fee_floor_bps: u64,
        max_fee_bps: u64,
        /// Three-tier fee curve parameters
        high_coverage_threshold_bps: u64,  // Default: 8000 (80%) - fixed rate above this
        low_coverage_threshold_bps: u64,  // Default: 3000 (30%) - sudden jump below this
        tier2_base_multiplier: u64,       // Default: 10x (dramatic base increase for tier 3)
        tier2_exponential_factor: u64,    // Default: 5x (steep exponential curve for tier 3)
        /// MM return parameters (for APY calculation)
        mm_return_min_bps: u64,  // Minimum return (e.g., 200 = 2% APY)
        mm_return_max_bps: u64,  // Maximum return (e.g., 800 = 8% APY)
        /// Per-currency MM returns (mocked, updated periodically by admin)
        mm_return_usdc_bps: u64,
        mm_return_chfx_bps: u64,
        mm_return_tryb_bps: u64,
        mm_return_sekx_bps: u64,
        /// Accrued fee value in micro-USD (for metrics/apy)
        fee_usd_accumulated_mu: u128,
        /// Per-currency fee accumulation (for APY)
        fee_accumulated_usdc_mu: u128,
        fee_accumulated_chfx_mu: u128,
        fee_accumulated_tryb_mu: u128,
        fee_accumulated_sekx_mu: u128
    }

    /// Initialize pool (entry function, not init)
    public entry fun create_pool(fee_bps: u64, min_reserve_bps: u64, ctx: &mut TxContext) {
        assert!(fee_bps <= 10_000, E_BAD_PARAMS);
        assert!(min_reserve_bps <= 10_000, E_BAD_PARAMS);
        let pool = Pool {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            paused: false,
            fee_bps,
            min_reserve_bps,
            usdc_reserve: 0,
            total_sbx_supply: 0,
            total_rc_liability: 0,
            chfx_liability_units: 0,
            tryb_liability_units: 0,
            sekx_liability_units: 0,
            mm_reserved_usdc: 0
        };
        transfer::public_transfer(pool, tx_context::sender(ctx));
    }

    /// Admin controls
    public entry fun pause(pool: &mut Pool, ctx: &TxContext) {
        assert!(pool.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        pool.paused = true;
    }

    public entry fun unpause(pool: &mut Pool, ctx: &TxContext) {
        assert!(pool.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        pool.paused = false;
    }

    /// Initialize registry
    public entry fun create_registry(ctx: &mut TxContext) {
        let registry = Registry {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            chfx_whitelisted: false,
            tryb_whitelisted: false,
            sekx_whitelisted: false,
            chfx_price_microusd: 0,
            tryb_price_microusd: 0,
            sekx_price_microusd: 0,
            target_usdc_bps: 0,
            target_chfx_bps: 0,
            target_tryb_bps: 0,
            target_sekx_bps: 0,
            base_fee_bps: 0,
            depth_fee_k_bps: 0,
            withdraw_fee_floor_bps: 0,
            swap_fee_floor_bps: 0,
            max_fee_bps: 0,
            high_coverage_threshold_bps: 8000,  // 80%
            low_coverage_threshold_bps: 3000,   // 30%
            tier2_base_multiplier: 10,          // 10x
            tier2_exponential_factor: 5,        // 5x
            mm_return_min_bps: 200,            // 2% APY
            mm_return_max_bps: 800,            // 8% APY
            mm_return_usdc_bps: 0,
            mm_return_chfx_bps: 0,
            mm_return_tryb_bps: 0,
            mm_return_sekx_bps: 0,
            fee_usd_accumulated_mu: 0u128,
            fee_accumulated_usdc_mu: 0u128,
            fee_accumulated_chfx_mu: 0u128,
            fee_accumulated_tryb_mu: 0u128,
            fee_accumulated_sekx_mu: 0u128
        };
        transfer::public_transfer(registry, tx_context::sender(ctx));
    }

    public entry fun admin_set_whitelist(registry: &mut Registry, chfx: bool, tryb: bool, sekx: bool, ctx: &TxContext) {
        assert!(registry.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        registry.chfx_whitelisted = chfx;
        registry.tryb_whitelisted = tryb;
        registry.sekx_whitelisted = sekx;
    }

    public entry fun admin_set_prices_microusd(registry: &mut Registry, chfx: u64, tryb: u64, sekx: u64, ctx: &TxContext) {
        assert!(registry.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        registry.chfx_price_microusd = chfx;
        registry.tryb_price_microusd = tryb;
        registry.sekx_price_microusd = sekx;
    }

    public entry fun admin_deposit_usdc(pool: &mut Pool, amount: u64, ctx: &TxContext) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(pool.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        pool.usdc_reserve = pool.usdc_reserve + amount;
    }

    public entry fun admin_withdraw_usdc(pool: &mut Pool, amount: u64, ctx: &TxContext) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(pool.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        assert!(pool.usdc_reserve >= amount, E_RESERVE_BREACH);
        pool.usdc_reserve = pool.usdc_reserve - amount;
    }

    /// User operations
    public entry fun deposit_and_mint(account: &mut Account, pool: &mut Pool, amount: u64) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        account.sbx = account.sbx + amount;
        account.rc_deposit = account.rc_deposit + amount;
        pool.total_sbx_supply = pool.total_sbx_supply + amount;
        pool.total_rc_liability = pool.total_rc_liability + amount;
    }

    /// Compute USDC allocation based on balance ratio
    /// Returns: (usdc_reserve_amount, mm_allocation_amount, usdc_allocation_amount, chfx_swap_amount, tryb_swap_amount, sekx_swap_amount)
    /// All in micro-USD units
    public fun compute_usdc_allocation(
        pool: &Pool,
        deposit_amount_mu: u64,
        chfx_price_mu: u64,
        tryb_price_mu: u64,
        sekx_price_mu: u64
    ): (u64, u64, u64, u64, u64, u64) {
        // 1. Calculate current regional values
        let chfx_mu = ((pool.chfx_liability_units as u128) * (chfx_price_mu as u128)) / 1_000_000u128;
        let tryb_mu = ((pool.tryb_liability_units as u128) * (tryb_price_mu as u128)) / 1_000_000u128;
        let sekx_mu = ((pool.sekx_liability_units as u128) * (sekx_price_mu as u128)) / 1_000_000u128;
        let regionals_sum_mu = chfx_mu + tryb_mu + sekx_mu;
        
        // 2. Calculate new USDC total after deposit
        let new_usdc_mu = (pool.usdc_reserve as u128) + (deposit_amount_mu as u128);
        
        // 3. Check balance ratio
        if (new_usdc_mu <= regionals_sum_mu) {
            // Unbalanced: keep all USDC
            (new_usdc_mu as u64, 0u64, 0u64, 0u64, 0u64, 0u64)
        } else {
            // Balanced: allocate excess
            let usdc_reserve_base = regionals_sum_mu as u64;
            let excess_mu = new_usdc_mu - regionals_sum_mu;
            
            // 30% of excess → MM
            let mm_allocation = ((excess_mu * 3u128) / 10u128) as u64;
            
            // 34% of excess → USDC
            let usdc_allocation = ((excess_mu * 34u128) / 100u128) as u64;
            
            // 36% of excess → Auto-swap to regionals
            let swap_total = ((excess_mu * 36u128) / 100u128) as u64;
            
            // Distribute to unhealthiest vaults (inverse health weighting)
            let total_mu = regionals_sum_mu + new_usdc_mu;
            let chfx_bps = if (total_mu > 0) { ((chfx_mu * 10_000u128) / total_mu) as u64 } else { 0u64 };
            let tryb_bps = if (total_mu > 0) { ((tryb_mu * 10_000u128) / total_mu) as u64 } else { 0u64 };
            let sekx_bps = if (total_mu > 0) { ((sekx_mu * 10_000u128) / total_mu) as u64 } else { 0u64 };
            
            let chfx_weight = if (chfx_bps > 0) { 10_000u128 / (chfx_bps as u128) } else { 100_000u128 };
            let tryb_weight = if (tryb_bps > 0) { 10_000u128 / (tryb_bps as u128) } else { 100_000u128 };
            let sekx_weight = if (sekx_bps > 0) { 10_000u128 / (sekx_bps as u128) } else { 100_000u128 };
            
            let total_weight = chfx_weight + tryb_weight + sekx_weight;
            let chfx_swap = ((swap_total as u128 * chfx_weight) / total_weight) as u64;
            let tryb_swap = ((swap_total as u128 * tryb_weight) / total_weight) as u64;
            let sekx_swap = swap_total - chfx_swap - tryb_swap;
            
            // USDC reserve = base reserve + USDC allocation
            let usdc_reserve = usdc_reserve_base + usdc_allocation;
            
            (usdc_reserve, mm_allocation, usdc_allocation, chfx_swap, tryb_swap, sekx_swap)
        }
    }

    /// Deposit USDC, mint SBX at 1 SBX = 1 USD (micro-USD)
    /// amount: USDC minimal units (6 decimals), equal to micro-USD
    /// Prices are passed as parameters (queried from API off-chain)
    public entry fun deposit_usdc(
        account: &mut Account,
        pool: &mut Pool,
        registry: &Registry,
        amount: u64,
        chfx_price_microusd: u64,
        tryb_price_microusd: u64,
        sekx_price_microusd: u64,
        ctx: &TxContext
    ) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        
        // Compute allocation
        let (usdc_reserve, mm_allocation, _usdc_allocation, _chfx_swap, _tryb_swap, _sekx_swap) = compute_usdc_allocation(
            pool, amount, chfx_price_microusd, tryb_price_microusd, sekx_price_microusd
        );
        
        // Mint SBX equal to USD micro value
        let mint_amount = amount;
        account.sbx = account.sbx + mint_amount;
        pool.total_sbx_supply = pool.total_sbx_supply + mint_amount;
        
        // Update USDC reserve (maintains balance with regionals + 34% of excess)
        pool.usdc_reserve = usdc_reserve;
        
        // Update MM reserved amount (30% of excess)
        pool.mm_reserved_usdc = pool.mm_reserved_usdc + mm_allocation;
        
        // Note: Auto-swap amounts are advisory; actual swaps happen via market incentives (fees)
    }

    public entry fun redeem_regional(account: &mut Account, pool: &mut Pool, amount: u64) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(account.sbx >= amount, E_INSUFFICIENT_SBX);
        assert!(account.rc_deposit >= amount, E_INSUFFICIENT_DEPOSIT);
        account.sbx = account.sbx - amount;
        account.rc_deposit = account.rc_deposit - amount;
        pool.total_sbx_supply = pool.total_sbx_supply - amount;
        pool.total_rc_liability = pool.total_rc_liability - amount;
    }

    public entry fun deposit_chfx(
        account: &mut Account,
        pool: &mut Pool,
        registry: &Registry,
        amount: u64,
        price_microusd: u64,
        ctx: &TxContext
    ) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(registry.chfx_whitelisted, E_NOT_WHITELISTED);
        assert!(price_microusd > 0, E_PRICE_NOT_SET);
        
        // Calculate USD value: amount (in token units) * price (micro-USD) / 1_000_000
        // This gives us the USD value in micro-USD, which equals the SBX amount to mint
        let usd_value_mu = ((amount as u128) * (price_microusd as u128)) / 1_000_000u128;
        let mint_amount = usd_value_mu as u64;
        
        account.sbx = account.sbx + mint_amount;
        account.rc_deposit = account.rc_deposit + amount;
        pool.total_sbx_supply = pool.total_sbx_supply + mint_amount;
        pool.total_rc_liability = pool.total_rc_liability + amount;
        pool.chfx_liability_units = pool.chfx_liability_units + amount;
    }

    public entry fun deposit_tryb(
        account: &mut Account,
        pool: &mut Pool,
        registry: &Registry,
        amount: u64,
        price_microusd: u64,
        ctx: &TxContext
    ) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(registry.tryb_whitelisted, E_NOT_WHITELISTED);
        assert!(price_microusd > 0, E_PRICE_NOT_SET);
        
        // Calculate USD value: amount (in token units) * price (micro-USD) / 1_000_000
        // This gives us the USD value in micro-USD, which equals the SBX amount to mint
        let usd_value_mu = ((amount as u128) * (price_microusd as u128)) / 1_000_000u128;
        let mint_amount = usd_value_mu as u64;
        
        account.sbx = account.sbx + mint_amount;
        account.rc_deposit = account.rc_deposit + amount;
        pool.total_sbx_supply = pool.total_sbx_supply + mint_amount;
        pool.total_rc_liability = pool.total_rc_liability + amount;
        pool.tryb_liability_units = pool.tryb_liability_units + amount;
    }

    public entry fun deposit_sekx(
        account: &mut Account,
        pool: &mut Pool,
        registry: &Registry,
        amount: u64,
        price_microusd: u64,
        ctx: &TxContext
    ) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(registry.sekx_whitelisted, E_NOT_WHITELISTED);
        assert!(price_microusd > 0, E_PRICE_NOT_SET);
        
        // Calculate USD value: amount (in token units) * price (micro-USD) / 1_000_000
        // This gives us the USD value in micro-USD, which equals the SBX amount to mint
        let usd_value_mu = ((amount as u128) * (price_microusd as u128)) / 1_000_000u128;
        let mint_amount = usd_value_mu as u64;
        
        account.sbx = account.sbx + mint_amount;
        account.rc_deposit = account.rc_deposit + amount;
        pool.total_sbx_supply = pool.total_sbx_supply + mint_amount;
        pool.total_rc_liability = pool.total_rc_liability + amount;
        pool.sekx_liability_units = pool.sekx_liability_units + amount;
    }

    public entry fun instant_swap_to_usdc(account: &mut Account, pool: &mut Pool, sbx_amount: u64) {
        assert!(sbx_amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(account.sbx >= sbx_amount, E_INSUFFICIENT_SBX);
        let fee_bps = pool.fee_bps as u128;
        let gross = sbx_amount as u128;
        let payout = (gross * (10_000u128 - fee_bps)) / 10_000u128;
        let payout_u64 = payout as u64;
        let post_reserve = (pool.usdc_reserve as u128) - (payout as u128);
        let post_supply = (pool.total_sbx_supply as u128) - (sbx_amount as u128);
        let min_bps = pool.min_reserve_bps as u128;
        if (post_supply > 0) {
            assert!((post_reserve * 10_000u128) >= (min_bps * post_supply), E_RESERVE_BREACH);
        };
        account.sbx = account.sbx - sbx_amount;
        pool.total_sbx_supply = pool.total_sbx_supply - sbx_amount;
        pool.usdc_reserve = pool.usdc_reserve - payout_u64;
        account.usdc_owed = account.usdc_owed + payout_u64;
    }

    public entry fun transfer_sbx(from_account: &mut Account, to_account: &mut Account, amount: u64) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(from_account.sbx >= amount, E_INSUFFICIENT_SBX);
        from_account.sbx = from_account.sbx - amount;
        to_account.sbx = to_account.sbx + amount;
    }

    /// Compute direct swap rate from asset A to asset B (no USD intermediate)
    /// Both prices are in micro-USD format (USD/[CURRENCY])
    /// Returns: rate as u128 (scaled by 1e6 for precision)
    public fun compute_direct_swap_rate(
        price_from_mu: u64,  // USD/[FROM_CURRENCY] in micro-USD
        price_to_mu: u64,    // USD/[TO_CURRENCY] in micro-USD
        to_depth_bps: u64,
        to_target_bps: u64
    ): u128 {
        // Base rate: price_to / price_from (both are USD/[CURRENCY])
        // If USD/CHFX = 0.75 and USD/TRYB = 0.25, then CHFX/TRYB = 0.25/0.75 = 0.333
        let base_rate = ((price_to_mu as u128) * 1_000_000u128) / (price_from_mu as u128);
        
        // Apply depth penalty if target asset is scarce
        let depth_penalty_bps = if (to_depth_bps < to_target_bps) {
            ((to_target_bps - to_depth_bps) * 100u64) / to_target_bps  // 0-100% penalty
        } else {
            0u64
        };
        
        // Apply penalty: rate = base_rate * (1 - penalty/10000)
        let adjusted_rate = (base_rate * (10_000u128 - (depth_penalty_bps as u128))) / 10_000u128;
        adjusted_rate
    }

    /// Swap regional stablecoin to regional stablecoin via direct A→B (no USD intermediate)
    /// from_code/to_code: 0 = CHFX, 1 = TRYB, 2 = SEKX
    /// Prices are passed as parameters (queried from API off-chain)
    public entry fun swap_regional(
        _account: &mut Account,
        pool: &mut Pool,
        registry: &mut Registry,
        amount_in: u64,
        from_code: u8,
        to_code: u8,
        price_from_microusd: u64,
        price_to_microusd: u64,
        ctx: &TxContext
    ) {
        assert!(amount_in > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);

        // Pre coverage for target asset using cached prices
        let (usdc_mu_pre, chfx_mu_pre, tryb_mu_pre, sekx_mu_pre, total_mu_pre) = vault_usd(
            pool,
            registry.chfx_price_microusd,
            registry.tryb_price_microusd,
            registry.sekx_price_microusd
        );
        let (_usdc_bps_pre, chfx_bps_pre, tryb_bps_pre, sekx_bps_pre) = coverage_bps(
            usdc_mu_pre, chfx_mu_pre, tryb_mu_pre, sekx_mu_pre, total_mu_pre
        );

        // Determine target bps and current bps for 'to' asset
        let (to_target_bps, to_cov_bps) = if (to_code == 0u8) {
            (registry.target_chfx_bps, chfx_bps_pre)
        } else if (to_code == 1u8) {
            (registry.target_tryb_bps, tryb_bps_pre)
        } else {
            (registry.target_sekx_bps, sekx_bps_pre)
        };

        // Compute direct swap rate A→B
        let rate = compute_direct_swap_rate(price_from_microusd, price_to_microusd, to_cov_bps, to_target_bps);
        
        // Calculate amount out before fee
        let amount_out_before_fee = ((amount_in as u128) * rate) / 1_000_000u128;
        
        // Apply fee based on target asset depth
        let fee_bps = compute_depth_fee_bps(registry, to_target_bps, to_cov_bps, registry.swap_fee_floor_bps);
        let payout_units = ((amount_out_before_fee * (10_000u128 - (fee_bps as u128))) / 10_000u128) as u64;

        // Calculate fee in USD terms for tracking
        let usd_value_in = ((amount_in as u128) * (price_from_microusd as u128)) / 1_000_000u128;
        let usd_value_out = ((payout_units as u128) * (price_to_microusd as u128)) / 1_000_000u128;
        let fee_mu = usd_value_in - usd_value_out;

        // Update liabilities: increase 'from' exposure (pool receives from asset), decrease 'to' exposure
        if (from_code == 0u8) {
            pool.chfx_liability_units = pool.chfx_liability_units + amount_in;
        } else if (from_code == 1u8) {
            pool.tryb_liability_units = pool.tryb_liability_units + amount_in;
        } else {
            pool.sekx_liability_units = pool.sekx_liability_units + amount_in;
        };

        if (to_code == 0u8) {
            assert!(pool.chfx_liability_units >= payout_units, E_RESERVE_BREACH);
            pool.chfx_liability_units = pool.chfx_liability_units - payout_units;
        } else if (to_code == 1u8) {
            assert!(pool.tryb_liability_units >= payout_units, E_RESERVE_BREACH);
            pool.tryb_liability_units = pool.tryb_liability_units - payout_units;
        } else {
            assert!(pool.sekx_liability_units >= payout_units, E_RESERVE_BREACH);
            pool.sekx_liability_units = pool.sekx_liability_units - payout_units;
        };

        // Accrue fee value per currency
        registry.fee_usd_accumulated_mu = registry.fee_usd_accumulated_mu + fee_mu;
        if (to_code == 0u8) {
            registry.fee_accumulated_chfx_mu = registry.fee_accumulated_chfx_mu + fee_mu;
        } else if (to_code == 1u8) {
            registry.fee_accumulated_tryb_mu = registry.fee_accumulated_tryb_mu + fee_mu;
        } else {
            registry.fee_accumulated_sekx_mu = registry.fee_accumulated_sekx_mu + fee_mu;
        };
    }

    /// Withdraw USDC by burning SBX. Applies depth-aware fee.
    /// Prices are passed as parameters (queried from API off-chain)
    public entry fun withdraw_usdc(
        account: &mut Account,
        pool: &mut Pool,
        registry: &mut Registry,
        sbx_amount: u64,
        chfx_price_microusd: u64,
        tryb_price_microusd: u64,
        sekx_price_microusd: u64,
        ctx: &TxContext
    ) {
        assert!(sbx_amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(account.sbx >= sbx_amount, E_INSUFFICIENT_SBX);

        // Compute pre coverage using provided prices
        let (usdc_mu_pre, chfx_mu_pre, tryb_mu_pre, sekx_mu_pre, total_mu_pre) = vault_usd(
            pool,
            chfx_price_microusd,
            tryb_price_microusd,
            sekx_price_microusd
        );
        let (usdc_bps_pre, _chfx_bps_pre, _tryb_bps_pre, _sekx_bps_pre) = coverage_bps(
            usdc_mu_pre, chfx_mu_pre, tryb_mu_pre, sekx_mu_pre, total_mu_pre
        );
        // After payout, coverage will drop in USDC; approximate post
        let fee_floor = registry.withdraw_fee_floor_bps;
        let fee_bps = compute_depth_fee_bps(
            registry,
            registry.target_usdc_bps,
            usdc_bps_pre, // conservative (pre), avoids undercharging; could simulate post
            fee_floor
        );

        // Net USD to pay = sbx_amount * (1 - fee)
        let sbx_u128 = sbx_amount as u128;
        let net_usd_mu = (sbx_u128 * (10_000u128 - (fee_bps as u128))) / 10_000u128;
        let fee_usd_mu = sbx_u128 - net_usd_mu;
        let net_u64 = net_usd_mu as u64;
        assert!(pool.usdc_reserve >= net_u64, E_RESERVE_BREACH);

        // Burn SBX and reduce reserve
        account.sbx = account.sbx - sbx_amount;
        pool.total_sbx_supply = pool.total_sbx_supply - sbx_amount;
        pool.usdc_reserve = pool.usdc_reserve - net_u64;
        // Accrue fee value per currency
        registry.fee_usd_accumulated_mu = registry.fee_usd_accumulated_mu + fee_usd_mu;
        registry.fee_accumulated_usdc_mu = registry.fee_accumulated_usdc_mu + fee_usd_mu;
    }

    /// Withdraw CHFX by burning SBX. Applies depth-aware fee based on CHFX scarcity.
    /// Prices are passed as parameters (queried from API off-chain)
    public entry fun withdraw_chfx(
        account: &mut Account,
        pool: &mut Pool,
        registry: &mut Registry,
        sbx_amount: u64,
        chfx_price_microusd: u64,
        tryb_price_microusd: u64,
        sekx_price_microusd: u64,
        ctx: &TxContext
    ) {
        assert!(sbx_amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(account.sbx >= sbx_amount, E_INSUFFICIENT_SBX);

        // Pre coverage
        let (usdc_mu_pre, chfx_mu_pre, tryb_mu_pre, sekx_mu_pre, total_mu_pre) = vault_usd(
            pool,
            chfx_price_microusd,
            tryb_price_microusd,
            sekx_price_microusd
        );
        let (_usdc_bps_pre, chfx_bps_pre, _tryb_bps_pre, _sekx_bps_pre) = coverage_bps(
            usdc_mu_pre, chfx_mu_pre, tryb_mu_pre, sekx_mu_pre, total_mu_pre
        );
        let fee_bps = compute_depth_fee_bps(
            registry,
            registry.target_chfx_bps,
            chfx_bps_pre,
            registry.withdraw_fee_floor_bps
        );
        // Net USD to pay
        let sbx_u128 = sbx_amount as u128;
        let net_usd_mu = (sbx_u128 * (10_000u128 - (fee_bps as u128))) / 10_000u128;
        let fee_usd_mu = sbx_u128 - net_usd_mu;
        // Convert to CHFX units
        let payout_units = ((net_usd_mu * 1_000_000u128) / (chfx_price_microusd as u128)) as u64;
        assert!(pool.chfx_liability_units >= payout_units, E_RESERVE_BREACH);

        // Burn and reduce liability
        account.sbx = account.sbx - sbx_amount;
        pool.total_sbx_supply = pool.total_sbx_supply - sbx_amount;
        pool.chfx_liability_units = pool.chfx_liability_units - payout_units;
        // Accrue fee value per currency
        registry.fee_usd_accumulated_mu = registry.fee_usd_accumulated_mu + fee_usd_mu;
        registry.fee_accumulated_chfx_mu = registry.fee_accumulated_chfx_mu + fee_usd_mu;
    }

    /// Withdraw TRYB
    /// Prices are passed as parameters (queried from API off-chain)
    public entry fun withdraw_tryb(
        account: &mut Account,
        pool: &mut Pool,
        registry: &mut Registry,
        sbx_amount: u64,
        chfx_price_microusd: u64,
        tryb_price_microusd: u64,
        sekx_price_microusd: u64,
        ctx: &TxContext
    ) {
        assert!(sbx_amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(account.sbx >= sbx_amount, E_INSUFFICIENT_SBX);
        let (usdc_mu_pre, chfx_mu_pre, tryb_mu_pre, sekx_mu_pre, total_mu_pre) = vault_usd(
            pool,
            chfx_price_microusd,
            tryb_price_microusd,
            sekx_price_microusd
        );
        let (_usdc_bps_pre, _chfx_bps_pre, tryb_bps_pre, _sekx_bps_pre) = coverage_bps(
            usdc_mu_pre, chfx_mu_pre, tryb_mu_pre, sekx_mu_pre, total_mu_pre
        );
        let fee_bps = compute_depth_fee_bps(
            registry,
            registry.target_tryb_bps,
            tryb_bps_pre,
            registry.withdraw_fee_floor_bps
        );
        let sbx_u128 = sbx_amount as u128;
        let net_usd_mu = (sbx_u128 * (10_000u128 - (fee_bps as u128))) / 10_000u128;
        let fee_usd_mu = sbx_u128 - net_usd_mu;
        let payout_units = ((net_usd_mu * 1_000_000u128) / (tryb_price_microusd as u128)) as u64;
        assert!(pool.tryb_liability_units >= payout_units, E_RESERVE_BREACH);
        account.sbx = account.sbx - sbx_amount;
        pool.total_sbx_supply = pool.total_sbx_supply - sbx_amount;
        pool.tryb_liability_units = pool.tryb_liability_units - payout_units;
        // Accrue fee value per currency
        registry.fee_usd_accumulated_mu = registry.fee_usd_accumulated_mu + fee_usd_mu;
        registry.fee_accumulated_tryb_mu = registry.fee_accumulated_tryb_mu + fee_usd_mu;
    }

    /// Withdraw SEKX
    /// Prices are passed as parameters (queried from API off-chain)
    public entry fun withdraw_sekx(
        account: &mut Account,
        pool: &mut Pool,
        registry: &mut Registry,
        sbx_amount: u64,
        chfx_price_microusd: u64,
        tryb_price_microusd: u64,
        sekx_price_microusd: u64,
        ctx: &TxContext
    ) {
        assert!(sbx_amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(account.sbx >= sbx_amount, E_INSUFFICIENT_SBX);
        let (usdc_mu_pre, chfx_mu_pre, tryb_mu_pre, sekx_mu_pre, total_mu_pre) = vault_usd(
            pool,
            chfx_price_microusd,
            tryb_price_microusd,
            sekx_price_microusd
        );
        let (_usdc_bps_pre, _chfx_bps_pre, _tryb_bps_pre, sekx_bps_pre) = coverage_bps(
            usdc_mu_pre, chfx_mu_pre, tryb_mu_pre, sekx_mu_pre, total_mu_pre
        );
        let fee_bps = compute_depth_fee_bps(
            registry,
            registry.target_sekx_bps,
            sekx_bps_pre,
            registry.withdraw_fee_floor_bps
        );
        let sbx_u128 = sbx_amount as u128;
        let net_usd_mu = (sbx_u128 * (10_000u128 - (fee_bps as u128))) / 10_000u128;
        let fee_usd_mu = sbx_u128 - net_usd_mu;
        let payout_units = ((net_usd_mu * 1_000_000u128) / (sekx_price_microusd as u128)) as u64;
        assert!(pool.sekx_liability_units >= payout_units, E_RESERVE_BREACH);
        account.sbx = account.sbx - sbx_amount;
        pool.total_sbx_supply = pool.total_sbx_supply - sbx_amount;
        pool.sekx_liability_units = pool.sekx_liability_units - payout_units;
        // Accrue fee value per currency
        registry.fee_usd_accumulated_mu = registry.fee_usd_accumulated_mu + fee_usd_mu;
        registry.fee_accumulated_sekx_mu = registry.fee_accumulated_sekx_mu + fee_usd_mu;
    }

    /// View helpers
    public fun sbx_balance_of(account: &Account): u64 {
        account.sbx
    }

    public fun rc_deposit_of(account: &Account): u64 {
        account.rc_deposit
    }

    public fun usdc_owed_of(account: &Account): u64 {
        account.usdc_owed
    }

    public fun stats(pool: &Pool): (u64, u64, u64, u64, bool) {
        (pool.usdc_reserve, pool.total_sbx_supply, pool.total_rc_liability, pool.fee_bps, pool.paused)
    }

    public fun prices_microusd(registry: &Registry): (u64, u64, u64) {
        (registry.chfx_price_microusd, registry.tryb_price_microusd, registry.sekx_price_microusd)
    }

    /// Metrics helpers
    public fun fee_accumulated_mu(registry: &Registry): u128 {
        registry.fee_usd_accumulated_mu
    }

    /// Estimated APY in basis points given 7d fees and average TVL (both in micro-USD)
    /// APY_bps = (fees_7d / avg_tvl_7d) * 52 * 10_000
    public fun estimated_apy_bps(fees_7d_mu: u128, avg_tvl_7d_mu: u128): u64 {
        if (avg_tvl_7d_mu == 0u128) { 0u64 } else { (((fees_7d_mu * 52u128) * 10_000u128) / avg_tvl_7d_mu) as u64 }
    }

    /// Calculate estimated APY for a specific currency (in basis points)
    /// Dynamic based on pool balance and allocation
    /// Balance = USDC / sum(regionals)
    public fun estimated_apy_bps_per_currency(
        registry: &Registry,
        pool: &Pool,
        currency_code: u8,  // 0=USDC, 1=CHFX, 2=TRYB, 3=SEKX
        fees_7d_mu: u128,
        avg_tvl_7d_mu: u128,
        chfx_price_mu: u64,
        tryb_price_mu: u64,
        sekx_price_mu: u64
    ): u64 {
        if (avg_tvl_7d_mu == 0u128) { return 0u64 };
        
        // 1. Calculate balance ratio
        let chfx_mu = ((pool.chfx_liability_units as u128) * (chfx_price_mu as u128)) / 1_000_000u128;
        let tryb_mu = ((pool.tryb_liability_units as u128) * (tryb_price_mu as u128)) / 1_000_000u128;
        let sekx_mu = ((pool.sekx_liability_units as u128) * (sekx_price_mu as u128)) / 1_000_000u128;
        let regionals_sum_mu = chfx_mu + tryb_mu + sekx_mu;
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
                else if (currency_code == 1u8) { registry.mm_return_chfx_bps }
                else if (currency_code == 2u8) { registry.mm_return_tryb_bps }
                else { registry.mm_return_sekx_bps };
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
                // Unbalanced: bonus = (1.0 - ratio) * 200 bps max
                ((10_000u128 - balance_ratio) / 50u128) as u64
            } else {
                // Balanced: +150 bps bonus over USDC
                150u64
            }
        };
        
        // 5. Total APY = fee APY + MM APY + compensation
        let total_apy = (fee_apy_bps as u128) + (mm_apy_bps as u128) + (compensation_bps as u128);
        if (total_apy > 10_000u128) { 10_000u64 } else { total_apy as u64 }
    }

    /// Admin: set coverage targets (bps). If sum != 10_000, targets are normalized on read paths.
    public entry fun admin_set_targets(
        registry: &mut Registry,
        usdc_bps: u64,
        chfx_bps: u64,
        tryb_bps: u64,
        sekx_bps: u64,
        ctx: &TxContext
    ) {
        assert!(registry.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        registry.target_usdc_bps = usdc_bps;
        registry.target_chfx_bps = chfx_bps;
        registry.target_tryb_bps = tryb_bps;
        registry.target_sekx_bps = sekx_bps;
    }

    /// Admin: set fee parameters
    public entry fun admin_set_fee_params(
        registry: &mut Registry,
        base_fee_bps: u64,
        depth_fee_k_bps: u64,
        withdraw_fee_floor_bps: u64,
        swap_fee_floor_bps: u64,
        max_fee_bps: u64,
        ctx: &TxContext
    ) {
        assert!(registry.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        registry.base_fee_bps = base_fee_bps;
        registry.depth_fee_k_bps = depth_fee_k_bps;
        registry.withdraw_fee_floor_bps = withdraw_fee_floor_bps;
        registry.swap_fee_floor_bps = swap_fee_floor_bps;
        registry.max_fee_bps = max_fee_bps;
    }

    /// Admin: set three-tier fee curve parameters
    public entry fun admin_set_tier_params(
        registry: &mut Registry,
        high_coverage_threshold_bps: u64,
        low_coverage_threshold_bps: u64,
        tier2_base_multiplier: u64,
        tier2_exponential_factor: u64,
        ctx: &TxContext
    ) {
        assert!(registry.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        assert!(high_coverage_threshold_bps > low_coverage_threshold_bps, E_BAD_PARAMS);
        registry.high_coverage_threshold_bps = high_coverage_threshold_bps;
        registry.low_coverage_threshold_bps = low_coverage_threshold_bps;
        registry.tier2_base_multiplier = tier2_base_multiplier;
        registry.tier2_exponential_factor = tier2_exponential_factor;
    }

    /// Admin: Update mocked MM returns (randomized off-chain, set on-chain)
    public entry fun admin_set_mm_returns(
        registry: &mut Registry,
        usdc_bps: u64,
        chfx_bps: u64,
        tryb_bps: u64,
        sekx_bps: u64,
        ctx: &TxContext
    ) {
        assert!(registry.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        assert!(usdc_bps >= registry.mm_return_min_bps && usdc_bps <= registry.mm_return_max_bps, E_BAD_PARAMS);
        assert!(chfx_bps >= registry.mm_return_min_bps && chfx_bps <= registry.mm_return_max_bps, E_BAD_PARAMS);
        assert!(tryb_bps >= registry.mm_return_min_bps && tryb_bps <= registry.mm_return_max_bps, E_BAD_PARAMS);
        assert!(sekx_bps >= registry.mm_return_min_bps && sekx_bps <= registry.mm_return_max_bps, E_BAD_PARAMS);
        registry.mm_return_usdc_bps = usdc_bps;
        registry.mm_return_chfx_bps = chfx_bps;
        registry.mm_return_tryb_bps = tryb_bps;
        registry.mm_return_sekx_bps = sekx_bps;
    }

    /// Compute vault USD values (micro-USD) using provided prices
    public fun vault_usd(
        pool: &Pool,
        chfx_price_mu: u64,
        tryb_price_mu: u64,
        sekx_price_mu: u64
    ): (u128, u128, u128, u128, u128) {
        let usdc_mu: u128 = (pool.usdc_reserve as u128) * 1u128; // USDC 6dp aligns to micro-USD
        let chfx_mu: u128 = ((pool.chfx_liability_units as u128) * (chfx_price_mu as u128)) / 1_000_000u128;
        let tryb_mu: u128 = ((pool.tryb_liability_units as u128) * (tryb_price_mu as u128)) / 1_000_000u128;
        let sekx_mu: u128 = ((pool.sekx_liability_units as u128) * (sekx_price_mu as u128)) / 1_000_000u128;
        let total_mu: u128 = usdc_mu + chfx_mu + tryb_mu + sekx_mu;
        (usdc_mu, chfx_mu, tryb_mu, sekx_mu, total_mu)
    }

    /// Compute coverage in basis points for each asset (returns zeros if total is zero)
    public fun coverage_bps(
        usdc_mu: u128,
        chfx_mu: u128,
        tryb_mu: u128,
        sekx_mu: u128,
        total_mu: u128
    ): (u64, u64, u64, u64) {
        if (total_mu == 0u128) {
            (0, 0, 0, 0)
        } else {
            let usdc_bps = ((usdc_mu * 10_000u128) / total_mu) as u64;
            let chfx_bps = ((chfx_mu * 10_000u128) / total_mu) as u64;
            let tryb_bps = ((tryb_mu * 10_000u128) / total_mu) as u64;
            let sekx_bps = ((sekx_mu * 10_000u128) / total_mu) as u64;
            (usdc_bps, chfx_bps, tryb_bps, sekx_bps)
        }
    }

    /// Compute a depth-aware fee (bps) with three-tier piecewise curve
    /// Tier 1 (≥80%): Fixed cheap rate for stablecoins
    /// Tier 2 (30-80%): Linear/pricewise fee
    /// Tier 3 (<30%): Sudden jump - dramatic fee increase (no cap)
    public fun compute_depth_fee_bps(
        registry: &Registry,
        target_bps: u64,
        current_bps: u64,
        floor_bps: u64
    ): u64 {
        let base = registry.base_fee_bps;
        let dev_bps = if (current_bps < target_bps) { target_bps - current_bps } else { 0u64 };
        
        let fee_u128 = if (current_bps >= registry.high_coverage_threshold_bps) {
            // Tier 1 (Above 80%): Fixed cheap rate for stablecoins
            // fee = floor + base (no deviation penalty, cheap for stablecoins)
            (floor_bps as u128) + (base as u128)
        } else if (current_bps >= registry.low_coverage_threshold_bps) {
            // Tier 2 (30-80%): Linear/pricewise fee
            // fee = floor + base + k * dev (linear scaling)
            let k = registry.depth_fee_k_bps as u128;
            let incremental = (k * (dev_bps as u128)) / 10_000u128;
            (floor_bps as u128) + (base as u128) + incremental
        } else {
            // Tier 3 (Below 30%): Sudden jump - DRAMATIC fee increase
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

}
