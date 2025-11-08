module first_package::chfx {
    use iota::coin;

    public struct CHFX has drop {}

    fun init(witness: CHFX, ctx: &mut TxContext) {
        let (treasury, deny_cap, metadata) = coin::create_regulated_currency_v1(witness, 6, b"CHFX", b"", b"", option::none(), false, ctx);
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx));
        transfer::public_transfer(deny_cap, tx_context::sender(ctx));
    }

    /// Mint CHFX tokens and transfer to recipient
    public entry fun mint(
        treasury: &mut coin::TreasuryCap<CHFX>,
        recipient: address,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    /// Transfer CHFX tokens from caller to recipient
    public entry fun transfer(
        coin: &mut coin::Coin<CHFX>,
        recipient: address,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let transfer_coin = coin::split(coin, amount, ctx);
        transfer::public_transfer(transfer_coin, recipient);
    }

    /// Get balance of a coin object
    public fun balance(coin: &coin::Coin<CHFX>): u64 {
        coin::value(coin)
    }
}

