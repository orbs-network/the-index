import { erc20s, setWeb3Instance } from "@defi.org/web3-candies";
import { Perf } from "../perf";
import { Processor } from "../processor";
import { LocalTestData } from "../test/data";
import { TokenReceiversSchema } from "./token-receivers";
import { itoken } from "./interfaces";
import Level from "level";

async function main() {
  const perf = new Perf();
  const data = new LocalTestData(process.env.THE_INDEX_DATA_DIR || `/data/rlp`, perf);
  const runner = new Processor(data, perf);

  setWeb3Instance(runner);

  const db = Level("the-index-zlotin");

  const token = erc20s.eth.WBTC();

  const schema = new TokenReceiversSchema(db, itoken(token));

  /**
   * Start Indexing!
   */
  await runner.run(schema);
  perf.report();

  /**
   * output
   */
  await schema.output();

  // const read = promisify(db.zrevrangebyscore).bind(db);
  // const res = await read(erc20s.eth.WBTC().name, bn6("100").toString(10), ether.toString(10));
}

function json(args: any) {
  try {
    return JSON.parse(args) || {};
  } catch (e) {
    return {};
  }
}

main().catch(console.error);
