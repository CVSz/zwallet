import { ethers } from "hardhat";

/**
 * ZEA Protocol: Initial Liquidity Provisioning
 * Funds the ZEASwap engine with its starting reserves.
 */
async function main() {
  const fs = require("fs");
  const deployed = JSON.parse(fs.readFileSync("deployed.json", "utf8"));
  const zeaAddress = deployed.zeaAddress;
  const zeazAddress = deployed.zeazAddress;
  const swapAddress = deployed.swapAddress;

  const [deployer] = await ethers.getSigners();
  console.log(`\n💰 Provisioning Initial Liquidity for Swap Engine: ${swapAddress}`);

  const ZEA = await ethers.getContractAt("ZEA", zeaAddress);
  const ZEAZ = await ethers.getContractAt("ZEAZ", zeazAddress);

  // Initial Reserves (e.g., 100,000 ZEA and 1,000,000 ZEAZ)
  const ZEA_LIQUIDITY = ethers.parseUnits("100000", 6);
  const ZEAZ_LIQUIDITY = ethers.parseUnits("1000000", 18);

  const MINTER_ROLE = await ZEA.MINTER_ROLE();
  console.log("   - Granting MINTER_ROLE to deployer temporarily...");
  await (await ZEA.grantRole(MINTER_ROLE, deployer.address)).wait();
  await (await ZEAZ.grantRole(MINTER_ROLE, deployer.address)).wait();

  // 1. Mint ZEA to Swap Engine
  console.log("   - Minting 100,000 ZEA to vault...");
  await (await ZEA.mint(swapAddress, ZEA_LIQUIDITY)).wait();

  // 2. Mint ZEAZ to Swap Engine
  console.log("   - Minting 1,000,000 ZEAZ to vault...");
  await (await ZEAZ.mint(swapAddress, ZEAZ_LIQUIDITY)).wait();

  console.log("\n✅ Liquidity Provisioning Complete. Swap engine is now functional.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
