// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";

contract TournamentPayout is AutomationCompatibleInterface {
    address public organizer;
    uint public prizePool;
    bool public tournamentEnded;
    bool public quizStarted;

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
    event QuizStarted();
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

        correctAnswers[1] = keccak256(abi.encodePacked("Manage payouts"));
        correctAnswers[2] = keccak256(abi.encodePacked("Remix"));
        correctAnswers[3] = keccak256(abi.encodePacked("VRF"));
    }

    function fundPrizePool() external payable onlyOrganizer {
        require(msg.value > 0, "Must send Ether to fund the prize pool.");
        prizePool += msg.value;
    }

    function addParticipant(address participant) external tournamentNotEnded {
        require(!quizStarted, "Quiz already started");
        require(!isParticipant[participant], "Already joined");
        isParticipant[participant] = true;
        participants.push(participant);
        emit ParticipantAdded(participant);

        if (participants.length == 4) {
            quizStarted = true;
            emit QuizStarted();
        }
    }

    function manualStartQuiz() external onlyOrganizer tournamentNotEnded {
        require(!quizStarted, "Already started");
        quizStarted = true;
        emit QuizStarted();
    }

    function submitAnswer(uint questionId, string calldata answer) external {
        require(isParticipant[msg.sender], "Not a participant");
        require(quizStarted, "Quiz not started yet");
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
                payable(participants[i]).transfer(rewardPerWinner);
                emit WinnerDeclared(participants[i], rewardPerWinner);
                emit PayoutDistributed(participants[i], rewardPerWinner);
            }
        }

        prizePool = 0;
        tournamentEnded = true;
        emit TournamentEnded(prizePool);
    }

    function resetTournament() external onlyOrganizer {
        for (uint i = 0; i < participants.length; i++) {
            isParticipant[participants[i]] = false;
            scores[participants[i]] = 0;
            participantRewards[participants[i]] = 0;
        }

        delete participants;
        prizePool = 0;
        quizStarted = false;
        tournamentEnded = false;

        emit TournamentReset();
    }

    function getParticipants() external view returns (address[] memory) {
        return participants;
    }

    function scoresOf(address player) external view returns (uint) {
        return scores[player];
    }

    // Chainlink Automation
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory) {
        bool timePassed = block.timestamp - lastUpkeepTime > upkeepInterval;
        upkeepNeeded = (!tournamentEnded && quizStarted && timePassed);
        return (upkeepNeeded, "");
    }

    function performUpkeep(bytes calldata) external override {
        if (!tournamentEnded && quizStarted && (block.timestamp - lastUpkeepTime > upkeepInterval)) {
            declareQuizWinners();
            lastUpkeepTime = block.timestamp;
        }
    }
}
