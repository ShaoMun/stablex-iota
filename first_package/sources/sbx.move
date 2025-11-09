module first_package::sbx {
    use iota::coin;
    use iota::transfer;
    use iota::tx_context::{Self, TxContext};
    use std::option;

    public struct SBX has drop {}

    fun init(witness: SBX, ctx: &mut TxContext) {
        let (treasury, deny_cap, metadata) = coin::create_regulated_currency_v1(
            witness,
            6,  // 6 decimals (micro-USD precision)
            b"SBX",
            b"StableX Token",
            b"Unified stablecoin pool token (1 SBX = 1 USD)",
            option::none(),
            false,
            ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx));
        transfer::public_transfer(deny_cap, tx_context::sender(ctx));
    }

    /// Mint SBX tokens and transfer to recipient
    /// Used by pool when users stake assets
    public entry fun mint(
        treasury: &mut coin::TreasuryCap<SBX>,
        recipient: address,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    /// Burn SBX tokens from a coin object
    /// Used by pool when users unstake assets
    public entry fun burn(
        treasury: &mut coin::TreasuryCap<SBX>,
        coin: coin::Coin<SBX>
    ) {
        coin::burn(treasury, coin);
    }

    /// Transfer SBX tokens from caller to recipient
    public entry fun transfer(
        coin: &mut coin::Coin<SBX>,
        recipient: address,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let transfer_coin = coin::split(coin, amount, ctx);
        transfer::public_transfer(transfer_coin, recipient);
    }

    /// Get balance of a coin object
    public fun balance(coin: &coin::Coin<SBX>): u64 {
        coin::value(coin)
    }

    /// Join two SBX coins into one
    public entry fun join(
        self: &mut coin::Coin<SBX>,
        other: coin::Coin<SBX>
    ) {
        coin::join(self, other);
    }
}

