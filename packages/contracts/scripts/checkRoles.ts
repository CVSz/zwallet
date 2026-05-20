import { ethers } from "hardhat";

async function main() {
  const fs = require("fs");
  const deployed = JSON.parse(fs.readFileSync("deployed.json", "utf8"));
  const [deployer] = await ethers.getSigners();
  
  const ZEA = await ethers.getContractAt("ZEA", deployed.zeaAddress);
  const adminRole = await ZEA.DEFAULT_ADMIN_ROLE();
  
  console.log("Deployer:", deployer.address);
  console.log("Admin role hash:", adminRole);
  const hasAdmin = await ZEA.hasRole(adminRole, deployer.address);
  console.log("Has Admin:", hasAdmin);
}
main().catch(console.error);
