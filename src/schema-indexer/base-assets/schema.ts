import { ISchema } from "../interfaces";
import { IToken, iweb3 } from "./interfaces";

export class Schema implements ISchema {
  public db = [] as any[];

  constructor(public token: IToken) {}

  async onInit() {}

  async onBlock(blockNumber: number) {
    if (blockNumber % 1e5 == 0) console.log("block", blockNumber);
    if (this.db.length > 100) return;

    if (!(await this.token.hasStateChanges())) return;

    const events = await this.token.getEvents("Transfer");
    if (events.length == 0) return;

    for (const event of events) {
      const { from, to, value } = event.returnValues as any;
      const fromContract = await iweb3().eth.getCode(from);
      if (fromContract) {
        const actor = fromContract;
        const amount = value;

        this.db.push({
          blockNumber,
          actor,
          amount,
        });
      }
    }
  }

  async onDone() {
    console.dir(this.db);
  }
}

function sameAddress(a: string, b: string) {
  return a == b || a.toLowerCase() == b.toLowerCase();
}

function isContract(address: string) {}
