import { ethers } from "hardhat";

/**
 * ZEA Protocol: Initial Liquidity Provisioning
 * Funds the ZEASwap engine with its starting reserves.
 */
async function main() {
  const zeaAddress = "0xZEA_ADDRESS_FROM_DEPLOYMENT";
  const zeazAddress = "0xZEAZ_ADDRESS_FROM_DEPLOYMENT";
  const swapAddress = "0xSWAP_ADDRESS_FROM_DEPLOYMENT";

  const [deployer] = await ethers.getSigners();
  console.log(`\n💰 Provisioning Initial Liquidity for Swap Engine: ${swapAddress}`);

  const ZEA = await ethers.getContractAt("ZEA", zeaAddress);
  const ZEAZ = await ethers.getContractAt("ZEAZ", zeazAddress);

  // Initial Reserves (e.g., 100,000 ZEA and 1,000,000 ZEAZ)
  const ZEA_LIQUIDITY = ethers.parseUnits("100000", 6);
  const ZEAZ_LIQUIDITY = ethers.parseUnits("1000000", 18);

  // 1. Mint ZEA to Swap Engine
  console.log("   - Minting 100,000 ZEA to vault...");
  await (await ZEA.mint(swapAddress, ZEA_LIQUIDITY)).wait();

  // 2. Mint ZEAZ to Swap Engine
  console.log("   - Minting 1,000,000 ZEAZ to vault...");
  await (await ZEAZ.mint(swapAddress, ZEAZ_LIQUIDITY)).wait();

  console.log("\n✅ Liquidity Provisioning Complete. Swap engine is now functional.\n");
}

main().catch(console.error);
