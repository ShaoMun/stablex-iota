// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./wSBX.sol";
import "./CHFX.sol";
import "./TRYB.sol";
import "./SEKX.sol";
import "./USDC.sol";

/**
 * @title StableXPool
 * @dev EVM pool contract mirroring L1 pool functionality
 * Supports staking, unstaking, and swapping
 */
contract StableXPool is Ownable {
    // Token addresses
    address public immutable wsbxToken;
    address public immutable chfx;
    address public immutable tryb;
    address public immutable sekx;
    address public immutable usdc;

    // Pool state
    uint256 public totalSBXSupply;
    uint256 public usdcReserve;
    uint256 public chfxLiability;
    uint256 public trybLiability;
    uint256 public sekxLiability;
    
    // User account mapping
    mapping(address => Account) public accounts;
    
    // Registry for prices and fees
    Registry public registry;

    struct Account {
        uint256 stakedUSDC;
        uint256 stakedCHFX;
        uint256 stakedTRYB;
        uint256 stakedSEKX;
    }

    struct Registry {
        uint64 chfxPriceMicroUSD;
        uint64 trybPriceMicroUSD;
        uint64 sekxPriceMicroUSD;
        uint64 baseFeeBps;
        bool chfxWhitelisted;
        bool trybWhitelisted;
        bool sekxWhitelisted;
    }

    event Staked(address indexed user, uint8 tokenType, uint256 amount, uint256 sbxMinted);
    event Unstaked(address indexed user, uint8 tokenType, uint256 sbxBurned, uint256 amountOut);
    event Swapped(address indexed user, uint8 fromType, uint8 toType, uint256 amountIn, uint256 amountOut);

    constructor(
        address _wSBX,
        address _chfx,
        address _tryb,
        address _sekx,
        address _usdc
    ) Ownable(msg.sender) {
        wsbxToken = _wSBX;
        chfx = _chfx;
        tryb = _tryb;
        sekx = _sekx;
        usdc = _usdc;

        // Initialize registry with default values
        registry.baseFeeBps = 7; // 0.07%
        registry.chfxWhitelisted = true;
        registry.trybWhitelisted = true;
        registry.sekxWhitelisted = true;
    }

    /**
     * @dev Stake USDC and mint SBX
     */
    function stakeUSDC(uint256 amount, uint64 chfxPriceMu, uint64 trybPriceMu, uint64 sekxPriceMu) external {
        require(amount > 0, "StableXPool: invalid amount");
        
        // Transfer USDC from user
        IERC20(usdc).transferFrom(msg.sender, address(this), amount);
        
        // Apply deposit fee (0.1% = 10 bps)
        uint256 fee = (amount * 10) / 10000;
        uint256 mintAmount = amount - fee;
        
        // Mint SBX to user
        wSBX token = wSBX(wsbxToken);
        token.mint(msg.sender, mintAmount);
        totalSBXSupply += mintAmount;
        
        // Update account
        accounts[msg.sender].stakedUSDC += amount;
        usdcReserve += amount;
        
        emit Staked(msg.sender, 0, amount, mintAmount);
    }

    /**
     * @dev Stake CHFX and mint SBX
     */
    function stakeCHFX(uint256 amount, uint64 priceMicroUSD) external {
        require(amount > 0, "StableXPool: invalid amount");
        require(registry.chfxWhitelisted, "StableXPool: CHFX not whitelisted");
        require(priceMicroUSD > 0, "StableXPool: price not set");
        
        // Transfer CHFX from user
        IERC20(chfx).transferFrom(msg.sender, address(this), amount);
        
        // Calculate USD value
        uint256 usdValue = (amount * priceMicroUSD) / 1_000_000;
        
        // Apply deposit fee (0.1% = 10 bps)
        uint256 fee = (usdValue * 10) / 10000;
        uint256 mintAmount = usdValue - fee;
        
        // Mint SBX to user
        wSBX token = wSBX(wsbxToken);
        token.mint(msg.sender, mintAmount);
        totalSBXSupply += mintAmount;
        
        // Update account and liabilities
        accounts[msg.sender].stakedCHFX += amount;
        chfxLiability += amount;
        
        emit Staked(msg.sender, 1, amount, mintAmount);
    }

    /**
     * @dev Stake TRYB and mint SBX
     */
    function stakeTRYB(uint256 amount, uint64 priceMicroUSD) external {
        require(amount > 0, "StableXPool: invalid amount");
        require(registry.trybWhitelisted, "StableXPool: TRYB not whitelisted");
        require(priceMicroUSD > 0, "StableXPool: price not set");
        
        IERC20(tryb).transferFrom(msg.sender, address(this), amount);
        uint256 usdValue = (amount * priceMicroUSD) / 1_000_000;
        uint256 fee = (usdValue * 10) / 10000;
        uint256 mintAmount = usdValue - fee;
        
        wSBX token = wSBX(wsbxToken);
        token.mint(msg.sender, mintAmount);
        totalSBXSupply += mintAmount;
        accounts[msg.sender].stakedTRYB += amount;
        trybLiability += amount;
        
        emit Staked(msg.sender, 2, amount, mintAmount);
    }

    /**
     * @dev Stake SEKX and mint SBX
     */
    function stakeSEKX(uint256 amount, uint64 priceMicroUSD) external {
        require(amount > 0, "StableXPool: invalid amount");
        require(registry.sekxWhitelisted, "StableXPool: SEKX not whitelisted");
        require(priceMicroUSD > 0, "StableXPool: price not set");
        
        IERC20(sekx).transferFrom(msg.sender, address(this), amount);
        uint256 usdValue = (amount * priceMicroUSD) / 1_000_000;
        uint256 fee = (usdValue * 10) / 10000;
        uint256 mintAmount = usdValue - fee;
        
        wSBX token = wSBX(wsbxToken);
        token.mint(msg.sender, mintAmount);
        totalSBXSupply += mintAmount;
        accounts[msg.sender].stakedSEKX += amount;
        sekxLiability += amount;
        
        emit Staked(msg.sender, 3, amount, mintAmount);
    }

    /**
     * @dev Unstake SBX to get USDC
     */
    function unstakeUSDC(uint256 sbxAmount, uint64 chfxPriceMu, uint64 trybPriceMu, uint64 sekxPriceMu) external {
        require(sbxAmount > 0, "StableXPool: invalid amount");
        require(accounts[msg.sender].stakedUSDC > 0, "StableXPool: no staked USDC");
        
        // Burn SBX
        wSBX token = wSBX(wsbxToken);
        token.burn(msg.sender, sbxAmount);
        totalSBXSupply -= sbxAmount;
        
        // Calculate payout (1:1 for USDC, minus fees)
        uint256 fee = (sbxAmount * registry.baseFeeBps) / 10000;
        uint256 payout = sbxAmount - fee;
        
        require(usdcReserve >= payout, "StableXPool: insufficient reserve");
        
        // Transfer USDC to user
        IERC20(usdc).transfer(msg.sender, payout);
        usdcReserve -= payout;
        accounts[msg.sender].stakedUSDC -= payout;
        
        emit Unstaked(msg.sender, 0, sbxAmount, payout);
    }

    /**
     * @dev Unstake SBX to get CHFX
     */
    function unstakeCHFX(uint256 sbxAmount, uint64 priceMicroUSD) external {
        require(sbxAmount > 0, "StableXPool: invalid amount");
        require(accounts[msg.sender].stakedCHFX > 0, "StableXPool: no staked CHFX");
        
        wSBX token = wSBX(wsbxToken);
        token.burn(msg.sender, sbxAmount);
        totalSBXSupply -= sbxAmount;
        
        uint256 fee = (sbxAmount * registry.baseFeeBps) / 10000;
        uint256 netUSD = sbxAmount - fee;
        uint256 payout = (netUSD * 1_000_000) / priceMicroUSD;
        
        require(chfxLiability >= payout, "StableXPool: insufficient reserve");
        
        IERC20(chfx).transfer(msg.sender, payout);
        chfxLiability -= payout;
        accounts[msg.sender].stakedCHFX -= payout;
        
        emit Unstaked(msg.sender, 1, sbxAmount, payout);
    }

    /**
     * @dev Unstake SBX to get TRYB
     */
    function unstakeTRYB(uint256 sbxAmount, uint64 priceMicroUSD) external {
        require(sbxAmount > 0, "StableXPool: invalid amount");
        require(accounts[msg.sender].stakedTRYB > 0, "StableXPool: no staked TRYB");
        
        wSBX token = wSBX(wsbxToken);
        token.burn(msg.sender, sbxAmount);
        totalSBXSupply -= sbxAmount;
        
        uint256 fee = (sbxAmount * registry.baseFeeBps) / 10000;
        uint256 netUSD = sbxAmount - fee;
        uint256 payout = (netUSD * 1_000_000) / priceMicroUSD;
        
        require(trybLiability >= payout, "StableXPool: insufficient reserve");
        
        IERC20(tryb).transfer(msg.sender, payout);
        trybLiability -= payout;
        accounts[msg.sender].stakedTRYB -= payout;
        
        emit Unstaked(msg.sender, 2, sbxAmount, payout);
    }

    /**
     * @dev Unstake SBX to get SEKX
     */
    function unstakeSEKX(uint256 sbxAmount, uint64 priceMicroUSD) external {
        require(sbxAmount > 0, "StableXPool: invalid amount");
        require(accounts[msg.sender].stakedSEKX > 0, "StableXPool: no staked SEKX");
        
        wSBX token = wSBX(wsbxToken);
        token.burn(msg.sender, sbxAmount);
        totalSBXSupply -= sbxAmount;
        
        uint256 fee = (sbxAmount * registry.baseFeeBps) / 10000;
        uint256 netUSD = sbxAmount - fee;
        uint256 payout = (netUSD * 1_000_000) / priceMicroUSD;
        
        require(sekxLiability >= payout, "StableXPool: insufficient reserve");
        
        IERC20(sekx).transfer(msg.sender, payout);
        sekxLiability -= payout;
        accounts[msg.sender].stakedSEKX -= payout;
        
        emit Unstaked(msg.sender, 3, sbxAmount, payout);
    }

    /**
     * @dev Swap between regional currencies
     */
    function swapRegional(
        uint8 fromType,
        uint8 toType,
        uint256 amountIn,
        uint64 priceFromMu,
        uint64 priceToMu
    ) external {
        require(fromType >= 1 && fromType <= 3, "StableXPool: invalid from type");
        require(toType >= 1 && toType <= 3, "StableXPool: invalid to type");
        require(fromType != toType, "StableXPool: same currency");
        require(amountIn > 0, "StableXPool: invalid amount");
        
        // Transfer from currency
        address fromToken = fromType == 1 ? chfx : (fromType == 2 ? tryb : sekx);
        IERC20(fromToken).transferFrom(msg.sender, address(this), amountIn);
        
        // Calculate swap rate: rate = priceTo / priceFrom
        uint256 usdValue = (amountIn * priceFromMu) / 1_000_000;
        uint256 fee = (usdValue * registry.baseFeeBps) / 10000;
        uint256 netUSD = usdValue - fee;
        uint256 amountOut = (netUSD * 1_000_000) / priceToMu;
        
        // Transfer to currency
        address toToken = toType == 1 ? chfx : (toType == 2 ? tryb : sekx);
        IERC20(toToken).transfer(msg.sender, amountOut);
        
        // Update liabilities
        if (fromType == 1) chfxLiability += amountIn;
        else if (fromType == 2) trybLiability += amountIn;
        else sekxLiability += amountIn;
        
        if (toType == 1) {
            require(chfxLiability >= amountOut, "StableXPool: insufficient reserve");
            chfxLiability -= amountOut;
        } else if (toType == 2) {
            require(trybLiability >= amountOut, "StableXPool: insufficient reserve");
            trybLiability -= amountOut;
        } else {
            require(sekxLiability >= amountOut, "StableXPool: insufficient reserve");
            sekxLiability -= amountOut;
        }
        
        emit Swapped(msg.sender, fromType, toType, amountIn, amountOut);
    }

    // Admin functions
    function setPrices(uint64 chfxPrice, uint64 trybPrice, uint64 sekxPrice) external onlyOwner {
        registry.chfxPriceMicroUSD = chfxPrice;
        registry.trybPriceMicroUSD = trybPrice;
        registry.sekxPriceMicroUSD = sekxPrice;
    }

    function setWhitelist(bool _chfx, bool _tryb, bool _sekx) external onlyOwner {
        registry.chfxWhitelisted = _chfx;
        registry.trybWhitelisted = _tryb;
        registry.sekxWhitelisted = _sekx;
    }

    function setBaseFee(uint64 feeBps) external onlyOwner {
        registry.baseFeeBps = feeBps;
    }
}


