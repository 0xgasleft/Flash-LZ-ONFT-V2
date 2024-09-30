require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config({ path: __dirname + '/.env' });


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.22",
  networks: {
    shimmer: {
      url: process.env.SHIMMER_RPC,
      accounts: [process.env.PK]
    },
    iota: {
      url: process.env.IOTA_RPC,
      accounts: [process.env.PK]
    }

  }
};
