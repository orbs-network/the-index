import * as fs from "fs";
import { IData } from "../interfaces";
import { toNumber, cursorParser, blockParser, contractsForBlockParser, decodeFromStream } from "../parser";

export class LocalTestData implements IData {
  protected blocksBlockNumber = 0;
  protected blocksBuffer = Buffer.alloc(0);
  protected blocksChunk = 0;

  protected contractsBlockNumberByShard: { [shard: string]: number } = {};
  protected contractsBufferByShard: { [shard: string]: Buffer } = {};
  protected contractsChunkByShard: { [shard: string]: number } = {};

  constructor(protected dataPath: string) {}

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
        const decoded = decodeFromStream(this.blocksBuffer);
        const data = decoded.data as Buffer[];
        if (data.length == 0) return [];
        this.blocksBlockNumber = toNumber(blockParser.getBlockNumber(data));
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
    if (this.contractsBlockNumberByShard[shard] == undefined) {
      this.contractsBlockNumberByShard[shard] = 0;
      this.contractsBufferByShard[shard] = Buffer.alloc(0);
      this.contractsChunkByShard[shard] = 0;
    }
    while (this.contractsBlockNumberByShard[shard] <= blockNumber) {
      // decode existing memory buffer as stream
      while (this.contractsBufferByShard[shard].length > 0) {
        const decoded = decodeFromStream(this.contractsBufferByShard[shard]);
        const data = decoded.data as Buffer[];
        if (data.length == 0) return [];
        this.contractsBlockNumberByShard[shard] = toNumber(contractsForBlockParser.getBlockNumber(data));
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
