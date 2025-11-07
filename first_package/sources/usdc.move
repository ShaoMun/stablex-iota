module first_package::usdc {
    use iota::coin;

    public struct USDC has drop {}

    fun init(witness: USDC, ctx: &mut TxContext) {
        let (treasury, deny_cap, metadata) = coin::create_regulated_currency_v1(witness, 6, b"USDC", b"", b"", option::none(), false, ctx);
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx));
        transfer::public_transfer(deny_cap, tx_context::sender(ctx));
    }

    /// Mint USDC tokens and transfer to recipient
    public entry fun mint(
        treasury: &mut coin::TreasuryCap<USDC>,
        recipient: address,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    /// Transfer USDC tokens from caller to recipient
    public entry fun transfer(
        coin: &mut coin::Coin<USDC>,
        recipient: address,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let transfer_coin = coin::split(coin, amount, ctx);
        transfer::public_transfer(transfer_coin, recipient);
    }

    /// Get balance of a coin object
    public fun balance(coin: &coin::Coin<USDC>): u64 {
        coin::value(coin)
    }
}


