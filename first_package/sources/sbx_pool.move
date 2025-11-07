module first_package::sbx_pool {
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::clock::{Self, Clock};
    use first_package::pyth_adapter;
    use Pyth::state::{Self, State};
    use Pyth::price_info::PriceInfoObject;
    use std::bcs;

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
        xsgd_liability_units: u64,
        myrc_liability_units: u64,
        jpyc_liability_units: u64,
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
        pyth_state: address,
        pyth_package: address,
        xsgd_feed: address,
        myrc_feed: address,
        jpyc_feed: address,
        xsgd_whitelisted: bool,
        myrc_whitelisted: bool,
        jpyc_whitelisted: bool,
        xsgd_price_microusd: u64,
        myrc_price_microusd: u64,
        jpyc_price_microusd: u64,
        /// Controller targets (basis points of total USD exposure)
        target_usdc_bps: u64,
        target_xsgd_bps: u64,
        target_myrc_bps: u64,
        target_jpyc_bps: u64,
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
        mm_return_xsgd_bps: u64,
        mm_return_myrc_bps: u64,
        mm_return_jpyc_bps: u64,
        /// Accrued fee value in micro-USD (for metrics/apy)
        fee_usd_accumulated_mu: u128,
        /// Per-currency fee accumulation (for APY)
        fee_accumulated_usdc_mu: u128,
        fee_accumulated_xsgd_mu: u128,
        fee_accumulated_myrc_mu: u128,
        fee_accumulated_jpyc_mu: u128
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
            xsgd_liability_units: 0,
            myrc_liability_units: 0,
            jpyc_liability_units: 0,
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
    public entry fun create_registry(pyth_state: address, pyth_package: address, ctx: &mut TxContext) {
        let registry = Registry {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            pyth_state,
            pyth_package,
            xsgd_feed: @0x0,
            myrc_feed: @0x0,
            jpyc_feed: @0x0,
            xsgd_whitelisted: false,
            myrc_whitelisted: false,
            jpyc_whitelisted: false,
            xsgd_price_microusd: 0,
            myrc_price_microusd: 0,
            jpyc_price_microusd: 0,
            target_usdc_bps: 0,
            target_xsgd_bps: 0,
            target_myrc_bps: 0,
            target_jpyc_bps: 0,
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
            mm_return_xsgd_bps: 0,
            mm_return_myrc_bps: 0,
            mm_return_jpyc_bps: 0,
            fee_usd_accumulated_mu: 0u128,
            fee_accumulated_usdc_mu: 0u128,
            fee_accumulated_xsgd_mu: 0u128,
            fee_accumulated_myrc_mu: 0u128,
            fee_accumulated_jpyc_mu: 0u128
        };
        transfer::public_transfer(registry, tx_context::sender(ctx));
    }

    public entry fun admin_set_feeds(registry: &mut Registry, xsgd_feed: address, myrc_feed: address, jpyc_feed: address, ctx: &TxContext) {
        assert!(registry.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        registry.xsgd_feed = xsgd_feed;
        registry.myrc_feed = myrc_feed;
        registry.jpyc_feed = jpyc_feed;
    }

    public entry fun admin_set_whitelist(registry: &mut Registry, xsgd: bool, myrc: bool, jpyc: bool, ctx: &TxContext) {
        assert!(registry.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        registry.xsgd_whitelisted = xsgd;
        registry.myrc_whitelisted = myrc;
        registry.jpyc_whitelisted = jpyc;
    }

    public entry fun admin_set_prices_microusd(registry: &mut Registry, xsgd: u64, myrc: u64, jpyc: u64, ctx: &TxContext) {
        assert!(registry.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        registry.xsgd_price_microusd = xsgd;
        registry.myrc_price_microusd = myrc;
        registry.jpyc_price_microusd = jpyc;
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
    /// Returns: (usdc_reserve_amount, mm_allocation_amount, xsgd_swap_amount, myrc_swap_amount, jpyc_swap_amount)
    /// All in micro-USD units
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

    /// Deposit USDC, mint SBX at 1 SBX = 1 USD (micro-USD)
    /// amount: USDC minimal units (6 decimals), equal to micro-USD
    public entry fun deposit_usdc(
        account: &mut Account,
        pool: &mut Pool,
        registry: &Registry,
        amount: u64,
        xsgd_price_info_obj: &PriceInfoObject,
        myrc_price_info_obj: &PriceInfoObject,
        jpyc_price_info_obj: &PriceInfoObject,
        clock: &Clock,
        ctx: &TxContext
    ) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        
        // Get prices for allocation calculation
        let xsgd_price_mu = pyth_adapter::read_price_microusd(xsgd_price_info_obj, clock);
        let myrc_price_mu = pyth_adapter::read_price_microusd(myrc_price_info_obj, clock);
        let jpyc_price_mu = pyth_adapter::read_price_microusd(jpyc_price_info_obj, clock);
        
        // Compute allocation
        let (usdc_reserve, mm_allocation, _xsgd_swap, _myrc_swap, _jpyc_swap) = compute_usdc_allocation(
            pool, amount, xsgd_price_mu, myrc_price_mu, jpyc_price_mu
        );
        
        // Mint SBX equal to USD micro value
        let mint_amount = amount;
        account.sbx = account.sbx + mint_amount;
        pool.total_sbx_supply = pool.total_sbx_supply + mint_amount;
        
        // Update USDC reserve (maintains balance with regionals)
        pool.usdc_reserve = usdc_reserve;
        
        // Update MM reserved amount
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

    public entry fun deposit_xsgd(
        account: &mut Account,
        pool: &mut Pool,
        registry: &Registry,
        xsgd_price_info_obj: &PriceInfoObject,
        amount: u64,
        clock: &Clock,
        ctx: &TxContext
    ) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(registry.xsgd_whitelisted, E_NOT_WHITELISTED);
        
        // Get live price from Pyth (in micro-USD, 1e6 = $1.00)
        let price_microusd = pyth_adapter::read_price_microusd(xsgd_price_info_obj, clock);
        assert!(price_microusd > 0, E_PRICE_NOT_SET);
        
        // Calculate USD value: amount (in token units) * price (micro-USD) / 1_000_000
        // This gives us the USD value in micro-USD, which equals the SBX amount to mint
        let usd_value_mu = ((amount as u128) * (price_microusd as u128)) / 1_000_000u128;
        let mint_amount = usd_value_mu as u64;
        
        account.sbx = account.sbx + mint_amount;
        account.rc_deposit = account.rc_deposit + amount;
        pool.total_sbx_supply = pool.total_sbx_supply + mint_amount;
        pool.total_rc_liability = pool.total_rc_liability + amount;
        pool.xsgd_liability_units = pool.xsgd_liability_units + amount;
    }

    public entry fun deposit_myrc(
        account: &mut Account,
        pool: &mut Pool,
        registry: &Registry,
        myrc_price_info_obj: &PriceInfoObject,
        amount: u64,
        clock: &Clock,
        ctx: &TxContext
    ) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(registry.myrc_whitelisted, E_NOT_WHITELISTED);
        
        // Get live price from Pyth (in micro-USD, 1e6 = $1.00)
        let price_microusd = pyth_adapter::read_price_microusd(myrc_price_info_obj, clock);
        assert!(price_microusd > 0, E_PRICE_NOT_SET);
        
        // Calculate USD value: amount (in token units) * price (micro-USD) / 1_000_000
        // This gives us the USD value in micro-USD, which equals the SBX amount to mint
        let usd_value_mu = ((amount as u128) * (price_microusd as u128)) / 1_000_000u128;
        let mint_amount = usd_value_mu as u64;
        
        account.sbx = account.sbx + mint_amount;
        account.rc_deposit = account.rc_deposit + amount;
        pool.total_sbx_supply = pool.total_sbx_supply + mint_amount;
        pool.total_rc_liability = pool.total_rc_liability + amount;
        pool.myrc_liability_units = pool.myrc_liability_units + amount;
    }

    public entry fun deposit_jpyc(
        account: &mut Account,
        pool: &mut Pool,
        registry: &Registry,
        jpyc_price_info_obj: &PriceInfoObject,
        amount: u64,
        clock: &Clock,
        ctx: &TxContext
    ) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(registry.jpyc_whitelisted, E_NOT_WHITELISTED);
        
        // Get live price from Pyth (in micro-USD, 1e6 = $1.00)
        let price_microusd = pyth_adapter::read_price_microusd(jpyc_price_info_obj, clock);
        assert!(price_microusd > 0, E_PRICE_NOT_SET);
        
        // Calculate USD value: amount (in token units) * price (micro-USD) / 1_000_000
        // This gives us the USD value in micro-USD, which equals the SBX amount to mint
        let usd_value_mu = ((amount as u128) * (price_microusd as u128)) / 1_000_000u128;
        let mint_amount = usd_value_mu as u64;
        
        account.sbx = account.sbx + mint_amount;
        account.rc_deposit = account.rc_deposit + amount;
        pool.total_sbx_supply = pool.total_sbx_supply + mint_amount;
        pool.total_rc_liability = pool.total_rc_liability + amount;
        pool.jpyc_liability_units = pool.jpyc_liability_units + amount;
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
        // If USD/XSGD = 0.75 and USD/MYRC = 0.25, then XSGD/MYRC = 0.25/0.75 = 0.333
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
    /// from_code/to_code: 0 = XSGD, 1 = MYRC, 2 = JPYC
    public entry fun swap_regional(
        _account: &mut Account,
        pool: &mut Pool,
        registry: &mut Registry,
        amount_in: u64,
        from_code: u8,
        to_code: u8,
        price_from: &PriceInfoObject,
        price_to: &PriceInfoObject,
        clock: &Clock,
        ctx: &TxContext
    ) {
        assert!(amount_in > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        // Prices
        let price_from_mu = pyth_adapter::read_price_microusd(price_from, clock);
        let price_to_mu = pyth_adapter::read_price_microusd(price_to, clock);

        // Pre coverage for target asset using cached prices for others
        let (usdc_mu_pre, xsgd_mu_pre, myrc_mu_pre, jpyc_mu_pre, total_mu_pre) = vault_usd(
            pool,
            registry.xsgd_price_microusd,
            registry.myrc_price_microusd,
            registry.jpyc_price_microusd
        );
        let (_usdc_bps_pre, xsgd_bps_pre, myrc_bps_pre, jpyc_bps_pre) = coverage_bps(
            usdc_mu_pre, xsgd_mu_pre, myrc_mu_pre, jpyc_mu_pre, total_mu_pre
        );

        // Determine target bps and current bps for 'to' asset
        let (to_target_bps, to_cov_bps) = if (to_code == 0u8) {
            (registry.target_xsgd_bps, xsgd_bps_pre)
        } else if (to_code == 1u8) {
            (registry.target_myrc_bps, myrc_bps_pre)
        } else {
            (registry.target_jpyc_bps, jpyc_bps_pre)
        };

        // Compute direct swap rate A→B
        let rate = compute_direct_swap_rate(price_from_mu, price_to_mu, to_cov_bps, to_target_bps);
        
        // Calculate amount out before fee
        let amount_out_before_fee = ((amount_in as u128) * rate) / 1_000_000u128;
        
        // Apply fee based on target asset depth
        let fee_bps = compute_depth_fee_bps(registry, to_target_bps, to_cov_bps, registry.swap_fee_floor_bps);
        let payout_units = ((amount_out_before_fee * (10_000u128 - (fee_bps as u128))) / 10_000u128) as u64;

        // Calculate fee in USD terms for tracking
        let usd_value_in = ((amount_in as u128) * (price_from_mu as u128)) / 1_000_000u128;
        let usd_value_out = ((payout_units as u128) * (price_to_mu as u128)) / 1_000_000u128;
        let fee_mu = usd_value_in - usd_value_out;

        // Update liabilities: increase 'from' exposure (pool receives from asset), decrease 'to' exposure
        if (from_code == 0u8) { pool.xsgd_liability_units = pool.xsgd_liability_units + amount_in; }
        if (from_code == 1u8) { pool.myrc_liability_units = pool.myrc_liability_units + amount_in; }
        if (from_code == 2u8) { pool.jpyc_liability_units = pool.jpyc_liability_units + amount_in; }

        if (to_code == 0u8) { assert!(pool.xsgd_liability_units >= payout_units, E_RESERVE_BREACH); pool.xsgd_liability_units = pool.xsgd_liability_units - payout_units; }
        if (to_code == 1u8) { assert!(pool.myrc_liability_units >= payout_units, E_RESERVE_BREACH); pool.myrc_liability_units = pool.myrc_liability_units - payout_units; }
        if (to_code == 2u8) { assert!(pool.jpyc_liability_units >= payout_units, E_RESERVE_BREACH); pool.jpyc_liability_units = pool.jpyc_liability_units - payout_units; }

        // Accrue fee value per currency
        registry.fee_usd_accumulated_mu = registry.fee_usd_accumulated_mu + fee_mu;
        if (to_code == 0u8) { registry.fee_accumulated_xsgd_mu = registry.fee_accumulated_xsgd_mu + fee_mu; }
        if (to_code == 1u8) { registry.fee_accumulated_myrc_mu = registry.fee_accumulated_myrc_mu + fee_mu; }
        if (to_code == 2u8) { registry.fee_accumulated_jpyc_mu = registry.fee_accumulated_jpyc_mu + fee_mu; }
    }

    /// Withdraw USDC by burning SBX. Applies depth-aware fee.
    public entry fun withdraw_usdc(
        account: &mut Account,
        pool: &mut Pool,
        registry: &mut Registry,
        sbx_amount: u64,
        clock: &Clock,
        ctx: &TxContext
    ) {
        assert!(sbx_amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(account.sbx >= sbx_amount, E_INSUFFICIENT_SBX);

        // Compute pre coverage using cached prices (UI should keep them fresh)
        let (usdc_mu_pre, xsgd_mu_pre, myrc_mu_pre, jpyc_mu_pre, total_mu_pre) = vault_usd(
            pool,
            registry.xsgd_price_microusd,
            registry.myrc_price_microusd,
            registry.jpyc_price_microusd
        );
        let (usdc_bps_pre, _xsgd_bps_pre, _myrc_bps_pre, _jpyc_bps_pre) = coverage_bps(
            usdc_mu_pre, xsgd_mu_pre, myrc_mu_pre, jpyc_mu_pre, total_mu_pre
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

    /// Withdraw XSGD by burning SBX. Applies depth-aware fee based on XSGD scarcity.
    public entry fun withdraw_xsgd(
        account: &mut Account,
        pool: &mut Pool,
        registry: &mut Registry,
        sbx_amount: u64,
        xsgd_price_info_obj: &PriceInfoObject,
        clock: &Clock,
        ctx: &TxContext
    ) {
        assert!(sbx_amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(account.sbx >= sbx_amount, E_INSUFFICIENT_SBX);

        // Read fresh XSGD price; use cached for others
        let xsgd_price_mu = pyth_adapter::read_price_microusd(xsgd_price_info_obj, clock);
        // Pre coverage
        let (usdc_mu_pre, xsgd_mu_pre, myrc_mu_pre, jpyc_mu_pre, total_mu_pre) = vault_usd(
            pool,
            xsgd_price_mu,
            registry.myrc_price_microusd,
            registry.jpyc_price_microusd
        );
        let (_usdc_bps_pre, xsgd_bps_pre, _myrc_bps_pre, _jpyc_bps_pre) = coverage_bps(
            usdc_mu_pre, xsgd_mu_pre, myrc_mu_pre, jpyc_mu_pre, total_mu_pre
        );
        let fee_bps = compute_depth_fee_bps(
            registry,
            registry.target_xsgd_bps,
            xsgd_bps_pre,
            registry.withdraw_fee_floor_bps
        );
        // Net USD to pay
        let sbx_u128 = sbx_amount as u128;
        let net_usd_mu = (sbx_u128 * (10_000u128 - (fee_bps as u128))) / 10_000u128;
        let fee_usd_mu = sbx_u128 - net_usd_mu;
        // Convert to XSGD units
        let payout_units = ((net_usd_mu * 1_000_000u128) / (xsgd_price_mu as u128)) as u64;
        assert!(pool.xsgd_liability_units >= payout_units, E_RESERVE_BREACH);

        // Burn and reduce liability
        account.sbx = account.sbx - sbx_amount;
        pool.total_sbx_supply = pool.total_sbx_supply - sbx_amount;
        pool.xsgd_liability_units = pool.xsgd_liability_units - payout_units;
        // Accrue fee value per currency
        registry.fee_usd_accumulated_mu = registry.fee_usd_accumulated_mu + fee_usd_mu;
        registry.fee_accumulated_xsgd_mu = registry.fee_accumulated_xsgd_mu + fee_usd_mu;
    }

    /// Withdraw MYRC
    public entry fun withdraw_myrc(
        account: &mut Account,
        pool: &mut Pool,
        registry: &mut Registry,
        sbx_amount: u64,
        myrc_price_info_obj: &PriceInfoObject,
        clock: &Clock,
        ctx: &TxContext
    ) {
        assert!(sbx_amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(account.sbx >= sbx_amount, E_INSUFFICIENT_SBX);
        let myrc_price_mu = pyth_adapter::read_price_microusd(myrc_price_info_obj, clock);
        let (usdc_mu_pre, xsgd_mu_pre, myrc_mu_pre, jpyc_mu_pre, total_mu_pre) = vault_usd(
            pool,
            registry.xsgd_price_microusd,
            myrc_price_mu,
            registry.jpyc_price_microusd
        );
        let (_usdc_bps_pre, _xsgd_bps_pre, myrc_bps_pre, _jpyc_bps_pre) = coverage_bps(
            usdc_mu_pre, xsgd_mu_pre, myrc_mu_pre, jpyc_mu_pre, total_mu_pre
        );
        let fee_bps = compute_depth_fee_bps(
            registry,
            registry.target_myrc_bps,
            myrc_bps_pre,
            registry.withdraw_fee_floor_bps
        );
        let sbx_u128 = sbx_amount as u128;
        let net_usd_mu = (sbx_u128 * (10_000u128 - (fee_bps as u128))) / 10_000u128;
        let fee_usd_mu = sbx_u128 - net_usd_mu;
        let payout_units = ((net_usd_mu * 1_000_000u128) / (myrc_price_mu as u128)) as u64;
        assert!(pool.myrc_liability_units >= payout_units, E_RESERVE_BREACH);
        account.sbx = account.sbx - sbx_amount;
        pool.total_sbx_supply = pool.total_sbx_supply - sbx_amount;
        pool.myrc_liability_units = pool.myrc_liability_units - payout_units;
        // Accrue fee value per currency
        registry.fee_usd_accumulated_mu = registry.fee_usd_accumulated_mu + fee_usd_mu;
        registry.fee_accumulated_myrc_mu = registry.fee_accumulated_myrc_mu + fee_usd_mu;
    }

    /// Withdraw JPYC
    public entry fun withdraw_jpyc(
        account: &mut Account,
        pool: &mut Pool,
        registry: &mut Registry,
        sbx_amount: u64,
        jpyc_price_info_obj: &PriceInfoObject,
        clock: &Clock,
        ctx: &TxContext
    ) {
        assert!(sbx_amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(account.sbx >= sbx_amount, E_INSUFFICIENT_SBX);
        let jpyc_price_mu = pyth_adapter::read_price_microusd(jpyc_price_info_obj, clock);
        let (usdc_mu_pre, xsgd_mu_pre, myrc_mu_pre, jpyc_mu_pre, total_mu_pre) = vault_usd(
            pool,
            registry.xsgd_price_microusd,
            registry.myrc_price_microusd,
            jpyc_price_mu
        );
        let (_usdc_bps_pre, _xsgd_bps_pre, _myrc_bps_pre, jpyc_bps_pre) = coverage_bps(
            usdc_mu_pre, xsgd_mu_pre, myrc_mu_pre, jpyc_mu_pre, total_mu_pre
        );
        let fee_bps = compute_depth_fee_bps(
            registry,
            registry.target_jpyc_bps,
            jpyc_bps_pre,
            registry.withdraw_fee_floor_bps
        );
        let sbx_u128 = sbx_amount as u128;
        let net_usd_mu = (sbx_u128 * (10_000u128 - (fee_bps as u128))) / 10_000u128;
        let fee_usd_mu = sbx_u128 - net_usd_mu;
        let payout_units = ((net_usd_mu * 1_000_000u128) / (jpyc_price_mu as u128)) as u64;
        assert!(pool.jpyc_liability_units >= payout_units, E_RESERVE_BREACH);
        account.sbx = account.sbx - sbx_amount;
        pool.total_sbx_supply = pool.total_sbx_supply - sbx_amount;
        pool.jpyc_liability_units = pool.jpyc_liability_units - payout_units;
        // Accrue fee value per currency
        registry.fee_usd_accumulated_mu = registry.fee_usd_accumulated_mu + fee_usd_mu;
        registry.fee_accumulated_jpyc_mu = registry.fee_accumulated_jpyc_mu + fee_usd_mu;
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

    public fun registry_info(registry: &Registry): (address, address) {
        (registry.pyth_state, registry.pyth_package)
    }

    public fun feeds(registry: &Registry): (address, address, address) {
        (registry.xsgd_feed, registry.myrc_feed, registry.jpyc_feed)
    }

    public fun prices_microusd(registry: &Registry): (u64, u64, u64) {
        (registry.xsgd_price_microusd, registry.myrc_price_microusd, registry.jpyc_price_microusd)
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
        xsgd_bps: u64,
        myrc_bps: u64,
        jpyc_bps: u64,
        ctx: &TxContext
    ) {
        assert!(registry.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        registry.target_usdc_bps = usdc_bps;
        registry.target_xsgd_bps = xsgd_bps;
        registry.target_myrc_bps = myrc_bps;
        registry.target_jpyc_bps = jpyc_bps;
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
        xsgd_bps: u64,
        myrc_bps: u64,
        jpyc_bps: u64,
        ctx: &TxContext
    ) {
        assert!(registry.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        assert!(usdc_bps >= registry.mm_return_min_bps && usdc_bps <= registry.mm_return_max_bps, E_BAD_PARAMS);
        assert!(xsgd_bps >= registry.mm_return_min_bps && xsgd_bps <= registry.mm_return_max_bps, E_BAD_PARAMS);
        assert!(myrc_bps >= registry.mm_return_min_bps && myrc_bps <= registry.mm_return_max_bps, E_BAD_PARAMS);
        assert!(jpyc_bps >= registry.mm_return_min_bps && jpyc_bps <= registry.mm_return_max_bps, E_BAD_PARAMS);
        registry.mm_return_usdc_bps = usdc_bps;
        registry.mm_return_xsgd_bps = xsgd_bps;
        registry.mm_return_myrc_bps = myrc_bps;
        registry.mm_return_jpyc_bps = jpyc_bps;
    }

    /// Compute vault USD values (micro-USD) using provided prices
    public fun vault_usd(
        pool: &Pool,
        xsgd_price_mu: u64,
        myrc_price_mu: u64,
        jpyc_price_mu: u64
    ): (u128, u128, u128, u128, u128) {
        let usdc_mu: u128 = (pool.usdc_reserve as u128) * 1u128; // USDC 6dp aligns to micro-USD
        let xsgd_mu: u128 = ((pool.xsgd_liability_units as u128) * (xsgd_price_mu as u128)) / 1_000_000u128;
        let myrc_mu: u128 = ((pool.myrc_liability_units as u128) * (myrc_price_mu as u128)) / 1_000_000u128;
        let jpyc_mu: u128 = ((pool.jpyc_liability_units as u128) * (jpyc_price_mu as u128)) / 1_000_000u128;
        let total_mu: u128 = usdc_mu + xsgd_mu + myrc_mu + jpyc_mu;
        (usdc_mu, xsgd_mu, myrc_mu, jpyc_mu, total_mu)
    }

    /// Compute coverage in basis points for each asset (returns zeros if total is zero)
    public fun coverage_bps(
        usdc_mu: u128,
        xsgd_mu: u128,
        myrc_mu: u128,
        jpyc_mu: u128,
        total_mu: u128
    ): (u64, u64, u64, u64) {
        if (total_mu == 0u128) {
            (0, 0, 0, 0)
        } else {
            let to_bps = |v: u128, tot: u128| { ((v * 10_000u128) / tot) as u64 };
            let usdc_bps = to_bps(usdc_mu, total_mu);
            let xsgd_bps = to_bps(xsgd_mu, total_mu);
            let myrc_bps = to_bps(myrc_mu, total_mu);
            let jpyc_bps = to_bps(jpyc_mu, total_mu);
            (usdc_bps, xsgd_bps, myrc_bps, jpyc_bps)
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

    /// Refresh prices from Pyth Network
    /// This function reads live prices from Pyth and updates the registry
    /// Note: Requires PriceInfoObject IDs to be passed - these can be obtained from State
    public entry fun refresh_prices_from_pyth(
        registry: &mut Registry,
        pyth_state: &State,
        xsgd_price_info_obj: &PriceInfoObject,
        myrc_price_info_obj: &PriceInfoObject,
        jpyc_price_info_obj: &PriceInfoObject,
        clock: &Clock,
        ctx: &TxContext
    ) {
        assert!(registry.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        
        // Read prices from Pyth (will abort if feeds fail or prices are stale)
        registry.xsgd_price_microusd = pyth_adapter::read_price_microusd(xsgd_price_info_obj, clock);
        registry.myrc_price_microusd = pyth_adapter::read_price_microusd(myrc_price_info_obj, clock);
        registry.jpyc_price_microusd = pyth_adapter::read_price_microusd(jpyc_price_info_obj, clock);
    }

    /// Test a specific Pyth feed to see if it responds
    /// price_info_object: The PriceInfoObject for the feed to test
    /// Returns: success if feed is accessible and price is fresh
    public entry fun test_pyth_feed(
        price_info_object: &PriceInfoObject,
        clock: &Clock,
        ctx: &TxContext
    ) {
        // Attempt to read price (will abort if feed fails or price is stale)
        let _price = pyth_adapter::read_price_microusd(price_info_object, clock);
        // If we get here, the feed is working and price is fresh
        // Price is in micro-USD (1e6 = $1.00)
    }
}
