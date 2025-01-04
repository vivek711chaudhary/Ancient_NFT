require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
    const provider = ethers.provider;
    const wallet = new ethers.Wallet("caf605b7fdf4fa00382c674fff3272b23e6f375013c31dc14cbd401b82382178", provider);
    console.log("--------------------Wallet Address--------------:", wallet.address);

    // Get current gas price
    const gasPrice = await provider.getFeeData();
    console.log("Current gas price:", ethers.formatUnits(gasPrice.gasPrice, "gwei"), "gwei");

    // Log wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log("Wallet balance:", ethers.formatEther(balance), "ETH");

    // Replace with the deployed MyNFT contract address
    const myNFTAddress = "0x2685563B4Ef5E6ba66E86d077b0D92eE41A07529";
    console.log("Using MyNFT contract address:", myNFTAddress);

    const NFTAuction = await ethers.getContractFactory("NFTAuction", wallet);

    // Deploy NFTAuction with explicit gas settings
    console.log("Deploying NFTAuction contract...");
    const nftAuction = await NFTAuction.deploy(myNFTAddress, {
        gasLimit: 3000000, // Adjust this value based on your contract
        maxFeePerGas: gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
    });

    await nftAuction.waitForDeployment();
    const deployedAddress = await nftAuction.getAddress();
    console.log("NFTAuction deployed to address:", deployedAddress);

    // Verify the contract is deployed
    const code = await provider.getCode(deployedAddress);
    if (code === '0x') {
        throw new Error('Contract deployment failed - no bytecode at address');
    }
    
    console.log("Contract deployment verified successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


    // 0x1b7b417881Ba4141CD2d14c76D163b9c8F7aAE6d
    // 0xb3e97900436D5741Ab91EE2fd2dfB3F20bC636e6
    // 0xfb74B119819936049a3A783803BA5455894Fa59C
    // 0x140624e9E6C22544A674175589aDD9f98A56Fd8b
    // 0xd6C7365259B9162f49e5aB7570A9AbF554cB09Fe
