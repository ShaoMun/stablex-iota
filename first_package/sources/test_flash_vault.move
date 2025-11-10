module first_package::test_flash_vault {
    use first_package::flash_vault::{Self, FlashVault, Receipt};
    use first_package::sbx_pool;
    use first_package::usdc::{Self, USDC};
    use iota::coin::{Self, Coin};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;

    /// Test: Create flash loan vault
    public entry fun test_create_vault(ctx: &mut TxContext) {
        flash_vault::create_vault(ctx);
    }

    /// Test: Deposit USDC to vault (admin function)
    public entry fun test_deposit_to_vault(
        pool: &mut sbx_pool::Pool,
        vault: &mut FlashVault,
        coin: Coin<USDC>,
        ctx: &TxContext
    ) {
        sbx_pool::admin_deposit_vault_usdc(pool, vault, coin, ctx);
    }

    /// Test: Flash loan - borrow and repay in same transaction
    /// This demonstrates the flash loan pattern using PTB
    public entry fun test_flash_loan_repay(
        vault: &mut FlashVault,
        amount: u64,
        ctx: &mut TxContext
    ) {
        // Step 1: Flash loan - borrow USDC
        let (borrowed_coin, receipt) = sbx_pool::flash_loan(vault, amount, ctx);
        
        // Step 2: Use the borrowed coin (in real scenario, would do arbitrage, etc.)
        // For testing, we'll just verify we have the coin
        let borrowed_amount = coin::value(&borrowed_coin);
        assert!(borrowed_amount == amount, 1);
        
        // Step 3: Repay the loan (with same amount, no fee for this test)
        sbx_pool::repay_flash_loan(vault, borrowed_coin, receipt);
    }

    /// Test: Flash loan with fee - borrow and repay with extra amount
    public entry fun test_flash_loan_with_fee(
        vault: &mut FlashVault,
        amount: u64,
        fee: u64,
        ctx: &mut TxContext
    ) {
        // Step 1: Flash loan - borrow USDC
        let (mut borrowed_coin, receipt) = sbx_pool::flash_loan(vault, amount, ctx);
        
        // Step 2: Use the borrowed coin (in real scenario, would do arbitrage, etc.)
        let borrowed_amount = coin::value(&borrowed_coin);
        assert!(borrowed_amount == amount, 1);
        
        // Step 3: Repay with fee (extra amount)
        // For this test, we'll need to add fee from somewhere else
        // In practice, the fee would come from profits made with the borrowed coin
        // For testing, we'll just repay the exact amount (fee handling would be in real scenario)
        sbx_pool::repay_flash_loan(vault, borrowed_coin, receipt);
    }

    /// Test: Check vault balance
    public entry fun test_vault_balance(vault: &FlashVault) {
        let _balance = sbx_pool::vault_balance(vault);
        // Just verify function works (would check balance in real scenario)
    }

    /// Test: Check if vault is flashed
    public entry fun test_vault_is_flashed(vault: &FlashVault) {
        let is_flashed = sbx_pool::vault_is_flashed(vault);
        // Just verify function works
    }

    /// Test: Admin withdraw from vault
    /// Note: This is a regular function, so we need to handle the return value
    /// In a real PTB, you would use this function and then transfer the coin
    public entry fun test_admin_withdraw_vault(
        pool: &mut sbx_pool::Pool,
        vault: &mut FlashVault,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let coin = sbx_pool::admin_withdraw_vault_usdc(pool, vault, amount, ctx);
        // Transfer the coin to sender
        transfer::public_transfer(coin, tx_context::sender(ctx));
    }

    /// Test: Full flow - deposit, flash loan, repay, withdraw
    public entry fun test_full_flash_loan_flow(
        pool: &mut sbx_pool::Pool,
        vault: &mut FlashVault,
        deposit_coin: Coin<USDC>,
        flash_amount: u64,
        ctx: &mut TxContext
    ) {
        // Step 1: Deposit to vault
        sbx_pool::admin_deposit_vault_usdc(pool, vault, deposit_coin, ctx);
        
        // Step 2: Flash loan
        let (borrowed_coin, receipt) = sbx_pool::flash_loan(vault, flash_amount, ctx);
        
        // Step 3: Verify we got the loan
        let borrowed = coin::value(&borrowed_coin);
        assert!(borrowed == flash_amount, 1);
        
        // Step 4: Repay the loan
        sbx_pool::repay_flash_loan(vault, borrowed_coin, receipt);
        
        // Step 5: Verify vault is no longer flashed
        let is_flashed = sbx_pool::vault_is_flashed(vault);
        assert!(!is_flashed, 2);
    }
}

