// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";

contract TournamentPayout is AutomationCompatibleInterface {
    address public organizer;
    uint public prizePool;
    bool public tournamentEnded;

    address[] public participants;
    mapping(address => bool) public isParticipant;
    mapping(address => uint) public participantRewards;
    mapping(address => uint) public scores;
    mapping(uint => bytes32) public correctAnswers;

    uint public lastUpkeepTime;
    uint public upkeepInterval = 5 minutes;

    event ParticipantAdded(address indexed participant);
    event WinnerDeclared(address indexed winner, uint reward);
    event PayoutDistributed(address indexed participant, uint reward);
    event TournamentEnded(uint remainingPrizePool);
    event TournamentReset();

    modifier onlyOrganizer() {
        require(msg.sender == organizer, "Only the organizer can call this function.");
        _;
    }

    modifier tournamentNotEnded() {
        require(!tournamentEnded, "Tournament has already ended.");
        _;
    }

    constructor() {
        organizer = msg.sender;
        lastUpkeepTime = block.timestamp;
    }

    function fundPrizePool() external payable onlyOrganizer {
        require(msg.value > 0, "Must send Ether to fund the prize pool.");
        prizePool += msg.value;
    }

    function addParticipant(address participant) external onlyOrganizer tournamentNotEnded {
        require(!isParticipant[participant], "Participant already added.");
        isParticipant[participant] = true;
        participants.push(participant);
        emit ParticipantAdded(participant);
    }

    function setCorrectAnswer(uint questionId, string calldata answer) external onlyOrganizer {
        correctAnswers[questionId] = keccak256(abi.encodePacked(answer));
    }

    function submitAnswer(uint questionId, string calldata answer) external tournamentNotEnded {
        require(isParticipant[msg.sender], "Not a participant");
        if (keccak256(abi.encodePacked(answer)) == correctAnswers[questionId]) {
            scores[msg.sender] += 1;
        }
    }

    function declareQuizWinners() public onlyOrganizer tournamentNotEnded {
        uint highestScore = 0;
        uint count = 0;

        for (uint i = 0; i < participants.length; i++) {
            if (scores[participants[i]] > highestScore) {
                highestScore = scores[participants[i]];
                count = 1;
            } else if (scores[participants[i]] == highestScore) {
                count++;
            }
        }

        require(count > 0 && highestScore > 0, "No winners");

        uint rewardPerWinner = prizePool / count;

        for (uint i = 0; i < participants.length; i++) {
            if (scores[participants[i]] == highestScore) {
                participantRewards[participants[i]] = rewardPerWinner;
                emit WinnerDeclared(participants[i], rewardPerWinner);
            }
        }

        prizePool -= rewardPerWinner * count;
    }

    function distributePayouts() external onlyOrganizer tournamentNotEnded {
        for (uint i = 0; i < participants.length; i++) {
            address participant = participants[i];
            uint reward = participantRewards[participant];
            if (reward > 0) {
                participantRewards[participant] = 0;
                payable(participant).transfer(reward);
                emit PayoutDistributed(participant, reward);
            }
        }
        tournamentEnded = true;
        emit TournamentEnded(prizePool);
    }

    function getParticipants() external view returns (address[] memory) {
        return participants;
    }

    // Chainlink Automation
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
    upkeepNeeded = (!tournamentEnded && (block.timestamp - lastUpkeepTime > upkeepInterval));
    performData = bytes("");
    }


    function performUpkeep(bytes calldata) external override {
        if (!tournamentEnded && (block.timestamp - lastUpkeepTime > upkeepInterval)) {
            declareQuizWinners();
            lastUpkeepTime = block.timestamp;
        }
    }
}
