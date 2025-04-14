import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const contractAddress = "0xC930216071978b23395A75793d10E807A36c7411";
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
    {
      id: 1,
      question: "What is one core goal of this project?",
      choices: [
        "Avoid smart contracts",
        "Use banks for payouts",
        "Transparent + Fast + Publicly Verifiable",
      ],
    },
    {
      id: 2,
      question: "Which Ethereum testnet is used in this project?",
      choices: ["Rinkeby", "Base Sepolia", "Goerli"],
    },
    {
      id: 3,
      question: "What framework is used to build the front end?",
      choices: ["Next.js", "React + Vite", "Angular"],
    },
    {
      id: 4,
      question: "What ensures that once deployed, contract logic cannot be altered?",
      choices: [
        "Private keys",
        "Immutable smart contract",
        "IPFS",
      ],
    },
    {
      id: 5,
      question: "What problem does this project aim to solve?",
      choices: [
        "Faster NFT minting",
        "Decentralized tournament payouts",
        "Better gas fees for token swaps",
      ],
    },
  ]);

  const [account, setAccount] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [score, setScore] = useState(null);
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [answered, setAnswered] = useState([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [prizePool, setPrizePool] = useState("0");
  const [showQuiz, setShowQuiz] = useState(true);
  const [winners, setWinners] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const organizerAddress = "0xca7490a6ea2d9ba9d8819a18ad37744c7d680f1e";

  const getMetaMaskProvider = () => {
    if (window.ethereum?.providers) {
      return window.ethereum.providers.find((p) => p.isMetaMask);
    }
    return window.ethereum?.isMetaMask ? window.ethereum : null;
  };

  const connectWallet = async () => {
    console.log("🔌 Connect Wallet button clicked");

    const provider = getMetaMaskProvider();
    if (!provider) {
      alert("❌ MetaMask not detected. Please install or enable MetaMask and try again.");
      console.error("No MetaMask provider found in window.ethereum");
      return;
    }

    try {
      console.log("🦊 Forcing MetaMask connection...");
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const user = accounts[0];
      console.log("✅ Connected:", user);
      setAccount(user);
      await init(user);
    } catch (err) {
      console.error("❌ Connection error:", err);
      alert("MetaMask connection failed. Please try again.");
    }
  };

  const init = async (userAddress) => {
    const provider = new ethers.providers.Web3Provider(getMetaMaskProvider());
    const user = userAddress;
    setAccount(user);
    if(user.toLowerCase() !== organizerAddress.toLowerCase()){
      await register(user);
    }
    await refreshParticipants();
    await fetchScore(user);
    await fetchQuizStarted();
    await fetchPrizePool();
    await updateLeaderboard();
  };

  useEffect(() => {
    const checkConnection = async () => {
      const provider = getMetaMaskProvider();
      if (provider) {
        try {
          const accounts = await provider.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await init(accounts[0]);
          }
        } catch (error) {
          console.error("Auto-connection check failed:", error);
        }
      }
    };
    checkConnection();

    getMetaMaskProvider()?.on("accountsChanged", () => {
      checkConnection();
    });

    const interval = setInterval(() => {
      refreshParticipants();
      updateLeaderboard();
    }, 10000);

    const quizInterval = setInterval(() => {
      fetchQuizStarted();
    }, 5000);

    const prizeInterval = setInterval(() => {
      fetchPrizePool();
    }, 7000);

    return () => {
      clearInterval(interval);
      clearInterval(quizInterval);
      clearInterval(prizeInterval);
    };
  }, []);

  return ( => {
      clearInterval(interval);
      clearInterval(quizInterval);
    };
  }, []);

    async function fetchQuizStarted() {
    const provider = new ethers.providers.Web3Provider(getMetaMaskProvider());
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const started = await contract.quizStarted();
    setQuizStarted(started);
    if (started) setShowQuiz(true);
    else setShowQuiz(false);
  }

  async function register(addr) {
    const provider = new ethers.providers.Web3Provider(getMetaMaskProvider());
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    const list = await contract.getParticipants();
    if (!list.includes(addr)) {
      const tx = await contract.addParticipant(addr);
      await tx.wait();
    }
  }

  async function refreshParticipants() {
    const provider = new ethers.providers.Web3Provider(getMetaMaskProvider());
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const list = await contract.getParticipants();
    setParticipants(list);
  }

  async function updateLeaderboard() {
    const provider = new ethers.providers.Web3Provider(getMetaMaskProvider());
    const contract = new ethers.Contract(contractAddress, abi, provider);
    try {
      const list = await contract.getParticipants();
      const board = [];
      for (const addr of list) {
        const sc = await contract.scoresOf(addr);
        board.push({ address: addr, score: Number(sc.toString()) });
      }
      const sorted = board.sort((a, b) => b.score - a.score);
      setLeaderboard(sorted);
    } catch (err) {
      console.error("Failed to update leaderboard:", err);
    }
  }

  async function fetchScore(addr) {
    const provider = new ethers.providers.Web3Provider(getMetaMaskProvider());
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const result = await contract.scoresOf(addr);
    setScore(result.toString());
  }

  async function fetchPrizePool() {
    const provider = new ethers.providers.Web3Provider(getMetaMaskProvider());
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const pool = await contract.prizePool();
    setPrizePool(ethers.utils.formatEther(pool));
  }

  async function submitAnswer(qid, ans) {
    if (answered.includes(qid)) return;
    const provider = new ethers.providers.Web3Provider(getMetaMaskProvider());
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    try {
      const tx = await contract.submitAnswer(qid, ans);
      setStatus(`Submitting answer for Q${qid}...`);
      setTxHash(tx.hash);
      await tx.wait();
      setAnswered([...answered, qid]);
      setStatus(`✅ Answer submitted for Q${qid}`);
      await updateLeaderboard();
    } catch (err) {
      setStatus("❌ Error submitting answer");
    }
  }

  async function manualStartQuiz() {
    const provider = new ethers.providers.Web3Provider(getMetaMaskProvider());
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    try {
      const tx = await contract.manualStartQuiz();
      setStatus("Starting tournament...");
      await tx.wait();
      setStatus("✅ Tournament started manually");
      setQuizStarted(true);
    } catch (err) {
      setStatus("❌ Failed to start tournament");
    }
  }

  async function resetTournament() {
    const provider = new ethers.providers.Web3Provider(getMetaMaskProvider());
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
      await updateLeaderboard();
    } catch (err) {
      setStatus("❌ Failed to reset");
    }
  }

  async function declareWinners() {
    const provider = new ethers.providers.Web3Provider(getMetaMaskProvider());
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

      const prizeInterval = setInterval(() => {
      fetchPrizePool();
    }, 7000); // every 7 seconds

    return () => {
      clearInterval(interval);
      clearInterval(quizInterval);
      clearInterval(prizeInterval);
    };
  }, []);

  return (
    <div style={{ padding: '2rem', background: '#111', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1>Quiz Battle Game</h1>

      {!account && (
        <button onClick={connectWallet} style={{ marginBottom: '1rem' }}>🔐 Connect Wallet</button>
      )}

      <p>🦉 Wallet: {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not connected'}</p>
      <p>🏆 Prize Pool: {prizePool} ETH</p>
      <p>👥 {participants.length} Participants</p>

      <h3 style={{ marginTop: '1rem' }}>📊 Live Leaderboard</h3>
      {leaderboard.length === 0 ? (
        <p>No scores yet.</p>
      ) : (
        <ol>
          {leaderboard.map((p, i) => (
            <li key={i}>{p.address.slice(0, 6)}...{p.address.slice(-4)} — 🧠 {p.score} pts</li>
          ))}
        </ol>
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
          <button onClick={manualStartQuiz}>Start Tournament</button>
          <button onClick={declareWinners}>Declare Winners</button>
          <button onClick={resetTournament}>Reset Tournament</button>
        </>
      )}

      {status && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#222', borderRadius: '6px' }}>
          <p>Status: {status}</p>
          {txHash && (
            <p>
              Tx: <a href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: '#4ade80' }}>
                {txHash.slice(0, 10)}...
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
