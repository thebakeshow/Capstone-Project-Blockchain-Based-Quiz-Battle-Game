// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TournamentPayout {
    address public organizer;
    uint public prizePool;
    bool public tournamentEnded;

    address[] public participants;
    mapping(address => bool) public isParticipant;
    mapping(address => uint) public participantRewards;

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

    function declareWinners(address[] calldata winners, uint[] calldata rewards) external onlyOrganizer tournamentNotEnded {
        require(winners.length == rewards.length, "Mismatched input lengths.");

        uint totalRewards = 0;
        for (uint i = 0; i < winners.length; i++) {
            require(isParticipant[winners[i]], "Winner is not a participant.");
            participantRewards[winners[i]] = rewards[i];
            totalRewards += rewards[i];
            emit WinnerDeclared(winners[i], rewards[i]);
        }
        require(totalRewards <= prizePool, "Not enough prize pool to cover rewards.");
        prizePool -= totalRewards;
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

    function resetTournament() external onlyOrganizer {
        require(tournamentEnded, "Tournament is not ended yet.");

        for (uint i = 0; i < participants.length; i++) {
            address participant = participants[i];
            isParticipant[participant] = false;
            participantRewards[participant] = 0;
        }
        delete participants;
        tournamentEnded = false;

        emit TournamentReset();
    }

    function getParticipants() external view returns (address[] memory) {
        return participants;
    }
}
