/**
 * EVM Event Watcher
 * Watches EVM bridge burn events and submits unlock transactions to L1 bridge
 */

import { Client, IotaClient } from "@iota/iota-sdk";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const EVM_RPC_URL = process.env.EVM_RPC_URL || "https://evm.wasp.sc.iota.org";
const EVM_BRIDGE_ADDRESS = process.env.EVM_BRIDGE_ADDRESS || "";
const L1_RPC_URL = process.env.L1_RPC_URL || "https://api.testnet.shimmer.network";
const L1_BRIDGE_PACKAGE_ID = process.env.L1_BRIDGE_PACKAGE_ID || "";
const L1_BRIDGE_OBJECT_ID = process.env.L1_BRIDGE_OBJECT_ID || "";
const L1_PRIVATE_KEY = process.env.L1_PRIVATE_KEY || "";

interface BurnEvent {
  sender: string;
  recipientL1: string;
  tokenType: number;
  amount: bigint;
  nonce: number;
  evmTxHash: string;
}

async function watchEVMEvents() {
  console.log("Starting EVM event watcher...");

  // Initialize EVM provider
  const evmProvider = new ethers.JsonRpcProvider(EVM_RPC_URL);
  const bridgeContract = new ethers.Contract(
    EVM_BRIDGE_ADDRESS,
    [
      "event BurnEvent(address indexed sender, bytes recipientL1, uint8 tokenType, uint256 amount, uint64 nonce, bytes32 evmTxHash)",
    ],
    evmProvider
  );

  // Initialize IOTA L1 client
  const client = new IotaClient({
    nodes: [L1_RPC_URL],
  });

  // Get signer for L1 transactions
  // Note: L1 signing would use IOTA SDK wallet
  // This is simplified - actual implementation would use proper wallet

  // Listen for BurnEvent
  bridgeContract.on("BurnEvent", async (
    sender: string,
    recipientL1: string,
    tokenType: number,
    amount: bigint,
    nonce: number,
    evmTxHash: string,
    event: ethers.Log
  ) => {
    console.log("BurnEvent detected:", {
      sender,
      recipientL1,
      tokenType,
      amount: amount.toString(),
      nonce,
      evmTxHash,
    });

    // Convert recipientL1 from bytes to address
    // IOTA addresses are 32 bytes
    const recipientAddress = ethers.hexlify(recipientL1);

    // Convert evmTxHash to bytes
    const evmTxHashBytes = Array.from(ethers.getBytes(evmTxHash));

    // Call L1 bridge unlock()
    try {
      // Build transaction to call bridge_l1::unlock()
      // This is simplified - actual implementation would use IOTA SDK transaction builder
      const tx = {
        kind: "moveCall",
        data: {
          packageObjectId: L1_BRIDGE_PACKAGE_ID,
          module: "bridge_l1",
          function: "unlock",
          arguments: [
            recipientAddress, // recipient_l1: address
            tokenType,        // token_type: u8
            amount.toString(), // amount: u64
            nonce,            // evm_nonce: u64
            evmTxHashBytes,  // evm_tx_hash: vector<u8>
          ],
          typeArguments: [],
        },
      };

      console.log("Unlock transaction prepared:", tx);
      // In production, sign and submit transaction using IOTA SDK
      // await client.signAndExecuteTransaction(tx);
      
    } catch (error) {
      console.error("Error unlocking on L1:", error);
    }
  });

  console.log("Listening for BurnEvent...");
}

// Export function for use in index.ts
export { watchEVMEvents };

