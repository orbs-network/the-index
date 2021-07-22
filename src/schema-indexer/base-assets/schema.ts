import { ISchema } from "../interfaces";
import { IToken } from "./interfaces";
import { createClient } from "redis";
import { promisify } from "util";
import { bn, zero } from "@defi.org/web3-candies";

export class Schema implements ISchema {
  db = createClient();
  dbGetSize = promisify(this.db.dbsize).bind(this.db);
  dbIncrement = promisify(this.db.zincrby).bind(this.db, this.token.name);
  dbSave = promisify(this.db.bgsave).bind(this.db);
  dbLastSave = promisify(this.db.lastsave).bind(this.db);
  decimalDiv = zero;

  constructor(public token: IToken) {}

  async onInit() {
    const decimals = bn(await this.token.methods.decimals().call());
    if (decimals.gtn(6)) this.decimalDiv = bn(10).pow(bn(6).sub(decimals));
    else this.decimalDiv = bn(1);
  }

  async onBlock(blockNumber: number) {
    if (blockNumber % 1e5 == 0) console.log("block", blockNumber);
    const dbSize = await this.dbGetSize();
    console.log("dbSize", dbSize);
    if (dbSize > 100) return;

    if (!(await this.token.hasStateChanges())) return;

    const events = await this.token.getEvents("Transfer");
    if (events.length == 0) return;

    for (const event of events) {
      const { to, value } = event.returnValues as any;
      const actor = to;
      const amount: number = bn(value).div(this.decimalDiv).toNumber();
      await this.dbIncrement(amount, actor);
    }
  }

  async onDone() {
    const r = await this.dbSave();
    console.dir(r);
    const l = await this.dbLastSave();
    console.dir(l);
  }
}
