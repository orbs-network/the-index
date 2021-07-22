import { erc20s, setWeb3Instance } from "@defi.org/web3-candies";
import { Perf } from "../perf";
import { Processor } from "../processor";
import { LocalTestData } from "../test/data";
import { Schema } from "./schema";
import { itoken } from "./interfaces";

async function main() {
  const perf = new Perf();
  const data = new LocalTestData(process.env.THE_INDEX_DATA_DIR || `/data/rlp`, perf);
  const runner = new Processor(data, perf);

  setWeb3Instance(runner);

  const schema = new Schema(itoken(erc20s.eth.WBTC()), 8);

  await runner.run(schema);

  perf.report();
}

function json(args: any) {
  try {
    return JSON.parse(args) || {};
  } catch (e) {
    return {};
  }
}

main().catch(console.error);
