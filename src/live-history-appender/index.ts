import Web3 from "web3";
import _ from "lodash";
import { bn, configFile } from "./utils";
import * as path from "path";
import { Config, EthereumClient } from "../ethereumjs/client";
import Common from "@ethereumjs/common";
const level = require("level");
const fs = require("fs-extra");

const root = path.resolve("./");
console.log("root", root);
const url = `https://eth-mainnet.alchemyapi.io/v2/${configFile().alchemyKey}`;
const web3 = new Web3(url);

async function main() {
  const chain = "mainnet";
  const common = new Common({ chain, hardfork: "chainstart" });

  const datadir = `${root}/datadir`;

  const config = new Config({
    common,
    syncmode: "full",
    datadir,
    loglevel: "info",
  });

  const chainDataDir = config.getChainDataDirectory();
  fs.ensureDirSync(chainDataDir);
  const stateDataDir = config.getStateDataDirectory();
  fs.ensureDirSync(stateDataDir);

  config.logger.info(`Data directory: ${config.datadir}`);

  config.logger.info("Initializing Ethereumjs client...");
  if (config.lightserv) {
    config.logger.info(`Serving light peer requests`);
  }
  const client = new EthereumClient({
    config,
    chainDB: level(chainDataDir),
    stateDB: level(stateDataDir),
  });

  const rootHash = Buffer.from("0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544", "hex");
  console.log("rootHash", rootHash.toString("hex"));
  // await config.vm?.blockchain.setHead("vm", )
  // await client.config.vm?.blockchain.setIteratorHead(
  //   "vm",
  //   new Buffer("0xd7f8974fb5ac78d9ac099b9ad5018bedc2ce0a72dad1827a1709da30580f0544", "hex")
  // );

  client.on("error", (err: any) => {
    config.logger.error(err);
    console.error(err);
  });
  client.on("listening", (details: any) => {
    config.logger.info(`Listener up transport=${details.transport} url=${details.url}`);
  });
  client.on("synchronized", () => {
    config.logger.info("Synchronized");
  });
  config.logger.info(`Connecting to network: ${config.chainCommon.chainName()}`);
  await client.open();
  config.logger.info("Synchronizing blockchain...");
  await client.start();

  // const client = new EthereumClient({ config }); // const config = new Config();
  //
  // await client.open();
  // await client.start();
  // await client.stop();

  process.on("SIGINT", async () => {
    console.log("stopping client");
    await client.stop();
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

async function blockFromAlchemy(n: number) {
  const block = await web3.eth.getBlock(n, true);

  return _.cloneDeepWith(block, (v) => {
    if (_.isString(v) && !_.startsWith(v, "0x")) {
      return web3.utils.toHex(v);
    }
  });
}
