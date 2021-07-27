import { ISchema } from "../interfaces";
import { IToken } from "./interfaces";
import { bn, to6, zero } from "@defi.org/web3-candies";
import fs from "fs-extra";

interface TokenReceiver {
  address: string;
  totalReceived: number;
}

export class TokenReceiversSchema implements ISchema {
  cache: Record<string, TokenReceiver> = {};

  decimals = zero;

  kdb = `TokenReceivers-${this.token.name}`;

  constructor(public token: IToken) {}

  async onInit() {}

  async onBlock(blockNumber: number) {
    if (blockNumber % 1e5 == 0) console.log("block", blockNumber);
    if (!(await this.token.isDeployed())) return;
    if (!(await this.token.hasStateChanges())) return;

    if (this.decimals == zero) {
      this.decimals = bn(await this.token.methods.decimals().call());
    }

    const transfers = await this.token.getEvents("Transfer");
    if (transfers.length == 0) return;

    for (const event of transfers) {
      const { from, to, value } = event.returnValues as any;
      const amount: number = to6(value, this.decimals).toNumber();

      if (amount > 0) {
        this.handleTransfer(to, value);
      }
    }
  }

  handleTransfer(address: string, value: number) {
    if (!this.cache[address]) this.cache[address] = { address, totalReceived: 0 };
    this.cache[address].totalReceived += value;
  }

  async onDone() {
    await fs.writeJson(this.dbPath(), this.cache);
  }

  async output() {
    this.cache = await fs.readJson(this.dbPath());
  }

  private dbPath() {
    return `./output/${this.kdb}`;
  }
}
