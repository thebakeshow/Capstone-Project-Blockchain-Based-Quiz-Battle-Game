import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const contractAddress = "0xc92bB4Ee16d623f9b7134bDa7c1f90BAA62C364F"; // Replace with your contract address
const abi = [
  "function addParticipant(address participant) external",
  "function declareQuizWinners() external",
  "function distributePayouts() external",
  "function fundPrizePool() external payable",
  "function participantRewards(address) view returns (uint)",
  "function prizePool() view returns (uint)",
  "function getParticipants() view returns (address[])",
  "function submitAnswer(uint questionId, string answer) external",
  "function setCorrectAnswer(uint questionId, string answer) external",
  "function scores(address) view returns (uint)"
];

export default function App() {
  const [questions] = useState([
    { id: 1, question: "What is the purpose of the TournamentPayout contract?", choices: ["Hold NFTs", "Manage payouts", "Stake ETH"] },
    { id: 2, question: "What tool is used to deploy the contract?", choices: ["Hardhat", "Remix", "Truffle"] },
    { id: 3, question: "What Chainlink service provides randomness?", choices: ["VRF", "Functions", "Data Feeds"] }
  ]);
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [score, setScore] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);

  useEffect(() => {
    async function init() {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        await registerParticipant(accounts[0]);
        await fetchParticipants();
        await fetchScore(accounts[0]);
      }
    }
    init();
  }, []);

  async function registerParticipant(address) {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);

      const currentList = await contract.getParticipants();
      if (!currentList.includes(address)) {
        const tx = await contract.addParticipant(address);
        setStatus("Registering participant...");
        await tx.wait();
        setStatus("✅ You’ve been added as a participant!");
      }
    } catch (err) {
      console.warn("Registration skipped or failed:", err);
    }
  }

  async function submitAnswerHandler(qid, answer) {
    if (!window.ethereum || answeredQuestions.includes(qid)) return;

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);

    try {
      const tx = await contract.submitAnswer(qid, answer);
      setStatus(`Submitting answer for Q${qid}...`);
      setTxHash(tx.hash);
      await tx.wait();
      setStatus(`✅ Answer submitted for Q${qid}`);
      setAnsweredQuestions(prev => [...prev, qid]);
    } catch (err) {
      console.error("Submit answer failed:", err);
      setStatus("❌ Failed to submit answer");
    }
  }

  async function fetchScore(addr) {
    if (!addr || !window.ethereum) return;

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const result = await contract.scores(addr);
    setScore(result.toString());
  }

  async function fetchParticipants() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const list = await contract.getParticipants();
    setParticipants(list);
  }

  async function declareQuizWinnersHandler() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);

    try {
      const tx = await contract.declareQuizWinners();
      setStatus("Declaring quiz winners...");
      setTxHash(tx.hash);
      await tx.wait();
      setStatus("✅ Winners declared!");
    } catch (err) {
      console.error("Declare winners failed:", err);
      setStatus("❌ Failed to declare winners");
    }
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', backgroundColor: '#111', color: '#fff', minHeight: '100vh' }}>
      <h1>Quiz Battle Game</h1>

      <p style={{ marginBottom: '1rem' }}>
        👥 Participants: {participants.length}/4 {participants.length < 4 ? '(Waiting for players...)' : '✅ Ready to start!'}
      </p>

      {questions.map((q) => (
        <div key={q.id} style={{ marginBottom: '1rem' }}>
          <p><strong>Q{q.id}:</strong> {q.question}</p>
          {q.choices.map((choice, idx) => (
            <button
              key={idx}
              disabled={answeredQuestions.includes(q.id)}
              onClick={() => submitAnswerHandler(q.id, choice)}
              style={{ marginRight: '0.5rem', opacity: answeredQuestions.includes(q.id) ? 0.4 : 1 }}
            >
              {choice}
            </button>
          ))}
        </div>
      ))}

      <h3 style={{ marginTop: '2rem' }}>Your Score</h3>
      <button onClick={() => fetchScore(account)}>Check My Score</button>
      {score !== null && <p>Your Score: {score}</p>}

      {account === "0xca7490a6ea2D9bA9D8819A18ad37744c7d680f1e" && (
        <>
          <h3 style={{ marginTop: '2rem' }}>Organizer Controls</h3>
          <button onClick={declareQuizWinnersHandler}>Declare Winners (Manual)</button>
        </>
      )}

      {status && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#222', borderRadius: '6px' }}>
          <p>Status: {status}</p>
          {txHash && (
            <p>
              Tx Hash: <a href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: '#4ade80' }}>
                {txHash.slice(0, 10)}...
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
