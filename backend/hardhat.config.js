/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");

const API_URL = "https://sepolia.infura.io/v3/17c1285ab7404aa195e6ea61e63a5482";
const PRIVATE_KEY = "caf605b7fdf4fa00382c674fff3272b23e6f375013c31dc14cbd401b82382178";

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: "sepolia",
  networks: {
    hardhat: {
      chainId: 1337
    },
    sepolia: {
      url: API_URL,
      accounts: [`0x${PRIVATE_KEY}`],
      gasMultiplier: 1,
      gasPrice: 50000000000 , // 50 gwei
      timeout: 60000
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
