// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title GovToken
/// @notice ERC20 governance token for BlockVote. Backs both the displayed
/// token balance and the voting weight used by the Governance contract.
/// @dev Voting weight is read as the caller's live `balanceOf` at the moment
/// they vote, not a snapshot taken at proposal creation. That means tokens
/// could in theory be moved between wallets to vote more than once with the
/// same underlying tokens. This is an accepted simplification for a course
/// project; a production system should use OpenZeppelin's ERC20Votes
/// checkpointing instead.
contract GovToken is ERC20, Ownable, ReentrancyGuard {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 ether;
    uint256 public constant FAUCET_AMOUNT = 5_000 ether;

    /// @notice Price of 1 whole GOV token, in wei. Default: 1e13 wei/GOV,
    /// i.e. 0.01 ETH buys 1,000 GOV. Configurable by the owner via
    /// setTokenPrice() — never hardcoded inside buyTokens() itself.
    uint256 public tokenPrice = 1e13;

    mapping(address => bool) public hasClaimed;

    event TokensPurchased(address indexed buyer, uint256 ethSpent, uint256 tokenReceived);
    event TokenPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event ETHWithdrawn(address indexed owner, uint256 amount);

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

    /// @notice Lets anyone increase their voting power beyond the one-time
    /// 5,000 GOV claim by purchasing additional GOV with Sepolia ETH, at the
    /// current tokenPrice. This is the only way to grow voting power past
    /// the faucet amount — there is no reward for voting or proposing.
    function buyTokens() external payable nonReentrant {
        require(msg.value > 0, "GovToken: zero ETH sent");
        uint256 tokenAmount = (msg.value * 1 ether) / tokenPrice;
        require(tokenAmount > 0, "GovToken: ETH amount too small");
        _mint(msg.sender, tokenAmount);
        emit TokensPurchased(msg.sender, msg.value, tokenAmount);
    }

    /// @notice Updates the GOV purchase price. Owner only.
    function setTokenPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "GovToken: price must be positive");
        uint256 oldPrice = tokenPrice;
        tokenPrice = newPrice;
        emit TokenPriceUpdated(oldPrice, newPrice);
    }

    /// @notice Withdraws all ETH collected from buyTokens() to the owner.
    function withdrawETH() external onlyOwner nonReentrant {
        uint256 amount = address(this).balance;
        require(amount > 0, "GovToken: no ETH to withdraw");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "GovToken: ETH transfer failed");
        emit ETHWithdrawn(owner(), amount);
    }

    /// @notice Accepts plain ETH transfers (e.g. sent directly, not via
    /// buyTokens()) so they don't revert and get stuck outside the
    /// contract's reachable balance. Does not mint tokens — only
    /// buyTokens() mints, so voting power still can't be bought for free
    /// by bypassing it.
    receive() external payable {}
}
