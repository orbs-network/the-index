import { ISchema } from "../interfaces";
import { IToken } from "./interfaces";

export class Schema implements ISchema {
  constructor(public token: IToken) {}

  async onInit() {}

  async onBlock(blockNumber: number) {
    if (blockNumber % 1e5 == 0) console.log("block", blockNumber);

    if (!(await this.token.hasStateChanges())) return;

    const events = await this.token.getEvents("Transfer");
    if (events.length == 0) return;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      console.log(event);
    }
  }

  async onDone() {}
}
