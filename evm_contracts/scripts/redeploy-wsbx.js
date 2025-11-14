const hre = require("hardhat");

async function main() {
  console.log("Redeploying wSBX with pool support...");
  console.log("Network:", hre.network.name);
  console.log("RPC URL:", hre.config.networks["iota-evm-testnet"].url);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy new wSBX
  console.log("\n=== Deploying wSBX ===");
  const wSBX = await hre.ethers.getContractFactory("wSBX");
  const wsbx = await wSBX.deploy();
  await wsbx.waitForDeployment();
  const wsbxAddress = await wsbx.getAddress();
  console.log("✓ wSBX deployed to:", wsbxAddress);

  // Get bridge and pool addresses
  const BRIDGE_ADDRESS = process.env.BRIDGE_ADDRESS || "0x5bEACC92487733898E786138410E8AC9486CC418";
  const POOL_ADDRESS = process.env.POOL_ADDRESS || "0x1AbdFcF32654eE9F06af8f272D12daC1E10c971A";

  // Set bridge address
  console.log("\n=== Configuring wSBX ===");
  console.log("Setting bridge address:", BRIDGE_ADDRESS);
  const setBridgeTx = await wsbx.setBridge(BRIDGE_ADDRESS);
  await setBridgeTx.wait();
  console.log("✓ Bridge address set");

  // Set pool address
  console.log("Setting pool address:", POOL_ADDRESS);
  const setPoolTx = await wsbx.setPool(POOL_ADDRESS);
  await setPoolTx.wait();
  console.log("✓ Pool address set");

  // Verify
  console.log("\n=== Verification ===");
  const bridge = await wsbx.bridge();
  const pool = await wsbx.pool();
  console.log("Bridge:", bridge);
  console.log("Pool:", pool);

  if (bridge.toLowerCase() !== BRIDGE_ADDRESS.toLowerCase()) {
    console.error("❌ Bridge address mismatch!");
    process.exit(1);
  }
  if (pool.toLowerCase() !== POOL_ADDRESS.toLowerCase()) {
    console.error("❌ Pool address mismatch!");
    process.exit(1);
  }

  console.log("\n✓ wSBX configured successfully");

  console.log("\n=== IMPORTANT: Update Bridge ===");
  console.log("⚠ The bridge contract needs to be updated to use the new wSBX address.");
  console.log("   Old wSBX: 0xf8bA1417dA2f8746364E3A325B457374Da531D9e");
  console.log("   New wSBX:", wsbxAddress);
  console.log("\n   You need to:");
  console.log("   1. Update EVMBridge to use new wSBX address");
  console.log("   2. Or redeploy EVMBridge with new wSBX address");

  console.log("\n=== Environment Variables ===");
  console.log("Add to frontend/.env.local:");
  console.log(`NEXT_PUBLIC_WSBX_ADDRESS=${wsbxAddress}`);
  console.log("\nUpdate DEPLOYED_ADDRESSES.txt with new wSBX address");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

