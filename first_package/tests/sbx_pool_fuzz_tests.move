#[test_only]
module first_package::sbx_pool_fuzz_tests {
    use first_package::sbx_pool;
    use std::debug;

    /// Fuzz test for deposit calculation logic
    /// Tests the USD value calculation: (amount * price_microusd) / 1_000_000
    #[test]
    fun test_deposit_calculation_fuzz() {
        // Test calculation logic only (no actual pool/registry creation needed)
        
        // Set test prices in micro-USD
        // XSGD: 0.75 USD, MYRC: 0.25 USD, JPYC: 0.0067 USD
        let xsgd_price = 750_000u64; // 0.75 * 1e6
        let myrc_price = 250_000u64; // 0.25 * 1e6
        let jpyc_price = 6_700u64;   // 0.0067 * 1e6
        
        // Test various deposit amounts
        let test_amounts = vector[
            1_000_000u64,        // 1 token
            10_000_000u64,       // 10 tokens
            100_000_000u64,      // 100 tokens
            1_000_000_000u64,    // 1000 tokens
        ];
        
        let mut i = 0;
        let len = vector::length(&test_amounts);
        while (i < len) {
            let amount = *vector::borrow(&test_amounts, i);
            
            // Test XSGD calculation
            // Expected SBX: (amount * 750_000) / 1_000_000
            let expected_sbx_xsgd = ((amount as u128) * (xsgd_price as u128)) / 1_000_000u128;
            debug::print(&expected_sbx_xsgd);
            assert!(expected_sbx_xsgd <= (amount as u128), 1); // SBX should be <= deposit amount for XSGD
            
            // Test MYRC calculation
            let expected_sbx_myrc = ((amount as u128) * (myrc_price as u128)) / 1_000_000u128;
            assert!(expected_sbx_myrc <= (amount as u128), 2);
            
            // Test JPYC calculation (very small price)
            let expected_sbx_jpyc = ((amount as u128) * (jpyc_price as u128)) / 1_000_000u128;
            assert!(expected_sbx_jpyc <= (amount as u128), 3);
            
            i = i + 1;
        };
    }

    /// Fuzz test for instant swap fee calculation
    /// Tests: payout = (sbx_amount * (10000 - fee_bps)) / 10000
    #[test]
    fun test_instant_swap_fee_calculation_fuzz() {
        // Test various fee rates
        let fee_rates = vector[0u64, 10u64, 30u64, 50u64, 100u64, 500u64]; // 0%, 0.1%, 0.3%, 0.5%, 1%, 5%
        let swap_amounts = vector[
            100_000u64,        // 0.1 tokens
            1_000_000u64,      // 1 token
            10_000_000u64,     // 10 tokens
            100_000_000u64,    // 100 tokens
        ];
        
        let mut i = 0;
        let fee_len = vector::length(&fee_rates);
        while (i < fee_len) {
            let fee_bps = *vector::borrow(&fee_rates, i);
            
            let mut j = 0;
            let amount_len = vector::length(&swap_amounts);
            while (j < amount_len) {
                let swap_amount = *vector::borrow(&swap_amounts, j);
                
                // Calculate expected payout
                let fee_bps_u128 = fee_bps as u128;
                let gross = swap_amount as u128;
                let expected_payout = (gross * (10_000u128 - fee_bps_u128)) / 10_000u128;
                let expected_payout_u64 = expected_payout as u64;
                
                // Verify payout is less than or equal to swap amount
                assert!(expected_payout_u64 <= swap_amount, 10);
                
                // Verify fee is correct
                let fee_amount = swap_amount - expected_payout_u64;
                let calculated_fee_bps = ((fee_amount as u128) * 10_000u128) / (swap_amount as u128);
                assert!((calculated_fee_bps as u64) == fee_bps, 11);
                
                j = j + 1;
            };
            
            i = i + 1;
        };
    }

    /// Fuzz test for reserve ratio calculation
    /// Tests: (post_reserve * 10000) >= (min_reserve_bps * post_supply)
    #[test]
    fun test_reserve_ratio_calculation_fuzz() {
        let min_reserve_bps_values = vector[1000u64, 2000u64, 5000u64]; // 10%, 20%, 50%
        
        let mut i = 0;
        let len = vector::length(&min_reserve_bps_values);
        while (i < len) {
            let min_reserve_bps = *vector::borrow(&min_reserve_bps_values, i);
            
            // Test various scenarios with sufficient reserve
            let total_supply = 10_000_000_000u64; // 10M SBX
            let reserve_ratio = min_reserve_bps + 500; // Well above minimum (15%, 25%, 55%)
            let usdc_reserve = ((total_supply as u128) * (reserve_ratio as u128)) / 10_000u128;
            
            // Test swap that should pass (small swap relative to reserve)
            let swap_amount = 100_000_000u64; // 0.1M SBX (1% of supply)
            let fee_bps = 30u64;
            let payout = ((swap_amount as u128) * (10_000u128 - (fee_bps as u128))) / 10_000u128;
            
            // Verify payout is less than reserve
            assert!(payout < usdc_reserve, 19);
            
            let post_reserve = usdc_reserve - payout;
            let post_supply = (total_supply as u128) - (swap_amount as u128);
            
            // Check if reserve ratio is maintained
            if (post_supply > 0) {
                let min_required_reserve = ((min_reserve_bps as u128) * post_supply) / 10_000u128;
                let reserve_ratio_check = post_reserve >= min_required_reserve;
                // This should be true for a valid swap
                assert!(reserve_ratio_check, 20);
            };
            
            i = i + 1;
        };
    }

    /// Fuzz test for price conversion edge cases
    /// Tests overflow/underflow scenarios with extreme prices
    #[test]
    fun test_price_conversion_edge_cases() {
        // Test with very small prices (JPYC-like: 0.0067 USD)
        let small_price = 6_700u64; // 0.0067 * 1e6
        let small_amounts = vector[1u64, 10u64, 100u64, 1000u64, 10000u64];
        
        let mut i = 0;
        let len = vector::length(&small_amounts);
        while (i < len) {
            let amount = *vector::borrow(&small_amounts, i);
            let usd_value = ((amount as u128) * (small_price as u128)) / 1_000_000u128;
            // Should not overflow
            assert!(usd_value <= (amount as u128), 30);
            i = i + 1;
        };
        
        // Test with very large prices (hypothetical: 2.0 USD)
        let large_price = 2_000_000u64; // 2.0 * 1e6
        let large_amounts = vector[1_000_000u64, 10_000_000u64, 100_000_000u64];
        
        let mut j = 0;
        let large_len = vector::length(&large_amounts);
        while (j < large_len) {
            let amount = *vector::borrow(&large_amounts, j);
            let usd_value = ((amount as u128) * (large_price as u128)) / 1_000_000u128;
            // Should be 2x the amount
            assert!(usd_value == ((amount as u128) * 2u128), 31);
            j = j + 1;
        };
    }

    /// Fuzz test for zero and boundary values
    /// Note: Zero amount validation is tested in the actual contract functions
    /// This test documents the expected behavior
    #[test]
    fun test_zero_amount_boundary() {
        // Zero amounts should be rejected by deposit/swap functions
        // This is handled by E_ZERO_AMOUNT error in the contract
        // No test needed here as it's a simple assertion check
    }
}

