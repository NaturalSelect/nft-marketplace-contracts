const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Market", function () {
  let usdt, market, nft, accountA, accountB;

  beforeEach(async () => {
    [accountA, accountB] = await ethers.getSigners();
    const USDT = await ethers.getContractFactory("cUSDT");
    usdt = await USDT.deploy();
    const MyNFT = await ethers.getContractFactory("NFTM");
    nft = await MyNFT.deploy(accountA.address);
    const Market = await ethers.getContractFactory("Market");
    market = await Market.deploy(usdt.target, nft.target);

    await nft.safeMint(accountB.address);
    await nft.safeMint(accountB.address);
    await usdt.approve(market.target, "1000000000000000000000000");
    await nft.connect(accountB).setApprovalForAll(accountA.address,true);
  });

it('its erc20 address should be usdt', async function() {
  expect(await market.erc20()).to.equal(usdt.target);
});

it('its erc721 address should be nft', async function() {
  expect(await market.erc721()).to.equal(nft.target);
});

it('accountB should have 2 nfts', async function() {
  expect(await nft.balanceOf(accountB.address)).to.equal(2);
});

it('accountA should have USDT', async function() {
  expect(await usdt.balanceOf(accountA.address)).to.equal("100000000000000000000000000");
});

it('accountA should have 0 nfts', async function() {
  expect(await nft.balanceOf(accountA.address)).to.equal(0);
});

it('accountB can list two nfts to market', async function() {
  const price = "0x0000000000000000000000000000000000000000000000000001c6bf52634000";
  expect(await nft['safeTransferFrom(address,address,uint256,bytes)']
  (accountB.address, market.target, 0, price)).to.emit(market, "NewOrder");
  expect(await nft['safeTransferFrom(address,address,uint256,bytes)']
  (accountB.address, market.target, 1, price)).to.emit(market, "NewOrder");

  expect(await nft.balanceOf(accountB.address)).to.equal(0);
  expect(await nft.balanceOf(market.target)).to.equal(2);
  // NOTE: b's nft run out, but market nft stil have 2
  expect(await market.isListed(0)).to.equal(true);
  expect(await market.isListed(1)).to.equal(true);

  expect(await market.getOrderLength()).to.equal(2);

  expect((await market.connect(accountB).getMyNFTs())[0][0]).to.equal(accountB.address);
  expect((await market.connect(accountB).getMyNFTs())[0][1]).to.equal(0);
  expect((await market.connect(accountB).getMyNFTs())[0][2]).to.equal(price);

})

it('accountB can unlist one nft from market', async function() {
  const price = "0x0000000000000000000000000000000000000000000000000001c6bf52634000";

  expect(await nft['safeTransferFrom(address,address,uint256,bytes)']
  (accountB.address,market.target, 0 , price)).to.emit(market,"NewOrder");
  expect(await nft['safeTransferFrom(address,address,uint256,bytes)']
  (accountB.address,market.target, 1 , price)).to.emit(market,"NewOrder");

  expect(await nft.balanceOf(accountB.address)).to.equal(0);
  expect(await nft.balanceOf(market.target)).to.equal(2);

  await market.connect(accountB).cancelOrder(0);

  expect(await market.isListed(0)).to.equal(false);
  expect(await market.isListed(1)).to.equal(true);

  expect(await market.getOrderLength()).to.equal(1);
})

it('accountB can change price of nft from market', async function() {
  const price = "0x0000000000000000000000000000000000000000000000000001c6bf52634000";
  expect(await nft['safeTransferFrom(address,address,uint256,bytes)']
  (accountB.address,market.target, 0 , price)).to.emit(market,"NewOrder");
  const newPrice = "0x0000000000000000000000000000000000000000000000000002c6bf52634000"
  await market.connect(accountB).changePrice(0,newPrice);
  expect((await market.connect(accountB).getMyNFTs())[0][2]).to.equal(newPrice);
})

it('accountA can buy nft from market', async function() {
  const price = "0x0000000000000000000000000000000000000000000000000001c6bf52634000";
  expect(await nft['safeTransferFrom(address,address,uint256,bytes)']
  (accountB.address,market.target, 0 , price)).to.emit(market,"NewOrder");
  const buyer = accountA.address;
  await market.buy(0);
  expect(await nft.ownerOf(0)).to.equal(buyer);
})
})