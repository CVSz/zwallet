import { ethers, run, network } from "hardhat";

/**
 * ZEA Protocol Deployment Orchestrator
 * Handles multi-network deployment, role initialization, and programmatic verification.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`\n🚀 Initializing Deployment on: ${network.name}`);
  console.log(`📡 Deployer Address: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH\n`);

  // --- 1. ZEA Stablecoin ---
  const ZEA = await ethers.getContractFactory("ZEA");
  const zea = await ZEA.deploy(deployer.address);
  await zea.waitForDeployment();
  const zeaAddr = await zea.getAddress();
  console.log(`✅ ZEA Stablecoin: ${zeaAddr}`);

  // --- 2. ZEAZ Utility Token ---
  const ZEAZ = await ethers.getContractFactory("ZEAZ");
  const zeaz = await ZEAZ.deploy(deployer.address);
  await zeaz.waitForDeployment();
  const zeazAddr = await zeaz.getAddress();
  console.log(`✅ ZEAZ Utility Token: ${zeazAddr}`);

  // --- 3. ZEASwap Engine ---
  const ZEASwap = await ethers.getContractFactory("ZEASwap");
  const swap = await ZEASwap.deploy(zeaAddr, zeazAddr);
  await swap.waitForDeployment();
  const swapAddr = await swap.getAddress();
  console.log(`✅ ZEASwap Engine: ${swapAddr}`);

  // --- 4. Role Initialization ---
  console.log("\n🔐 Orchestrating AccessControl Roles...");
  const MINTER_ROLE = await zea.MINTER_ROLE();
  const tx1 = await zea.grantRole(MINTER_ROLE, swapAddr);
  await tx1.wait();
  console.log(`   - Granted ZEA.MINTER_ROLE -> ZEASwap`);

  const tx2 = await zeaz.grantRole(MINTER_ROLE, swapAddr);
  await tx2.wait();
  console.log(`   - Granted ZEAZ.MINTER_ROLE -> ZEASwap`);

  // --- 5. Etherscan Verification Loop ---
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n🔭 Initiating Programmatic Verification Loop...");
    
    // Wait for blocks to ensure indexing
    const WAIT_BLOCKS = 5;
    console.log(`   - Waiting for ${WAIT_BLOCKS} blocks...`);
    await zea.deploymentTransaction()?.wait(WAIT_BLOCKS);

    const contracts = [
      { address: zeaAddr, args: [deployer.address] },
      { address: zeazAddr, args: [deployer.address] },
      { address: swapAddr, args: [zeaAddr, zeazAddr] }
    ];

    for (const contract of contracts) {
      try {
        console.log(`   - Verifying ${contract.address}...`);
        await run("verify:verify", {
          address: contract.address,
          constructorArguments: contract.args,
        });
      } catch (error: any) {
        if (error.message.toLowerCase().includes("already verified")) {
          console.log("     (Already verified)");
        } else {
          console.error(`     ❌ Verification failed: ${error.message}`);
        }
      }
    }
  }

  console.log("\n🎉 Deployment Suite Complete.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
