module first_package::pyth_adapter {
    // Pyth adapter for reading price feeds on IOTA
    // Based on Pyth IOTA documentation: https://docs.pyth.network/price-feeds/core/use-real-time-data/pull-integration/iota
    use Pyth::state::{Self, State};
    use Pyth::pyth;
    use Pyth::price_identifier;
    use Pyth::price;
    use Pyth::price_info::{Self, PriceInfoObject};
    use Pyth::i64::{Self, I64};
    use iota::clock::{Self, Clock};
    use iota::tx_context::TxContext;
    use std::bcs;

    const E_STALE_PRICE: u64 = 1;
    const E_INVALID_PRICE: u64 = 2;
    const E_PRICE_NOT_FOUND: u64 = 3;
    const E_INVALID_FEED: u64 = 4;

    /// Maximum acceptable price age in seconds (5 minutes)
    const MAX_PRICE_AGE_SECONDS: u64 = 300;

    /// Read price from Pyth and convert to micro-USD
    /// price_info_object: The PriceInfoObject for the feed (shared object, passed as reference)
    /// clock: Clock object for timestamp validation
    /// Returns: price in micro-USD (1e6 = $1.00)
    public fun read_price_microusd(
        price_info_object: &PriceInfoObject,
        clock: &Clock
    ): u64 {
        // 1. Get price using Pyth's get_price_no_older_than function
        // This ensures the price is fresh (not older than MAX_PRICE_AGE_SECONDS)
        let price_struct = pyth::get_price_no_older_than(
            price_info_object,
            clock,
            MAX_PRICE_AGE_SECONDS
        );
        
        // 2. Extract price value and exponent from the price struct
        let price_value = price::get_price(&price_struct);
        let expo = price::get_expo(&price_struct);
        
        // 3. Convert to micro-USD (1e6 = $1.00)
        convert_price_to_microusd(price_value, expo)
    }

    /// Helper function to get PriceInfoObject from State
    /// This is needed to convert from State-based API to PriceInfoObject-based API
    public fun get_price_info_object_from_state(
        pyth_state: &State,
        feed_id_bytes: vector<u8>
    ): ID {
        // Convert feed_id_bytes to PriceIdentifier
        let price_id = price_identifier::from_byte_vec(feed_id_bytes);
        
        // Check if feed exists
        if (!state::price_feed_object_exists(pyth_state, price_id)) {
            abort E_PRICE_NOT_FOUND
        };
        
        // Get PriceInfoObject ID from State
        state::get_price_info_object_id(pyth_state, feed_id_bytes)
    }

    /// Convert Pyth price to micro-USD
    /// price_value: The price value from Pyth (I64 - signed integer)
    /// expo: The exponent from Pyth (I64, typically -8)
    /// Returns: price in micro-USD (1e6 = $1.00)
    fun convert_price_to_microusd(price_value: I64, expo: I64): u64 {
        // Pyth format: price_value * 10^expo
        // Target format: micro_usd_price * 10^-6
        // So: micro_usd_price = price_value * 10^(expo + 6)
        
        // Extract magnitude from I64 structs
        // I64 has magnitude field - access it directly or use getter function
        let price_magnitude = i64::get_magnitude_if_positive(&price_value);
        let expo_magnitude = if (i64::get_is_negative(&expo)) {
            i64::get_magnitude_if_negative(&expo)
        } else {
            i64::get_magnitude_if_positive(&expo)
        };
        
        // Check if price is negative (should not be for USD feeds)
        if (i64::get_is_negative(&price_value)) {
            abort E_INVALID_PRICE  // Negative prices not expected for USD feeds
        };
        
        // Check if expo is negative (typically -8 for Pyth)
        let expo_is_negative = i64::get_is_negative(&expo);
        
        // Calculate scale factor: target_expo - expo = -6 - expo
        // If expo is -8, we need to multiply by 10^2 to get to -6
        // If expo is -6, no scaling needed
        
        // Convert expo magnitude to i64 value (negative if expo_is_negative)
        // For typical expo of -8: magnitude = 8, so we need to add 6 to get -2, then multiply by 10^2
        // For expo of -6: magnitude = 6, so we need to add 6 to get 0, no scaling
        
        if (expo_is_negative) {
            // expo is negative (e.g., -8)
            // We want to scale from expo to -6
            // If expo is -8 and target is -6, we need to multiply by 10^2
            // scale_expo = (-6) - (-8) = 2
            let expo_val = expo_magnitude;
            if (expo_val >= 6) {
                // expo is more negative than -6, need to multiply
                let scale_expo = (expo_val - 6) as u8;
                price_magnitude * pow10(scale_expo)
            } else {
                // expo is less negative than -6, need to divide (shouldn't happen for Pyth)
                let scale_expo = (6 - expo_val) as u8;
                price_magnitude / pow10(scale_expo)
            }
        } else {
            // expo is positive (unlikely for Pyth, but handle it)
            // If expo is positive and target is -6, we need to divide
            let scale_expo = ((expo_magnitude + 6) as u8);
            price_magnitude / pow10(scale_expo)
        }
    }

    /// Helper: 10^n (for price conversion)
    fun pow10(n: u8): u64 {
        let mut result = 1u64;
        let mut i = 0u8;
        while (i < n) {
            result = result * 10;
            i = i + 1;
        };
        result
    }

    /// Test function to verify feed connectivity
    /// This will attempt to read from Pyth and return the price
    public entry fun test_feed(
        price_info_object: &PriceInfoObject,
        clock: &Clock,
        ctx: &TxContext
    ) {
        let _price = read_price_microusd(price_info_object, clock);
        // If we get here, the feed is working and price is fresh
        // Price is returned in micro-USD (1e6 = $1.00)
    }

    /// Test function that takes State and feed address, gets PriceInfoObject ID
    /// This is a convenience function for testing
    public entry fun test_feed_from_state(
        pyth_state: &State,
        feed_address: address,
        clock: &Clock,
        ctx: &TxContext
    ): ID {
        // Convert address to bytes
        let feed_id_bytes = bcs::to_bytes(&feed_address);
        
        // Get PriceInfoObject ID
        get_price_info_object_from_state(pyth_state, feed_id_bytes)
    }

    /// Helper to convert address to bytes for feed ID
    /// Note: Feed IDs are 32 bytes, addresses are also 32 bytes
    public fun address_to_feed_bytes(addr: address): vector<u8> {
        bcs::to_bytes(&addr)
    }

    /// Helper function for backward compatibility - gets price using State
    /// This function gets PriceInfoObject ID from State, then the caller should
    /// borrow the PriceInfoObject and call read_price_microusd directly
    public fun read_price_microusd_from_state(
        pyth_state: &State,
        feed_id_bytes: vector<u8>,
        clock: &Clock
    ): (ID, u64) {
        // Get PriceInfoObject ID
        let price_info_obj_id = get_price_info_object_from_state(pyth_state, feed_id_bytes);
        
        // Note: Caller needs to borrow PriceInfoObject using the ID and call read_price_microusd
        // This is a placeholder - actual implementation requires caller to handle object borrowing
        abort E_PRICE_NOT_FOUND  // This function is not fully implemented - use read_price_microusd with PriceInfoObject directly
    }
}
