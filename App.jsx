import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const contractAddress = "0x5Eadf9cD069729b3457C67110EE1fF5Bb3EF7fc5"; // ✅ Replace if needed
const abi = [
  "function addParticipant(address participant) external",
  "function declareQuizWinners() external",
  "function distributePayouts() external",
  "function fundPrizePool() external payable",
  "function participantRewards(address) view returns (uint)",
  "function prizePool() view returns (uint)",
  "function getParticipants() view returns (address[])",
  "function submitAnswer(uint questionId, string answer) external",
  "function scoresOf(address) view returns (uint)",
  "function manualStartQuiz() external",
  "function resetTournament() external",
  "function quizStarted() view returns (bool)",
  "event WinnerDeclared(address indexed winner, uint reward)",
  "event TournamentEnded(uint)"
];

export default function App() {
  const [questions] = useState([
    { id: 1, question: "What is the purpose of the TournamentPayout contract?", choices: ["Hold NFTs", "Manage payouts", "Stake ETH"] },
    { id: 2, question: "What tool is used to deploy the contract?", choices: ["Hardhat", "Remix", "Truffle"] },
    { id: 3, question: "What Chainlink service provides randomness?", choices: ["VRF", "Functions", "Data Feeds"] }
  ]);

  const [account, setAccount] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [score, setScore] = useState(null);
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [answered, setAnswered] = useState([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [prizePool, setPrizePool] = useState("0");
  const [showQuiz, setShowQuiz] = useState(true);
  const [winners, setWinners] = useState([]);

  const organizerAddress = "0xca7490a6ea2d9ba9d8819a18ad37744c7d680f1e";

  useEffect(() => {
    init();
    window.ethereum?.on("accountsChanged", () => {
      init();
    });
  }, []);

  useEffect(() => {
    if (participants.length === 4 && !quizStarted) {
      let time = 5;
      setCountdown(time);
      const timer = setInterval(() => {
        time -= 1;
        setCountdown(time);
        if (time === 0) clearInterval(timer);
      }, 1000);
    }
  }, [participants, quizStarted]);

  useEffect(() => {
    if (countdown === 0 && participants.length === 4 && !quizStarted) {
      fetchQuizStarted();
    }
  }, [countdown]);

  async function init() {
    if (!window.ethereum) return alert("Please install MetaMask");
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    const user = accounts[0];
    setAccount(user);
    await register(user);
    await refreshParticipants();
    await fetchScore(user);
    await fetchQuizStarted();
    await fetchPrizePool();
    await fetchWinners();
  }

  async function fetchQuizStarted() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const started = await contract.quizStarted();
    setQuizStarted(started);
    if (!started) {
      setShowQuiz(true);
    }
  }

  async function fetchWinners() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, abi, provider);

    try {
      const list = await contract.getParticipants();
      const results = [];

      for (let addr of list) {
        const reward = await contract.participantRewards(addr);
        if (reward.gt(0)) {
          results.push({
            address: addr,
            reward: ethers.utils.formatEther(reward)
          });
        }
      }

      if (results.length > 0) {
        setWinners(results);
        setShowQuiz(false);
      }
    } catch (err) {
      console.error("Could not fetch winners");
    }
  }

  async function register(addr) {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    const list = await contract.getParticipants();
    if (!list.includes(addr)) {
      const tx = await contract.addParticipant(addr);
      await tx.wait();
    }
  }

  async function refreshParticipants() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const list = await contract.getParticipants();
    setParticipants(list);
  }

  async function fetchScore(addr) {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const result = await contract.scoresOf(addr);
    setScore(result.toString());
  }

  async function fetchPrizePool() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const pool = await contract.prizePool();
    setPrizePool(ethers.utils.formatEther(pool));
  }

  async function submitAnswer(qid, ans) {
    if (answered.includes(qid)) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    try {
      const tx = await contract.submitAnswer(qid, ans);
      setStatus(`Submitting answer for Q${qid}...`);
      setTxHash(tx.hash);
      await tx.wait();
      setAnswered([...answered, qid]);
      setStatus(`✅ Answer submitted for Q${qid}`);
    } catch (err) {
      setStatus("❌ Error submitting answer");
    }
  }

  async function manualStartQuiz() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    try {
      const tx = await contract.manualStartQuiz();
      setStatus("Starting quiz...");
      await tx.wait();
      setStatus("✅ Quiz started manually");
      setQuizStarted(true);
    } catch (err) {
      setStatus("❌ Failed to start quiz");
    }
  }

  async function resetTournament() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    try {
      const tx = await contract.resetTournament();
      setStatus("Resetting tournament...");
      await tx.wait();
      setStatus("✅ Tournament reset!");
      setQuizStarted(false);
      setAnswered([]);
      setScore(null);
      setWinners([]);
      setShowQuiz(true);
      await refreshParticipants();
      await fetchPrizePool();
    } catch (err) {
      setStatus("❌ Failed to reset");
    }
  }

  async function declareWinners() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    try {
      const tx = await contract.declareQuizWinners();
      setStatus("Declaring winners...");
      const receipt = await tx.wait();
      setStatus("✅ Winners declared!");
      const winnerEvents = receipt.events.filter(e => e.event === "WinnerDeclared");
      const result = winnerEvents.map(e => ({
        address: e.args.winner,
        reward: ethers.utils.formatEther(e.args.reward)
      }));
      setWinners(result);
      setShowQuiz(false);
    } catch (err) {
      setStatus("❌ Error declaring winners");
    }
  }

  return (
    <div style={{ padding: '2rem', background: '#111', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1>Quiz Battle Game</h1>

      <p>🦊 Wallet: {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}</p>
      <p>🏆 Prize Pool: {prizePool} ETH</p>
      <p>👥 {participants.length}/4 Participants</p>
      <ul>
        {participants.map((p, i) => (
          <li key={i}>{p.slice(0, 6)}...{p.slice(-4)}</li>
        ))}
      </ul>

      {!quizStarted && participants.length === 4 && countdown > 0 && (
        <h2>⏳ Quiz starts in: {countdown}s</h2>
      )}

      {showQuiz && quizStarted && (
        <>
          <h2>🎯 Quiz In Progress</h2>
          {questions.map(q => (
            <div key={q.id} style={{ marginBottom: '1rem' }}>
              <p><strong>Q{q.id}:</strong> {q.question}</p>
              {q.choices.map((c, i) => (
                <button
                  key={i}
                  onClick={() => submitAnswer(q.id, c)}
                  disabled={answered.includes(q.id)}
                  style={{ marginRight: '0.5rem', opacity: answered.includes(q.id) ? 0.5 : 1 }}
                >
                  {c}
                </button>
              ))}
            </div>
          ))}
        </>
      )}

      {!showQuiz && winners.length > 0 && (
        <>
          <h2>🏁 Quiz Over – Winners</h2>
          <ul>
            {winners.map((w, i) => (
              <li key={i}>{w.address.slice(0, 6)}...{w.address.slice(-4)} — 💰 {w.reward} ETH</li>
            ))}
          </ul>
        </>
      )}

      <h3 style={{ marginTop: '2rem' }}>Your Score</h3>
      <button onClick={() => fetchScore(account)}>Check My Score</button>
      {score !== null && <p>Your Score: {score}</p>}

      {account?.toLowerCase() === organizerAddress.toLowerCase() && (
        <>
          <h3>Organizer Controls</h3>
          <button onClick={manualStartQuiz}>Start Quiz Manually</button>
          <button onClick={declareWinners}>Declare Winners</button>
          <button onClick={resetTournament}>Reset Tournament</button>
        </>
      )}

      {status && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#222', borderRadius: '6px' }}>
          <p>Status: {status}</p>
          {txHash && (
            <p>Tx: <a href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: '#4ade80' }}>{txHash.slice(0, 10)}...</a></p>
          )}
        </div>
      )}
    </div>
  );
}
