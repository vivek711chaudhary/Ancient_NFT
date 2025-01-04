// web3config.js
const Web3 = require("web3");
// const dotenv = require("dotenv");

// Load environment variables from .env file
// dotenv.config();

// Retrieve environment variables
const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

// Validate required environment variables
if (!contractAddress || !privateKey) {
    console.error("Missing required environment variables:");
    if (!contractAddress) console.error("- CONTRACT_ADDRESS is not set");
    if (!privateKey) console.error("- PRIVATE_KEY is not set");
    process.exit(1); // Exit if essential variables are missing
}

// Set up the Web3 instance
const web3 = new Web3("http://127.0.0.1:8545");

// Load contract ABI and address
const contractABI = require("./CreatorChainNFT.json").abi;

// Create contract instance
const contract = new web3.eth.Contract(contractABI, contractAddress);

module.exports = { web3, contract, privateKey };
