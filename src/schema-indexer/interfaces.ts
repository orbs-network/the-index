export abstract class ISchema {
  abstract onInit(web3: IWeb3, rawData: IData): Promise<void>;
  abstract onBlock(blockNumber: number): Promise<void>;
  abstract onDone(): Promise<void>;
}

export abstract class IWeb3 {
  abstract getBlock(): Promise<Block | null>;
}

export abstract class IData {
  abstract getLatestBlockNumber(): Promise<number>;
  abstract findNextBlock(blockNumber: number, latestBlockNumber: number): Promise<Buffer[]>;
}

export interface Block {
  number: number;
  hash: string;
  timestamp: number;
  miner: string;
  difficulty: string;
  gasLimit: number;
}
