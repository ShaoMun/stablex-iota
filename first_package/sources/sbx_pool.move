module first_package::sbx_pool {
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use first_package::sbx::{Self, SBX};
    use iota::coin::{Self, Coin, TreasuryCap};
    use first_package::flash_vault::{Self, FlashVault, Receipt};
    use first_package::usdc::USDC;

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
    const E_USDC_DEPOSITOR_CANNOT_WITHDRAW_USDC: u64 = 11;
    const E_INSUFFICIENT_STAKED: u64 = 12;
    const E_EPOCH_NOT_COMPLETE: u64 = 13;
    const E_NO_STAKING_STATUS: u64 = 14;

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
        mm_reserved_usdc: u64,
        /// Epoch tracking for yield distribution
        current_epoch: u64,
        last_epoch_timestamp_ms: u64,
        epoch_duration_ms: u64,
        /// Accumulated yield to be distributed (in SBX, micro-USD)
        pending_yield_sbx: u64,
        /// SBX treasury cap for minting/burning tokens
        sbx_treasury: TreasuryCap<SBX>
    }

    /// Per-user account state (staking status)
    /// Note: Users hold actual SBX tokens (Coin<SBX>), not just balances
    public struct Account has key, store {
        id: UID,
        usdc_owed: u64,
        /// Staked amounts per currency (recorded when staking)
        /// User needs both status (staked amount) AND SBX tokens to unstake
        staked_usdc: u64,      // Staked USDC amount (in micro-USD)
        staked_chfx: u64,      // Staked CHFX amount (in native units)
        staked_tryb: u64,      // Staked TRYB amount (in native units)
        staked_sekx: u64,      // Staked SEKX amount (in native units)
        /// Last epoch when yield was claimed
        last_yield_epoch: u64
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
    /// Requires SBX treasury cap to be passed (created via sbx::init)
    public entry fun create_pool(
        fee_bps: u64,
        min_reserve_bps: u64,
        sbx_treasury: TreasuryCap<SBX>,
        ctx: &mut TxContext
    ) {
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
            mm_reserved_usdc: 0,
            current_epoch: 0,
            last_epoch_timestamp_ms: 0,
            epoch_duration_ms: 86400000,  // Default: 1 day in milliseconds
            pending_yield_sbx: 0,
            sbx_treasury
        };
        transfer::share_object(pool);
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
        transfer::share_object(registry);
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

    /// Admin: Deposit USDC to flash loan vault
    /// This should be called to deposit the MM allocation (30% of excess) to the vault
    public entry fun admin_deposit_vault_usdc(
        pool: &mut Pool,
        vault: &mut FlashVault,
        coin: Coin<USDC>,
        ctx: &TxContext
    ) {
        assert!(pool.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        let amount = coin::value(&coin);
        flash_vault::deposit_usdc(vault, coin);
        // Update tracking (vault balance is tracked separately in vault)
        // mm_reserved_usdc in pool is just for accounting
    }

    /// Admin: Withdraw USDC from flash loan vault
    /// This is a regular function (not entry) - returns Coin that must be handled in PTB
    public fun admin_withdraw_vault_usdc(
        pool: &mut Pool,
        vault: &mut FlashVault,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<USDC> {
        assert!(pool.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        assert!(amount > 0, E_ZERO_AMOUNT);
        flash_vault::withdraw_usdc(vault, amount, ctx)
    }

    /// Flash loan: Borrow USDC from vault
    /// Returns the borrowed coin and a receipt that must be used to repay
    /// Must be repaid in the same transaction via repay_flash_loan
    /// This is a regular function (not entry) - users must build PTBs to call it
    public fun flash_loan(
        vault: &mut FlashVault,
        amount: u64,
        ctx: &mut TxContext
    ): (Coin<USDC>, Receipt) {
        flash_vault::flash(vault, amount, ctx)
    }

    /// Repay flash loan
    /// Must repay at least the borrowed amount (can pay more as fee)
    /// This is a regular function (not entry) - users must build PTBs to call it
    public fun repay_flash_loan(
        vault: &mut FlashVault,
        coin: Coin<USDC>,
        receipt: Receipt
    ) {
        flash_vault::repay_flash(vault, coin, receipt);
    }

    /// Get flash vault balance
    public fun vault_balance(vault: &FlashVault): u64 {
        flash_vault::balance(vault)
    }

    /// Check if vault is currently flashed (loan active)
    public fun vault_is_flashed(vault: &FlashVault): bool {
        flash_vault::is_flashed(vault)
    }

    /// Legacy function - kept for compatibility
    /// Users should use stake functions instead which mint actual SBX tokens
    public entry fun deposit_and_mint(
        account: &mut Account,
        pool: &mut Pool,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        
        // Mint SBX tokens and transfer to user
        sbx::mint(&mut pool.sbx_treasury, tx_context::sender(ctx), amount, ctx);
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
            
            // 50% of excess → USDC
            let usdc_allocation = ((excess_mu * 5u128) / 10u128) as u64;
            
            // 20% of excess → Auto-swap to regionals
            let swap_total = ((excess_mu * 2u128) / 10u128) as u64;
            
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

    /// Stake USDC, mint SBX at 1 SBX = 1 USD (micro-USD)
    /// amount: USDC minimal units (6 decimals), equal to micro-USD
    /// Prices are passed as parameters (queried from API off-chain)
    /// Records staked amount in account status
    /// Mints actual SBX tokens and transfers to user
    /// MM allocation (30% of excess) is tracked for flash loan vault
    public entry fun stake_usdc(
        account: &mut Account,
        pool: &mut Pool,
        registry: &Registry,
        amount: u64,
        chfx_price_microusd: u64,
        tryb_price_microusd: u64,
        sekx_price_microusd: u64,
        ctx: &mut TxContext
    ) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        
        // Compute allocation
        let (usdc_reserve, mm_allocation, _usdc_allocation, _chfx_swap, _tryb_swap, _sekx_swap) = compute_usdc_allocation(
            pool, amount, chfx_price_microusd, tryb_price_microusd, sekx_price_microusd
        );
        
        // Mint SBX equal to USD micro value and transfer to user
        let mint_amount = amount;
        sbx::mint(&mut pool.sbx_treasury, tx_context::sender(ctx), mint_amount, ctx);
        pool.total_sbx_supply = pool.total_sbx_supply + mint_amount;
        
        // Record staked amount in account status
        account.staked_usdc = account.staked_usdc + amount;
        
        // Update USDC reserve (maintains balance with regionals + 50% of excess)
        pool.usdc_reserve = usdc_reserve;
        
        // Update MM reserved amount (30% of excess) - tracked for flash loan vault
        pool.mm_reserved_usdc = pool.mm_reserved_usdc + mm_allocation;
        
        // Note: Auto-swap amounts are advisory; actual swaps happen via market incentives (fees)
        // Note: MM allocation should be deposited to flash vault via admin_deposit_vault_usdc
    }

    /// Legacy function - kept for compatibility
    /// Users should use unstake functions with Coin<SBX> instead
    public entry fun redeem_regional(
        account: &mut Account,
        pool: &mut Pool,
        sbx_coin: Coin<SBX>,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&sbx_coin);
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        
        // Burn SBX tokens
        sbx::burn(&mut pool.sbx_treasury, sbx_coin);
        pool.total_sbx_supply = pool.total_sbx_supply - amount;
        pool.total_rc_liability = pool.total_rc_liability - amount;
    }

    /// Stake CHFX, mint SBX based on USD value
    /// Records staked amount in account status
    /// Mints actual SBX tokens and transfers to user
    public entry fun stake_chfx(
        account: &mut Account,
        pool: &mut Pool,
        registry: &Registry,
        amount: u64,
        price_microusd: u64,
        ctx: &mut TxContext
    ) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(registry.chfx_whitelisted, E_NOT_WHITELISTED);
        assert!(price_microusd > 0, E_PRICE_NOT_SET);
        
        // Calculate USD value: amount (in token units) * price (micro-USD) / 1_000_000
        // This gives us the USD value in micro-USD, which equals the SBX amount to mint
        let usd_value_mu = ((amount as u128) * (price_microusd as u128)) / 1_000_000u128;
        let mint_amount = usd_value_mu as u64;
        
        // Mint SBX tokens and transfer to user
        sbx::mint(&mut pool.sbx_treasury, tx_context::sender(ctx), mint_amount, ctx);
        pool.total_sbx_supply = pool.total_sbx_supply + mint_amount;
        pool.total_rc_liability = pool.total_rc_liability + amount;
        pool.chfx_liability_units = pool.chfx_liability_units + amount;
        
        // Record staked amount in account status
        account.staked_chfx = account.staked_chfx + amount;
    }

    /// Stake TRYB, mint SBX based on USD value
    /// Records staked amount in account status
    /// Mints actual SBX tokens and transfers to user
    public entry fun stake_tryb(
        account: &mut Account,
        pool: &mut Pool,
        registry: &Registry,
        amount: u64,
        price_microusd: u64,
        ctx: &mut TxContext
    ) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(registry.tryb_whitelisted, E_NOT_WHITELISTED);
        assert!(price_microusd > 0, E_PRICE_NOT_SET);
        
        // Calculate USD value: amount (in token units) * price (micro-USD) / 1_000_000
        // This gives us the USD value in micro-USD, which equals the SBX amount to mint
        let usd_value_mu = ((amount as u128) * (price_microusd as u128)) / 1_000_000u128;
        let mint_amount = usd_value_mu as u64;
        
        // Mint SBX tokens and transfer to user
        sbx::mint(&mut pool.sbx_treasury, tx_context::sender(ctx), mint_amount, ctx);
        pool.total_sbx_supply = pool.total_sbx_supply + mint_amount;
        pool.total_rc_liability = pool.total_rc_liability + amount;
        pool.tryb_liability_units = pool.tryb_liability_units + amount;
        
        // Record staked amount in account status
        account.staked_tryb = account.staked_tryb + amount;
    }

    /// Stake SEKX, mint SBX based on USD value
    /// Records staked amount in account status
    /// Mints actual SBX tokens and transfers to user
    public entry fun stake_sekx(
        account: &mut Account,
        pool: &mut Pool,
        registry: &Registry,
        amount: u64,
        price_microusd: u64,
        ctx: &mut TxContext
    ) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        assert!(registry.sekx_whitelisted, E_NOT_WHITELISTED);
        assert!(price_microusd > 0, E_PRICE_NOT_SET);
        
        // Calculate USD value: amount (in token units) * price (micro-USD) / 1_000_000
        // This gives us the USD value in micro-USD, which equals the SBX amount to mint
        let usd_value_mu = ((amount as u128) * (price_microusd as u128)) / 1_000_000u128;
        let mint_amount = usd_value_mu as u64;
        
        // Mint SBX tokens and transfer to user
        sbx::mint(&mut pool.sbx_treasury, tx_context::sender(ctx), mint_amount, ctx);
        pool.total_sbx_supply = pool.total_sbx_supply + mint_amount;
        pool.total_rc_liability = pool.total_rc_liability + amount;
        pool.sekx_liability_units = pool.sekx_liability_units + amount;
        
        // Record staked amount in account status
        account.staked_sekx = account.staked_sekx + amount;
    }


    /// Transfer SBX tokens between users
    /// Users transfer actual Coin<SBX> tokens, not account balances
    /// This is a helper function - users can also use sbx::transfer directly
    public entry fun transfer_sbx(
        from_coin: &mut Coin<SBX>,
        to: address,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        sbx::transfer(from_coin, to, amount, ctx);
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

    /// Unstake USDC by burning SBX. Applies depth-aware fee.
    /// Users can unstake anytime (before or after epoch completion).
    /// Note: Users who unstake before epoch completion will not receive yield for that epoch.
    /// Asymmetric withdrawal rule: User can only withdraw USDC if SBX > staked USDC.
    /// This means USDC stakers cannot withdraw USDC (they can only withdraw regionals).
    /// Prices are passed as parameters (queried from API off-chain)
    /// User must pass SBX tokens to burn
    public entry fun unstake_usdc(
        account: &mut Account,
        pool: &mut Pool,
        registry: &mut Registry,
        sbx_coin: Coin<SBX>,
        chfx_price_microusd: u64,
        tryb_price_microusd: u64,
        sekx_price_microusd: u64,
        ctx: &mut TxContext
    ) {
        let sbx_amount = coin::value(&sbx_coin);
        assert!(sbx_amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        
        // Check user's SBX balance from coin
        // Asymmetric withdrawal: User can only withdraw USDC if SBX > staked USDC
        // This prevents USDC stakers from withdrawing USDC
        assert!(sbx_amount > account.staked_usdc, E_USDC_DEPOSITOR_CANNOT_WITHDRAW_USDC);

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

        // Burn SBX tokens
        sbx::burn(&mut pool.sbx_treasury, sbx_coin);
        pool.total_sbx_supply = pool.total_sbx_supply - sbx_amount;
        pool.usdc_reserve = pool.usdc_reserve - net_u64;
        
        // Note: We don't reduce staked_usdc here because:
        // - If user has SBX > staked_usdc, they're withdrawing yield (not original stake)
        // - If user has SBX <= staked_usdc, they cannot withdraw USDC (check above prevents this)
        // - Regional stakers can withdraw USDC but don't have staked_usdc, so nothing to reduce
        
        // Accrue fee value per currency
        registry.fee_usd_accumulated_mu = registry.fee_usd_accumulated_mu + fee_usd_mu;
        registry.fee_accumulated_usdc_mu = registry.fee_accumulated_usdc_mu + fee_usd_mu;
    }

    /// Unstake CHFX by burning SBX. Applies depth-aware fee based on CHFX scarcity.
    /// Users can unstake anytime (before or after epoch completion).
    /// Note: Users who unstake before epoch completion will not receive yield for that epoch.
    /// User needs both staked amount (status) AND SBX tokens to unstake.
    /// Prices are passed as parameters (queried from API off-chain)
    /// User must pass SBX tokens to burn
    public entry fun unstake_chfx(
        account: &mut Account,
        pool: &mut Pool,
        registry: &mut Registry,
        sbx_coin: Coin<SBX>,
        chfx_price_microusd: u64,
        tryb_price_microusd: u64,
        sekx_price_microusd: u64,
        ctx: &mut TxContext
    ) {
        let sbx_amount = coin::value(&sbx_coin);
        assert!(sbx_amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        
        // Calculate required CHFX units for this SBX amount
        let required_chfx_units = ((sbx_amount as u128) * 1_000_000u128) / (chfx_price_microusd as u128);
        assert!(account.staked_chfx >= (required_chfx_units as u64), E_INSUFFICIENT_STAKED);

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

        // Burn SBX tokens and reduce liability
        sbx::burn(&mut pool.sbx_treasury, sbx_coin);
        pool.total_sbx_supply = pool.total_sbx_supply - sbx_amount;
        pool.chfx_liability_units = pool.chfx_liability_units - payout_units;
        
        // Reduce staked amount (user unstaking)
        account.staked_chfx = account.staked_chfx - payout_units;
        
        // Accrue fee value per currency
        registry.fee_usd_accumulated_mu = registry.fee_usd_accumulated_mu + fee_usd_mu;
        registry.fee_accumulated_chfx_mu = registry.fee_accumulated_chfx_mu + fee_usd_mu;
    }

    /// Unstake TRYB by burning SBX. User needs both staked amount (status) AND SBX tokens to unstake.
    /// Users can unstake anytime (before or after epoch completion).
    /// Note: Users who unstake before epoch completion will not receive yield for that epoch.
    /// Prices are passed as parameters (queried from API off-chain)
    /// User must pass SBX tokens to burn
    public entry fun unstake_tryb(
        account: &mut Account,
        pool: &mut Pool,
        registry: &mut Registry,
        sbx_coin: Coin<SBX>,
        chfx_price_microusd: u64,
        tryb_price_microusd: u64,
        sekx_price_microusd: u64,
        ctx: &mut TxContext
    ) {
        let sbx_amount = coin::value(&sbx_coin);
        assert!(sbx_amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        
        // Calculate required TRYB units for this SBX amount
        let required_tryb_units = ((sbx_amount as u128) * 1_000_000u128) / (tryb_price_microusd as u128);
        assert!(account.staked_tryb >= (required_tryb_units as u64), E_INSUFFICIENT_STAKED);
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
        // Burn SBX tokens and reduce liability
        sbx::burn(&mut pool.sbx_treasury, sbx_coin);
        pool.total_sbx_supply = pool.total_sbx_supply - sbx_amount;
        pool.tryb_liability_units = pool.tryb_liability_units - payout_units;
        
        // Reduce staked amount (user unstaking)
        account.staked_tryb = account.staked_tryb - payout_units;
        
        // Accrue fee value per currency
        registry.fee_usd_accumulated_mu = registry.fee_usd_accumulated_mu + fee_usd_mu;
        registry.fee_accumulated_tryb_mu = registry.fee_accumulated_tryb_mu + fee_usd_mu;
    }

    /// Unstake SEKX by burning SBX. User needs both staked amount (status) AND SBX tokens to unstake.
    /// Users can unstake anytime (before or after epoch completion).
    /// Note: Users who unstake before epoch completion will not receive yield for that epoch.
    /// Prices are passed as parameters (queried from API off-chain)
    /// User must pass SBX tokens to burn
    public entry fun unstake_sekx(
        account: &mut Account,
        pool: &mut Pool,
        registry: &mut Registry,
        sbx_coin: Coin<SBX>,
        chfx_price_microusd: u64,
        tryb_price_microusd: u64,
        sekx_price_microusd: u64,
        ctx: &mut TxContext
    ) {
        let sbx_amount = coin::value(&sbx_coin);
        assert!(sbx_amount > 0, E_ZERO_AMOUNT);
        assert!(!pool.paused, E_PAUSED);
        
        // Calculate required SEKX units for this SBX amount
        let required_sekx_units = ((sbx_amount as u128) * 1_000_000u128) / (sekx_price_microusd as u128);
        assert!(account.staked_sekx >= (required_sekx_units as u64), E_INSUFFICIENT_STAKED);
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
        // Burn SBX tokens and reduce liability
        sbx::burn(&mut pool.sbx_treasury, sbx_coin);
        pool.total_sbx_supply = pool.total_sbx_supply - sbx_amount;
        pool.sekx_liability_units = pool.sekx_liability_units - payout_units;
        
        // Reduce staked amount (user unstaking)
        account.staked_sekx = account.staked_sekx - payout_units;
        
        // Accrue fee value per currency
        registry.fee_usd_accumulated_mu = registry.fee_usd_accumulated_mu + fee_usd_mu;
        registry.fee_accumulated_sekx_mu = registry.fee_accumulated_sekx_mu + fee_usd_mu;
    }

    /// View helpers
    /// Note: Users hold actual Coin<SBX> tokens, so balance is checked from coin objects
    /// This function is kept for compatibility but users should check coin balance directly

    /// Get staked amounts
    public fun staked_usdc_of(account: &Account): u64 {
        account.staked_usdc
    }

    public fun staked_chfx_of(account: &Account): u64 {
        account.staked_chfx
    }

    public fun staked_tryb_of(account: &Account): u64 {
        account.staked_tryb
    }

    public fun staked_sekx_of(account: &Account): u64 {
        account.staked_sekx
    }

    public fun usdc_owed_of(account: &Account): u64 {
        account.usdc_owed
    }

    /// Create a new account for a user
    /// Users need an account object to stake/unstake
    public entry fun create_account(ctx: &mut TxContext) {
        let account = Account {
            id: object::new(ctx),
            usdc_owed: 0,
            staked_usdc: 0,
            staked_chfx: 0,
            staked_tryb: 0,
            staked_sekx: 0,
            last_yield_epoch: 0
        };
        transfer::public_transfer(account, tx_context::sender(ctx));
    }

    /// Migrate staking status from one account to another
    /// Transfers all staked amounts (staked_usdc, staked_chfx, staked_tryb, staked_sekx)
    /// from source_account to destination_account
    /// 
    /// Requirements:
    /// - Only the owner of source_account can migrate (must be sender)
    /// - Destination account must exist (created via create_account)
    /// - Source account must have some staking status to migrate
    /// 
    /// After migration:
    /// - Destination account can unstake if they have the corresponding SBX tokens
    /// - Source account's staked amounts are reset to 0
    /// - last_yield_epoch is transferred to destination (uses the later epoch)
    public entry fun migrate_staking_status(
        source_account: &mut Account,
        destination_account: &mut Account,
        ctx: &TxContext
    ) {
        // Verify sender owns the source account (in Move, this is implicit via object ownership)
        // The source_account must be passed as owned object, so only owner can call
        
        // Check that source has staking status to migrate
        let total_staked = source_account.staked_usdc + 
                          source_account.staked_chfx + 
                          source_account.staked_tryb + 
                          source_account.staked_sekx;
        assert!(total_staked > 0, E_NO_STAKING_STATUS);
        
        // Transfer staked amounts to destination
        destination_account.staked_usdc = destination_account.staked_usdc + source_account.staked_usdc;
        destination_account.staked_chfx = destination_account.staked_chfx + source_account.staked_chfx;
        destination_account.staked_tryb = destination_account.staked_tryb + source_account.staked_tryb;
        destination_account.staked_sekx = destination_account.staked_sekx + source_account.staked_sekx;
        
        // Transfer last_yield_epoch (use the later epoch to ensure yield eligibility)
        if (source_account.last_yield_epoch > destination_account.last_yield_epoch) {
            destination_account.last_yield_epoch = source_account.last_yield_epoch;
        };
        
        // Reset source account staking status
        source_account.staked_usdc = 0;
        source_account.staked_chfx = 0;
        source_account.staked_tryb = 0;
        source_account.staked_sekx = 0;
        // Note: We don't reset last_yield_epoch on source, as it's informational
        
        // Note: usdc_owed is not migrated (it's a separate debt mechanism)
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

    /// Calculate unified APY for all depositors (in basis points)
    /// All depositors earn the same unified APY (higher than USDC alone)
    /// Dynamic based on pool balance and allocation
    /// Balance = USDC / sum(regionals)
    public fun estimated_unified_apy_bps(
        registry: &Registry,
        pool: &Pool,
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
        
        // 2. Base fee APY (unified for all)
        let fee_apy_bps = ((fees_7d_mu * 52u128 * 10_000u128) / avg_tvl_7d_mu) as u64;
        
        // 3. MM return APY (unified, weighted average of all currencies)
        // Only if balanced and has MM allocation
        let mm_apy_bps = if (balance_ratio >= 10_000u128 && pool.mm_reserved_usdc > 0) {
            // Weighted average of MM returns based on pool composition
            let total_mu = usdc_mu + regionals_sum_mu;
            let usdc_weight = if (total_mu > 0) { (usdc_mu * 10_000u128) / total_mu } else { 0u128 };
            let chfx_weight = if (total_mu > 0) { (chfx_mu * 10_000u128) / total_mu } else { 0u128 };
            let tryb_weight = if (total_mu > 0) { (tryb_mu * 10_000u128) / total_mu } else { 0u128 };
            let sekx_weight = if (total_mu > 0) { (sekx_mu * 10_000u128) / total_mu } else { 0u128 };
            
            let weighted_mm = ((usdc_weight * (registry.mm_return_usdc_bps as u128)) +
                              (chfx_weight * (registry.mm_return_chfx_bps as u128)) +
                              (tryb_weight * (registry.mm_return_tryb_bps as u128)) +
                              (sekx_weight * (registry.mm_return_sekx_bps as u128))) / 10_000u128;
            weighted_mm as u64
            } else {
                0u64
        };
        
        // 4. Unified APY = fee APY + MM APY
        // All depositors earn the same unified APY (higher than USDC alone)
        let total_apy = (fee_apy_bps as u128) + (mm_apy_bps as u128);
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

    /// Admin: Set epoch duration (in milliseconds)
    public entry fun admin_set_epoch_duration(
        pool: &mut Pool,
        duration_ms: u64,
        ctx: &TxContext
    ) {
        assert!(pool.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        assert!(duration_ms > 0, E_BAD_PARAMS);
        pool.epoch_duration_ms = duration_ms;
    }

    /// Check if epoch is complete and advance if needed
    /// Returns: (epoch_complete: bool, current_epoch: u64)
    public fun check_and_advance_epoch(pool: &mut Pool, current_timestamp_ms: u64): (bool, u64) {
        if (pool.last_epoch_timestamp_ms == 0) {
            // First epoch - initialize
            pool.last_epoch_timestamp_ms = current_timestamp_ms;
            pool.current_epoch = 1;
            (false, pool.current_epoch)
        } else {
            let elapsed = current_timestamp_ms - pool.last_epoch_timestamp_ms;
            if (elapsed >= pool.epoch_duration_ms) {
                // Epoch complete - advance
                pool.current_epoch = pool.current_epoch + 1;
                pool.last_epoch_timestamp_ms = current_timestamp_ms;
                (true, pool.current_epoch)
            } else {
                (false, pool.current_epoch)
            }
        }
    }

    /// Distribute yield SBX to staker accounts after epoch completion
    /// Yield is distributed proportionally based on staked amounts at epoch completion
    /// Users who unstake before epoch completion will not receive yield for that epoch
    /// (because their staked amounts are reduced, so they get no yield)
    /// This function should be called after epoch completion
    public entry fun distribute_yield_after_epoch(
        account: &mut Account,
        pool: &mut Pool,
        registry: &Registry,
        current_timestamp_ms: u64,
        chfx_price_mu: u64,
        tryb_price_mu: u64,
        sekx_price_mu: u64,
        ctx: &mut TxContext
    ) {
        assert!(!pool.paused, E_PAUSED);
        
        // Check and advance epoch
        let (epoch_complete, current_epoch) = check_and_advance_epoch(pool, current_timestamp_ms);
        // Only distribute yield if epoch is complete and user hasn't claimed for this epoch
        assert!(epoch_complete, E_EPOCH_NOT_COMPLETE);
        assert!(account.last_yield_epoch < current_epoch, E_EPOCH_NOT_COMPLETE);
        
        // Calculate user's total staked value in micro-USD at epoch completion
        // Note: If user unstaked before epoch completion, their staked amounts are already reduced
        // So they will receive yield only for what remains staked at epoch completion
        let staked_usdc_mu = account.staked_usdc;
        let staked_chfx_mu = ((account.staked_chfx as u128) * (chfx_price_mu as u128)) / 1_000_000u128;
        let staked_tryb_mu = ((account.staked_tryb as u128) * (tryb_price_mu as u128)) / 1_000_000u128;
        let staked_sekx_mu = ((account.staked_sekx as u128) * (sekx_price_mu as u128)) / 1_000_000u128;
        let total_staked_mu = (staked_usdc_mu as u128) + staked_chfx_mu + staked_tryb_mu + staked_sekx_mu;
        
        if (total_staked_mu == 0u128) {
            // No staked amount at epoch completion (user unstaked everything before epoch ended)
            // No yield for this user
            account.last_yield_epoch = current_epoch;
            return
        };
        
        // Calculate total pool staked value
        let pool_usdc_mu = pool.usdc_reserve as u128;
        let pool_chfx_mu = ((pool.chfx_liability_units as u128) * (chfx_price_mu as u128)) / 1_000_000u128;
        let pool_tryb_mu = ((pool.tryb_liability_units as u128) * (tryb_price_mu as u128)) / 1_000_000u128;
        let pool_sekx_mu = ((pool.sekx_liability_units as u128) * (sekx_price_mu as u128)) / 1_000_000u128;
        let total_pool_mu = pool_usdc_mu + pool_chfx_mu + pool_tryb_mu + pool_sekx_mu;
        
        if (total_pool_mu == 0u128) {
            account.last_yield_epoch = current_epoch;
            return
        };
        
        // Calculate user's share of yield
        // Yield = pending_yield_sbx * (user_staked / total_pool_staked)
        let user_yield = ((pool.pending_yield_sbx as u128) * total_staked_mu) / total_pool_mu;
        
        // Distribute yield by minting SBX tokens and transferring to user
        sbx::mint(&mut pool.sbx_treasury, tx_context::sender(ctx), user_yield as u64, ctx);
        pool.total_sbx_supply = pool.total_sbx_supply + (user_yield as u64);
        
        // Update last yield epoch
        account.last_yield_epoch = current_epoch;
    }

    /// Admin: Add yield to pool (called after epoch, from fees/MM returns)
    public entry fun admin_add_yield(
        pool: &mut Pool,
        yield_amount_sbx: u64,
        ctx: &TxContext
    ) {
        assert!(pool.admin == tx_context::sender(ctx), E_NOT_ADMIN);
        assert!(yield_amount_sbx > 0, E_ZERO_AMOUNT);
        pool.pending_yield_sbx = pool.pending_yield_sbx + yield_amount_sbx;
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
