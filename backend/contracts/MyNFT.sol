// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721, Ownable {
    enum Rarity { Common, Rare, Legendary }

    struct Edition {
        uint256 maxSupply;
        uint256 currentSupply;
        Rarity rarity;
        bool isFirstEdition;
        string baseURI;
        mapping(uint256 => bool) tokenExists;
    }

    // Mapping from edition ID to Edition details
    mapping(uint256 => Edition) public editions;
    // Mapping from token ID to edition ID
    mapping(uint256 => uint256) public tokenEditions;
    // Counter for edition IDs
    uint256 private _editionIds;
    
    // Events
    event EditionCreated(uint256 editionId, uint256 maxSupply, Rarity rarity);
    event NFTMinted(uint256 tokenId, uint256 editionId, uint256 editionNumber);

    constructor() ERC721("MyNFT", "MNFT") {}

    function createEdition(
        uint256 maxSupply,
        Rarity rarity,
        string memory baseURI
    ) external returns (uint256) {
        _editionIds++;
        uint256 editionId = _editionIds;
        
        Edition storage edition = editions[editionId];
        edition.maxSupply = maxSupply;
        edition.currentSupply = 0;
        edition.rarity = rarity;
        edition.isFirstEdition = editionId == 1;
        edition.baseURI = baseURI;
        
        emit EditionCreated(editionId, maxSupply, rarity);
        return editionId;
    }

    function mintEdition(uint256 editionId) external returns (uint256) {
        Edition storage edition = editions[editionId];
        require(edition.maxSupply > 0, "Edition does not exist");
        require(edition.currentSupply < edition.maxSupply, "Edition sold out");
        
        edition.currentSupply++;
        uint256 tokenId = uint256(keccak256(abi.encodePacked(editionId, edition.currentSupply)));
        require(!edition.tokenExists[tokenId], "Token ID already exists");
        
        edition.tokenExists[tokenId] = true;
        tokenEditions[tokenId] = editionId;
        
        _safeMint(msg.sender, tokenId);
        emit NFTMinted(tokenId, editionId, edition.currentSupply);
        
        return tokenId;
    }

    function getEditionDetails(uint256 editionId) external view returns (
        uint256 maxSupply,
        uint256 currentSupply,
        Rarity rarity,
        bool isFirstEdition,
        string memory baseURI
    ) {
        Edition storage edition = editions[editionId];
        return (
            edition.maxSupply,
            edition.currentSupply,
            edition.rarity,
            edition.isFirstEdition,
            edition.baseURI
        );
    }

    function getTokenEditionNumber(uint256 tokenId) external view returns (uint256, uint256) {
        uint256 editionId = tokenEditions[tokenId];
        Edition storage edition = editions[editionId];
        return (editionId, edition.currentSupply);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return "";
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        uint256 editionId = tokenEditions[tokenId];
        return editions[editionId].baseURI;
    }
}