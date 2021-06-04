import * as fs from "fs";
import { IData } from "../interfaces";
import {
  toNumber,
  cursorParser,
  blockParser,
  contractsForBlockParser,
  decodeFromStream,
  contractParser,
  toHexString,
  stateParser,
} from "../parser";
import { Perf } from "../perf";

export class LocalTestData implements IData {
  protected isTrackingState = false;

  protected blocksBlockNumber = 0;
  protected blocksBuffer = Buffer.alloc(0);
  protected blocksChunk = 0;

  protected contractsBlockNumberByShard: { [shard: string]: number } = {};
  protected contractsBufferByShard: { [shard: string]: Buffer } = {};
  protected contractsChunkByShard: { [shard: string]: number } = {};

  protected contractsStateByAddress: { [address: string]: { [stateKey: string]: Buffer } } = {};

  constructor(protected dataPath: string, protected perf: Perf) {}

  trackState(): void {
    this.isTrackingState = true;
  }

  async getLatestBlockNumber(): Promise<number> {
    const buffer = this.readFile("cursor");
    if (buffer == null) return 0;
    const decoded = decodeFromStream(buffer);
    const data = decoded.data as Buffer[];
    if (data.length == 0) return 0;
    return toNumber(cursorParser.getBlockNumber(data));
  }

  async findHeaderForBlock(blockNumber: number): Promise<Buffer[]> {
    while (this.blocksBlockNumber <= blockNumber) {
      // decode existing memory buffer as stream
      while (this.blocksBuffer.length > 0) {
        /**/ this.perf.start("block:decodeFromStream");
        const decoded = decodeFromStream(this.blocksBuffer);
        /**/ this.perf.end("block:decodeFromStream");
        const data = decoded.data as Buffer[];
        if (data.length == 0) return [];
        this.blocksBlockNumber = toNumber(blockParser.getBlockNumber(data));
        if (this.blocksBlockNumber > blockNumber) return [];
        if (this.blocksBlockNumber == blockNumber) {
          return data;
        }
        this.blocksBuffer = decoded.remainder;
      }
      // stream is complete, load next chunk from disk
      const nextChunk = this.blocksChunk + 1;
      const buffer = this.readChunkFile("blocks", nextChunk);
      if (buffer == null) return [];
      this.blocksBuffer = buffer;
      this.blocksChunk = nextChunk;
    }
    return [];
  }

  async findContractsForBlock(shard: string, blockNumber: number): Promise<Buffer[]> {
    // init properties
    if (this.contractsBlockNumberByShard[shard] == undefined) {
      this.contractsBlockNumberByShard[shard] = 0;
      this.contractsBufferByShard[shard] = Buffer.alloc(0);
      this.contractsChunkByShard[shard] = 0;
    }

    while (this.contractsBlockNumberByShard[shard] <= blockNumber) {
      // decode existing memory buffer as stream
      while (this.contractsBufferByShard[shard].length > 0) {
        /**/ this.perf.start("contracts:decodeFromStream");
        const decoded = decodeFromStream(this.contractsBufferByShard[shard]);
        /**/ this.perf.end("contracts:decodeFromStream");
        const data = decoded.data as Buffer[];
        if (data.length == 0) return [];
        this.contractsBlockNumberByShard[shard] = toNumber(contractsForBlockParser.getBlockNumber(data));
        // TODO: optimization: maybe track state changes only if contractsBlockNumber actually changed
        if (this.isTrackingState) this.trackStateChanges(contractsForBlockParser.getContracts(data));
        if (this.contractsBlockNumberByShard[shard] > blockNumber) return [];
        if (this.contractsBlockNumberByShard[shard] == blockNumber) {
          return data;
        }
        this.contractsBufferByShard[shard] = decoded.remainder;
      }
      // stream is complete, load next chunk from disk
      const nextChunk = this.contractsChunkByShard[shard] + 1;
      const buffer = this.readChunkFile(`contracts-${shard}`, nextChunk);
      if (buffer == null) return [];
      this.contractsBufferByShard[shard] = buffer;
      this.contractsChunkByShard[shard] = nextChunk;
    }
    return [];
  }

  getContractState(address: string, stateKey: string): Buffer {
    if (!this.isTrackingState) throw new Error("Not tracking state, run data.trackState().");
    const res = this.contractsStateByAddress[address]?.[stateKey];
    if (res) return res;
    else return Buffer.alloc(0);
  }

  trackStateChanges(contracts: Buffer[][]) {
    /**/ this.perf.start("trackStateChanges");
    for (const contract of contracts) {
      const states = contractParser.getStates(contract);
      if (states.length == 0) continue;
      const address = toHexString(contractParser.getAddress(contract));
      if (this.contractsStateByAddress[address] == undefined) {
        this.contractsStateByAddress[address] = {};
      }
      for (const state of states) {
        const key = toHexString(stateParser.getKey(state));
        const value = stateParser.getValue(state);
        this.contractsStateByAddress[address][key] = value;
      }
    }
    /**/ this.perf.end("trackStateChanges");
  }

  readFile(name: string): Buffer | null {
    const filePath = `${this.dataPath}/${name}.rlp`;
    let res = null;
    try {
      res = fs.readFileSync(filePath);
    } catch (e) {
      return null;
    }
    return res;
  }

  readChunkFile(name: string, chunk: number): Buffer | null {
    const filePath = `${this.dataPath}/${name}-${chunk.toString().padStart(5, "0")}.rlp`;
    let res = null;
    try {
      res = fs.readFileSync(filePath);
    } catch (e) {
      return null;
    }
    return res;
  }
}
