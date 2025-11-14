/**
 * L1 Event Watcher
 * Watches IOTA L1 bridge events and submits mint transactions to EVM bridge
 */

import { Client, IotaClient } from "@iota/iota-sdk";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const L1_RPC_URL = process.env.L1_RPC_URL || "https://api.testnet.shimmer.network";
const EVM_RPC_URL = process.env.EVM_RPC_URL || "https://evm.wasp.sc.iota.org";
const EVM_BRIDGE_ADDRESS = process.env.EVM_BRIDGE_ADDRESS || "";
const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY || "";
const BRIDGE_OBJECT_ID = process.env.BRIDGE_OBJECT_ID || "";

interface LockEvent {
  sender: string;
  recipient_evm: string;
  token_type: number;
  amount: string;
  nonce: number;
  tx_digest: string;
}

async function watchL1Events() {
  console.log("Starting L1 event watcher...");

  // Initialize IOTA L1 client
  const client = new IotaClient({
    nodes: [L1_RPC_URL],
  });

  // Initialize EVM provider and signer
  const evmProvider = new ethers.JsonRpcProvider(EVM_RPC_URL);
  const evmSigner = new ethers.Wallet(EVM_PRIVATE_KEY, evmProvider);
  const bridgeContract = new ethers.Contract(
    EVM_BRIDGE_ADDRESS,
    [
      "function mint(address recipient, uint8 tokenType, uint256 amount, uint64 l1Nonce, bytes memory l1TxDigest) external",
    ],
    evmSigner
  );

  // Poll for new events
  let lastProcessedTx = "";
  
  while (true) {
    try {
      // Query bridge object for events
      // Note: This is a simplified version. In production, use proper event indexing
      const bridgeObject = await client.getObject({
        id: BRIDGE_OBJECT_ID,
        options: {
          showContent: true,
          showEvents: true,
        },
      });

      // Process LockEvents
      // In a real implementation, you would:
      // 1. Query transaction history for the bridge object
      // 2. Parse LockEvent events from transactions
      // 3. For each new LockEvent, call EVM bridge mint()
      
      // Example: Get recent transactions
      const transactions = await client.queryTransactions({
        filter: {
          object: BRIDGE_OBJECT_ID,
        },
        options: {
          limit: 10,
        },
      });

      for (const tx of transactions.data || []) {
        if (tx.digest === lastProcessedTx) break;

        // Parse LockEvent from transaction
        // This is simplified - actual implementation would parse Move events
        const events = tx.events || [];
        for (const event of events) {
          if (event.type === "LockEvent") {
            const lockEvent: LockEvent = event.parsedJson;
            
            // Convert recipient_evm from bytes to address
            const recipientAddress = "0x" + Buffer.from(lockEvent.recipient_evm, "base64").toString("hex");
            
            // Convert tx_digest to bytes
            const txDigestBytes = ethers.toUtf8Bytes(lockEvent.tx_digest);

            console.log(`Processing LockEvent:`, {
              sender: lockEvent.sender,
              recipient: recipientAddress,
              tokenType: lockEvent.token_type,
              amount: lockEvent.amount,
              nonce: lockEvent.nonce,
            });

            // Call EVM bridge mint()
            try {
              const tx = await bridgeContract.mint(
                recipientAddress,
                lockEvent.token_type,
                lockEvent.amount,
                lockEvent.nonce,
                txDigestBytes
              );
              console.log(`Mint transaction submitted: ${tx.hash}`);
              await tx.wait();
              console.log(`Mint transaction confirmed: ${tx.hash}`);
            } catch (error) {
              console.error("Error minting on EVM:", error);
            }
          }
        }
      }

      if (transactions.data && transactions.data.length > 0) {
        lastProcessedTx = transactions.data[0].digest;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5 seconds
    } catch (error) {
      console.error("Error watching L1 events:", error);
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds on error
    }
  }
}

// Export function for use in index.ts
export { watchL1Events };

