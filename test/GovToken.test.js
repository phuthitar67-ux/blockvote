const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GovToken", function () {
  let govToken, deployer, alice, bob;

  beforeEach(async function () {
    [deployer, alice, bob] = await ethers.getSigners();
    const GovToken = await ethers.getContractFactory("GovToken");
    govToken = await GovToken.deploy();
    await govToken.waitForDeployment();
  });

  it("mints the initial supply to the deployer", async function () {
    expect(await govToken.balanceOf(deployer.address)).to.equal(await govToken.INITIAL_SUPPLY());
    expect(await govToken.totalSupply()).to.equal(await govToken.INITIAL_SUPPLY());
  });

  it("lets any address claim the faucet amount once", async function () {
    await govToken.connect(alice).claim();
    expect(await govToken.balanceOf(alice.address)).to.equal(await govToken.FAUCET_AMOUNT());
    expect(await govToken.hasClaimed(alice.address)).to.equal(true);
  });

  it("reverts on a second claim from the same address", async function () {
    await govToken.connect(alice).claim();
    await expect(govToken.connect(alice).claim()).to.be.revertedWith("GovToken: already claimed");
  });

  it("tracks claims independently per address", async function () {
    await govToken.connect(alice).claim();
    await govToken.connect(bob).claim();
    expect(await govToken.balanceOf(bob.address)).to.equal(await govToken.FAUCET_AMOUNT());
  });
});
