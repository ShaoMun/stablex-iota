module first_package::jpyc {
    use iota::coin;

    public struct JPYC has drop {}

    fun init(witness: JPYC, ctx: &mut TxContext) {
        let (treasury, deny_cap, metadata) = coin::create_regulated_currency(witness, 6, b"JPYC", b"", b"", option::none(), ctx);
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx));
        transfer::public_transfer(deny_cap, tx_context::sender(ctx));
    }
}


