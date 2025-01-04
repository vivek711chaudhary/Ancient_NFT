// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./MyNFT.sol";

contract NFTAuction is Ownable {
    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
    }

    struct Auction {
        address payable creator;
        uint256 nftId;
        uint256 startTime;
        uint256 endTime;
        address highestBidder;
        uint256 highestBid;
        bool isActive;
    }

    MyNFT public nftContract; // Reference to the MyNFT contract
    mapping(uint256 => Auction) public auctions; // Mapping auction ID to Auction
    mapping(uint256 => Bid[]) public auctionBids; // Mapping from NFT ID to array of bids

    event AuctionCreated(uint256 indexed nftId, address indexed creator, uint256 endTime);
    event NewBid(uint256 indexed nftId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed nftId, address indexed winner, uint256 winningBid);

    constructor(address _nftContractAddress) {
        nftContract = MyNFT(_nftContractAddress);
    }

    function isNFTInActiveAuction(uint256 nftId) public view returns (bool) {
        Auction storage auction = auctions[nftId];
        return auction.isActive && block.timestamp <= auction.endTime;
    }

    function createAuction(uint256 nftId, uint256 biddingTime) external {
        require(nftContract.ownerOf(nftId) == msg.sender, "You don't own this NFT");
        require(!isNFTInActiveAuction(nftId), "NFT is already in an active auction");
        require(biddingTime > 0, "Bidding time must be greater than 0");
        
        // If there's an old auction, make sure it's marked as inactive
        if (auctions[nftId].isActive) {
            require(block.timestamp > auctions[nftId].endTime, "Previous auction hasn't ended yet");
            auctions[nftId].isActive = false;
        }

        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + biddingTime;

        auctions[nftId] = Auction({
            creator: payable(msg.sender),
            nftId: nftId,
            startTime: startTime,
            endTime: endTime,
            highestBidder: address(0),
            highestBid: 0,
            isActive: true
        });

        emit AuctionCreated(nftId, msg.sender, endTime);
    }

    function placeBid(uint256 nftId) external payable {
        Auction storage auction = auctions[nftId];
        require(auction.isActive, "Auction is not active");
        require(block.timestamp <= auction.endTime, "Auction has ended");
        require(msg.value > auction.highestBid, "Bid is too low");

        // Refund the previous highest bidder
        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }

        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;

        // Add bid to history
        auctionBids[nftId].push(Bid({
            bidder: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        }));

        emit NewBid(nftId, msg.sender, msg.value);
    }

    function endAuction(uint256 nftId) external {
        Auction storage auction = auctions[nftId];
        require(auction.isActive, "Auction already ended");
        require(block.timestamp > auction.endTime, "Auction not yet ended");

        auction.isActive = false;

        if (auction.highestBidder != address(0)) {
            // Transfer the NFT to the highest bidder
            nftContract.transferFrom(auction.creator, auction.highestBidder, nftId);

            // Transfer funds to the creator
            auction.creator.transfer(auction.highestBid);
        }

        emit AuctionEnded(nftId, auction.highestBidder, auction.highestBid);
    }

    // Helper function to get auction details including status
    function getAuctionDetails(uint256 nftId) external view returns (
        address creator,
        uint256 startTime,
        uint256 endTime,
        address highestBidder,
        uint256 highestBid,
        bool isActive,
        bool hasEnded
    ) {
        Auction storage auction = auctions[nftId];
        return (
            auction.creator,
            auction.startTime,
            auction.endTime,
            auction.highestBidder,
            auction.highestBid,
            auction.isActive,
            block.timestamp > auction.endTime
        );
    }

    // Function to get bid history for an NFT
    function getBidHistory(uint256 nftId) external view returns (
        address[] memory bidders,
        uint256[] memory amounts,
        uint256[] memory timestamps
    ) {
        Bid[] storage bids = auctionBids[nftId];
        uint256 length = bids.length;
        
        bidders = new address[](length);
        amounts = new uint256[](length);
        timestamps = new uint256[](length);
        
        for (uint256 i = 0; i < length; i++) {
            bidders[i] = bids[i].bidder;
            amounts[i] = bids[i].amount;
            timestamps[i] = bids[i].timestamp;
        }
        
        return (bidders, amounts, timestamps);
    }
}
