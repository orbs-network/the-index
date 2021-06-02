import { rlp } from "ethereumjs-util";
import * as fs from "fs";
import { IData } from "../interfaces";
import { toNumber, cursorParser, blockParser } from "../parser";

export class LocalTestData implements IData {
  constructor(protected dataPath: string) {}

  protected currentBlocksBuffer = Buffer.alloc(0);
  protected currentBlocksChunk = 0;

  async getLatestBlockNumber(): Promise<number> {
    const buffer = this.readFile("cursor");
    if (buffer == null) return 0;
    const decoded = rlp.decode(buffer as rlp.Input, true) as rlp.Decoded;
    const data = decoded.data as Buffer[];
    if (data.length == 0) return 0;
    return toNumber(cursorParser.getBlockNumber(data));
  }

  async findNextBlock(blockNumber: number, latestBlockNumber: number): Promise<Buffer[]> {
    if (blockNumber > latestBlockNumber) return [];
    while (true) {
      // decode existing memory buffer as stream
      while (this.currentBlocksBuffer.length > 0) {
        const decoded = rlp.decode(this.currentBlocksBuffer as rlp.Input, true) as rlp.Decoded;
        const data = decoded.data as Buffer[];
        this.currentBlocksBuffer = decoded.remainder;
        if (data.length == 0) return [];
        if (blockNumber == toNumber(blockParser.getBlockNumber(data))) {
          return data;
        }
      }
      // stream is complete, load next chunk
      const nextChunk = this.currentBlocksChunk + 1;
      const buffer = this.readChunkFile("blocks", nextChunk);
      if (buffer == null) return [];
      this.currentBlocksBuffer = buffer;
      this.currentBlocksChunk = nextChunk;
    }
  }

  readFile(name: string): Buffer | null {
    const filePath = `${this.dataPath}/${name}.rlp`;
    return fs.readFileSync(filePath);
  }

  readChunkFile(name: string, chunk: number): Buffer | null {
    const filePath = `${this.dataPath}/${name}-${chunk.toString().padStart(5, "0")}.rlp`;
    return fs.readFileSync(filePath);
  }
}
