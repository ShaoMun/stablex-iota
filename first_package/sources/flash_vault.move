module first_package::flash_vault {
    use iota::coin::{Self, Coin};
    use iota::balance::{Self, Balance};
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use first_package::usdc::USDC;

    const E_ALREADY_FLASHED: u64 = 1;
    const E_INSUFFICIENT_BALANCE: u64 = 2;
    const E_INSUFFICIENT_REPAY: u64 = 3;
    const E_INVALID_RECEIPT: u64 = 4;
    const E_NOT_FLASHED: u64 = 5;

    /// Flash loan vault for USDC
    /// Holds USDC balance that can be borrowed via flash loans
    public struct FlashVault has key {
        id: UID,
        usdc_balance: Balance<USDC>,
        flashed: bool
    }

    /// Receipt for flash loan repayment
    /// Tracks the vault ID and repayment amount
    public struct Receipt has copy, drop {
        vault_id: ID,
        repay_amount: u64
    }

    /// Initialize flash loan vault as a shared object
    /// Vault starts empty and can be funded via deposit functions
    /// Shared object allows multiple users to access flash loans
    public entry fun create_vault(ctx: &mut TxContext) {
        let vault = FlashVault {
            id: object::new(ctx),
            usdc_balance: balance::zero<USDC>(),
            flashed: false
        };
        transfer::share_object(vault);
    }

    /// Deposit USDC into the flash loan vault
    /// Called by pool when allocating MM funds (30% of excess)
    public fun deposit_usdc(vault: &mut FlashVault, coin: Coin<USDC>) {
        balance::join(&mut vault.usdc_balance, coin::into_balance(coin));
    }

    /// Withdraw USDC from the flash loan vault
    /// Called by pool when rebalancing or admin operations
    public fun withdraw_usdc(vault: &mut FlashVault, amount: u64, ctx: &mut TxContext): Coin<USDC> {
        assert!(!vault.flashed, E_ALREADY_FLASHED);
        assert!(amount > 0, E_INSUFFICIENT_BALANCE); // Zero amount check
        assert!(balance::value(&vault.usdc_balance) >= amount, E_INSUFFICIENT_BALANCE);
        coin::from_balance(balance::split(&mut vault.usdc_balance, amount), ctx)
    }

    /// Flash loan: Borrow USDC from vault
    /// Returns: (borrowed_coin, receipt)
    /// The receipt must be used to repay the loan in the same transaction
    public fun flash(vault: &mut FlashVault, amount: u64, ctx: &mut TxContext): (Coin<USDC>, Receipt) {
        assert!(!vault.flashed, E_ALREADY_FLASHED);
        assert!(amount > 0, E_INSUFFICIENT_BALANCE); // Zero amount check
        assert!(balance::value(&vault.usdc_balance) >= amount, E_INSUFFICIENT_BALANCE);
        
        let coin = coin::from_balance(balance::split(&mut vault.usdc_balance, amount), ctx);
        let receipt = Receipt {
            vault_id: object::id(vault),
            repay_amount: amount
        };
        
        vault.flashed = true;
        (coin, receipt)
    }

    /// Repay flash loan
    /// Must repay at least the borrowed amount (can pay more as fee)
    /// The receipt is consumed to prevent reuse
    public fun repay_flash(vault: &mut FlashVault, coin: Coin<USDC>, receipt: Receipt) {
        // Verify vault is currently flashed (loan is active)
        assert!(vault.flashed, E_NOT_FLASHED);
        
        let Receipt {
            vault_id: receipt_vault_id,
            repay_amount: required_amount
        } = receipt;
        
        // Verify receipt matches this vault
        assert!(receipt_vault_id == object::id(vault), E_INVALID_RECEIPT);
        
        // Verify required amount is valid
        assert!(required_amount > 0, E_INSUFFICIENT_REPAY);
        
        // Verify repayment amount is sufficient
        let repay_amount = coin::value(&coin);
        assert!(repay_amount >= required_amount, E_INSUFFICIENT_REPAY);
        
        // Deposit the repayment (including any fee)
        balance::join(&mut vault.usdc_balance, coin::into_balance(coin));
        vault.flashed = false;
    }

    /// Get current USDC balance in vault
    public fun balance(vault: &FlashVault): u64 {
        balance::value(&vault.usdc_balance)
    }

    /// Check if vault is currently flashed (loan active)
    public fun is_flashed(vault: &FlashVault): bool {
        vault.flashed
    }
}

