import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

// Minimum ABI for ERC721
const ERC721_ABI = [
    "function mintNFT(address recipient) public returns (uint256)",
    "function ownerOf(uint256 tokenId) public view returns (address owner)",
    "function balanceOf(address owner) public view returns (uint256 balance)",
    "function name() public view returns (string memory)",
    "function symbol() public view returns (string memory)",
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

function App() {
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState(null);
    const [tokenId, setTokenId] = useState(null);

    useEffect(() => {
        const loadProvider = async () => {
            try {
                console.log("Loading provider...");
                const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
                const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
                
                const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
                const nftContract = new ethers.Contract(contractAddress, ERC721_ABI, wallet);

                setContract(nftContract);
                setAccount(wallet.address);
                console.log("Provider and contract loaded successfully.");
            } catch (error) {
                console.error("Error in loadProvider:", error);
            }
        };

        loadProvider();
    }, []);

    const mintNFT = async () => {
        try {
            if (!contract || !account) {
                console.error("Contract or account not available.");
                return;
            }

            console.log("Attempting to mint NFT...");
            const txn = await contract.mintNFT(account);
            console.log("Transaction sent. Waiting for confirmation...");
            const receipt = await txn.wait();

            console.log("Transaction receipt received:", receipt);
            
            const transferEvent = receipt.logs.find(log => 
                log.topics[0] === ethers.id("Transfer(address,address,uint256)")
            );

            if (transferEvent) {
                const newTokenId = ethers.toBigInt(transferEvent.topics[3]);
                setTokenId(newTokenId.toString());
                console.log(`Minted Token ID: ${newTokenId}`);
                
                // Verify ownership
                const owner = await contract.ownerOf(newTokenId);
                console.log(`Owner of Token ID ${newTokenId}:`, owner);
            } else {
                console.error("Transfer event not found in receipt.");
            }
        } catch (err) {
            console.error("Minting failed:", err);
        }
    };

    return (
        <div>
            <h1>CreatorChain NFT</h1>
            {account ? (
                <div>
                    <p>Connected Account: {account}</p>
                    <button onClick={mintNFT}>Mint NFT</button>
                    {tokenId && <p>Token ID: {tokenId}</p>}
                </div>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    );
}

export default App;
