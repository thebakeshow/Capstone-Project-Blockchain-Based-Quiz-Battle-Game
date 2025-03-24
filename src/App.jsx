import { useState } from 'react';
import { ethers } from 'ethers';

const contractAddress = "0x0C30c7a064f603018635a30dBa1bf2f98B57f4D6"; // Replace with the contract address from Remix
const abi = [
  "function addParticipant(address participant, uint reward) external",
  "function distributePayouts() external",
  "function fundPrizePool() external payable",
  "function participantRewards(address) view returns (uint)",
  "function prizePool() view returns (uint)"
];

export default function App() {
  const [participant, setParticipant] = useState("");
  const [reward, setReward] = useState("");
  const [prizePool, setPrizePool] = useState("0");

  async function addParticipant() {
    if (!window.ethereum) return alert("Install MetaMask!");

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);

    try {
      const tx = await contract.addParticipant(participant, ethers.utils.parseEther(reward));
      await tx.wait();
      alert("Participant added!");
    } catch (err) {
      console.error(err);
      alert("Transaction failed");
    }
  }

  async function distributePayouts() {
    if (!window.ethereum) return alert("Install MetaMask!");

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);

    try {
      const tx = await contract.distributePayouts();
      await tx.wait();
      alert("Payouts Distributed!");
    } catch (err) {
      console.error(err);
      alert("Transaction failed");
    }
  }

  async function fetchPrizePool() {
    if (!window.ethereum) return alert("Install MetaMask!");

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, abi, provider);

    try {
      const amount = await contract.prizePool();
      setPrizePool(ethers.utils.formatEther(amount));
    } catch (err) {
      console.error(err);
      alert("Could not fetch prize pool");
    }
  }

  return (
    <div>
      <h1>Tournament Payout System</h1>
      <p>Prize Pool: {prizePool} ETH</p>
      <button onClick={fetchPrizePool}>Refresh Prize Pool</button>

      <h3>Add Participant</h3>
      <input type="text" placeholder="Participant Address" onChange={(e) => setParticipant(e.target.value)} />
      <input type="text" placeholder="Reward in ETH" onChange={(e) => setReward(e.target.value)} />
      <button onClick={addParticipant}>Add</button>

      <h3>Distribute Payouts</h3>
      <button onClick={distributePayouts}>Pay Winners</button>
    </div>
  );
}
