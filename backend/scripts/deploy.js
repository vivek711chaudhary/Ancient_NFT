const { ethers } = require("hardhat");

async function main() {
    const provider = ethers.provider;
    const wallet = new ethers.Wallet("caf605b7fdf4fa00382c674fff3272b23e6f375013c31dc14cbd401b82382178", provider);
    console.log("--------------------Wallet Address--------------:", wallet.address);
    
    // Get current gas price
    let gasPrice = await provider.getFeeData();
    console.log("Current gas price:", ethers.formatUnits(gasPrice.gasPrice, "gwei"), "gwei");
    
    // decrease gasPrice by 20%
    gasPrice = {
        maxFeePerGas: gasPrice.maxFeePerGas * 7n / 10n,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas * 7n / 10n
    };
console.log("Decreased gas price (30% lower):", ethers.formatUnits(gasPrice.maxFeePerGas, "gwei"), "gwei");

    // Log wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log("Wallet balance:", ethers.formatEther(balance), "ETH");

    const MyNFT = await ethers.getContractFactory("MyNFT", wallet);
  
    // Deploy with explicit gas settings
    console.log("Deploying contract...");
    const myNFT = await MyNFT.deploy({
        gasLimit: 5000000, // Increased gas limit
        maxFeePerGas: gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
    });
    
    await myNFT.waitForDeployment();
    const deployedAddress = await myNFT.getAddress();
    console.log("Contract deployed to address:", deployedAddress);
    
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

    // 0x79eD048E2f02A7405a2e85Ff872ef8496baA93D8
    // 0x2685563B4Ef5E6ba66E86d077b0D92eE41A07529