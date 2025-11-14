const hre = require("hardhat");

async function main() {
  console.log("Deploying StableX EVM contracts...");

  // Deploy token contracts
  console.log("Deploying token contracts...");
  const CHFX = await hre.ethers.getContractFactory("CHFX");
  const chfx = await CHFX.deploy();
  await chfx.waitForDeployment();
  console.log("CHFX deployed to:", await chfx.getAddress());

  const TRYB = await hre.ethers.getContractFactory("TRYB");
  const tryb = await TRYB.deploy();
  await tryb.waitForDeployment();
  console.log("TRYB deployed to:", await tryb.getAddress());

  const SEKX = await hre.ethers.getContractFactory("SEKX");
  const sekx = await SEKX.deploy();
  await sekx.waitForDeployment();
  console.log("SEKX deployed to:", await sekx.getAddress());

  const USDC = await hre.ethers.getContractFactory("USDC");
  const usdc = await USDC.deploy();
  await usdc.waitForDeployment();
  console.log("USDC deployed to:", await usdc.getAddress());

  const wSBX = await hre.ethers.getContractFactory("wSBX");
  const wsbx = await wSBX.deploy();
  await wsbx.waitForDeployment();
  console.log("wSBX deployed to:", await wsbx.getAddress());

  // Deploy bridge
  console.log("Deploying bridge...");
  const EVMBridge = await hre.ethers.getContractFactory("EVMBridge");
  const bridge = await EVMBridge.deploy(
    await wsbx.getAddress(),
    await chfx.getAddress(),
    await tryb.getAddress(),
    await sekx.getAddress(),
    await usdc.getAddress()
  );
  await bridge.waitForDeployment();
  console.log("EVMBridge deployed to:", await bridge.getAddress());

  console.log("\nDeployment Summary:");
  console.log("CHFX:", await chfx.getAddress());
  console.log("TRYB:", await tryb.getAddress());
  console.log("SEKX:", await sekx.getAddress());
  console.log("USDC:", await usdc.getAddress());
  console.log("wSBX:", await wsbx.getAddress());
  console.log("EVMBridge:", await bridge.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


