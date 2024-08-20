# Simple LayerZero ONFT V2
This project demonstrates a basic implementation of LayerZero ONFT V2 built manually without Hardhat Tasks and minimal automation.

This implementation is built based on a particular by default connected pathway on testnet which is:
Sepolia <-> Arbitrum Sepolia

- ONFT NAME: FLASH
- ONFT SYMBOL: FLS
- ONFT SUPPLY: 100


# Technical requirements (tested on):
- Node.js v18.9
- Hardhat v2.17.0
- Hardhat toolbox v2.0.2


# Required configuration:
- Fill .env local file with 3 fields:
    + PK: private key of a wallet funded with ETH in Sepolia and Arbitrum Sepolia/
    + SEPOLIA_RPC: sepolia rpc url.
    + ARBITRUM_SEPOLIA_RPC: arbitrum sepolia rpc url.
- Run `npm i` to install node packages.


# Steps to use:

## First step: DEPLOYMENT EXECUTION
- run: `npx hardhat run scripts/onft.js --network sepolia` and collect deployment address from terminal.
- then: - run: `npx hardhat run scripts/onft.js --network arbsepolia` and collect deployment address from terminal.


## Second step: DEPLOYMENT CONFIGURATION
- In onft.js, fill LZ_CONFIG sepolia and arbitrum 'deployment' field with previously collected corresponding addresses.


## Third step: SETTING PEERS
- In onft.js, comment line `await deploy();`.
- Then uncomment: `const flashInstance = await getFlashInstance();` and `await trustEachOther(flashInstance);` .
- Save and run:
    + `npx hardhat run scripts/onft.js --network sepolia`
    + `npx hardhat run scripts/onft.js --network arbsepolia`

## Fourth step: SETTING ENFORCED OPTIONS
- In onft.js, comment line `await trustEachOther(flashInstance);`.
- Then uncomment: `await configureItGlobally(flashInstance);` .
- Save and run:
    + `npx hardhat run scripts/onft.js --network sepolia`
    + `npx hardhat run scripts/onft.js --network arbsepolia`

## Fifth step: SENDING CROSS CHAIN
- In onft.js, comment line `await configureItGlobally(flashInstance);`.
- Then uncomment: `await sendFlash(flashInstance, TOKEN_ID_TO_BE_SENT);`.
- In onft.js, change line: `const TOKEN_ID_TO_BE_SENT = 0;` with the token ID you want to send.
- Make sure the token ID you configured exists on the local chain (has been minted).
- Save and run:
    + To send ONFT from Sepolia -> ARB Sepolia: `npx hardhat run scripts/onft.js --network sepolia`
    + To send ONFT from ARB Sepolia -> Sepolia: `npx hardhat run scripts/onft.js --network arbsepolia`
- You're finally done!
 