import _ from "lodash";
import abiDefault, { AbiCoder } from "web3-eth-abi";
import { AbiItem } from "web3-utils";
import { ISchema, IData, IWeb3, IContract, Block, Event } from "./interfaces";
import {
  toNumber,
  toHexString,
  blockParser,
  toDecString,
  contractsForBlockParser,
  contractParser,
  logParser,
  toBuffer,
} from "./parser";
import { Perf } from "./perf";
const abiCoder = abiDefault as unknown as AbiCoder;

export async function processSchema(schemaJsPath: string, data: IData, perf: Perf) {
  const Schema = require(schemaJsPath);
  const schema = new Schema() as ISchema;
  const processor = new Processor(schema, data, perf);
  await processor.run();
}

class Processor implements IWeb3 {
  protected currentBlockNumber: number = 0;
  protected latestBlockNumber: number = 0;

  constructor(protected schema: ISchema, protected data: IData, protected perf: Perf) {}

  async run() {
    /**/ this.perf.start("all");
    if (this.schema.onInit) {
      /**/ this.perf.start("init");
      await this.schema.onInit(this, this.data);
      /**/ this.perf.end("init");
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
    /**/ this.perf.end("all");
  }

  // web3 interface

  Contract(jsonAbi: string, address: string): IContract {
    return new (class {
      protected abi: AbiItem[];
      protected abiEventsByName: { [event: string]: AbiItem };
      protected abiEventsByTopic0: { [topic0: string]: AbiItem };
      protected eventTopic0BufferByName: { [event: string]: Buffer };
      protected shard: string;
      protected addressAsBuffer;

      constructor(protected processor: Processor, jsonAbi: string | AbiItem[], protected address: string) {
        if (typeof jsonAbi == "string") this.abi = JSON.parse(jsonAbi);
        else this.abi = jsonAbi;
        this.abiEventsByName = _.keyBy(
          _.filter(this.abi, (abiItem: AbiItem) => abiItem.type == "event"),
          "name"
        );
        this.abiEventsByTopic0 = _.keyBy(
          _.filter(this.abi, (abiItem: AbiItem) => abiItem.type == "event"),
          (abiItem: AbiItem) => abiCoder.encodeEventSignature(abiItem)
        );
        this.eventTopic0BufferByName = _.mapValues(this.abiEventsByName, (abiItem: AbiItem) =>
          toBuffer(abiCoder.encodeEventSignature(abiItem))
        );
        this.shard = address.substr(2, 2).toLowerCase();
        this.addressAsBuffer = toBuffer(address);
      }

      async getEvents(event?: string): Promise<Event[]> {
        // prepare filters
        let filterTopic0 = false;
        let filterTopic0Buffer = Buffer.alloc(0);
        if (event) {
          filterTopic0 = true;
          if (this.abiEventsByName[event]) {
            filterTopic0Buffer = this.eventTopic0BufferByName[event];
          }
        }

        // go over all contract records in this block
        const res: Event[] = [];
        /**/ this.processor.perf.start("findContractsForBlock");
        const contractsForBlock = await this.processor.data.findContractsForBlock(
          this.shard,
          this.processor.currentBlockNumber
        );
        /**/ this.processor.perf.end("findContractsForBlock");
        if (contractsForBlock.length == 0) return [];
        const contracts = contractsForBlockParser.getContracts(contractsForBlock);
        for (const contract of contracts) {
          if (this.addressAsBuffer.equals(contractParser.getAddress(contract))) {
            const logs = contractParser.getLogs(contract);
            for (const log of logs) {
              const topics = logParser.getTopics(log);
              if (topics.length == 0) continue;
              if (filterTopic0 && !filterTopic0Buffer.equals(topics[0])) continue;

              // add the log to results
              /**/ this.processor.perf.start("parseLogForOutput");
              const abiEvent = this.abiEventsByTopic0[toHexString(topics[0])];
              if (!abiEvent) continue;
              const abiEventInputs = abiEvent.inputs || [];
              const dataAsString = toHexString(logParser.getData(log));
              const topicsAsStrings = _.map(topics.slice(1), (topic: Buffer) => toHexString(topic));
              abiCoder.decodeLog(abiEventInputs, dataAsString, topicsAsStrings);
              const decodedLog = abiCoder.decodeLog(abiEventInputs, dataAsString, topicsAsStrings);
              /**/ this.processor.perf.end("parseLogForOutput");
              res.push({
                returnValues: decodedLog,
                raw: {
                  data: dataAsString,
                  topics: topicsAsStrings,
                },
                event: abiEvent.name,
              });
            }
          }
        }
        return res;
      }
    })(this, jsonAbi, address);
  }

  async getBlock(): Promise<Block | null> {
    /**/ this.perf.start("findHeaderForBlock");
    const block = await this.data.findHeaderForBlock(this.currentBlockNumber);
    /**/ this.perf.end("findHeaderForBlock");
    if (block.length == 0) return null;
    /**/ this.perf.start("parseBlockForOutput");
    const res = {
      number: toNumber(blockParser.getBlockNumber(block)),
      hash: toHexString(blockParser.getHash(block)),
      timestamp: toNumber(blockParser.getTime(block)),
      miner: toHexString(blockParser.getCoinbase(block)),
      difficulty: toDecString(blockParser.getDifficulty(block)),
      gasLimit: toNumber(blockParser.getGasLimit(block)),
    };
    /**/ this.perf.end("parseBlockForOutput");
    return res;
  }
}
