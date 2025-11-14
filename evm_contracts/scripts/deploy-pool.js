const hre = require("hardhat");

async function main() {
  console.log("Deploying StableX Pool contract to IOTA EVM Testnet...");
  console.log("Network:", hre.network.name);
  console.log("RPC URL:", hre.config.networks["iota-evm-testnet"].url);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Read deployed token addresses from DEPLOYED_ADDRESSES.txt or use environment variables
  const wSBX_ADDRESS = process.env.WSBX_ADDRESS || "0xf8bA1417dA2f8746364E3A325B457374Da531D9e";
  const CHFX_ADDRESS = process.env.CHFX_ADDRESS || "0x956Cc9A9a71347b0d392D49DAdD49b4dC74b21bE";
  const TRYB_ADDRESS = process.env.TRYB_ADDRESS || "0x00f791a9E86f58Af72179b432b060FD1C40b8268";
  const SEKX_ADDRESS = process.env.SEKX_ADDRESS || "0x00fec4B374a0B74B4718AfefD41dB07469d85A71";
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x34E1C1F3CFAa76C058eB6B7e77b0F81e1E6aB61f";

  console.log("\n=== Deploying StableX Pool Contract ===");
  console.log("Token addresses:");
  console.log("wSBX:", wSBX_ADDRESS);
  console.log("CHFX:", CHFX_ADDRESS);
  console.log("TRYB:", TRYB_ADDRESS);
  console.log("SEKX:", SEKX_ADDRESS);
  console.log("USDC:", USDC_ADDRESS);

  // Deploy pool
  const StableXPool = await hre.ethers.getContractFactory("StableXPool");
  const pool = await StableXPool.deploy(
    wSBX_ADDRESS,
    CHFX_ADDRESS,
    TRYB_ADDRESS,
    SEKX_ADDRESS,
    USDC_ADDRESS
  );
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log("✓ StableXPool deployed to:", poolAddress);

  // Set pool address in wSBX so it can mint/burn
  console.log("\n=== Configuring wSBX ===");
  try {
    const wSBX = await hre.ethers.getContractAt("wSBX", wSBX_ADDRESS);
    const owner = await wSBX.owner();
    console.log("wSBX owner:", owner);
    console.log("Deployer address:", deployer.address);
    
    if (owner.toLowerCase() === deployer.address.toLowerCase()) {
      console.log("Setting pool address in wSBX...");
      const setPoolTx = await wSBX.setPool(poolAddress);
      await setPoolTx.wait();
      console.log("✓ Pool address set in wSBX");
    } else {
      console.log("⚠ Deployer is not wSBX owner. Pool address needs to be set manually.");
      console.log("   Call wSBX.setPool(", poolAddress, ") from owner account");
    }
  } catch (error) {
    console.log("⚠ Could not configure wSBX:", error.message);
    console.log("   The deployed wSBX contract may not have the setPool function.");
    console.log("   You may need to redeploy wSBX with the updated contract that includes setPool.");
  }

  console.log("\n=== Deployment Summary ===");
  console.log("Network: IOTA EVM Testnet");
  console.log("Explorer: https://explorer.evm.testnet.iota.cafe/");
  console.log("\nContract Address:");
  console.log("StableXPool:", poolAddress);

  console.log("\n=== Environment Variables ===");
  console.log("Add this to frontend/.env.local:");
  console.log(`NEXT_PUBLIC_EVM_POOL_ADDRESS=${poolAddress}`);

  // Write to file
  const fs = require("fs");
  const addressesFile = "DEPLOYED_ADDRESSES.txt";
  let content = "";
  if (fs.existsSync(addressesFile)) {
    content = fs.readFileSync(addressesFile, "utf8");
  }
  
  if (!content.includes("=== POOL CONTRACT ===")) {
    content += "\n=== POOL CONTRACT ===\n";
  }
  
  // Update or add pool address
  const poolRegex = /StableXPool:\s*0x[a-fA-F0-9]{40}/;
  if (poolRegex.test(content)) {
    content = content.replace(poolRegex, `StableXPool: ${poolAddress}`);
  } else {
    content += `StableXPool: ${poolAddress}\n`;
  }
  
  fs.writeFileSync(addressesFile, content);
  console.log("\n✓ Addresses written to", addressesFile);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

