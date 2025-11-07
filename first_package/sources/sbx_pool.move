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
        total_rc_liability: u64
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
        jpyc_price_microusd: u64
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
            total_rc_liability: 0
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
            jpyc_price_microusd: 0
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
