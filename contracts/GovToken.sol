// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title GovToken
/// @notice ERC20 governance token for BlockVote. Backs both the displayed
/// token balance and the voting weight used by the Governance contract.
/// @dev Voting weight is read as the caller's live `balanceOf` at the moment
/// they vote, not a snapshot taken at proposal creation. That means tokens
/// could in theory be moved between wallets to vote more than once with the
/// same underlying tokens. This is an accepted simplification for a course
/// project; a production system should use OpenZeppelin's ERC20Votes
/// checkpointing instead.
contract GovToken is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 ether;
    uint256 public constant FAUCET_AMOUNT = 5_000 ether;

    mapping(address => bool) public hasClaimed;

    constructor() ERC20("Governance Token", "GOV") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /// @notice One-time self-serve faucet so any wallet can obtain voting
    /// tokens after the contract is deployed, without a manual airdrop step.
    function claim() external {
        require(!hasClaimed[msg.sender], "GovToken: already claimed");
        hasClaimed[msg.sender] = true;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
