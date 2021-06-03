export abstract class ISchema {
  abstract onInit(web3: IWeb3, rawData: IData): Promise<void>;
  abstract onBlock(blockNumber: number): Promise<void>;
  abstract onDone(): Promise<void>;
}

export abstract class IWeb3 {
  abstract Contract(jsonAbi: string, address: string): IContract;
  abstract getBlock(): Promise<Block | null>;
}

export abstract class IData {
  abstract getLatestBlockNumber(): Promise<number>;
  abstract findHeaderForBlock(blockNumber: number): Promise<Buffer[]>;
  abstract findContractsForBlock(shard: string, blockNumber: number): Promise<Buffer[]>;
}

export abstract class IContract {
  abstract getEvents(event?: string): Promise<Event[]>;
}

export interface Block {
  number: number;
  hash: string;
  timestamp: number;
  miner: string;
  difficulty: string;
  gasLimit: number;
}

export interface Event {
  returnValues: {};
  raw: {
    data: string;
    topics: string[];
  };
  event?: string;
}
