# 🎯 Blockchain-Based Quiz Battle Game

This project is a fully decentralized **quiz battle game** built on **Base Sepolia testnet**, designed for competitive on-chain trivia battles using **smart contracts**, **React (Vite)**, and **Chainlink Automation**.

Participants connect their wallets, get auto-registered, and compete in a timed quiz. The player(s) with the highest score automatically receive ETH rewards from the prize pool — all handled trustlessly via smart contract.

---

## 🔧 Tech Stack

- **Smart Contract:** Solidity (0.8.x)
- **Frontend:** React + Vite + Ethers.js
- **Deployment:** Vercel
- **Testnet:** Base Sepolia
- **Automation:** Chainlink Keepers (Automation)

---

## 🚀 Live Demo

🔗 [Live App on Vercel](https://your-vercel-url.vercel.app)

---

## 👾 How It Works

### 1. Organizer:

- Deploys the contract on Base Sepolia
- Funds the prize pool
- Sets correct answers via embedded logic
- Can start or reset the tournament manually

### 2. Players:

- Connect wallet via MetaMask
- Are auto-registered upon connection
- Answer quiz questions (1 attempt per question)
- Scores are tracked live
- Winners are declared automatically based on score

---

## 🧠 Features

- ✅ Wallet auto-registration
- ✅ 4-player countdown trigger
- ✅ Organizer override control
- ✅ Live Leaderboard (auto-refreshing)
- ✅ Auto payout to winners via smart contract
- ✅ Trustless + transparent logic
- ✅ Seamless frontend UX

---

## 🛠 Installation & Development

``bash

# Clone the repo
git clone https://github.com/yourname/quiz-battle-game.git
cd quiz-battle-game

# Install dependencies
npm install

# Run locally
npm run dev

📦 Deployment (Vercel)
Push your project to a GitHub repo

Go to vercel.com → Import GitHub repo

Set Framework: Vite

Leave default build settings (npm run build)

Deploy 🚀

🧾 Smart Contract Overview
// Key contract functions
function addParticipant(address);
function submitAnswer(uint questionId, string answer);
function declareQuizWinners();
function distributePayouts();
function resetTournament();

Participant tracking

Answer verification

Score logic

Prize distribution

🧪 Testing
You can test by:

Adding multiple wallets (MetaMask profiles)

Connecting to Base Sepolia

Interacting via live frontend

Watching contract events on BaseScan

🤝 Credits
Built by Jonathan baker as a Master's Capstone Project
With support from Chainlink, Base, and open-source tools 💙

📜 License
MIT License


Chainlink Automation

https://automation.chain.link/base-sepolia/111785981947419106210724474317909575151787299810306682769802088209447627098938
