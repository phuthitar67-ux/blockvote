const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const VoteType = { None: 0, Yes: 1, No: 2, Abstain: 3 };
const ProposalState = { Active: 0, Passed: 1, Rejected: 2 };
const ONE_HOUR = 60 * 60;
const ONE_DAY = 24 * ONE_HOUR;

async function deployFixture() {
  const [deployer, alice, bob, carol] = await ethers.getSigners();

  const GovToken = await ethers.getContractFactory("GovToken");
  const govToken = await GovToken.deploy();
  await govToken.waitForDeployment();

  const Governance = await ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(await govToken.getAddress());
  await governance.waitForDeployment();

  // alice and bob claim faucet tokens (5,000 GOV each, above the 1,000 GOV
  // proposal threshold); carol never claims, so she stays at 0 balance.
  await govToken.connect(alice).claim();
  await govToken.connect(bob).claim();

  return { governance, govToken, deployer, alice, bob, carol };
}

describe("Governance", function () {
  describe("createProposal", function () {
    it("creates a proposal for an address above the threshold", async function () {
      const { governance, alice } = await deployFixture();
      await expect(governance.connect(alice).createProposal("Title", "Desc", "Treasury", ONE_DAY))
        .to.emit(governance, "ProposalCreated");
      expect(await governance.proposalCount()).to.equal(1n);
    });

    it("reverts for an address below the proposal threshold", async function () {
      const { governance, carol } = await deployFixture();
      await expect(
        governance.connect(carol).createProposal("Title", "Desc", "Treasury", ONE_DAY)
      ).to.be.revertedWith("Governance: below proposal threshold");
    });

    it("reverts for a voting period outside the allowed range", async function () {
      const { governance, alice } = await deployFixture();
      await expect(
        governance.connect(alice).createProposal("Title", "Desc", "Treasury", 10)
      ).to.be.revertedWith("Governance: voting period out of range");
      await expect(
        governance.connect(alice).createProposal("Title", "Desc", "Treasury", 60 * ONE_DAY)
      ).to.be.revertedWith("Governance: voting period out of range");
    });
  });

  describe("castVote", function () {
    async function createdProposalFixture() {
      const ctx = await deployFixture();
      await ctx.governance.connect(ctx.alice).createProposal("Title", "Desc", "Treasury", ONE_DAY);
      return ctx;
    }

    it("tallies vote weight into the correct bucket", async function () {
      const { governance, govToken, alice, bob } = await createdProposalFixture();
      const bobWeight = await govToken.balanceOf(bob.address);

      await expect(governance.connect(bob).castVote(0, VoteType.Yes))
        .to.emit(governance, "VoteCast")
        .withArgs(0, bob.address, VoteType.Yes, bobWeight);

      const proposal = await governance.getProposal(0);
      expect(proposal.votesYes).to.equal(bobWeight);
      expect(proposal.votesNo).to.equal(0n);
    });

    it("reverts on a second vote from the same address", async function () {
      const { governance, bob } = await createdProposalFixture();
      await governance.connect(bob).castVote(0, VoteType.Yes);
      await expect(governance.connect(bob).castVote(0, VoteType.No)).to.be.revertedWith(
        "Governance: already voted"
      );
    });

    it("reverts for an address with no voting weight", async function () {
      const { governance, carol } = await createdProposalFixture();
      await expect(governance.connect(carol).castVote(0, VoteType.Yes)).to.be.revertedWith(
        "Governance: no voting weight"
      );
    });

    it("reverts once the voting period has ended", async function () {
      const { governance, bob } = await createdProposalFixture();
      await network.provider.send("evm_increaseTime", [ONE_DAY + 1]);
      await network.provider.send("evm_mine");
      await expect(governance.connect(bob).castVote(0, VoteType.Yes)).to.be.revertedWith(
        "Governance: voting closed"
      );
    });
  });

  describe("state", function () {
    it("is Active before the voting period ends", async function () {
      const { governance, alice } = await deployFixture();
      await governance.connect(alice).createProposal("Title", "Desc", "Treasury", ONE_DAY);
      expect(await governance.state(0)).to.equal(ProposalState.Active);
    });

    it("is Passed when yes votes outweigh no votes after the deadline", async function () {
      const { governance, alice, bob } = await deployFixture();
      await governance.connect(alice).createProposal("Title", "Desc", "Treasury", ONE_HOUR);
      await governance.connect(bob).castVote(0, VoteType.Yes);

      await network.provider.send("evm_increaseTime", [ONE_HOUR + 1]);
      await network.provider.send("evm_mine");

      expect(await governance.state(0)).to.equal(ProposalState.Passed);
    });

    it("is Rejected when no votes outweigh or tie yes votes after the deadline", async function () {
      const { governance, alice, bob } = await deployFixture();
      await governance.connect(alice).createProposal("Title", "Desc", "Treasury", ONE_HOUR);
      await governance.connect(bob).castVote(0, VoteType.No);

      await network.provider.send("evm_increaseTime", [ONE_HOUR + 1]);
      await network.provider.send("evm_mine");

      expect(await governance.state(0)).to.equal(ProposalState.Rejected);
    });
  });
});
