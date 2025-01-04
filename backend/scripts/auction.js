require("dotenv").config();
const { Web3 } = require("web3");
const API_URL = process.env.API_URL;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// const web3 = new Web3(API_URL);
const web3 = new Web3(new Web3.providers.HttpProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`));

const contract = require("../artifacts/contracts/Auction.sol/NFTAuction.json");
const auctionContractAddress = "0xd6C7365259B9162f49e5aB7570A9AbF554cB09Fe";
const auctionContract = new web3.eth.Contract(contract.abi, auctionContractAddress);


async function createAuction(nftId, startPrice, duration) {
  try {
    // Clean and validate the NFT ID
    const cleanNftId = nftId.toString().trim();
    if (!cleanNftId || cleanNftId.includes(' ')) {
      throw new Error('Invalid NFT ID format');
    }

    console.log('Creating auction with params:', {
      nftId: cleanNftId,
      startPrice,
      duration
    });
    
    // Convert duration from hours to seconds
    const durationInSeconds = Math.floor(parseFloat(duration) * 3600); // hours to seconds
    
    console.log('Auction timing details:', {
      durationInHours: duration,
      durationInSeconds,
      currentBlockTime: Math.floor(Date.now() / 1000)
    });

    // Check if the duration is valid
    if (durationInSeconds <= 0) {
      throw new Error('Duration must be greater than 0');
    }

    // Check if NFT is already in an auction
    const isInAuction = await auctionContract.methods.isNFTInActiveAuction(cleanNftId).call();
    if (isInAuction) {
      throw new Error('NFT is already in an active auction');
    }

    // Retrieve and add the private key account to the wallet
    const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);

    console.log('Estimating gas for NFT ID:', cleanNftId);

    const gasEstimate = await auctionContract.methods
        .createAuction(cleanNftId, durationInSeconds)
        .estimateGas({ from: account.address });

    console.log('Sending transaction...');
    const tx = await auctionContract.methods
        .createAuction(cleanNftId, durationInSeconds)
        .send({
            from: account.address,
            gas: Math.floor(Number(gasEstimate) * 1.2) // Add 20% buffer for safety
        });

    console.log('Transaction successful:', tx.transactionHash);
    
    // Get the auction details to verify
    const auctionDetails = await auctionContract.methods.auctions(cleanNftId).call();
    console.log('Created auction details:', {
      ...auctionDetails,
      startTimeDate: new Date(parseInt(auctionDetails.startTime) * 1000).toLocaleString(),
      endTimeDate: new Date(parseInt(auctionDetails.endTime) * 1000).toLocaleString(),
    });

    return tx;
  } catch (err) {
    console.error('Error in createAuction:', err);
    if (err.message.includes('NFT is already in an active auction')) {
      throw new Error('This NFT is already in an active auction. Please wait for the current auction to end.');
    }
    throw new Error(`Failed to create auction: ${err.message}`);
  }
}


  
  async function placeBid(auctionId, bidAmount) {
    try {
      const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, "latest");
      console.log("Nonce:", nonce);
      
      // Get current gas price
      const gasPrice = await web3.eth.getGasPrice();
      console.log("Current Gas Price:", web3.utils.fromWei(gasPrice, 'gwei'), "gwei");
      
      // Increase gasPrice by 20%
      const increasedGasPrice = BigInt(gasPrice) * 12n / 10n;
      console.log("Increased Gas Price (20% higher):", web3.utils.fromWei(increasedGasPrice.toString(), 'gwei'), "gwei");

      // Estimate gas
      const estimatedGas = await auctionContract.methods
        .placeBid(auctionId)
        .estimateGas({ from: PUBLIC_KEY, value: bidAmount });
      console.log("Estimated gas:", estimatedGas);
  
      const tx = {
        from: PUBLIC_KEY,
        to: auctionContractAddress,
        nonce: nonce,
        gas: estimatedGas,
        gasPrice: increasedGasPrice.toString(),
        value: web3.utils.toWei(bidAmount.toString(), "ether"),
        data: auctionContract.methods.placeBid(auctionId).encodeABI(),
      };
  
      console.log("Transaction prepared:", tx);
  
      const signedTx = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
      console.log("Transaction signed:", signedTx);

      // Send the signed transaction
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log("Transaction receipt:", receipt);

      console.log("Bid placed successfully:", receipt.transactionHash);
      return receipt;
    } catch (err) {
      console.error("Error placing bid:", err.message);
      if (err.cause) console.error("Cause:", err.cause.message);
    }
  }

  
async function endAuction(auctionId) {
    try {
      const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, "latest");
      console.log("Nonce:", nonce);
      
      // Get current gas price
      const gasPrice = await web3.eth.getGasPrice();
      console.log("Current Gas Price:", web3.utils.fromWei(gasPrice, 'gwei'), "gwei");
      
      // Increase gasPrice by 20%
      const increasedGasPrice = BigInt(gasPrice) * 12n / 10n;
      console.log("Increased Gas Price (20% higher):", web3.utils.fromWei(increasedGasPrice.toString(), 'gwei'), "gwei");

      // Estimate gas
      const estimatedGas = await auctionContract.methods
        .endAuction(auctionId)
        .estimateGas({ from: PUBLIC_KEY });
      console.log("Estimated gas:", estimatedGas);
  
      const tx = {
        from: PUBLIC_KEY,
        to: auctionContractAddress,
        nonce: nonce,
        gas: estimatedGas,
        gasPrice: increasedGasPrice.toString(),
        data: auctionContract.methods.endAuction(auctionId).encodeABI(),
      };
  
      console.log("Transaction prepared:", tx);
  
      const signedTx = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
      console.log("Transaction signed:", signedTx);

      // Send the signed transaction
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log("Transaction receipt:", receipt);

      console.log("Auction ended successfully:", receipt.transactionHash);
      return receipt;
    } catch (err) {
      console.error("Error ending auction:", err.message);
      if (err.cause) console.error("Cause:", err.cause.message);
    }
  }

async function isNFTInActiveAuction(nftId) {
  try {
    const isActive = await auctionContract.methods.isNFTInActiveAuction(nftId).call();
    return isActive;
  } catch (err) {
    console.error("Error checking NFT auction status:", err.message);
    if (err.cause) console.error("Cause:", err.cause.message);
  }
}

async function getAuctionDetails(nftId) {
  try {
    // First check if the NFT is in an active auction
    const isActive = await auctionContract.methods.isNFTInActiveAuction(nftId).call();
    if (!isActive) {
      return null;
    }
    
    const details = await auctionContract.methods.getAuctionDetails(nftId).call();
    // Convert BigInt values to strings
    return {
      ...details,
      nftId: details.nftId.toString(),
      startTime: details.startTime.toString(),
      endTime: details.endTime.toString(),
      highestBid: details.highestBid.toString(),
      isActive
    };
  } catch (err) {
    console.error("Error getting auction details:", err.message);
    if (err.cause) console.error("Cause:", err.cause.message);
    return null;
  }
}

async function getBidHistory(nftId) {
  try {
    console.log("Getting bid history for NFT:", nftId);
    
    // First check if the NFT exists in an auction
    const auctionExists = await auctionContract.methods.isNFTInActiveAuction(nftId).call();
    if (!auctionExists) {
      console.log("No active auction found for NFT:", nftId);
      return null;
    }

    const history = await auctionContract.methods.getBidHistory(nftId).call();
    console.log("Raw bid history:", history);

    // Convert any BigInt values to strings
    const processedHistory = {
      bidders: history.bidders,
      amounts: history.amounts.map(amount => amount.toString()),
      timestamps: history.timestamps.map(time => time.toString())
    };

    console.log("Processed bid history:", processedHistory);
    return processedHistory;
  } catch (err) {
    console.error("Error getting bid history:", err.message);
    if (err.cause) console.error("Cause:", err.cause.message);
    return null;
  }
}

async function getActiveAuctions() {
  try {
    // Get the current block number
    const currentBlock = await web3.eth.getBlockNumber();
    console.log('Current block number:', currentBlock);

    // Look back about 1 week worth of blocks (assuming 12 second block time)
    const fromBlock = Math.max(0, Number(currentBlock) - 50400); // Ensure `currentBlock` is converted to `Number`
    console.log('Fetching events from block:', fromBlock, 'to latest');

    // Get AuctionCreated events
    const createdEvents = await auctionContract.getPastEvents('AuctionCreated', {
      fromBlock: fromBlock,
      toBlock: 'latest'
    });
    console.log('Found created events:', createdEvents.length);

    // Get AuctionEnded events to filter out ended auctions
    const endedEvents = await auctionContract.getPastEvents('AuctionEnded', {
      fromBlock: fromBlock,
      toBlock: 'latest'
    });
    console.log('Found ended events:', endedEvents.length);

    // Create a set of ended auction NFT IDs (convert to string for uniformity)
    const endedAuctionIds = new Set(
      endedEvents.map(event => event.returnValues.nftId.toString())
    );
    console.log('Ended auction IDs:', Array.from(endedAuctionIds));

    // Filter out ended auctions and get details for active ones
    const activeAuctions = [];
    for (const event of createdEvents) {
      const nftId = event.returnValues.nftId.toString(); // Convert to string
      console.log('Processing NFT ID:', nftId);

      if (!endedAuctionIds.has(nftId)) {
        try {
          console.log('Fetching details for NFT:', nftId);
          const details = await auctionContract.methods.auctions(nftId).call();
          console.log('Raw details:', details);

          if (details && details.isActive) {
            // Convert all BigInt values to strings
            const auctionData = {
              nftId: nftId,
              creator: details.creator,
              startTime: details.startTime.toString(),
              endTime: details.endTime.toString(),
              highestBidder: details.highestBidder,
              highestBid: details.highestBid.toString(),
              isActive: details.isActive,
              transactionHash: event.transactionHash
            };
            console.log('Processed auction data:', auctionData);
            activeAuctions.push(auctionData);
          } else {
            console.log('Auction not active for NFT:', nftId);
          }
        } catch (error) {
          console.error(`Error getting details for NFT ${nftId}:`, error);
        }
      } else {
        console.log('Auction ended for NFT:', nftId);
      }
    }

    console.log('Active auctions:', activeAuctions);
    return activeAuctions;
  } catch (err) {
    console.error("Error getting active auctions:", err.message);
    if (err.cause) console.error("Cause:", err.cause.message);
    return [];
  }
}

module.exports = { 
  createAuction,
  placeBid,
  endAuction,
  isNFTInActiveAuction,
  getAuctionDetails,
  getBidHistory,
  getActiveAuctions
};