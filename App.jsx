import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const contractAddress = "0x289EBb0ba8B6937dD0AAC9E6dC33402E053A1C81"; // replace this with your deployed contract address
const abi = [
  "function addParticipant(address participant) external",
  "function declareWinners(address[] calldata winners, uint[] calldata rewards) external",
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
  const [questionId, setQuestionId] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [score, setScore] = useState(null);
  const [account, setAccount] = useState(null);

  const questions = [
    { id: 1, question: "What is the purpose of the TournamentPayout contract?", choices: ["Hold NFTs", "Manage payouts", "Stake ETH"] },
    { id: 2, question: "What tool is used to deploy the contract?", choices: ["Hardhat", "Remix", "Truffle"] },
    { id: 3, question: "What Chainlink service provides randomness?", choices: ["VRF", "Functions", "Data Feeds"] }
  ];

  useEffect(() => {
    async function connectWallet() {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          setAccount(accounts[0]);
        } catch (err) {
          console.error("Wallet connection rejected:", err);
        }
      }
    }
    connectWallet();
  }, []);

  async function submitAnswerHandler(qid, userAnswer) {
    if (!window.ethereum) return alert("Install MetaMask!");
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);

    try {
      const tx = await contract.submitAnswer(qid, userAnswer);
      setStatus(`Submitting answer for Q${qid}...`);
      setTxHash(tx.hash);
      await tx.wait();
      setStatus(`✅ Answer submitted for Q${qid}`);
    } catch (err) {
      console.error("Submit answer failed:", err);
      setStatus("❌ Failed to submit answer");
    }
  }

  async function fetchScore() {
    if (!window.ethereum || !account) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, abi, provider);

    try {
      const result = await contract.scores(account);
      setScore(result.toString());
    } catch (err) {
      console.error("Fetch score failed:", err);
    }
  }

  async function declareQuizWinnersHandler() {
    if (!window.ethereum) return alert("Install MetaMask!");
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);

    try {
      const tx = await contract.declareQuizWinners();
      setStatus("Declaring quiz winners...");
      setTxHash(tx.hash);
      await tx.wait();
      setStatus("✅ Quiz winners declared!");
    } catch (err) {
      console.error("Declare quiz winners failed:", err);
      setStatus("❌ Failed to declare quiz winners");
    }
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', backgroundColor: '#111', color: '#fff', minHeight: '100vh' }}>
      <h1>Quiz Battle Game</h1>

      {questions.map((q) => (
        <div key={q.id} style={{ marginBottom: '1rem' }}>
          <p><strong>Q{q.id}:</strong> {q.question}</p>
          {q.choices.map((choice, idx) => (
            <button key={idx} style={{ marginRight: '0.5rem' }} onClick={() => submitAnswerHandler(q.id, choice)}>
              {choice}
            </button>
          ))}
        </div>
      ))}

      <h3 style={{ marginTop: '2rem' }}>Declare Quiz Winners</h3>
      <button onClick={declareQuizWinnersHandler}>Declare Winners</button>

      <h3 style={{ marginTop: '2rem' }}>Your Score</h3>
      <button onClick={fetchScore}>Check My Score</button>
      {score !== null && <p>Your Score: {score}</p>}

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
