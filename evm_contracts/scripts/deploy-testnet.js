const hre = require("hardhat");

async function main() {
  console.log("Deploying StableX EVM contracts to IOTA EVM Testnet...");
  console.log("Network:", hre.network.name);
  console.log("RPC URL:", hre.config.networks["iota-evm-testnet"].url);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy token contracts
  console.log("\n=== Deploying Token Contracts ===");
  const CHFX = await hre.ethers.getContractFactory("CHFX");
  const chfx = await CHFX.deploy();
  await chfx.waitForDeployment();
  const chfxAddress = await chfx.getAddress();
  console.log("✓ CHFX deployed to:", chfxAddress);

  const TRYB = await hre.ethers.getContractFactory("TRYB");
  const tryb = await TRYB.deploy();
  await tryb.waitForDeployment();
  const trybAddress = await tryb.getAddress();
  console.log("✓ TRYB deployed to:", trybAddress);

  const SEKX = await hre.ethers.getContractFactory("SEKX");
  const sekx = await SEKX.deploy();
  await sekx.waitForDeployment();
  const sekxAddress = await sekx.getAddress();
  console.log("✓ SEKX deployed to:", sekxAddress);

  const USDC = await hre.ethers.getContractFactory("USDC");
  const usdc = await USDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✓ USDC deployed to:", usdcAddress);

  const wSBX = await hre.ethers.getContractFactory("wSBX");
  const wsbx = await wSBX.deploy();
  await wsbx.waitForDeployment();
  const wsbxAddress = await wsbx.getAddress();
  console.log("✓ wSBX deployed to:", wsbxAddress);

  // Deploy bridge
  console.log("\n=== Deploying Bridge Contract ===");
  const EVMBridge = await hre.ethers.getContractFactory("EVMBridge");
  const bridge = await EVMBridge.deploy(
    wsbxAddress,
    chfxAddress,
    trybAddress,
    sekxAddress,
    usdcAddress
  );
  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  console.log("✓ EVMBridge deployed to:", bridgeAddress);

  // Set bridge address for wSBX
  console.log("\n=== Configuring wSBX ===");
  const setBridgeTx = await wsbx.setBridge(bridgeAddress);
  await setBridgeTx.wait();
  console.log("✓ wSBX bridge address set");

  console.log("\n=== Deployment Summary ===");
  console.log("Network: IOTA EVM Testnet");
  console.log("Explorer: https://explorer.evm.testnet.iota.cafe/");
  console.log("\nContract Addresses:");
  console.log("CHFX:", chfxAddress);
  console.log("TRYB:", trybAddress);
  console.log("SEKX:", sekxAddress);
  console.log("USDC:", usdcAddress);
  console.log("wSBX:", wsbxAddress);
  console.log("EVMBridge:", bridgeAddress);

  console.log("\n=== Environment Variables ===");
  console.log("Add these to your .env file:");
  console.log(`NEXT_PUBLIC_EVM_BRIDGE_ADDRESS=${bridgeAddress}`);
  console.log(`EVM_BRIDGE_ADDRESS=${bridgeAddress}`);
  console.log(`EVM_RPC_URL=https://json-rpc.evm.testnet.iota.cafe`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


