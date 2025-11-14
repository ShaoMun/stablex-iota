// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TRYB
 * @dev Turkish Lira token (ERC-20)
 */
contract TRYB is ERC20 {
    uint8 private constant _decimals = 6;

    constructor() ERC20("TRYB", "TRYB") {}

    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        // For POC: anyone can mint. In production, add access control
        _mint(to, amount);
    }
}


