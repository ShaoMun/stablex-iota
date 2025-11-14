// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title wSBX
 * @dev Wrapped SBX token (ERC-20) - can be minted/burned by bridge or pool
 */
contract wSBX is ERC20, Ownable {
    uint8 private constant _decimals = 6;
    address public bridge;
    address public pool;

    constructor() ERC20("Wrapped SBX", "wSBX") Ownable(msg.sender) {}

    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    function setBridge(address _bridge) external onlyOwner {
        bridge = _bridge;
    }

    function setPool(address _pool) external onlyOwner {
        pool = _pool;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == bridge || msg.sender == pool, "wSBX: only bridge or pool can mint");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == bridge || msg.sender == pool, "wSBX: only bridge or pool can burn");
        _burn(from, amount);
    }
}


