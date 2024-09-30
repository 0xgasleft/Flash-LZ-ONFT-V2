const {ethers, network} = require("hardhat");
const {Options} = require("@layerzerolabs/lz-v2-utilities");


const MAX_SUPPLY = 50;

const LZ_CONFIG = {
  "shimmer": {
    "asset": "SMR",
    "endpoint": "0x148f693af10ddfaE81cDdb36F4c93B31A90076e1",
    "eid": 30230,
    "startIndex": 0,
    "deployment": "",
    "dvns": ["0x9bdf3ae7e2e3d211811e5e782a808ca0a75bf1fc"],
    "sendLib": "0xD4a903930f2c9085586cda0b11D9681EECb20D2f",
    "receiveLib": "0xb21f945e8917c6Cd69FcFE66ac6703B90f7fe004",
  },
  "iota": {
    "asset": "IOTA",
    "endpoint": "0x1a44076050125825900e736c501f859c50fE728c",
    "eid": 30284,
    "startIndex": 50,
    "deployment": "",
    "dvns": ["0x6788f52439aca6bff597d3eec2dc9a44b8fee842"],
    "sendLib": "0xC39161c743D0307EB9BCc9FEF03eeb9Dc4802de7",
    "receiveLib": "0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043"
  }
}



const TOKEN_ID_TO_BE_SENT = 0;




const filterCurrentNetwork = () => {

const otherNetwork = Object.keys(LZ_CONFIG).filter(key => key != network.name)[0];

  return LZ_CONFIG[otherNetwork];
}

const deploy = async () => {

  console.log(`Deploying on ${network.name}`);
  
  const flash = await ethers.deployContract(
                                            "Flash", 
                                            [
                                              LZ_CONFIG[network.name].endpoint,
                                              MAX_SUPPLY,
                                              LZ_CONFIG[network.name].startIndex
                                            ]
                                          );

  await flash.deployed();

  console.log(`Flash contract deployed on ${network.name} at: ${flash.address}`);
  return flash.address;
}

const trustEachOther = async (flashInstance) => {

  console.log("Getting other network info..");
  const otherNetwork = filterCurrentNetwork();

  console.log(`Applying set peers on ${network.name}`);
  const receipt = await flashInstance.setPeer(otherNetwork.eid, 
                                              ethers.utils.zeroPad(
                                                                  otherNetwork.deployment, 
                                                                  32
                                            ));
  console.log("Peer set!");
}


const configureItGlobally = async (flashInstance) => {

  console.log("Getting other network info..");
  const otherNetwork = filterCurrentNetwork();

  console.log("Building enforced options struct..");
  const enforcedOptions = craftEnforcedOptions(otherNetwork.eid);

  console.log(enforcedOptions);
  console.log(`Configuring flash contract on ${network.name}`);
  const txResp = await flashInstance.setEnforcedOptions(enforcedOptions);
  await txResp.wait();
  
  console.log("Configuration set!");

}

const craftEnforcedOptions = (_eid) => {

  const GAS_LIMIT = 1000000; // Gas limit for the executor
  const MSG_VALUE = 0; // msg.value for the lzReceive() function on destination in wei

  const _options = Options.newOptions().addExecutorLzReceiveOption(GAS_LIMIT, MSG_VALUE);
  return [[
    _eid,
    1,
    _options.toHex()
  ]];

}

const setDVNs = async () => {

  console.log("Getting other network info..");
  const otherNetwork = filterCurrentNetwork();
  
  const ulnConfig = {
    confirmations: 15, 
    requiredDVNCount: 1, 
    optionalDVNCount: 0,
    optionalDVNThreshold: 0, 
    requiredDVNs: [...LZ_CONFIG[network.name].dvns],
    optionalDVNs: [],
  };

  const signer = (await ethers.getSigners())[0];
  
  console.log("Crafting DVN configuration..");
  const endpointAbi = [
    'function setConfig(address oappAddress, address sendLibAddress, tuple(uint32 eid, uint32 configType, bytes config)[] setConfigParams) external',
  ];
  const endpointContract = new ethers.Contract(LZ_CONFIG[network.name].endpoint, endpointAbi, signer);

  const configTypeUlnStruct =
    'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)';
  const encodedUlnConfig = ethers.utils.defaultAbiCoder.encode([configTypeUlnStruct], [ulnConfig]);

  const setConfigParamUln = {
    eid: otherNetwork.eid,
    configType: 2,
    config: encodedUlnConfig,
  };

  console.log("DVN config: ");
  console.log(setConfigParamUln);
  console.log("Sending inbound DVN config transaction");
  
  let tx = await endpointContract.setConfig(
    LZ_CONFIG[network.name].deployment,
    LZ_CONFIG[network.name].receiveLib,
    [setConfigParamUln]
  );

  let receipt = await tx.wait();
  console.log(`Inbound DVN config set successful at: ${receipt.transactionHash}`);

  console.log("Sending outbound DVN config transaction");
  
  tx = await endpointContract.setConfig(
    LZ_CONFIG[network.name].deployment,
    LZ_CONFIG[network.name].sendLib,
    [setConfigParamUln]
  );

  receipt = await tx.wait();
  console.log(`Outbound DVN config set successful at: ${receipt.transactionHash}`);

}

const quoteIt = async (flashInstance, _tokenID) => {
  const signer = (await ethers.getSigners())[0];
  
  console.log("Getting other network info..");
  const otherNetwork = filterCurrentNetwork();

  console.log("Estimating how much it would cost to send a Flash token..");
  
  const sendParams = [
    otherNetwork.eid,
    ethers.utils.hexZeroPad(
      signer.address, 
      32
    ),
    _tokenID,
    "0x",
    "0x",
    "0x"
  ];
  console.log(sendParams);

  const quote = await flashInstance.quoteSend(sendParams, false);
  console.log(`Quote result: ${ethers.utils.formatEther(quote.nativeFee)} ${LZ_CONFIG[network.name].asset}`);

  return {sp: sendParams, fee: quote.nativeFee};

}

const getFlashInstance = async () => {
  console.log(`Connecting with flash instance at ${LZ_CONFIG[network.name].deployment} on ${network.name}`);
  return await ethers.getContractAt("Flash", LZ_CONFIG[network.name].deployment);
}

const sendFlash = async (flashInstance, _tokenID) => {
  const signer = (await ethers.getSigners())[0];

  console.log(`Approving Flash token with id ${_tokenID} to be transfered..`);
  const abi = new ethers.utils.AbiCoder();
  const data = abi.encode(["address", "uint"], [LZ_CONFIG[network.name].deployment, _tokenID]).slice(2);
  const sigHash = ethers.utils.id("approve(address,uint256)").slice(0, 10);
  const approvalReceipt = await signer.sendTransaction({to: LZ_CONFIG[network.name].deployment, data: sigHash + data});
  await approvalReceipt.wait();

  console.log("Quoting for send call..");
  const quote = await quoteIt(flashInstance, _tokenID);

  const txResp = await flashInstance.send(quote.sp, [quote.fee, 0], signer.address, {value: quote.fee});
  await txResp.wait();

  console.log(`Sent from ${network.name} with tx hash: ${txResp.hash} !`);

}

async function main() {

  // DEPLOYING
  await deploy();

  //const flashInstance = await getFlashInstance();
  
  // SETTING PEERS
  //await trustEachOther(flashInstance);

  // SETTING ENFORCED OPTIONS
  //await configureItGlobally(flashInstance);

  // CONFIGURE DVN
  //await setDVNs();

  //await quoteIt(flashInstance, TOKEN_ID_TO_BE_SENT);

  // SENDING 
  //await sendFlash(flashInstance, TOKEN_ID_TO_BE_SENT);

}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
