import { ISchema } from "../interfaces";
import { IToken } from "./interfaces";
import { bn, to6, zero } from "@defi.org/web3-candies";
import Level from "level";

export class TokenReceiversSchema implements ISchema {
  temp = {} as any;

  decimals = zero;

  constructor(public db: Level.LevelDB, public token: IToken) {}

  async onInit() {
    this.decimals = bn(await this.token.methods.decimals().call());
  }

  async onBlock(blockNumber: number) {
    if (blockNumber % 1e5 == 0) console.log("block", blockNumber);
    if (!(await this.token.hasStateChanges())) return;

    const transfers = await this.token.getEvents("Transfer");
    if (transfers.length == 0) return;

    for (const event of transfers) {
      const { to, value } = event.returnValues as any;
      const amount: number = to6(value, this.decimals).toNumber();
      if (amount > 0) this.temp[to] += amount;
    }
  }

  async onDone() {
    console.log(await this.db.put(`TokenReceivers-${this.token.name}`, this.temp));
  }

  async output() {}
}
