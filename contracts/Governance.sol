// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Governance
/// @notice Simple time-boxed, token-weighted signaling vote contract for
/// BlockVote. Proposals are plain text (no on-chain execution of calls) and
/// are voted on Yes / No / Abstain, weighted by the voter's live GovToken
/// balance. See GovToken.sol NatSpec for the accepted live-balance-weighting
/// simplification.
contract Governance {
    enum VoteType {
        None,
        Yes,
        No,
        Abstain
    }

    enum ProposalState {
        Active,
        Passed,
        Rejected
    }

    struct Proposal {
        uint256 id;
        address creator;
        string title;
        string description;
        string category;
        uint64 startTime;
        uint64 endTime;
        uint256 votesYes;
        uint256 votesNo;
        uint256 votesAbstain;
    }

    IERC20 public immutable govToken;
    uint256 public constant PROPOSAL_THRESHOLD = 1_000 ether;
    uint64 public constant MIN_VOTING_PERIOD = 1 hours;
    uint64 public constant MAX_VOTING_PERIOD = 30 days;

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => VoteType)) public votesCast;

    event ProposalCreated(
        uint256 indexed id,
        address indexed creator,
        string title,
        string category,
        uint64 startTime,
        uint64 endTime
    );
    event VoteCast(uint256 indexed id, address indexed voter, VoteType support, uint256 weight);

    constructor(address govTokenAddress) {
        govToken = IERC20(govTokenAddress);
    }

    function createProposal(
        string calldata title,
        string calldata description,
        string calldata category,
        uint64 votingPeriodSeconds
    ) external returns (uint256 id) {
        require(govToken.balanceOf(msg.sender) >= PROPOSAL_THRESHOLD, "Governance: below proposal threshold");
        require(bytes(title).length > 0, "Governance: empty title");
        require(
            votingPeriodSeconds >= MIN_VOTING_PERIOD && votingPeriodSeconds <= MAX_VOTING_PERIOD,
            "Governance: voting period out of range"
        );

        id = proposalCount++;
        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = startTime + votingPeriodSeconds;

        proposals[id] = Proposal({
            id: id,
            creator: msg.sender,
            title: title,
            description: description,
            category: category,
            startTime: startTime,
            endTime: endTime,
            votesYes: 0,
            votesNo: 0,
            votesAbstain: 0
        });

        emit ProposalCreated(id, msg.sender, title, category, startTime, endTime);
    }

    function castVote(uint256 id, VoteType support) external {
        require(id < proposalCount, "Governance: no such proposal");
        require(support != VoteType.None, "Governance: invalid vote");
        Proposal storage p = proposals[id];
        require(block.timestamp < p.endTime, "Governance: voting closed");
        require(votesCast[id][msg.sender] == VoteType.None, "Governance: already voted");

        uint256 weight = govToken.balanceOf(msg.sender);
        require(weight > 0, "Governance: no voting weight");

        votesCast[id][msg.sender] = support;

        if (support == VoteType.Yes) {
            p.votesYes += weight;
        } else if (support == VoteType.No) {
            p.votesNo += weight;
        } else {
            p.votesAbstain += weight;
        }

        emit VoteCast(id, msg.sender, support, weight);
    }

    function state(uint256 id) public view returns (ProposalState) {
        require(id < proposalCount, "Governance: no such proposal");
        Proposal storage p = proposals[id];
        if (block.timestamp < p.endTime) {
            return ProposalState.Active;
        }
        return p.votesYes > p.votesNo ? ProposalState.Passed : ProposalState.Rejected;
    }

    function getProposal(uint256 id) external view returns (Proposal memory) {
        require(id < proposalCount, "Governance: no such proposal");
        return proposals[id];
    }
}
