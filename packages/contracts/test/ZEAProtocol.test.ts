import { expect } from "chai";
import { ethers } from "hardhat";
import { ZEA, ZEAZ, ZEASwap } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ZEA Protocol: E2E Security & Logic Audit", function () {
  let zea: ZEA;
  let zeaz: ZEAZ;
  let swap: ZEASwap;
  let admin: SignerWithAddress;
  let minter: SignerWithAddress;
  let user: SignerWithAddress;
  let attacker: SignerWithAddress;

  const INITIAL_LIQUIDITY = ethers.parseUnits("10000", 18);
  const ZEA_LIQUIDITY = ethers.parseUnits("10000", 6);

  beforeEach(async function () {
    [admin, minter, user, attacker] = await ethers.getSigners();

    // Deploy Contracts
    const ZEA = await ethers.getContractFactory("ZEA");
    zea = await ZEA.deploy(admin.address);

    const ZEAZ = await ethers.getContractFactory("ZEAZ");
    zeaz = await ZEAZ.deploy(admin.address);

    const ZEASwap = await ethers.getContractFactory("ZEASwap");
    swap = await ZEASwap.deploy(await zea.getAddress(), await zeaz.getAddress());

    // Setup Roles
    const MINTER_ROLE = await zea.MINTER_ROLE();
    await zea.grantRole(MINTER_ROLE, admin.address);
    await zeaz.grantRole(MINTER_ROLE, admin.address);
    await zea.grantRole(MINTER_ROLE, await swap.getAddress());
    await zeaz.grantRole(MINTER_ROLE, await swap.getAddress());

    // Seed Liquidity
    await zea.mint(await swap.getAddress(), ZEA_LIQUIDITY);
    await zeaz.mint(await swap.getAddress(), INITIAL_LIQUIDITY);
  });

  describe("🛡️ AccessControl & Security Constraints", function () {
    it("Should REVERT if a non-minter attempts to mint ZEA", async function () {
      const MINTER_ROLE = await zea.MINTER_ROLE();
      await expect(zea.connect(attacker).mint(attacker.address, 100))
        .to.be.revertedWithCustomError(zea, "AccessControlUnauthorizedAccount")
        .withArgs(attacker.address, MINTER_ROLE);
    });

    it("Should REVERT if a non-minter attempts to mint ZEAZ", async function () {
      const MINTER_ROLE = await zeaz.MINTER_ROLE();
      await expect(zeaz.connect(attacker).mint(attacker.address, 100))
        .to.be.revertedWithCustomError(zeaz, "AccessControlUnauthorizedAccount")
        .withArgs(attacker.address, MINTER_ROLE);
    });
  });

  describe("🔃 Atomic Swap Engine Logic", function () {
    it("Should accurately swap ZEA for ZEAZ with 0.3% fee", async function () {
      const swapAmount = ethers.parseUnits("100", 6);
      await zea.mint(user.address, swapAmount);
      await zea.connect(user).approve(await swap.getAddress(), swapAmount);

      const expectedFee = (swapAmount * 30n) / 10000n;
      const expectedOut = swapAmount - expectedFee;

      // Note: In a real scenario, ZEA (6) and ZEAZ (18) would need scaling math.
      // For this test, we assume 1:1 nominal value for simplicity.
      
      await expect(swap.connect(user).swapZEAforZEAZ(swapAmount))
        .to.emit(swap, "Swapped")
        .withArgs(user.address, await zea.getAddress(), swapAmount, expectedOut);

      expect(await zeaz.balanceOf(user.address)).to.equal(expectedOut);
    });

    it("Should REVERT swap if engine has insufficient liquidity", async function () {
      const hugeAmount = ethers.parseUnits("1000000", 6);
      await zea.mint(user.address, hugeAmount);
      await zea.connect(user).approve(await swap.getAddress(), hugeAmount);

      await expect(swap.connect(user).swapZEAforZEAZ(hugeAmount))
        .to.be.revertedWithCustomError(swap, "InsufficientLiquidity");
    });
  });

  describe("🔥 Stability Burn Engine", function () {
    it("Should REVERT if attempting to burn zero amount", async function () {
      await expect(swap.connect(user).burnStablecoin(0))
        .to.be.revertedWithCustomError(swap, "ZeroAmount");
    });

    it("Should successfully burn ZEA and emit StablecoinBurned event", async function () {
      const burnAmount = ethers.parseUnits("50", 6);
      await zea.mint(user.address, burnAmount);
      await zea.connect(user).approve(await swap.getAddress(), burnAmount);

      await expect(swap.connect(user).burnStablecoin(burnAmount))
        .to.emit(swap, "StablecoinBurned")
        .withArgs(user.address, burnAmount);

      expect(await zea.balanceOf(user.address)).to.equal(0);
    });

    it("Should REVERT if user attempts to burn more than their balance", async function () {
      const balance = ethers.parseUnits("10", 6);
      const burnAmount = ethers.parseUnits("20", 6);
      await zea.mint(user.address, balance);
      await zea.connect(user).approve(await swap.getAddress(), burnAmount);

      // ERC20Burnable typically reverts with InsufficientBalance
      await expect(swap.connect(user).burnStablecoin(burnAmount))
        .to.be.reverted; 
    });
  });
});
