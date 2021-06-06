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
  abstract trackState(): void;
  abstract getLatestBlockNumber(): Promise<number>;
  abstract findHeaderForBlock(blockNumber: number): Promise<Buffer[]>;
  abstract findContractsForBlock(shard: string, blockNumber: number): Promise<Buffer[]>;
  abstract isTrackedContract(address: string): boolean;
  abstract getContractState(address: string, stateKey: string): Buffer;
  abstract getContractCode(address: string): Buffer;
  abstract getContractBalance(address: string): Buffer;
}

export abstract class IContract {
  abstract getEvents(event?: string): Promise<Event[]>;
  abstract isDeployed(): Promise<boolean>;
  abstract hasStateChanges(): Promise<boolean>;
  abstract getStorageAt(position: number | string): Promise<string>;
  abstract getCode(): Promise<string>;
  abstract methods: { [name: string]: (...inputs: any[]) => ICallable };
}

export abstract class ICallable {
  abstract call(options?: CallOptions): Promise<CallResult>;
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

export interface CallOptions {
  from?: string;
  fakeFromAccount?: boolean;
}

export type CallResult = any;
