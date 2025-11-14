const hre = require("hardhat");

async function main() {
  console.log("Setting pool address in wSBX contract...");
  console.log("Network:", hre.network.name);
  console.log("RPC URL:", hre.config.networks["iota-evm-testnet"].url);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  const WSBX_ADDRESS = process.env.WSBX_ADDRESS || "0xf8bA1417dA2f8746364E3A325B457374Da531D9e";
  const POOL_ADDRESS = process.env.POOL_ADDRESS || "0x1AbdFcF32654eE9F06af8f272D12daC1E10c971A";

  console.log("\n=== Configuration ===");
  console.log("wSBX Address:", WSBX_ADDRESS);
  console.log("Pool Address:", POOL_ADDRESS);

  // Get wSBX contract
  const wSBX = await hre.ethers.getContractAt("wSBX", WSBX_ADDRESS);
  
  // Check current owner
  const owner = await wSBX.owner();
  console.log("\n=== Current wSBX State ===");
  console.log("Owner:", owner);
  console.log("Current Bridge:", await wSBX.bridge());
  
  // Try to read pool (may not exist in old contract)
  let currentPool = "0x0000000000000000000000000000000000000000";
  try {
    currentPool = await wSBX.pool();
    console.log("Current Pool:", currentPool);
  } catch (error) {
    console.log("⚠ Pool variable not found in contract (old version)");
    console.log("   Attempting to set pool address anyway...");
  }

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("\n❌ Error: Deployer is not the owner of wSBX contract");
    console.error("   Owner:", owner);
    console.error("   Deployer:", deployer.address);
    process.exit(1);
  }

  // Check if pool is already set (if variable exists)
  if (currentPool && currentPool !== "0x0000000000000000000000000000000000000000") {
    if (currentPool.toLowerCase() === POOL_ADDRESS.toLowerCase()) {
      console.log("\n✓ Pool address is already set correctly");
      return;
    }
  }

  // Set pool address
  console.log("\n=== Setting Pool Address ===");
  try {
    const tx = await wSBX.setPool(POOL_ADDRESS);
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("✓ Pool address set successfully");
    
    // Verify (if pool variable exists)
    try {
      const newPool = await wSBX.pool();
      console.log("\n=== Verification ===");
      console.log("New Pool Address:", newPool);
      if (newPool.toLowerCase() === POOL_ADDRESS.toLowerCase()) {
        console.log("✓ Pool address verified successfully");
      } else {
        console.error("❌ Pool address mismatch!");
        process.exit(1);
      }
    } catch (error) {
      console.log("\n⚠ Could not verify pool address (contract may not have pool variable)");
      console.log("   Transaction succeeded, but verification failed.");
      console.log("   The deployed wSBX contract may need to be redeployed with pool support.");
    }
  } catch (error) {
    console.error("\n❌ Error setting pool address:", error.message);
    if (error.message.includes("execution reverted")) {
      console.error("   The wSBX contract may not have the setPool function.");
      console.error("   You may need to redeploy wSBX with the updated contract.");
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

