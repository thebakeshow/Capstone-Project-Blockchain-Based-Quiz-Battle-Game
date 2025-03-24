// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TournamentPayout {
    address public organizer;
    uint public prizePool;
    bool public tournamentEnded;

    mapping(address => uint) public participantRewards;
    address[] public participants;

    event ParticipantAdded(address indexed participant, uint reward);
    event PayoutDistributed(address indexed participant, uint reward);
    event TournamentEnded(uint remainingPrizePool);

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

    function addParticipant(address participant, uint reward) external onlyOrganizer tournamentNotEnded {
        require(participantRewards[participant] == 0, "Participant already added.");
        require(reward <= prizePool, "Insufficient prize pool.");

        participantRewards[participant] = reward;
        participants.push(participant);
        prizePool -= reward;

        emit ParticipantAdded(participant, reward);
    }

    function distributePayouts() external onlyOrganizer tournamentNotEnded {
        require(participants.length > 0, "No participants to pay.");

        for (uint i = 0; i < participants.length; i++) {
            address participant = participants[i];
            uint reward = participantRewards[participant];

            if (reward > 0) {
                payable(participant).transfer(reward);
                emit PayoutDistributed(participant, reward);
            }
        }

        tournamentEnded = true;
        emit TournamentEnded(prizePool);
    }
}
