/**
 * Bridge Relayer Main Entry Point
 * Runs both L1 and EVM watchers
 */

import { watchL1Events } from "./l1-watcher";
import { watchEVMEvents } from "./evm-watcher";

console.log("Starting StableX Bridge Relayer...");

// Start both watchers
Promise.all([
  watchL1Events(),
  watchEVMEvents(),
]).catch((error) => {
  console.error("Fatal error in bridge relayer:", error);
  process.exit(1);
});

