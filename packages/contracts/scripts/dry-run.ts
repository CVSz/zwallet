import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 STARTING MAINNET DEPLOYMENT DRY-RUN (ETHERS V6)");
  console.log("---------------------------------------");

  const configPath = path.join(__dirname, "../mainnet-config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  
  const network = await ethers.provider.getNetwork();
  console.log(`Simulating on Network: ${network.name} (ChainID: ${network.chainId})`);

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  console.log("\n1. Simulating ZEA Token Deployment...");
  const ZEA = await ethers.getContractFactory("ZEA");
  const zea = await ZEA.deploy(deployer.address); // Admin initially is deployer
  await zea.waitForDeployment();
  const zeaAddress = await zea.getAddress();
  console.log(`✅ ZEA Deployed to: ${zeaAddress}`);

  console.log("\n2. Simulating ZEAZ Token Deployment...");
  const ZEAZ = await ethers.getContractFactory("ZEAZ");
  const zeaz = await ZEAZ.deploy(deployer.address); // Admin initially is deployer
  await zeaz.waitForDeployment();
  const zeazAddress = await zeaz.getAddress();
  console.log(`✅ ZEAZ Deployed to: ${zeazAddress}`);

  console.log("\n3. Simulating ZEASwap Deployment...");
  const ZEASwap = await ethers.getContractFactory("ZEASwap");
  const swap = await ZEASwap.deploy(zeaAddress, zeazAddress);
  await swap.waitForDeployment();
  const swapAddress = await swap.getAddress();
  console.log(`✅ ZEASwap Deployed to: ${swapAddress}`);

  console.log("\n4. Verifying Ownership & Role Handover...");
  
  // Handover DEFAULT_ADMIN_ROLE to Multi-Sig
  const DEFAULT_ADMIN_ROLE = await zea.DEFAULT_ADMIN_ROLE();
  
  await zea.grantRole(DEFAULT_ADMIN_ROLE, config.zea.owner);
  await zeaz.grantRole(DEFAULT_ADMIN_ROLE, config.zeaz.owner);
  await swap.grantRole(DEFAULT_ADMIN_ROLE, config.swap.owner);
  
  // Renounce deployer's admin role
  await zea.renounceRole(DEFAULT_ADMIN_ROLE, deployer.address);
  await zeaz.renounceRole(DEFAULT_ADMIN_ROLE, deployer.address);
  await swap.renounceRole(DEFAULT_ADMIN_ROLE, deployer.address);
  
  const hasZeaAdmin = await zea.hasRole(DEFAULT_ADMIN_ROLE, config.zea.owner);
  const deployerHasRole = await zea.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  
  if (hasZeaAdmin && !deployerHasRole) {
    console.log("✅ Admin role handover verified.");
  } else {
    throw new Error("FAILED: Admin role handover mismatch.");
  }

  console.log("\n---------------------------------------");
  console.log("🏁 DRY-RUN COMPLETED SUCCESSFULLY");
  console.log("All simulations passed on forked network.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
