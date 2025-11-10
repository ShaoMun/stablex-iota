#[test_only]
module first_package::flash_vault_tests {
    use first_package::flash_vault::{Self, FlashVault, Receipt};
    use first_package::usdc::{Self, USDC};
    use iota::coin::{Self, Coin};
    use iota::balance;
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use std::debug;

    const E_TEST_FAILED: u64 = 999;

    /// Test: Create vault
    #[test]
    fun test_create_vault() {
        let mut ctx = tx_context::dummy();
        flash_vault::create_vault(&mut ctx);
        tx_context::destroy(ctx);
    }

    /// Test: Deposit to vault
    #[test]
    fun test_deposit() {
        let mut ctx = tx_context::dummy();
        let sender = @0x1;
        
        // Create vault
        flash_vault::create_vault(&mut ctx);
        let vault = test_utils::get_vault(&mut ctx);
        
        // Mint USDC
        let coin = test_utils::mint_usdc(1000000, &mut ctx);
        
        // Deposit
        flash_vault::deposit_usdc(&mut vault, coin);
        
        // Verify balance
        let balance = flash_vault::balance(&vault);
        assert!(balance == 1000000, E_TEST_FAILED);
        
        tx_context::destroy(ctx);
    }

    /// Test: Flash loan basic flow
    #[test]
    fun test_flash_loan_basic() {
        let mut ctx = tx_context::dummy();
        
        // Setup: Create vault and deposit
        flash_vault::create_vault(&mut ctx);
        let vault = test_utils::get_vault(&mut ctx);
        let coin = test_utils::mint_usdc(1000000, &mut ctx);
        flash_vault::deposit_usdc(&mut vault, coin);
        
        // Flash loan
        let (borrowed_coin, receipt) = flash_vault::flash(&mut vault, 500000, &mut ctx);
        
        // Verify borrowed amount
        assert!(coin::value(&borrowed_coin) == 500000, E_TEST_FAILED);
        
        // Verify vault is flashed
        assert!(flash_vault::is_flashed(&vault), E_TEST_FAILED);
        
        // Verify vault balance decreased
        let balance = flash_vault::balance(&vault);
        assert!(balance == 500000, E_TEST_FAILED);
        
        // Repay
        flash_vault::repay_flash(&mut vault, borrowed_coin, receipt);
        
        // Verify vault is no longer flashed
        assert!(!flash_vault::is_flashed(&vault), E_TEST_FAILED);
        
        // Verify balance restored
        let final_balance = flash_vault::balance(&vault);
        assert!(final_balance == 1000000, E_TEST_FAILED);
        
        tx_context::destroy(ctx);
    }

    /// Test: Flash loan with fee
    #[test]
    fun test_flash_loan_with_fee() {
        let mut ctx = tx_context::dummy();
        
        // Setup
        flash_vault::create_vault(&mut ctx);
        let vault = test_utils::get_vault(&mut ctx);
        let coin = test_utils::mint_usdc(1000000, &mut ctx);
        flash_vault::deposit_usdc(&mut vault, coin);
        
        // Flash loan
        let (mut borrowed_coin, receipt) = flash_vault::flash(&mut vault, 500000, &mut ctx);
        
        // Add fee to borrowed coin (simulate profit)
        let fee_coin = test_utils::mint_usdc(10000, &mut ctx);
        coin::join(&mut borrowed_coin, fee_coin);
        
        // Repay with fee
        flash_vault::repay_flash(&mut vault, borrowed_coin, receipt);
        
        // Verify vault received the fee
        let final_balance = flash_vault::balance(&vault);
        assert!(final_balance == 1010000, E_TEST_FAILED); // 1000000 - 500000 + 510000
        
        tx_context::destroy(ctx);
    }

    /// Test: Cannot flash when already flashed
    #[test]
    #[expected_failure(abort_code = first_package::flash_vault::E_ALREADY_FLASHED)]
    fun test_cannot_flash_when_flashed() {
        let mut ctx = tx_context::dummy();
        
        // Setup
        flash_vault::create_vault(&mut ctx);
        let vault = test_utils::get_vault(&mut ctx);
        let coin = test_utils::mint_usdc(1000000, &mut ctx);
        flash_vault::deposit_usdc(&mut vault, coin);
        
        // First flash loan
        let (_coin1, _receipt1) = flash_vault::flash(&mut vault, 500000, &mut ctx);
        
        // Try to flash again (should fail)
        let (_coin2, _receipt2) = flash_vault::flash(&mut vault, 300000, &mut ctx);
        
        tx_context::destroy(ctx);
    }

    /// Test: Cannot flash more than balance
    #[test]
    #[expected_failure(abort_code = first_package::flash_vault::E_INSUFFICIENT_BALANCE)]
    fun test_cannot_flash_more_than_balance() {
        let mut ctx = tx_context::dummy();
        
        // Setup
        flash_vault::create_vault(&mut ctx);
        let vault = test_utils::get_vault(&mut ctx);
        let coin = test_utils::mint_usdc(1000000, &mut ctx);
        flash_vault::deposit_usdc(&mut vault, coin);
        
        // Try to flash more than available
        let (_coin, _receipt) = flash_vault::flash(&mut vault, 2000000, &mut ctx);
        
        tx_context::destroy(ctx);
    }

    /// Test: Cannot repay less than borrowed
    #[test]
    #[expected_failure(abort_code = first_package::flash_vault::E_INSUFFICIENT_REPAY)]
    fun test_cannot_repay_less_than_borrowed() {
        let mut ctx = tx_context::dummy();
        
        // Setup
        flash_vault::create_vault(&mut ctx);
        let vault = test_utils::get_vault(&mut ctx);
        let coin = test_utils::mint_usdc(1000000, &mut ctx);
        flash_vault::deposit_usdc(&mut vault, coin);
        
        // Flash loan
        let (mut borrowed_coin, receipt) = flash_vault::flash(&mut vault, 500000, &mut ctx);
        
        // Try to repay less
        let partial_repay = coin::split(&mut borrowed_coin, 400000, &mut ctx);
        flash_vault::repay_flash(&mut vault, partial_repay, receipt);
        
        tx_context::destroy(ctx);
    }

    /// Test: Cannot repay with wrong receipt
    #[test]
    #[expected_failure(abort_code = first_package::flash_vault::E_INVALID_RECEIPT)]
    fun test_cannot_repay_with_wrong_receipt() {
        let mut ctx = tx_context::dummy();
        
        // Setup: Create two vaults
        flash_vault::create_vault(&mut ctx);
        let vault1 = test_utils::get_vault(&mut ctx);
        flash_vault::create_vault(&mut ctx);
        let vault2 = test_utils::get_vault(&mut ctx);
        
        // Deposit to both
        let coin1 = test_utils::mint_usdc(1000000, &mut ctx);
        let coin2 = test_utils::mint_usdc(1000000, &mut ctx);
        flash_vault::deposit_usdc(&mut vault1, coin1);
        flash_vault::deposit_usdc(&mut vault2, coin2);
        
        // Flash from vault1
        let (_coin1, receipt1) = flash_vault::flash(&mut vault1, 500000, &mut ctx);
        
        // Flash from vault2
        let (coin2, _receipt2) = flash_vault::flash(&mut vault2, 500000, &mut ctx);
        
        // Try to repay vault2 with vault1's receipt (should fail)
        flash_vault::repay_flash(&mut vault2, coin2, receipt1);
        
        tx_context::destroy(ctx);
    }

    /// Test: Cannot withdraw when flashed
    #[test]
    #[expected_failure(abort_code = first_package::flash_vault::E_ALREADY_FLASHED)]
    fun test_cannot_withdraw_when_flashed() {
        let mut ctx = tx_context::dummy();
        
        // Setup
        flash_vault::create_vault(&mut ctx);
        let vault = test_utils::get_vault(&mut ctx);
        let coin = test_utils::mint_usdc(1000000, &mut ctx);
        flash_vault::deposit_usdc(&mut vault, coin);
        
        // Flash loan
        let (_coin, _receipt) = flash_vault::flash(&mut vault, 500000, &mut ctx);
        
        // Try to withdraw (should fail)
        let _withdrawn = flash_vault::withdraw_usdc(&mut vault, 100000, &mut ctx);
        
        tx_context::destroy(ctx);
    }

    /// Test: Can deposit during flash (this should be allowed)
    #[test]
    fun test_can_deposit_during_flash() {
        let mut ctx = tx_context::dummy();
        
        // Setup
        flash_vault::create_vault(&mut ctx);
        let vault = test_utils::get_vault(&mut ctx);
        let coin1 = test_utils::mint_usdc(1000000, &mut ctx);
        flash_vault::deposit_usdc(&mut vault, coin1);
        
        // Flash loan
        let (_coin, _receipt) = flash_vault::flash(&mut vault, 500000, &mut ctx);
        
        // Deposit more during flash (should work)
        let coin2 = test_utils::mint_usdc(200000, &mut ctx);
        flash_vault::deposit_usdc(&mut vault, coin2);
        
        // Verify balance increased
        let balance = flash_vault::balance(&vault);
        assert!(balance == 700000, E_TEST_FAILED); // 1000000 - 500000 + 200000
        
        tx_context::destroy(ctx);
    }

    /// Test: Zero amount flash loan (should fail)
    #[test]
    #[expected_failure(abort_code = first_package::flash_vault::E_INSUFFICIENT_BALANCE)]
    fun test_cannot_flash_zero() {
        let mut ctx = tx_context::dummy();
        
        // Setup
        flash_vault::create_vault(&mut ctx);
        let vault = test_utils::get_vault(&mut ctx);
        let coin = test_utils::mint_usdc(1000000, &mut ctx);
        flash_vault::deposit_usdc(&mut vault, coin);
        
        // Try to flash zero (will fail on balance check)
        let (_coin, _receipt) = flash_vault::flash(&mut vault, 0, &mut ctx);
        
        tx_context::destroy(ctx);
    }

    /// Test: Exact repayment amount
    #[test]
    fun test_exact_repayment() {
        let mut ctx = tx_context::dummy();
        
        // Setup
        flash_vault::create_vault(&mut ctx);
        let vault = test_utils::get_vault(&mut ctx);
        let coin = test_utils::mint_usdc(1000000, &mut ctx);
        flash_vault::deposit_usdc(&mut vault, coin);
        
        // Flash loan
        let (borrowed_coin, receipt) = flash_vault::flash(&mut vault, 500000, &mut ctx);
        
        // Repay exact amount
        flash_vault::repay_flash(&mut vault, borrowed_coin, receipt);
        
        // Verify balance restored
        let balance = flash_vault::balance(&vault);
        assert!(balance == 1000000, E_TEST_FAILED);
        
        tx_context::destroy(ctx);
    }

    /// Test: Multiple flash loans in sequence
    #[test]
    fun test_multiple_flash_loans_sequence() {
        let mut ctx = tx_context::dummy();
        
        // Setup
        flash_vault::create_vault(&mut ctx);
        let vault = test_utils::get_vault(&mut ctx);
        let coin = test_utils::mint_usdc(1000000, &mut ctx);
        flash_vault::deposit_usdc(&mut vault, coin);
        
        // First flash loan
        let (coin1, receipt1) = flash_vault::flash(&mut vault, 300000, &mut ctx);
        flash_vault::repay_flash(&mut vault, coin1, receipt1);
        
        // Second flash loan (after first is repaid)
        let (coin2, receipt2) = flash_vault::flash(&mut vault, 400000, &mut ctx);
        flash_vault::repay_flash(&mut vault, coin2, receipt2);
        
        // Third flash loan
        let (coin3, receipt3) = flash_vault::flash(&mut vault, 200000, &mut ctx);
        flash_vault::repay_flash(&mut vault, coin3, receipt3);
        
        // Verify final balance
        let balance = flash_vault::balance(&vault);
        assert!(balance == 1000000, E_TEST_FAILED);
        
        tx_context::destroy(ctx);
    }
}

/// Test utilities module
#[test_only]
module first_package::test_utils {
    use first_package::flash_vault::FlashVault;
    use first_package::usdc::{Self, USDC};
    use iota::coin::{Self, Coin, TreasuryCap};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use std::option;

    // Note: In real tests, you'd need to get the vault object from the shared object
    // For unit tests, we'll create a mock vault
    public fun get_vault(ctx: &mut TxContext): FlashVault {
        // This is a simplified version for testing
        // In real scenario, you'd get the shared object
        let witness = USDC {};
        let (treasury, _deny_cap, metadata) = coin::create_regulated_currency_v1(
            witness,
            6,
            b"USDC",
            b"",
            b"",
            option::none(),
            false,
            ctx
        );
        transfer::public_freeze_object(metadata);
        
        // Create vault (simplified for testing)
        // In real tests, you'd call create_vault and get the shared object
        flash_vault::create_vault(ctx);
        // Return a dummy vault - in real tests, get from shared object
        abort 0 // This is a placeholder - real implementation would get shared object
    }

    public fun mint_usdc(amount: u64, ctx: &mut TxContext): Coin<USDC> {
        let witness = USDC {};
        let (treasury, _deny_cap, metadata) = coin::create_regulated_currency_v1(
            witness,
            6,
            b"USDC",
            b"",
            b"",
            option::none(),
            false,
            ctx
        );
        transfer::public_freeze_object(metadata);
        let coin = coin::mint(&mut treasury, amount, ctx);
        coin
    }
}

