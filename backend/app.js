const express = require("express");
const cors = require("cors");
const { 
  mintNFT, 
  createEdition, 
  mintEdition, 
  getEditionDetails, 
  getTokenEditionNumber, 
  tokenURI,
} = require("./scripts/mint-nft");
const { createAuction, placeBid, endAuction, getAuctionDetails, isNFTInActiveAuction, getBidHistory, getActiveAuctions } = require("./scripts/auction");

const app = express();
app.use(cors());
app.use(express.json());

// NFT Routes
app.post("/api/mint", async (req, res) => {
  try {
    console.log('DEBUG: Received POST request to /mint');
    console.log('DEBUG: Request body:', req.body);

    const { tokenURI } = req.body;

    if (!tokenURI) {
      console.error('ERROR: Missing tokenURI in the request body');
      return res.status(400).json({ success: false, error: "tokenURI is required" });
    }

    console.log('DEBUG: Calling mintNFT with tokenURI:', tokenURI);
    const receipt = await mintNFT(tokenURI);
    console.log('DEBUG: NFT minted successfully. Receipt:', receipt);

    res.json({ success: true, receipt });
  } catch (err) {
    console.error('ERROR: An error occurred while minting the NFT:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get edition details
app.get("/editions/:editionId", async (req, res) => {
  try {
    console.log('DEBUG: Received GET request to /editions/:editionId');
    const editionId = req.params.editionId;
    console.log('DEBUG: Getting edition details for ID:', editionId);
    
    const details = await getEditionDetails(editionId);
    console.log('DEBUG: Edition details:', details);
    
    // Convert BigInt values to strings before sending response
    const response = {
      success: true,
      details: {
        maxSupply: details.maxSupply.toString(),
        currentSupply: details.currentSupply.toString(),
        rarity: details.rarity.toString(),
        isFirstEdition: details.isFirstEdition,
        baseURI: details.baseURI
      }
    };
    
    res.json(response);
  } catch (err) {
    console.error('ERROR: Failed to get edition details:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Get token edition number
app.get("/token/:tokenId/edition", async (req, res) => {
  try {
    console.log('DEBUG: Received GET request to /token/:tokenId/edition');
    const { tokenId } = req.params;
    
    if (!tokenId) {
      return res.status(400).json({ 
        success: false, 
        error: "Token ID is required" 
      });
    }

    const editionInfo = await getTokenEditionNumber(tokenId);
    res.json({ 
      success: true, 
      editionInfo 
    });
  } catch (err) {
    console.error('ERROR: Failed to get token edition number:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Get token URI
app.get("/token/:tokenId/uri", async (req, res) => {
  try {
    console.log('DEBUG: Received GET request to /token/:tokenId/uri');
    const { tokenId } = req.params;
    
    if (!tokenId) {
      return res.status(400).json({ 
        success: false, 
        error: "Token ID is required" 
      });
    }

    const uri = await tokenURI(tokenId);
    res.json({ 
      success: true, 
      uri 
    });
  } catch (err) {
    console.error('ERROR: Failed to get token URI:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Mint NFT from an edition
app.post("/mint", async (req, res) => {
  try {
    console.log('DEBUG: Received POST request to /mint');
    console.log('DEBUG: Request body:', req.body);
    
    const { editionId } = req.body;
    
    if (!editionId) {
      return res.status(400).json({ 
        success: false, 
        error: "Edition ID is required" 
      });
    }

    console.log('DEBUG: Minting NFT with params:', { editionId });
    const result = await mintEdition(editionId);
    console.log('DEBUG: NFT minted successfully:', result);

    res.json({ 
      success: true,
      transactionHash: result.transactionHash,
      tokenId: result.tokenId,
      editionId: result.editionId,
      editionNumber: result.editionNumber,
    });
  } catch (err) {
    console.error('ERROR: Failed to mint NFT:', err);
    console.error('ERROR details:', {
      message: err.message,
      code: err.code,
      data: err.data
    });
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Edition Routes
app.post("/editions", async (req, res) => {
  try {
    console.log('DEBUG: Received POST request to /editions');
    console.log('DEBUG: Request body:', req.body);
    
    const { maxSupply, rarity, baseURI } = req.body;
    
    // Validate inputs
    if (!maxSupply || !baseURI) {
      console.error('DEBUG: Missing required fields');
      return res.status(400).json({ 
        success: false, 
        error: "maxSupply and baseURI are required" 
      });
    }

    console.log('DEBUG: Creating edition with params:', {
      maxSupply,
      rarity,
      baseURI
    });

    const result = await createEdition(maxSupply, rarity, baseURI);
    console.log('DEBUG: Edition created with transaction hash:', result.transactionHash);
    console.log('DEBUG: Edition data:', result.data);
    res.json({ 
      success: true, 
      transactionHash: result.transactionHash,
      data: result.data
    });
  } catch (err) {
    console.error('ERROR: Failed to create edition:', err);
    console.error('ERROR details:', {
      message: err.message,
      code: err.code,
      data: err.data
    });
    res.status(500).json({ 
      success: false, 
      error: err.message
    });
  }
});

app.post("/editions/:editionId/mint", async (req, res) => {
  try {
    console.log('DEBUG: Received POST request to /editions/:editionId/mint');
    const { editionId } = req.params;
    const tokenId = await mintEdition(editionId);
    res.json({ success: true, tokenId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Auction Routes
app.post("/create-auction", async (req, res) => {
  try {
    console.log('DEBUG: Received POST request to /create-auction');
    const { nftId, minBid, duration } = req.body;
    console.log('DEBUG: request body:', req.body);
    const receipt = await createAuction(nftId, minBid, duration);
    
    // Convert BigInt values to strings in the receipt
    const serializedReceipt = JSON.parse(JSON.stringify(receipt, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
    
    console.log("serializedReceipt:", serializedReceipt);
    res.json({ success: true, receipt: serializedReceipt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/auctions/:nftId/bid", async (req, res) => {
  try {
    console.log('DEBUG: Received POST request to /auctions/:nftId/bid');
    const { nftId } = req.params;
    const { amount } = req.body;
    const receipt = await placeBid(nftId, amount);
    res.json({ success: true, receipt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/auctions/:nftId/end", async (req, res) => {
  try {
    console.log('DEBUG: Received POST request to /auctions/:nftId/end');
    const { nftId } = req.params;
    const receipt = await endAuction(nftId);
    res.json({ success: true, receipt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/auctions/:nftId", async (req, res) => {
  try {
    console.log('DEBUG: Received GET request to /auctions/:nftId');
    const { nftId } = req.params;
    const details = await getAuctionDetails(nftId);
    res.json({ success: true, details });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/auctions/:nftId/active", async (req, res) => {
  try {
    console.log('DEBUG: Received GET request to /auctions/:nftId/active');
    const { nftId } = req.params;
    const isActive = await isNFTInActiveAuction(nftId);
    res.json({ success: true, isActive });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/auctions/:nftId/bids", async (req, res) => {
  try {
    console.log('DEBUG: Received GET request to /auctions/:nftId/bids');
    const nftId = req.params.nftId;
    
    if (!nftId) {
      console.error('No NFT ID provided');
      return res.status(400).json({ 
        success: false, 
        error: 'NFT ID is required' 
      });
    }

    console.log('DEBUG: NFT ID from params:', nftId);

    const history = await getBidHistory(nftId);
    console.log('---------------DEBUG: Raw Bid history:---------', history);

    if (!history) {
      return res.json({ 
        success: true, 
        history: { 
          bidders: [], 
          amounts: [], 
          timestamps: [] 
        } 
      });
    }

    // Convert BigInt values to strings for serialization
    const serializedHistory = {
      bidders: history.bidders,
      amounts: history.amounts.map(amount => amount.toString()),
      timestamps: history.timestamps.map(timestamp => timestamp.toString())
    };

    console.log('---------------DEBUG: Serialized Bid history:---------', serializedHistory);
    res.json({ success: true, history: serializedHistory });
  } catch (err) {
    console.error('Error fetching bid history:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get active auctions
app.get("/active-auctions", async (req, res) => {
  try {
    const activeAuctions = await getActiveAuctions();
    res.json({ success: true, auctions: activeAuctions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
