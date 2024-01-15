# 🚀 AI Low-Code StarkNet Development Suite

Defi Builder AI is an innovative platform designed for StarkNet blockchain developers. It leverages AI-driven tools to facilitate the creation, deployment, and optimization of StarkNet-based decentralized applications (dApps) using Cairo language.

## 🤖 Technical Overview

Defi Builder AI integrates advanced AI capabilities to enhance StarkNet smart contract development in Cairo. At its core, the platform features an AI-driven smart contract generator and a suite of tools specific to StarkNet development.

## ✨ Features

- 🤖 **AI Smart Contract Generator**: Utilize AI to generate a variety of smart contracts based on user requests, trained on Cairo smart contracts.
- 🔍 **AI Auditor**: Specialized agent for ensuring thorough and reliable contract examination in Cairo.
- 🛠️ **DeFi Tool Suite**: Tools for creating custom tokens, NFTs, Editions, Marketplaces, Vaults, DEXs, specifically for StarkNet.
- 🌐 **AI Training in Cairo**: DEFI BUILDER AI is specially trained to generate smart contracts in Cairo, the native language for StarkNet.
- 🏦 **Web3 Wallet Integration**: DEFI BUILDER AI requires a web3 wallet connection for full operation, with added StarkNet support.
- 🌉 **Cairo Code Compiler**: DEFI BUILDER AI includes a tool to test generated contracts using StarkNet environments.

## 🧠 Main Logic of the AI System in Defi Builder Starknet AI Suite

🚀 Try it now: [Starknet AI](https://starknet.defibuilder.com)

Defi Builder's AI system is a sophisticated ensemble of components, each designed to ensure the security, efficiency, and reliability of StarkNet smart contracts in Cairo. The system comprises three main elements: the AI Generator Agent, the Builder Backend, and the AI Auditor Backend.

### AI Generator Agent

- **Purpose**: To generate StarkNet smart contracts in Cairo.
- **Training and Data Sources**: Fine-tuned on a vast dataset of Cairo smart contracts, enhancing security and reliability.
- **Functionality**: Processes user inputs to generate smart contract code adhering to Cairo best practices.

### AI Auditor Agent

- **Objective**: After a successful compilation, the AI Auditor Backend evaluates the smart contract for potential vulnerabilities.
- **Vulnerability Assessment and Categorization**: The AI Auditor is fine-tuned on a comprehensive dataset, including a public Hugging Face Q&A dataset with over 9,000 examples of potential vulnerabilities. This allows the AI to categorize vulnerabilities based on their security concerns (Low, Medium, High).

### Builder Backend

- **Role**: Post-generation processing of Cairo smart contracts.
- **Compilation and Syntax Checking**: Verifies Cairo contract compilation, crucial for syntax and coding issues.

## 🚀 Getting Started

Follow these steps to set up Defi Builder AI for development and testing:

### Prerequisites

- Node.js
- OpenAI API Key
- MongoDB URI
- Compiler Backend API KEY

### Environment Setup

- Update the `.env` files in respective folders with necessary API keys and database URIs.

back-end
'''sh
OPENAI_API_KEY=''
MONGO_DB_URI=''
X_API_KEY=''
'''

### Installation

1. Clone the StarknetAI repository:

   ```sh
   git clone https://github.com/thedefibuilder/starknet-ai.git
   ```

2. Navigate to the project directory and install dependencies:

   ```sh
   cd starknet-ai
   npm install
   cd back-end
   npm install
   cd ../front-end
   npm install
   ```

## 📝 Usage

To use Starknet AI Builder Repo, start the local development server:

```sh
cd back-end
npm genezio local
```

On a new terminal while backend is running

```sh
cd front-end
npm run dev
```

Navigate through the platform to create, test, and deploy Starknet smart contracts using our AI-assisted tools.

## 🔥 Contributing

Contributions are welcome! Please follow the standard fork-and-pull-request workflow to contribute.

## 🧾 License

DeFi Builder © 2024 by DeFi Builder is licensed under CC BY-NC-SA 4.0. To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/
