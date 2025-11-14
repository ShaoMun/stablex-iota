const hre = require("hardhat");

async function main() {
  console.log("Deploying EVMBridge contract with existing token addresses...");

  // Use the already deployed token addresses
  const chfxAddress = "0x956Cc9A9a71347b0d392D49DAdD49b4dC74b21bE";
  const trybAddress = "0x00f791a9E86f58Af72179b432b060FD1C40b8268";
  const sekxAddress = "0x00fec4B374a0B74B4718AfefD41dB07469d85A71";
  const usdcAddress = "0x34E1C1F3CFAa76C058eB6B7e77b0F81e1E6aB61f";
  const wsbxAddress = "0xf8bA1417dA2f8746364E3A325B457374Da531D9e";

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

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
  const wsbx = await hre.ethers.getContractAt("wSBX", wsbxAddress);
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


