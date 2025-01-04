require("dotenv").config();
const { Web3 } = require("web3");

const API_URL = process.env.API_URL;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const web3 = new Web3(API_URL);

const contract = require("../artifacts/contracts/MyNFT.sol/MyNFT.json");
const contractAddress = "0x2685563B4Ef5E6ba66E86d077b0D92eE41A07529";
const nftContract = new web3.eth.Contract(contract.abi, contractAddress);

async function mintNFT(tokenURI) {
  try {
    const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, "latest");
    
    // Get current gas price
    const gasPrice = await web3.eth.getGasPrice();
    console.log("Current gas price:", web3.utils.fromWei(gasPrice, 'gwei'), "gwei");

    // Increase gasPrice by 20%
    const increasedGasPrice = BigInt(gasPrice) * 12n / 10n;
    console.log("Increased gas price (20% higher):", web3.utils.fromWei(increasedGasPrice.toString(), 'gwei'), "gwei");

    // Estimate gas
    const estimatedGas = await nftContract.methods
      .mintNFT(PUBLIC_KEY, tokenURI)
      .estimateGas({ from: PUBLIC_KEY });
    
    console.log("Estimated gas:", estimatedGas);

    const tx = {
      from: PUBLIC_KEY,
      to: contractAddress,
      nonce: nonce,
      gas: estimatedGas,
      gasPrice: increasedGasPrice.toString(),  // Use increased gas price
      data: nftContract.methods.mintNFT(PUBLIC_KEY, tokenURI).encodeABI(),
    };

    console.log("Transaction configured:", tx);

    const signedTx = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
    console.log("Transaction signed");

    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log("Transaction successful with hash:", receipt.transactionHash);
    return receipt;
  } catch (err) {
    console.error("An error occurred while sending the transaction:", err);
    // Log more details about the error
    console.error("Error details:", err.message);
    if (err.cause) {
      console.error("Cause:", err.cause.message);
    }
  }
}

async function createEdition(maxSupply, rarity, baseURI) {
  try {
    console.log('DEBUG: Starting createEdition with params:', {
      maxSupply,
      rarity,
      baseURI
    });

    const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, "latest");
    console.log('DEBUG: Got nonce:', nonce);
    
    // Get current gas price
    const gasPrice = await web3.eth.getGasPrice();
    console.log("DEBUG: Current gas price:", web3.utils.fromWei(gasPrice, 'gwei'), "gwei");

    // Increase gasPrice by 20%
    const increasedGasPrice = BigInt(gasPrice) * 12n / 10n;
    console.log("DEBUG: Increased gas price (20% higher):", web3.utils.fromWei(increasedGasPrice.toString(), 'gwei'), "gwei");

    // Estimate gas
    console.log('DEBUG: Estimating gas...');
    const estimatedGas = await nftContract.methods
      .createEdition(maxSupply, rarity, baseURI)
      .estimateGas({ from: PUBLIC_KEY });
    console.log("DEBUG: Estimated gas:", estimatedGas);

    const tx = {
      from: PUBLIC_KEY,
      to: contractAddress,
      nonce: nonce,
      gas: estimatedGas,
      gasPrice: increasedGasPrice.toString(),
      data: nftContract.methods.createEdition(maxSupply, rarity, baseURI).encodeABI(),
    };

    console.log("DEBUG: Transaction object:", {
      ...tx,
      data: tx.data.substring(0, 64) + '...' // Truncate data for logging
    });

    const signedTx = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
    console.log("DEBUG: Transaction signed");

    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log("Transaction Receipt:", receipt);

    // Hex code of the EditionCreated event
    const eventSignatureHash = "0x0de8cb2d5d75008bccc5e896b39081f8003620e1ab1d6b42196e2ba4dfbdba59";

    // Find the log matching the EditionCreated event signature
    const matchingLog = receipt.logs.find(log => log.topics[0] === eventSignatureHash);

    if (matchingLog) {
      // Decode the log data
      const decodedLog = web3.eth.abi.decodeLog(
        [
          { type: 'uint256', name: 'editionId' },
          { type: 'uint256', name: 'availableTokens' }
        ],
        matchingLog.data,
        matchingLog.topics.slice(1) // Exclude the event signature
      );

      console.log("Decoded Log:", decodedLog);

      // Convert BigInt to string for compatibility
      const responsePayload = {
        editionId: decodedLog.editionId.toString(),
        availableTokens: decodedLog.availableTokens.toString(),
      };  

      console.log("DEBUG: Edition created with transaction hash:", receipt.transactionHash);
      return {
        transactionHash: receipt.transactionHash,
        data: responsePayload
      };

    } else {
      throw new Error("EditionCreated event not found in transaction logs.");
    }

  } catch (err) {
    console.error("ERROR: Failed to create edition");
    console.error("Error message:", err.message);
    if (err.code) console.error("Error code:", err.code);
    if (err.data) console.error("Error data:", err.data);
    throw new Error(`Failed to create edition: ${err.message}`);
  }
}

async function getEditionDetails(editionId) {
  try {
    console.log('DEBUG: Getting edition details for ID:', editionId);
    const details = await nftContract.methods.getEditionDetails(editionId).call();
    console.log('DEBUG: Edition details:', details);
    
    return {
      maxSupply: details[0].toString(),
      currentSupply: details[1].toString(),
      rarity: details[2].toString(),
      isFirstEdition: details[3],
      baseURI: details[4]
    };
  } catch (err) {
    console.error("ERROR: Failed to get edition details");
    console.error("Error message:", err.message);
    throw new Error(`Failed to get edition details: ${err.message}`);
  }
}

async function getTokenEditionNumber(tokenId) {
  try {
    console.log('DEBUG: Getting token edition number for token ID:', tokenId);
    const details = await nftContract.methods.getTokenEditionNumber(tokenId).call();
    console.log('DEBUG: Token edition details:', details);
    
    return {
      editionId: details[0].toString(),
      editionNumber: details[1].toString()
    };
  } catch (err) {
    console.error("ERROR: Failed to get token edition number");
    console.error("Error message:", err.message);
    throw new Error(`Failed to get token edition number: ${err.message}`);
  }
}

async function tokenURI(tokenId) {
  try {
    console.log('DEBUG: Getting token URI for token ID:', tokenId);
    const uri = await nftContract.methods.tokenURI(tokenId).call();
    console.log('DEBUG: Token URI:', uri);
    return uri;
  } catch (err) {
    console.error("ERROR: Failed to get token URI");
    console.error("Error message:", err.message);
    throw new Error(`Failed to get token URI: ${err.message}`);
  }
}
function decodeEventData(logs, eventSignatureHash, receipt) {
  try {
      // Look for the NFTMinted event using the hex code
      const matchingLog = logs.find(log => log.topics[0] === eventSignatureHash);
      console.log("Matching log:", matchingLog);
      
      if (!matchingLog) {
          console.error("Available event topics:", logs.map(log => log.topics[0]));
          throw new Error("NFTMinted event not found in transaction logs");
      }

      // Print raw data for debugging
      console.log("Step 1: Raw Event Data");
      console.log("Matching log data:", matchingLog.data);
      console.log("Matching log topics:", matchingLog.topics);
      console.log("-".repeat(50));

      // Remove '0x' prefix and split into chunks
      const cleanData = matchingLog.data.slice(2);
      const chunks = cleanData.match(/.{1,64}/g);

      console.log("Step 2: Data Chunks");
      chunks.forEach((chunk, index) => {
          console.log(`Chunk ${index}: ${chunk}`);
      });
      console.log("-".repeat(50));

      // Decode values
      console.log("Step 3: Decoded Values");
      const decodedValues = {
          tokenId: web3.utils.hexToNumberString('0x' + chunks[0]),
          editionId: web3.utils.hexToNumberString('0x' + chunks[1]),
          editionNumber: web3.utils.hexToNumberString('0x' + chunks[2])
      };
      console.log("Decoded values:", decodedValues);
      console.log("-".repeat(50));

      // Format and return response
      return {
          transactionHash: receipt.transactionHash,
          tokenId: decodedValues.tokenId,
          editionId: decodedValues.editionId,
          editionNumber: decodedValues.editionNumber
      };

  } catch (eventError) {
      console.error("ERROR: Failed to process event log");
      console.error("Event Error:", eventError);
      throw eventError;
  }
}
async function mintEdition(editionId) {
  try {
    console.log('DEBUG: Starting mintEdition with params:', { editionId });

    const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, "latest");
    console.log('DEBUG: Got nonce:', nonce);
    
    // Get current gas price
    const gasPrice = await web3.eth.getGasPrice();
    console.log("DEBUG: Current gas price:", web3.utils.fromWei(gasPrice, 'gwei'), "gwei");

    // Increase gasPrice by 20%
    const increasedGasPrice = BigInt(gasPrice) * 12n / 10n;
    console.log("DEBUG: Increased gas price (20% higher):", web3.utils.fromWei(increasedGasPrice.toString(), 'gwei'), "gwei");

    // Estimate gas
    console.log('DEBUG: Estimating gas...');
    const estimatedGas = await nftContract.methods
      .mintEdition(editionId)
      .estimateGas({ from: PUBLIC_KEY });
    console.log("DEBUG: Estimated gas:", estimatedGas);

    const tx = {
      from: PUBLIC_KEY,
      to: contractAddress,
      nonce: nonce,
      gas: estimatedGas,
      gasPrice: increasedGasPrice.toString(),
      data: nftContract.methods.mintEdition(editionId).encodeABI(),
    };

    console.log("DEBUG: Transaction object:", {
      ...tx,
      data: tx.data.substring(0, 64) + '...' // Truncate data for logging
    });

    const signedTx = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
    console.log("DEBUG: Transaction signed");

    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.log("NFT minted successfully: " + receipt.transactionHash);
    console.log("------------------Transaction Receipt-------------:", receipt);

    try {
      // Find the relevant event log
      const logs = receipt.logs;
      if (!logs || logs.length === 0) {
        throw new Error("No event logs found in transaction receipt");
      }

      // Use the specific hex code for NFTMinted event
      const eventSignatureHash = "0xe5177288d661448b7d383a5e5f1be3886695859c8c327562a87df71d65e21ac2";

      // try {
      //   // Look for the NFTMinted event using the hex code
      //   const matchingLog = logs.find(log => log.topics[0] === eventSignatureHash);
      //   console.log("Matching log:", matchingLog);
      //   if (!matchingLog) {
      //     console.error("Available event topics:", logs.map(log => log.topics[0]));
      //     throw new Error("NFTMinted event not found in transaction logs");
      //   }

      //   console.log("Matching log data:", matchingLog.data);
      //   console.log("Matching log topics:", matchingLog.topics);

      //   try {
      //     // The data contains three 32-byte values
      //     // Remove '0x' prefix and split into 64-character chunks (32 bytes each)
      //     const data = matchingLog.data.slice(2); // remove '0x'
      //     const chunks = data.match(/.{1,64}/g); // split into 64-char chunks

      //     // Convert hex values to decimal strings
      //     const tokenId = web3.utils.hexToNumberString('0x' + chunks[0]);
      //     const amount = web3.utils.hexToNumberString('0x' + chunks[1]);
      //     const price = web3.utils.hexToNumberString('0x' + chunks[2]);

      //     console.log("Decoded values:", {
      //       tokenId,
      //       amount,
      //       price
      //     });

      //     return {
      //       transactionHash: receipt.transactionHash,
      //       tokenId: tokenId,
      //       editionId: amount,  // amount represents editionId
      //       editionNumber: price // price represents editionNumber
      //     };
      //   } catch (decodeError) {
      //     console.error("ERROR: Failed to decode hex data");
      //     console.error("Decode Error:", decodeError);
      //     throw decodeError;
      //   }
      // } catch (eventError) {
      //   console.error("ERROR: Failed to process event log");
      //   console.error("Event Error:", eventError);
      //   throw eventError;
      // }

      const responsePayload = decodeEventData(logs, eventSignatureHash, receipt);
      return responsePayload;

    } catch (receiptError) {
      console.error("ERROR: Failed to process transaction receipt");
      console.error("Receipt Error:", receiptError);
      throw receiptError;
    }
  } catch (err) {
    console.error("ERROR: Failed to mint NFT");
    console.error("Error message:", err.message);
    if (err.code) console.error("Error code:", err.code);
    if (err.data) console.error("Error data:", err.data);
    throw new Error(`Failed to mint NFT: ${err.message}`);
  }
}

module.exports = {
  createEdition,
  getEditionDetails,
  getTokenEditionNumber,
  tokenURI,
  mintEdition
};
