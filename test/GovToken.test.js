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

  describe("buyTokens", function () {
    it("mints GOV proportional to ETH sent at the default price (0.01 ETH = 1000 GOV)", async function () {
      const price = await govToken.tokenPrice();
      expect(price).to.equal(10n ** 13n);

      const ethSent = ethers.parseEther("0.01");
      await govToken.connect(alice).buyTokens({ value: ethSent });
      expect(await govToken.balanceOf(alice.address)).to.equal(ethers.parseEther("1000"));
    });

    it("emits TokensPurchased with the correct args", async function () {
      const ethSent = ethers.parseEther("0.01");
      await expect(govToken.connect(alice).buyTokens({ value: ethSent }))
        .to.emit(govToken, "TokensPurchased")
        .withArgs(alice.address, ethSent, ethers.parseEther("1000"));
    });

    it("reverts when no ETH is sent", async function () {
      await expect(govToken.connect(alice).buyTokens({ value: 0 })).to.be.revertedWith(
        "GovToken: zero ETH sent"
      );
    });

    it("reverts when ETH sent is too small to mint even 1 wei of GOV", async function () {
      // At the default price (1e13 wei/GOV) even 1 wei rounds up to a
      // nonzero (tiny) token amount, since GOV has 18 decimals. Raise the
      // price above 1e18 wei/GOV so integer division genuinely floors a
      // 1-wei purchase to zero, to exercise this revert path specifically.
      await govToken.setTokenPrice(ethers.parseEther("2"));
      await expect(govToken.connect(alice).buyTokens({ value: 1 })).to.be.revertedWith(
        "GovToken: ETH amount too small"
      );
    });

    it("increases the contract's ETH balance by the amount sent", async function () {
      const ethSent = ethers.parseEther("0.05");
      const govTokenAddress = await govToken.getAddress();
      await govToken.connect(alice).buyTokens({ value: ethSent });
      expect(await ethers.provider.getBalance(govTokenAddress)).to.equal(ethSent);
    });

    it("mints proportionally more GOV after the price is lowered", async function () {
      await govToken.setTokenPrice(10n ** 12n); // 10x cheaper: 0.01 ETH -> 10,000 GOV
      await govToken.connect(alice).buyTokens({ value: ethers.parseEther("0.01") });
      expect(await govToken.balanceOf(alice.address)).to.equal(ethers.parseEther("10000"));
    });

    it("claim() and buyTokens() stack independently for the same address", async function () {
      await govToken.connect(alice).claim();
      await govToken.connect(alice).buyTokens({ value: ethers.parseEther("0.01") });
      const expected = (await govToken.FAUCET_AMOUNT()) + ethers.parseEther("1000");
      expect(await govToken.balanceOf(alice.address)).to.equal(expected);
    });
  });

  describe("setTokenPrice", function () {
    it("lets the owner update the price", async function () {
      await govToken.setTokenPrice(10n ** 14n);
      expect(await govToken.tokenPrice()).to.equal(10n ** 14n);
    });

    it("emits TokenPriceUpdated with old and new price", async function () {
      const oldPrice = await govToken.tokenPrice();
      const newPrice = 10n ** 14n;
      await expect(govToken.setTokenPrice(newPrice))
        .to.emit(govToken, "TokenPriceUpdated")
        .withArgs(oldPrice, newPrice);
    });

    it("reverts on zero price", async function () {
      await expect(govToken.setTokenPrice(0)).to.be.revertedWith("GovToken: price must be positive");
    });

    it("reverts when called by a non-owner", async function () {
      await expect(
        govToken.connect(alice).setTokenPrice(10n ** 14n)
      ).to.be.revertedWithCustomError(govToken, "OwnableUnauthorizedAccount");
    });
  });

  describe("withdrawETH", function () {
    it("lets the owner withdraw the full contract ETH balance", async function () {
      const ethSent = ethers.parseEther("0.02");
      await govToken.connect(alice).buyTokens({ value: ethSent });

      const govTokenAddress = await govToken.getAddress();
      const balanceBefore = await ethers.provider.getBalance(deployer.address);

      const tx = await govToken.withdrawETH();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      expect(await ethers.provider.getBalance(govTokenAddress)).to.equal(0n);
      expect(await ethers.provider.getBalance(deployer.address)).to.equal(
        balanceBefore + ethSent - gasCost
      );
    });

    it("emits ETHWithdrawn with the owner and amount", async function () {
      const ethSent = ethers.parseEther("0.02");
      await govToken.connect(alice).buyTokens({ value: ethSent });
      await expect(govToken.withdrawETH())
        .to.emit(govToken, "ETHWithdrawn")
        .withArgs(deployer.address, ethSent);
    });

    it("reverts when called by a non-owner", async function () {
      await govToken.connect(alice).buyTokens({ value: ethers.parseEther("0.01") });
      await expect(govToken.connect(alice).withdrawETH()).to.be.revertedWithCustomError(
        govToken,
        "OwnableUnauthorizedAccount"
      );
    });

    it("reverts when there is no ETH to withdraw", async function () {
      await expect(govToken.withdrawETH()).to.be.revertedWith("GovToken: no ETH to withdraw");
    });
  });

  describe("receive", function () {
    it("accepts plain ETH transfers without minting any GOV", async function () {
      const govTokenAddress = await govToken.getAddress();
      await alice.sendTransaction({ to: govTokenAddress, value: ethers.parseEther("0.01") });
      expect(await ethers.provider.getBalance(govTokenAddress)).to.equal(ethers.parseEther("0.01"));
      expect(await govToken.balanceOf(alice.address)).to.equal(0n);
    });
  });
});
