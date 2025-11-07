module first_package::myrc {
    use iota::coin;

    public struct MYRC has drop {}

    fun init(witness: MYRC, ctx: &mut TxContext) {
        let (treasury, deny_cap, metadata) = coin::create_regulated_currency_v1(witness, 6, b"MYRC", b"", b"", option::none(), false, ctx);
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx));
        transfer::public_transfer(deny_cap, tx_context::sender(ctx));
    }

    /// Mint MYRC tokens and transfer to recipient
    public entry fun mint(
        treasury: &mut coin::TreasuryCap<MYRC>,
        recipient: address,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    /// Transfer MYRC tokens from caller to recipient
    public entry fun transfer(
        coin: &mut coin::Coin<MYRC>,
        recipient: address,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let transfer_coin = coin::split(coin, amount, ctx);
        transfer::public_transfer(transfer_coin, recipient);
    }

    /// Get balance of a coin object
    public fun balance(coin: &coin::Coin<MYRC>): u64 {
        coin::value(coin)
    }
}


