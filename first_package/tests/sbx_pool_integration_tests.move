#[test_only]
module first_package::sbx_pool_integration_tests {
    use first_package::sbx_pool;
    use first_package::sbx::{Self, SBX};
    use iota::coin::{Self, Coin, TreasuryCap};
    use iota::object;
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use std::debug;
    use std::option;
    use std::vector;

    // Test constants
    const TEST_FEE_BPS: u64 = 30; // 0.3%
    const TEST_MIN_RESERVE_BPS: u64 = 1000; // 10%
    const TEST_CHFX_PRICE: u64 = 750_000; // 0.75 USD
    const TEST_TRYB_PRICE: u64 = 250_000; // 0.25 USD
    const TEST_SEKX_PRICE: u64 = 900_000; // 0.90 USD

    /// Test helper: Create test pool
    fun create_test_pool(ctx: &mut TxContext): (sbx_pool::Pool, TreasuryCap<SBX>) {
        // First create SBX token
        let witness = SBX {};
        let (treasury, _deny_cap, metadata) = coin::create_regulated_currency_v1(
            witness,
            6,
            b"SBX",
            b"StableX Token",
            b"Test token",
            option::none(),
            false,
            ctx
        );
        transfer::public_freeze_object(metadata);
        
        // Create pool with treasury
        sbx_pool::create_pool(TEST_FEE_BPS, TEST_MIN_RESERVE_BPS, treasury, ctx);
        
        // Get pool object (in real scenario, would be transferred)
        // For testing, we'll simulate by creating account
        let pool = sbx_pool::Pool {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            paused: false,
            fee_bps: TEST_FEE_BPS,
            min_reserve_bps: TEST_MIN_RESERVE_BPS,
            usdc_reserve: 0,
            total_sbx_supply: 0,
            total_rc_liability: 0,
            chfx_liability_units: 0,
            tryb_liability_units: 0,
            sekx_liability_units: 0,
            mm_reserved_usdc: 0,
            current_epoch: 0,
            last_epoch_timestamp_ms: 0,
            epoch_duration_ms: 86400000,
            pending_yield_sbx: 0,
            sbx_treasury: treasury
        };
        
        (pool, treasury)
    }

    /// Test helper: Create test registry
    fun create_test_registry(ctx: &mut TxContext): sbx_pool::Registry {
        sbx_pool::create_registry(ctx);
        // In real scenario, would get from transfer
        // For testing, create minimal registry
        let registry = sbx_pool::Registry {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            chfx_whitelisted: true,
            tryb_whitelisted: true,
            sekx_whitelisted: true,
            chfx_price_microusd: TEST_CHFX_PRICE,
            tryb_price_microusd: TEST_TRYB_PRICE,
            sekx_price_microusd: TEST_SEKX_PRICE,
            target_usdc_bps: 4000,
            target_chfx_bps: 2000,
            target_tryb_bps: 2000,
            target_sekx_bps: 2000,
            base_fee_bps: 2,
            depth_fee_k_bps: 50,
            withdraw_fee_floor_bps: 5,
            swap_fee_floor_bps: 5,
            max_fee_bps: 500,
            high_coverage_threshold_bps: 8000,
            low_coverage_threshold_bps: 3000,
            tier2_base_multiplier: 10,
            tier2_exponential_factor: 5,
            mm_return_min_bps: 200,
            mm_return_max_bps: 800,
            mm_return_usdc_bps: 400,
            mm_return_chfx_bps: 400,
            mm_return_tryb_bps: 400,
            mm_return_sekx_bps: 400,
            fee_usd_accumulated_mu: 0,
            fee_accumulated_usdc_mu: 0,
            fee_accumulated_chfx_mu: 0,
            fee_accumulated_tryb_mu: 0,
            fee_accumulated_sekx_mu: 0
        };
        registry
    }

    /// Test helper: Create test account
    fun create_test_account(ctx: &mut TxContext): sbx_pool::Account {
        sbx_pool::Account {
            id: object::new(ctx),
            usdc_owed: 0,
            staked_usdc: 0,
            staked_chfx: 0,
            staked_tryb: 0,
            staked_sekx: 0,
            last_yield_epoch: 0
        }
    }

    /// Test 1: SBX Token Creation
    #[test]
    fun test_sbx_token_creation() {
        let mut ctx = tx_context::dummy();
        let witness = SBX {};
        let (treasury, deny_cap, metadata) = coin::create_regulated_currency_v1(
            witness,
            6,
            b"SBX",
            b"StableX Token",
            b"Test",
            option::none(),
            false,
            &mut ctx
        );
        
        // Verify treasury was created
        assert!(coin::supply(&treasury) == option::none(), 1);
        
        // Test minting
        let mint_amount = 1_000_000u64; // 1 SBX
        let coin = coin::mint(&mut treasury, mint_amount, &mut ctx);
        assert!(coin::value(&coin) == mint_amount, 2);
        
        // Test burning
        coin::burn(&mut treasury, coin, &mut ctx);
        
        tx_context::destroy(ctx);
    }

    /// Test 2: Pool Creation
    #[test]
    fun test_pool_creation() {
        let mut ctx = tx_context::dummy();
        let witness = SBX {};
        let (treasury, _deny_cap, _metadata) = coin::create_regulated_currency_v1(
            witness,
            6,
            b"SBX",
            b"",
            b"",
            option::none(),
            false,
            &mut ctx
        );
        
        sbx_pool::create_pool(TEST_FEE_BPS, TEST_MIN_RESERVE_BPS, treasury, &mut ctx);
        
        // Pool creation should succeed
        // In real scenario, would verify pool object exists
        tx_context::destroy(ctx);
    }

    /// Test 3: Registry Creation
    #[test]
    fun test_registry_creation() {
        let mut ctx = tx_context::dummy();
        sbx_pool::create_registry(&mut ctx);
        
        // Registry creation should succeed
        tx_context::destroy(ctx);
    }

    /// Test 4: Stake USDC
    #[test]
    fun test_stake_usdc() {
        let mut ctx = tx_context::dummy();
        let sender = tx_context::sender(&ctx);
        
        // Create pool
        let witness = SBX {};
        let (treasury, _deny_cap, metadata) = coin::create_regulated_currency_v1(
            witness,
            6,
            b"SBX",
            b"",
            b"",
            option::none(),
            false,
            &mut ctx
        );
        transfer::public_freeze_object(metadata);
        
        let pool_id = object::new(&mut ctx);
        let pool = sbx_pool::Pool {
            id: pool_id,
            admin: sender,
            paused: false,
            fee_bps: TEST_FEE_BPS,
            min_reserve_bps: TEST_MIN_RESERVE_BPS,
            usdc_reserve: 0,
            total_sbx_supply: 0,
            total_rc_liability: 0,
            chfx_liability_units: 0,
            tryb_liability_units: 0,
            sekx_liability_units: 0,
            mm_reserved_usdc: 0,
            current_epoch: 0,
            last_epoch_timestamp_ms: 0,
            epoch_duration_ms: 86400000,
            pending_yield_sbx: 0,
            sbx_treasury: treasury
        };
        
        // Create account
        let account = sbx_pool::Account {
            id: object::new(&mut ctx),
            usdc_owed: 0,
            staked_usdc: 0,
            staked_chfx: 0,
            staked_tryb: 0,
            staked_sekx: 0,
            last_yield_epoch: 0
        };
        
        // Create registry
        let registry = sbx_pool::Registry {
            id: object::new(&mut ctx),
            admin: sender,
            chfx_whitelisted: true,
            tryb_whitelisted: true,
            sekx_whitelisted: true,
            chfx_price_microusd: TEST_CHFX_PRICE,
            tryb_price_microusd: TEST_TRYB_PRICE,
            sekx_price_microusd: TEST_SEKX_PRICE,
            target_usdc_bps: 4000,
            target_chfx_bps: 2000,
            target_tryb_bps: 2000,
            target_sekx_bps: 2000,
            base_fee_bps: 2,
            depth_fee_k_bps: 50,
            withdraw_fee_floor_bps: 5,
            swap_fee_floor_bps: 5,
            max_fee_bps: 500,
            high_coverage_threshold_bps: 8000,
            low_coverage_threshold_bps: 3000,
            tier2_base_multiplier: 10,
            tier2_exponential_factor: 5,
            mm_return_min_bps: 200,
            mm_return_max_bps: 800,
            mm_return_usdc_bps: 400,
            mm_return_chfx_bps: 400,
            mm_return_tryb_bps: 400,
            mm_return_sekx_bps: 400,
            fee_usd_accumulated_mu: 0,
            fee_accumulated_usdc_mu: 0,
            fee_accumulated_chfx_mu: 0,
            fee_accumulated_tryb_mu: 0,
            fee_accumulated_sekx_mu: 0
        };
        
        let stake_amount = 1_000_000u64; // 1 USDC (6 decimals)
        
        // Stake USDC
        sbx_pool::stake_usdc(
            &mut account,
            &mut pool,
            &registry,
            stake_amount,
            TEST_CHFX_PRICE,
            TEST_TRYB_PRICE,
            TEST_SEKX_PRICE,
            &mut ctx
        );
        
        // Verify staked amount recorded
        assert!(sbx_pool::staked_usdc_of(&account) == stake_amount, 10);
        assert!(pool.total_sbx_supply == stake_amount, 11);
        assert!(pool.usdc_reserve == stake_amount, 12); // Initially all goes to reserve
        
        tx_context::destroy(ctx);
    }

    /// Test 5: Stake CHFX
    #[test]
    fun test_stake_chfx() {
        let mut ctx = tx_context::dummy();
        let sender = tx_context::sender(&ctx);
        
        // Setup (similar to test_stake_usdc)
        let witness = SBX {};
        let (treasury, _deny_cap, metadata) = coin::create_regulated_currency_v1(
            witness,
            6,
            b"SBX",
            b"",
            b"",
            option::none(),
            false,
            &mut ctx
        );
        transfer::public_freeze_object(metadata);
        
        let mut pool = sbx_pool::Pool {
            id: object::new(&mut ctx),
            admin: sender,
            paused: false,
            fee_bps: TEST_FEE_BPS,
            min_reserve_bps: TEST_MIN_RESERVE_BPS,
            usdc_reserve: 0,
            total_sbx_supply: 0,
            total_rc_liability: 0,
            chfx_liability_units: 0,
            tryb_liability_units: 0,
            sekx_liability_units: 0,
            mm_reserved_usdc: 0,
            current_epoch: 0,
            last_epoch_timestamp_ms: 0,
            epoch_duration_ms: 86400000,
            pending_yield_sbx: 0,
            sbx_treasury: treasury
        };
        
        let mut account = sbx_pool::Account {
            id: object::new(&mut ctx),
            usdc_owed: 0,
            staked_usdc: 0,
            staked_chfx: 0,
            staked_tryb: 0,
            staked_sekx: 0,
            last_yield_epoch: 0
        };
        
        let registry = sbx_pool::Registry {
            id: object::new(&mut ctx),
            admin: sender,
            chfx_whitelisted: true,
            tryb_whitelisted: true,
            sekx_whitelisted: true,
            chfx_price_microusd: TEST_CHFX_PRICE,
            tryb_price_microusd: TEST_TRYB_PRICE,
            sekx_price_microusd: TEST_SEKX_PRICE,
            target_usdc_bps: 4000,
            target_chfx_bps: 2000,
            target_tryb_bps: 2000,
            target_sekx_bps: 2000,
            base_fee_bps: 2,
            depth_fee_k_bps: 50,
            withdraw_fee_floor_bps: 5,
            swap_fee_floor_bps: 5,
            max_fee_bps: 500,
            high_coverage_threshold_bps: 8000,
            low_coverage_threshold_bps: 3000,
            tier2_base_multiplier: 10,
            tier2_exponential_factor: 5,
            mm_return_min_bps: 200,
            mm_return_max_bps: 800,
            mm_return_usdc_bps: 400,
            mm_return_chfx_bps: 400,
            mm_return_tryb_bps: 400,
            mm_return_sekx_bps: 400,
            fee_usd_accumulated_mu: 0,
            fee_accumulated_usdc_mu: 0,
            fee_accumulated_chfx_mu: 0,
            fee_accumulated_tryb_mu: 0,
            fee_accumulated_sekx_mu: 0
        };
        
        let stake_amount = 1_000_000u64; // 1 CHFX
        
        // Stake CHFX
        sbx_pool::stake_chfx(
            &mut account,
            &mut pool,
            &registry,
            stake_amount,
            TEST_CHFX_PRICE,
            &mut ctx
        );
        
        // Verify: Expected SBX = (1_000_000 * 750_000) / 1_000_000 = 750_000
        let expected_sbx = 750_000u64;
        assert!(sbx_pool::staked_chfx_of(&account) == stake_amount, 20);
        assert!(pool.total_sbx_supply == expected_sbx, 21);
        assert!(pool.chfx_liability_units == stake_amount, 22);
        
        tx_context::destroy(ctx);
    }

    /// Test 6: Unstake USDC (Regional Staker)
    #[test]
    fun test_unstake_usdc_regional_staker() {
        let mut ctx = tx_context::dummy();
        let sender = tx_context::sender(&ctx);
        
        // Setup pool, account, registry
        let witness = SBX {};
        let (treasury, _deny_cap, metadata) = coin::create_regulated_currency_v1(
            witness,
            6,
            b"SBX",
            b"",
            b"",
            option::none(),
            false,
            &mut ctx
        );
        transfer::public_freeze_object(metadata);
        
        let mut pool = sbx_pool::Pool {
            id: object::new(&mut ctx),
            admin: sender,
            paused: false,
            fee_bps: TEST_FEE_BPS,
            min_reserve_bps: TEST_MIN_RESERVE_BPS,
            usdc_reserve: 10_000_000u64, // 10 USDC
            total_sbx_supply: 0,
            total_rc_liability: 0,
            chfx_liability_units: 0,
            tryb_liability_units: 0,
            sekx_liability_units: 0,
            mm_reserved_usdc: 0,
            current_epoch: 0,
            last_epoch_timestamp_ms: 0,
            epoch_duration_ms: 86400000,
            pending_yield_sbx: 0,
            sbx_treasury: treasury
        };
        
        // Regional staker (no staked_usdc, can withdraw USDC)
        let mut account = sbx_pool::Account {
            id: object::new(&mut ctx),
            usdc_owed: 0,
            staked_usdc: 0,
            staked_chfx: 1_000_000u64, // Staked CHFX
            staked_tryb: 0,
            staked_sekx: 0,
            last_yield_epoch: 0
        };
        
        let registry = sbx_pool::Registry {
            id: object::new(&mut ctx),
            admin: sender,
            chfx_whitelisted: true,
            tryb_whitelisted: true,
            sekx_whitelisted: true,
            chfx_price_microusd: TEST_CHFX_PRICE,
            tryb_price_microusd: TEST_TRYB_PRICE,
            sekx_price_microusd: TEST_SEKX_PRICE,
            target_usdc_bps: 4000,
            target_chfx_bps: 2000,
            target_tryb_bps: 2000,
            target_sekx_bps: 2000,
            base_fee_bps: 2,
            depth_fee_k_bps: 50,
            withdraw_fee_floor_bps: 5,
            swap_fee_floor_bps: 5,
            max_fee_bps: 500,
            high_coverage_threshold_bps: 8000,
            low_coverage_threshold_bps: 3000,
            tier2_base_multiplier: 10,
            tier2_exponential_factor: 5,
            mm_return_min_bps: 200,
            mm_return_max_bps: 800,
            mm_return_usdc_bps: 400,
            mm_return_chfx_bps: 400,
            mm_return_tryb_bps: 400,
            mm_return_sekx_bps: 400,
            fee_usd_accumulated_mu: 0,
            fee_accumulated_usdc_mu: 0,
            fee_accumulated_chfx_mu: 0,
            fee_accumulated_tryb_mu: 0,
            fee_accumulated_sekx_mu: 0
        };
        
        // Create SBX coin to burn (regional staker has yield, so SBX > staked_usdc = 0)
        let sbx_amount = 1_000_000u64; // 1 SBX
        let sbx_coin = coin::mint(&mut pool.sbx_treasury, sbx_amount, &mut ctx);
        pool.total_sbx_supply = sbx_amount;
        
        // Unstake USDC (should succeed for regional staker)
        sbx_pool::unstake_usdc(
            &mut account,
            &mut pool,
            &mut registry,
            sbx_coin,
            TEST_CHFX_PRICE,
            TEST_TRYB_PRICE,
            TEST_SEKX_PRICE,
            &mut ctx
        );
        
        // Verify SBX was burned
        assert!(pool.total_sbx_supply == 0, 30);
        
        tx_context::destroy(ctx);
    }

    /// Test 7: Unstake USDC (USDC Staker - Should Fail)
    #[test]
    #[expected_failure(abort_code = first_package::sbx_pool::E_USDC_DEPOSITOR_CANNOT_WITHDRAW_USDC)]
    fun test_unstake_usdc_usdc_staker_fails() {
        let mut ctx = tx_context::dummy();
        let sender = tx_context::sender(&ctx);
        
        // Setup
        let witness = SBX {};
        let (treasury, _deny_cap, metadata) = coin::create_regulated_currency_v1(
            witness,
            6,
            b"SBX",
            b"",
            b"",
            option::none(),
            false,
            &mut ctx
        );
        transfer::public_freeze_object(metadata);
        
        let mut pool = sbx_pool::Pool {
            id: object::new(&mut ctx),
            admin: sender,
            paused: false,
            fee_bps: TEST_FEE_BPS,
            min_reserve_bps: TEST_MIN_RESERVE_BPS,
            usdc_reserve: 10_000_000u64,
            total_sbx_supply: 0,
            total_rc_liability: 0,
            chfx_liability_units: 0,
            tryb_liability_units: 0,
            sekx_liability_units: 0,
            mm_reserved_usdc: 0,
            current_epoch: 0,
            last_epoch_timestamp_ms: 0,
            epoch_duration_ms: 86400000,
            pending_yield_sbx: 0,
            sbx_treasury: treasury
        };
        
        // USDC staker (has staked_usdc, cannot withdraw USDC)
        let mut account = sbx_pool::Account {
            id: object::new(&mut ctx),
            usdc_owed: 0,
            staked_usdc: 1_000_000u64, // Staked USDC
            staked_chfx: 0,
            staked_tryb: 0,
            staked_sekx: 0,
            last_yield_epoch: 0
        };
        
        let registry = sbx_pool::Registry {
            id: object::new(&mut ctx),
            admin: sender,
            chfx_whitelisted: true,
            tryb_whitelisted: true,
            sekx_whitelisted: true,
            chfx_price_microusd: TEST_CHFX_PRICE,
            tryb_price_microusd: TEST_TRYB_PRICE,
            sekx_price_microusd: TEST_SEKX_PRICE,
            target_usdc_bps: 4000,
            target_chfx_bps: 2000,
            target_tryb_bps: 2000,
            target_sekx_bps: 2000,
            base_fee_bps: 2,
            depth_fee_k_bps: 50,
            withdraw_fee_floor_bps: 5,
            swap_fee_floor_bps: 5,
            max_fee_bps: 500,
            high_coverage_threshold_bps: 8000,
            low_coverage_threshold_bps: 3000,
            tier2_base_multiplier: 10,
            tier2_exponential_factor: 5,
            mm_return_min_bps: 200,
            mm_return_max_bps: 800,
            mm_return_usdc_bps: 400,
            mm_return_chfx_bps: 400,
            mm_return_tryb_bps: 400,
            mm_return_sekx_bps: 400,
            fee_usd_accumulated_mu: 0,
            fee_accumulated_usdc_mu: 0,
            fee_accumulated_chfx_mu: 0,
            fee_accumulated_tryb_mu: 0,
            fee_accumulated_sekx_mu: 0
        };
        
        // Create SBX coin (SBX = staked_usdc, so cannot withdraw)
        let sbx_amount = 1_000_000u64; // Same as staked_usdc
        let sbx_coin = coin::mint(&mut pool.sbx_treasury, sbx_amount, &mut ctx);
        pool.total_sbx_supply = sbx_amount;
        
        // This should fail: USDC staker cannot withdraw USDC
        sbx_pool::unstake_usdc(
            &mut account,
            &mut pool,
            &mut registry,
            sbx_coin,
            TEST_CHFX_PRICE,
            TEST_TRYB_PRICE,
            TEST_SEKX_PRICE,
            &mut ctx
        );
    }

    /// Test 8: Unstake CHFX
    #[test]
    fun test_unstake_chfx() {
        let mut ctx = tx_context::dummy();
        let sender = tx_context::sender(&ctx);
        
        // Setup
        let witness = SBX {};
        let (treasury, _deny_cap, metadata) = coin::create_regulated_currency_v1(
            witness,
            6,
            b"SBX",
            b"",
            b"",
            option::none(),
            false,
            &mut ctx
        );
        transfer::public_freeze_object(metadata);
        
        let mut pool = sbx_pool::Pool {
            id: object::new(&mut ctx),
            admin: sender,
            paused: false,
            fee_bps: TEST_FEE_BPS,
            min_reserve_bps: TEST_MIN_RESERVE_BPS,
            usdc_reserve: 0,
            total_sbx_supply: 0,
            total_rc_liability: 0,
            chfx_liability_units: 1_000_000u64, // 1 CHFX available
            tryb_liability_units: 0,
            sekx_liability_units: 0,
            mm_reserved_usdc: 0,
            current_epoch: 0,
            last_epoch_timestamp_ms: 0,
            epoch_duration_ms: 86400000,
            pending_yield_sbx: 0,
            sbx_treasury: treasury
        };
        
        let mut account = sbx_pool::Account {
            id: object::new(&mut ctx),
            usdc_owed: 0,
            staked_usdc: 0,
            staked_chfx: 1_000_000u64, // Staked 1 CHFX
            staked_tryb: 0,
            staked_sekx: 0,
            last_yield_epoch: 0
        };
        
        let mut registry = sbx_pool::Registry {
            id: object::new(&mut ctx),
            admin: sender,
            chfx_whitelisted: true,
            tryb_whitelisted: true,
            sekx_whitelisted: true,
            chfx_price_microusd: TEST_CHFX_PRICE,
            tryb_price_microusd: TEST_TRYB_PRICE,
            sekx_price_microusd: TEST_SEKX_PRICE,
            target_usdc_bps: 4000,
            target_chfx_bps: 2000,
            target_tryb_bps: 2000,
            target_sekx_bps: 2000,
            base_fee_bps: 2,
            depth_fee_k_bps: 50,
            withdraw_fee_floor_bps: 5,
            swap_fee_floor_bps: 5,
            max_fee_bps: 500,
            high_coverage_threshold_bps: 8000,
            low_coverage_threshold_bps: 3000,
            tier2_base_multiplier: 10,
            tier2_exponential_factor: 5,
            mm_return_min_bps: 200,
            mm_return_max_bps: 800,
            mm_return_usdc_bps: 400,
            mm_return_chfx_bps: 400,
            mm_return_tryb_bps: 400,
            mm_return_sekx_bps: 400,
            fee_usd_accumulated_mu: 0,
            fee_accumulated_usdc_mu: 0,
            fee_accumulated_chfx_mu: 0,
            fee_accumulated_tryb_mu: 0,
            fee_accumulated_sekx_mu: 0
        };
        
        // Create SBX coin to burn (750_000 SBX = 1 CHFX at 0.75 price)
        let sbx_amount = 750_000u64;
        let sbx_coin = coin::mint(&mut pool.sbx_treasury, sbx_amount, &mut ctx);
        pool.total_sbx_supply = sbx_amount;
        
        // Unstake CHFX
        sbx_pool::unstake_chfx(
            &mut account,
            &mut pool,
            &mut registry,
            sbx_coin,
            TEST_CHFX_PRICE,
            TEST_TRYB_PRICE,
            TEST_SEKX_PRICE,
            &mut ctx
        );
        
        // Verify staked amount reduced
        assert!(sbx_pool::staked_chfx_of(&account) == 0, 40);
        assert!(pool.chfx_liability_units < 1_000_000u64, 41); // Reduced by payout
        
        tx_context::destroy(ctx);
    }

    /// Test 9: Swap Regional
    #[test]
    fun test_swap_regional() {
        let mut ctx = tx_context::dummy();
        let sender = tx_context::sender(&ctx);
        
        // Setup pool with both currencies
        let witness = SBX {};
        let (treasury, _deny_cap, metadata) = coin::create_regulated_currency_v1(
            witness,
            6,
            b"SBX",
            b"",
            b"",
            option::none(),
            false,
            &mut ctx
        );
        transfer::public_freeze_object(metadata);
        
        let mut pool = sbx_pool::Pool {
            id: object::new(&mut ctx),
            admin: sender,
            paused: false,
            fee_bps: TEST_FEE_BPS,
            min_reserve_bps: TEST_MIN_RESERVE_BPS,
            usdc_reserve: 0,
            total_sbx_supply: 0,
            total_rc_liability: 0,
            chfx_liability_units: 10_000_000u64, // 10 CHFX
            tryb_liability_units: 10_000_000u64, // 10 TRYB
            sekx_liability_units: 0,
            mm_reserved_usdc: 0,
            current_epoch: 0,
            last_epoch_timestamp_ms: 0,
            epoch_duration_ms: 86400000,
            pending_yield_sbx: 0,
            sbx_treasury: treasury
        };
        
        let mut account = sbx_pool::Account {
            id: object::new(&mut ctx),
            usdc_owed: 0,
            staked_usdc: 0,
            staked_chfx: 0,
            staked_tryb: 0,
            staked_sekx: 0,
            last_yield_epoch: 0
        };
        
        let mut registry = sbx_pool::Registry {
            id: object::new(&mut ctx),
            admin: sender,
            chfx_whitelisted: true,
            tryb_whitelisted: true,
            sekx_whitelisted: true,
            chfx_price_microusd: TEST_CHFX_PRICE,
            tryb_price_microusd: TEST_TRYB_PRICE,
            sekx_price_microusd: TEST_SEKX_PRICE,
            target_usdc_bps: 4000,
            target_chfx_bps: 2000,
            target_tryb_bps: 2000,
            target_sekx_bps: 2000,
            base_fee_bps: 2,
            depth_fee_k_bps: 50,
            withdraw_fee_floor_bps: 5,
            swap_fee_floor_bps: 5,
            max_fee_bps: 500,
            high_coverage_threshold_bps: 8000,
            low_coverage_threshold_bps: 3000,
            tier2_base_multiplier: 10,
            tier2_exponential_factor: 5,
            mm_return_min_bps: 200,
            mm_return_max_bps: 800,
            mm_return_usdc_bps: 400,
            mm_return_chfx_bps: 400,
            mm_return_tryb_bps: 400,
            mm_return_sekx_bps: 400,
            fee_usd_accumulated_mu: 0,
            fee_accumulated_usdc_mu: 0,
            fee_accumulated_chfx_mu: 0,
            fee_accumulated_tryb_mu: 0,
            fee_accumulated_sekx_mu: 0
        };
        
        // Swap CHFX to TRYB
        let amount_in = 1_000_000u64; // 1 CHFX
        let from_code = 0u8; // CHFX
        let to_code = 1u8; // TRYB
        
        sbx_pool::swap_regional(
            &mut account,
            &mut pool,
            &mut registry,
            amount_in,
            from_code,
            to_code,
            TEST_CHFX_PRICE,
            TEST_TRYB_PRICE,
            &mut ctx
        );
        
        // Verify swap occurred
        assert!(pool.chfx_liability_units > 10_000_000u64, 50); // Increased
        assert!(pool.tryb_liability_units < 10_000_000u64, 51); // Decreased
        
        tx_context::destroy(ctx);
    }

    /// Test 10: Yield Distribution After Epoch
    #[test]
    fun test_yield_distribution() {
        let mut ctx = tx_context::dummy();
        let sender = tx_context::sender(&ctx);
        
        // Setup
        let witness = SBX {};
        let (treasury, _deny_cap, metadata) = coin::create_regulated_currency_v1(
            witness,
            6,
            b"SBX",
            b"",
            b"",
            option::none(),
            false,
            &mut ctx
        );
        transfer::public_freeze_object(metadata);
        
        let mut pool = sbx_pool::Pool {
            id: object::new(&mut ctx),
            admin: sender,
            paused: false,
            fee_bps: TEST_FEE_BPS,
            min_reserve_bps: TEST_MIN_RESERVE_BPS,
            usdc_reserve: 10_000_000u64, // 10 USDC
            total_sbx_supply: 0,
            total_rc_liability: 0,
            chfx_liability_units: 10_000_000u64, // 10 CHFX
            tryb_liability_units: 0,
            sekx_liability_units: 0,
            mm_reserved_usdc: 0,
            current_epoch: 0,
            last_epoch_timestamp_ms: 0,
            epoch_duration_ms: 86400000, // 1 day
            pending_yield_sbx: 100_000u64, // 0.1 SBX yield
            sbx_treasury: treasury
        };
        
        let mut account = sbx_pool::Account {
            id: object::new(&mut ctx),
            usdc_owed: 0,
            staked_usdc: 5_000_000u64, // 5 USDC staked
            staked_chfx: 5_000_000u64, // 5 CHFX staked
            staked_tryb: 0,
            staked_sekx: 0,
            last_yield_epoch: 0
        };
        
        let registry = sbx_pool::Registry {
            id: object::new(&mut ctx),
            admin: sender,
            chfx_whitelisted: true,
            tryb_whitelisted: true,
            sekx_whitelisted: true,
            chfx_price_microusd: TEST_CHFX_PRICE,
            tryb_price_microusd: TEST_TRYB_PRICE,
            sekx_price_microusd: TEST_SEKX_PRICE,
            target_usdc_bps: 4000,
            target_chfx_bps: 2000,
            target_tryb_bps: 2000,
            target_sekx_bps: 2000,
            base_fee_bps: 2,
            depth_fee_k_bps: 50,
            withdraw_fee_floor_bps: 5,
            swap_fee_floor_bps: 5,
            max_fee_bps: 500,
            high_coverage_threshold_bps: 8000,
            low_coverage_threshold_bps: 3000,
            tier2_base_multiplier: 10,
            tier2_exponential_factor: 5,
            mm_return_min_bps: 200,
            mm_return_max_bps: 800,
            mm_return_usdc_bps: 400,
            mm_return_chfx_bps: 400,
            mm_return_tryb_bps: 400,
            mm_return_sekx_bps: 400,
            fee_usd_accumulated_mu: 0,
            fee_accumulated_usdc_mu: 0,
            fee_accumulated_chfx_mu: 0,
            fee_accumulated_tryb_mu: 0,
            fee_accumulated_sekx_mu: 0
        };
        
        // Simulate epoch completion (1 day later)
        let current_timestamp = 86400001u64; // 1 day + 1ms
        
        // Distribute yield
        sbx_pool::distribute_yield_after_epoch(
            &mut account,
            &mut pool,
            &registry,
            current_timestamp,
            TEST_CHFX_PRICE,
            TEST_TRYB_PRICE,
            TEST_SEKX_PRICE,
            &mut ctx
        );
        
        // Verify epoch advanced
        assert!(pool.current_epoch == 1, 60);
        assert!(account.last_yield_epoch == 1, 61);
        
        tx_context::destroy(ctx);
    }

    /// Test 11: Admin Functions
    #[test]
    fun test_admin_functions() {
        let mut ctx = tx_context::dummy();
        let sender = tx_context::sender(&ctx);
        
        // Create registry
        let mut registry = sbx_pool::Registry {
            id: object::new(&mut ctx),
            admin: sender,
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
            high_coverage_threshold_bps: 8000,
            low_coverage_threshold_bps: 3000,
            tier2_base_multiplier: 10,
            tier2_exponential_factor: 5,
            mm_return_min_bps: 200,
            mm_return_max_bps: 800,
            mm_return_usdc_bps: 0,
            mm_return_chfx_bps: 0,
            mm_return_tryb_bps: 0,
            mm_return_sekx_bps: 0,
            fee_usd_accumulated_mu: 0,
            fee_accumulated_usdc_mu: 0,
            fee_accumulated_chfx_mu: 0,
            fee_accumulated_tryb_mu: 0,
            fee_accumulated_sekx_mu: 0
        };
        
        // Test admin_set_whitelist
        sbx_pool::admin_set_whitelist(&mut registry, true, true, true, &ctx);
        assert!(registry.chfx_whitelisted == true, 70);
        
        // Test admin_set_prices_microusd
        sbx_pool::admin_set_prices_microusd(&mut registry, TEST_CHFX_PRICE, TEST_TRYB_PRICE, TEST_SEKX_PRICE, &ctx);
        assert!(registry.chfx_price_microusd == TEST_CHFX_PRICE, 71);
        
        // Test admin_set_targets
        sbx_pool::admin_set_targets(&mut registry, 4000, 2000, 2000, 2000, &ctx);
        assert!(registry.target_usdc_bps == 4000, 72);
        
        // Test admin_set_fee_params
        sbx_pool::admin_set_fee_params(&mut registry, 2, 50, 5, 5, 500, &ctx);
        assert!(registry.base_fee_bps == 2, 73);
        
        // Test admin_set_mm_returns
        sbx_pool::admin_set_mm_returns(&mut registry, 400, 400, 400, 400, &ctx);
        assert!(registry.mm_return_usdc_bps == 400, 74);
        
        tx_context::destroy(ctx);
    }

    /// Test 12: Create Account
    #[test]
    fun test_create_account() {
        let mut ctx = tx_context::dummy();
        sbx_pool::create_account(&mut ctx);
        
        // Account creation should succeed
        // In real scenario, would verify account object exists
        tx_context::destroy(ctx);
    }

    /// Test 13: Migrate Staking Status
    #[test]
    fun test_migrate_staking_status() {
        let mut ctx = tx_context::dummy();
        let sender = tx_context::sender(&ctx);
        
        // Create source account with staking status
        let mut source_account = sbx_pool::Account {
            id: object::new(&mut ctx),
            usdc_owed: 0,
            staked_usdc: 5_000_000u64, // 5 USDC staked
            staked_chfx: 2_000_000u64, // 2 CHFX staked
            staked_tryb: 0,
            staked_sekx: 0,
            last_yield_epoch: 1
        };
        
        // Create destination account (empty)
        let mut dest_account = sbx_pool::Account {
            id: object::new(&mut ctx),
            usdc_owed: 0,
            staked_usdc: 0,
            staked_chfx: 0,
            staked_tryb: 0,
            staked_sekx: 0,
            last_yield_epoch: 0
        };
        
        // Migrate staking status
        sbx_pool::migrate_staking_status(&mut source_account, &mut dest_account, &ctx);
        
        // Verify migration
        assert!(sbx_pool::staked_usdc_of(&source_account) == 0, 90);
        assert!(sbx_pool::staked_chfx_of(&source_account) == 0, 91);
        assert!(sbx_pool::staked_usdc_of(&dest_account) == 5_000_000u64, 92);
        assert!(sbx_pool::staked_chfx_of(&dest_account) == 2_000_000u64, 93);
        assert!(dest_account.last_yield_epoch == 1, 94); // Should use source's epoch
        
        tx_context::destroy(ctx);
    }

    /// Test 14: Migrate Staking Status (Empty Source - Should Fail)
    #[test]
    #[expected_failure(abort_code = first_package::sbx_pool::E_NO_STAKING_STATUS)]
    fun test_migrate_staking_status_empty_source() {
        let mut ctx = tx_context::dummy();
        
        // Create empty source account
        let mut source_account = sbx_pool::Account {
            id: object::new(&mut ctx),
            usdc_owed: 0,
            staked_usdc: 0,
            staked_chfx: 0,
            staked_tryb: 0,
            staked_sekx: 0,
            last_yield_epoch: 0
        };
        
        // Create destination account
        let mut dest_account = sbx_pool::Account {
            id: object::new(&mut ctx),
            usdc_owed: 0,
            staked_usdc: 0,
            staked_chfx: 0,
            staked_tryb: 0,
            staked_sekx: 0,
            last_yield_epoch: 0
        };
        
        // This should fail - no staking status to migrate
        sbx_pool::migrate_staking_status(&mut source_account, &mut dest_account, &ctx);
    }

    /// Test 15: Pause/Unpause
    #[test]
    fun test_pause_unpause() {
        let mut ctx = tx_context::dummy();
        let sender = tx_context::sender(&ctx);
        
        let witness = SBX {};
        let (treasury, _deny_cap, metadata) = coin::create_regulated_currency_v1(
            witness,
            6,
            b"SBX",
            b"",
            b"",
            option::none(),
            false,
            &mut ctx
        );
        transfer::public_freeze_object(metadata);
        
        let mut pool = sbx_pool::Pool {
            id: object::new(&mut ctx),
            admin: sender,
            paused: false,
            fee_bps: TEST_FEE_BPS,
            min_reserve_bps: TEST_MIN_RESERVE_BPS,
            usdc_reserve: 0,
            total_sbx_supply: 0,
            total_rc_liability: 0,
            chfx_liability_units: 0,
            tryb_liability_units: 0,
            sekx_liability_units: 0,
            mm_reserved_usdc: 0,
            current_epoch: 0,
            last_epoch_timestamp_ms: 0,
            epoch_duration_ms: 86400000,
            pending_yield_sbx: 0,
            sbx_treasury: treasury
        };
        
        // Pause
        sbx_pool::pause(&mut pool, &ctx);
        assert!(pool.paused == true, 80);
        
        // Unpause
        sbx_pool::unpause(&mut pool, &ctx);
        assert!(pool.paused == false, 81);
        
        tx_context::destroy(ctx);
    }
}

