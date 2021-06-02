import { ISchema, IData, IWeb3, Block } from "./interfaces";
import { toNumber, toHexString, blockParser, toDecString } from "./parser";

export async function processSchema(schemaJsPath: string, data: IData) {
  const Schema = require(schemaJsPath);
  const schema = new Schema() as ISchema;
  const processor = new Processor(schema, data);
  return processor.run();
}

class Processor implements IWeb3 {
  constructor(protected schema: ISchema, protected data: IData) {}

  protected currentBlockNumber: number = 0;
  protected latestBlockNumber: number = 0;

  async run() {
    if (this.schema.onInit) {
      await this.schema.onInit(this, this.data);
    }
    this.latestBlockNumber = await this.data.getLatestBlockNumber();
    for (this.currentBlockNumber = 1; this.currentBlockNumber <= this.latestBlockNumber; this.currentBlockNumber++) {
      if (this.schema.onBlock) {
        await this.schema.onBlock(this.currentBlockNumber);
      }
    }
    if (this.schema.onDone) {
      await this.schema.onDone();
    }
  }

  // web3 interface

  async getBlock(): Promise<Block | null> {
    const block = await this.data.findNextBlock(this.currentBlockNumber, this.latestBlockNumber);
    if (block.length == 0) return null;
    return {
      number: toNumber(blockParser.getBlockNumber(block)),
      hash: toHexString(blockParser.getHash(block)),
      timestamp: toNumber(blockParser.getTime(block)),
      miner: toHexString(blockParser.getCoinbase(block)),
      difficulty: toDecString(blockParser.getDifficulty(block)),
      gasLimit: toNumber(blockParser.getGasLimit(block)),
    };
  }
}
