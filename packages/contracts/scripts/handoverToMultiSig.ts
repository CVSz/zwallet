import { ethers } from "hardhat";

/**
 * ZEA Protocol: Multi-Sig Handover Script
 * Transfers administrative control from the deployer to a Gnosis Safe or institutional multi-sig.
 */
async function main() {
  const fs = require("fs");
  const deployed = JSON.parse(fs.readFileSync("deployed.json", "utf8"));
  
  // Use a fallback for local testing if env is not set
  const MULTISIG_ADDRESS = process.env.MULTISIG_ADDRESS || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  
  const zeaAddress = deployed.zeaAddress;
  const zeazAddress = deployed.zeazAddress;
  const swapAddress = deployed.swapAddress;

  const [deployer] = await ethers.getSigners();
  console.log(`\n🛡️ Initiating Administrative Handover to: ${MULTISIG_ADDRESS}`);

  const ZEA = await ethers.getContractAt("ZEA", zeaAddress);
  const ZEAZ = await ethers.getContractAt("ZEAZ", zeazAddress);
  const SWAP = await ethers.getContractAt("ZEASwap", swapAddress);

  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  // 1. Handover ZEA
  console.log("   - Transferring ZEA Admin Role...");
  await (await ZEA.grantRole(DEFAULT_ADMIN_ROLE, MULTISIG_ADDRESS)).wait();
  await (await ZEA.revokeRole(DEFAULT_ADMIN_ROLE, deployer.address)).wait();

  // 2. Handover ZEAZ
  console.log("   - Transferring ZEAZ Admin Role...");
  await (await ZEAZ.grantRole(DEFAULT_ADMIN_ROLE, MULTISIG_ADDRESS)).wait();
  await (await ZEAZ.revokeRole(DEFAULT_ADMIN_ROLE, deployer.address)).wait();

  // 3. Handover ZEASwap
  console.log("   - Transferring ZEASwap Admin Role...");
  await (await SWAP.grantRole(DEFAULT_ADMIN_ROLE, MULTISIG_ADDRESS)).wait();
  await (await SWAP.revokeRole(DEFAULT_ADMIN_ROLE, deployer.address)).wait();

  console.log("\n✅ Handover Complete. Deployer has been removed from all administrative roles.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
