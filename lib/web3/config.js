import { isAddress, ZeroAddress } from "ethers";
import GovTokenAbi from "./abi/GovToken.json";
import GovernanceAbi from "./abi/Governance.json";
import deployedAddresses from "./addresses.json";

export const SEPOLIA_CHAIN_ID = 11155111;

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? SEPOLIA_CHAIN_ID);

function resolveAddress(envValue, deployedValue) {
  const candidate = envValue || deployedValue;
  return isAddress(candidate) ? candidate : ZeroAddress;
}

// Falls back to the zero address (rather than "") when nothing is configured
// yet, so ethers Contract instances can still be constructed without
// throwing — calls against it simply fail until real addresses are set via
// NEXT_PUBLIC_GOV_TOKEN_ADDRESS / NEXT_PUBLIC_GOVERNANCE_ADDRESS.
export const GOV_TOKEN_ADDRESS = resolveAddress(
  process.env.NEXT_PUBLIC_GOV_TOKEN_ADDRESS,
  deployedAddresses.govToken
);
export const GOVERNANCE_ADDRESS = resolveAddress(
  process.env.NEXT_PUBLIC_GOVERNANCE_ADDRESS,
  deployedAddresses.governance
);
export const IS_CONFIGURED = GOV_TOKEN_ADDRESS !== ZeroAddress && GOVERNANCE_ADDRESS !== ZeroAddress;

export const GOV_TOKEN_ABI = GovTokenAbi;
export const GOVERNANCE_ABI = GovernanceAbi;

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.sepolia.org";

export const SEPOLIA_NETWORK_PARAMS = {
  chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
  chainName: "Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

export const VOTE_TYPE = { None: 0, Yes: 1, No: 2, Abstain: 3 };
export const PROPOSAL_STATE = { Active: 0, Passed: 1, Rejected: 2 };
