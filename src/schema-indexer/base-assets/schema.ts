import { IERC20, setWeb3Instance, web3 } from "@defi.org/web3-candies";
import { IContract, ISchema, IWeb3 } from "../interfaces";

function iweb3() {
  return web3() as any as IWeb3;
}

export class Schema implements ISchema {
  c: IContract;

  constructor(public token: IERC20) {
    this.c = iweb3().Contract(token.abi.toString(), token.address);
  }

  async onInit() {}

  async onBlock(blockNumber: number) {
    if (!await this.c.hasStateChanges()) return;

    const events = await this.c.getEvents("Transfer");
    if (events.length == 0) return;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      console.log(event.returnValues)
      throw new Error("")
    } 
  }

  async onDone() {}
}
