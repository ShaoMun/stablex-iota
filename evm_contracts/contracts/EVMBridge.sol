// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./wSBX.sol";
import "./CHFX.sol";
import "./TRYB.sol";
import "./SEKX.sol";
import "./USDC.sol";

/**
 * @title EVMBridge
 * @dev Bridge contract for cross-chain token transfers between IOTA L1 and EVM
 * For POC: Uses event-based verification (relayer watches L1 events and calls mint)
 */
contract EVMBridge {
    // Token types: 0 = SBX, 1 = CHFX, 2 = TRYB, 3 = SEKX, 4 = USDC
    uint8 public constant TOKEN_TYPE_SBX = 0;
    uint8 public constant TOKEN_TYPE_CHFX = 1;
    uint8 public constant TOKEN_TYPE_TRYB = 2;
    uint8 public constant TOKEN_TYPE_SEKX = 3;
    uint8 public constant TOKEN_TYPE_USDC = 4;

    // Track processed nonces to prevent replay attacks
    mapping(bytes32 => bool) public processedNonces;
    
    // Wrapped token addresses (token type => token address)
    mapping(uint8 => address) public wrappedTokens;
    
    // Native token addresses (for non-wrapped tokens like CHFX, TRYB, SEKX, USDC)
    mapping(uint8 => address) public nativeTokens;
    
    // Nonce counter for burn operations
    uint64 public burnNonceCounter;

    // Events
    event MintEvent(
        address indexed recipient,
        uint8 tokenType,
        uint256 amount,
        uint64 nonce,
        bytes l1TxDigest
    );

    event BurnEvent(
        address indexed sender,
        bytes recipientL1,
        uint8 tokenType,
        uint256 amount,
        uint64 nonce,
        bytes32 evmTxHash
    );

    constructor(
        address _wSBX,
        address _chfx,
        address _tryb,
        address _sekx,
        address _usdc
    ) {
        wrappedTokens[TOKEN_TYPE_SBX] = _wSBX;
        nativeTokens[TOKEN_TYPE_CHFX] = _chfx;
        nativeTokens[TOKEN_TYPE_TRYB] = _tryb;
        nativeTokens[TOKEN_TYPE_SEKX] = _sekx;
        nativeTokens[TOKEN_TYPE_USDC] = _usdc;

        // Note: wSBX bridge address must be set after deployment via setBridge()
        // This is done in the deploy script by the owner
    }

    /**
     * @dev Mint wrapped tokens when L1 tokens are locked
     * For POC: Relayer verifies L1 lock event and calls this function
     * @param recipient EVM address to receive wrapped tokens
     * @param tokenType Token type (0=SBX, 1=CHFX, 2=TRYB, 3=SEKX, 4=USDC)
     * @param amount Amount to mint
     * @param l1Nonce Nonce from L1 lock event
     * @param l1TxDigest Transaction digest from L1 lock event
     */
    function mint(
        address recipient,
        uint8 tokenType,
        uint256 amount,
        uint64 l1Nonce,
        bytes memory l1TxDigest
    ) external {
        require(recipient != address(0), "EVMBridge: invalid recipient");
        require(amount > 0, "EVMBridge: invalid amount");
        require(tokenType <= TOKEN_TYPE_USDC, "EVMBridge: invalid token type");

        // Create unique nonce key from L1 nonce and tx digest
        bytes32 nonceKey = keccak256(abi.encodePacked(l1Nonce, l1TxDigest));
        require(!processedNonces[nonceKey], "EVMBridge: nonce already used");

        // Mark nonce as processed
        processedNonces[nonceKey] = true;

        // Mint tokens based on type
        if (tokenType == TOKEN_TYPE_SBX) {
            wSBX(wrappedTokens[TOKEN_TYPE_SBX]).mint(recipient, amount);
        } else if (tokenType == TOKEN_TYPE_CHFX) {
            CHFX(nativeTokens[TOKEN_TYPE_CHFX]).mint(recipient, amount);
        } else if (tokenType == TOKEN_TYPE_TRYB) {
            TRYB(nativeTokens[TOKEN_TYPE_TRYB]).mint(recipient, amount);
        } else if (tokenType == TOKEN_TYPE_SEKX) {
            SEKX(nativeTokens[TOKEN_TYPE_SEKX]).mint(recipient, amount);
        } else {
            USDC(nativeTokens[TOKEN_TYPE_USDC]).mint(recipient, amount);
        }

        emit MintEvent(recipient, tokenType, amount, l1Nonce, l1TxDigest);
    }

    /**
     * @dev Burn wrapped tokens to unlock on L1
     * @param tokenType Token type (0=SBX, 1=CHFX, 2=TRYB, 3=SEKX, 4=USDC)
     * @param amount Amount to burn
     * @param recipientL1 L1 address to receive unlocked tokens (as bytes)
     */
    function burn(
        uint8 tokenType,
        uint256 amount,
        bytes memory recipientL1
    ) external {
        require(amount > 0, "EVMBridge: invalid amount");
        require(tokenType <= TOKEN_TYPE_USDC, "EVMBridge: invalid token type");
        require(recipientL1.length == 32, "EVMBridge: invalid L1 address length"); // IOTA addresses are 32 bytes

        // Generate nonce
        uint64 nonce = burnNonceCounter;
        burnNonceCounter++;

        // Burn tokens based on type
        if (tokenType == TOKEN_TYPE_SBX) {
            wSBX(wrappedTokens[TOKEN_TYPE_SBX]).burn(msg.sender, amount);
        } else {
            // For native tokens (CHFX, TRYB, SEKX, USDC), transfer to bridge
            // These tokens will be unlocked on L1, so we hold them in escrow
            IERC20 token = IERC20(nativeTokens[tokenType]);
            require(token.transferFrom(msg.sender, address(this), amount), "EVMBridge: transfer failed");
        }

        emit BurnEvent(
            msg.sender,
            recipientL1,
            tokenType,
            amount,
            nonce,
            keccak256(abi.encodePacked(block.number, block.timestamp, msg.sender, nonce))
        );
    }

    /**
     * @dev Get wrapped token address for a token type
     */
    function getWrappedToken(uint8 tokenType) external view returns (address) {
        if (tokenType == TOKEN_TYPE_SBX) {
            return wrappedTokens[TOKEN_TYPE_SBX];
        }
        return nativeTokens[tokenType];
    }

    /**
     * @dev Check if a nonce has been processed
     */
    function isNonceProcessed(uint64 l1Nonce, bytes memory l1TxDigest) external view returns (bool) {
        bytes32 nonceKey = keccak256(abi.encodePacked(l1Nonce, l1TxDigest));
        return processedNonces[nonceKey];
    }
}

