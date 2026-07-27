const fs = require("fs");
const path = require("path");
const { ethers, network, artifacts } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const GovToken = await ethers.getContractFactory("GovToken");
  const govToken = await GovToken.deploy();
  await govToken.waitForDeployment();
  const govTokenAddress = await govToken.getAddress();
  console.log("GovToken deployed to:", govTokenAddress);

  const Governance = await ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(govTokenAddress);
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log("Governance deployed to:", governanceAddress);

  const web3Dir = path.join(__dirname, "..", "lib", "web3");
  const abiDir = path.join(web3Dir, "abi");
  fs.mkdirSync(abiDir, { recursive: true });

  const addresses = {
    network: network.name,
    chainId: network.config.chainId ?? null,
    govToken: govTokenAddress,
    governance: governanceAddress,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(web3Dir, "addresses.json"), JSON.stringify(addresses, null, 2));

  const govTokenArtifact = await artifacts.readArtifact("GovToken");
  const governanceArtifact = await artifacts.readArtifact("Governance");
  fs.writeFileSync(path.join(abiDir, "GovToken.json"), JSON.stringify(govTokenArtifact.abi, null, 2));
  fs.writeFileSync(path.join(abiDir, "Governance.json"), JSON.stringify(governanceArtifact.abi, null, 2));

  console.log("\nWrote lib/web3/addresses.json and lib/web3/abi/*.json");
  console.log("\nAdd these to .env.local:");
  console.log(`NEXT_PUBLIC_GOV_TOKEN_ADDRESS=${govTokenAddress}`);
  console.log(`NEXT_PUBLIC_GOVERNANCE_ADDRESS=${governanceAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
