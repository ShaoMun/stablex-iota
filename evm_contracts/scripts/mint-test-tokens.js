const hre = require("hardhat");

async function main() {
  console.log("Minting test tokens to test wallet...");

  // Test wallet address
  const testWallet = "0x975e2b4f845cab4a6e871bcf6b70a1fecd81f864";
  
  // Token amounts (in token units with 6 decimals)
  // 1000 tokens = 1000 * 10^6 = 1000000000
  const amount = hre.ethers.parseUnits("1000", 6); // 1000 tokens

  // Deployed contract addresses
  const chfxAddress = "0x956Cc9A9a71347b0d392D49DAdD49b4dC74b21bE";
  const trybAddress = "0x00f791a9E86f58Af72179b432b060FD1C40b8268";
  const sekxAddress = "0x00fec4B374a0B74B4718AfefD41dB07469d85A71";
  const usdcAddress = "0x34E1C1F3CFAa76C058eB6B7e77b0F81e1E6aB61f";
  const wsbxAddress = "0xf8bA1417dA2f8746364E3A325B457374Da531D9e";

  const [deployer] = await hre.ethers.getSigners();
  console.log("Minting from account:", deployer.address);
  console.log("Minting to test wallet:", testWallet);
  console.log("Amount per token:", hre.ethers.formatUnits(amount, 6), "tokens\n");

  // Mint CHFX
  console.log("Minting CHFX...");
  const chfx = await hre.ethers.getContractAt("CHFX", chfxAddress);
  const chfxTx = await chfx.mint(testWallet, amount);
  await chfxTx.wait();
  console.log("✓ CHFX minted:", hre.ethers.formatUnits(amount, 6), "CHFX");

  // Mint TRYB
  console.log("Minting TRYB...");
  const tryb = await hre.ethers.getContractAt("TRYB", trybAddress);
  const trybTx = await tryb.mint(testWallet, amount);
  await trybTx.wait();
  console.log("✓ TRYB minted:", hre.ethers.formatUnits(amount, 6), "TRYB");

  // Mint SEKX
  console.log("Minting SEKX...");
  const sekx = await hre.ethers.getContractAt("SEKX", sekxAddress);
  const sekxTx = await sekx.mint(testWallet, amount);
  await sekxTx.wait();
  console.log("✓ SEKX minted:", hre.ethers.formatUnits(amount, 6), "SEKX");

  // Mint USDC
  console.log("Minting USDC...");
  const usdc = await hre.ethers.getContractAt("USDC", usdcAddress);
  const usdcTx = await usdc.mint(testWallet, amount);
  await usdcTx.wait();
  console.log("✓ USDC minted:", hre.ethers.formatUnits(amount, 6), "USDC");

  // Mint wSBX (via bridge contract since only bridge can mint)
  console.log("Minting wSBX...");
  const bridgeAddress = "0x5bEACC92487733898E786138410E8AC9486CC418";
  const bridge = await hre.ethers.getContractAt("EVMBridge", bridgeAddress);
  
  // For wSBX, we need to use the bridge's mint function
  // But for testing, let's mint directly via the bridge contract
  // Actually, wSBX can only be minted by the bridge, so we'll need to call bridge.mint()
  // But that requires L1 lock event data. For testing, let's create a test mint function
  // Or we can temporarily give the deployer mint permissions
  
  // For now, let's use the bridge's admin mint (if we had one) or create a test script
  // Actually, let's just mint a small amount via the bridge for testing
  // But the bridge requires L1 nonce and tx digest, so for POC testing, let's skip wSBX for now
  // and mint it manually via a test transaction
  
  console.log("⚠ wSBX can only be minted via bridge (requires L1 lock event)");
  console.log("   For testing, you can bridge SBX from L1 to get wSBX");

  console.log("\n=== Minting Complete ===");
  console.log("Test wallet:", testWallet);
  console.log("Balances:");
  console.log("  CHFX:", hre.ethers.formatUnits(amount, 6));
  console.log("  TRYB:", hre.ethers.formatUnits(amount, 6));
  console.log("  SEKX:", hre.ethers.formatUnits(amount, 6));
  console.log("  USDC:", hre.ethers.formatUnits(amount, 6));
  console.log("\nYou can now test bridging these tokens!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


