import { Utils } from "web3-utils";

// main interface of the schema class
export interface ISchema {
  // runs once on init of the schema before travesing over blocks
  onInit(web3: IWeb3, rawData: IData): Promise<void>;
  // runs once on every block (consecutive)
  onBlock(blockNumber: number): Promise<void>;
  // runs once when the schema is complete after all blocks
  onDone(): Promise<void>;
}

// mimic web3 api to query various things about the current block
export interface IWeb3 {
  // create a contract instance for doing calls and getting events
  Contract(jsonAbi: string, address: string): IContract;
  // read the current block header
  getBlock(): Promise<Block | null>;
  // standard web3 utility functions (https://web3js.readthedocs.io/en/v1.4.0/web3-utils.html)
  utils: Utils;
}

// mimic web3 api for a contract instance
export interface IContract {
  // get events emitted in the current block
  getEvents(event?: string): Promise<Event[]>;
  // is the available (already deployed) in the current block
  isDeployed(): Promise<boolean>;
  // did the contract change its storage state in the current block
  hasStateChanges(): Promise<boolean>;
  // get a storage slot in this contract in the current block
  getStorageAt(position: number | string): Promise<string>;
  // get the code for the contract in the current block (assuming it was deployed already)
  getCode(): Promise<string>;
  // will be populated automatically with all available methods according to the abi
  methods: { [name: string]: (...inputs: any[]) => ICallable };
}

// mimic web3 api for a method allowing to call it
export interface ICallable {
  // call the method
  call(options?: CallOptions): Promise<CallResult>;
}

// block header
export interface Block {
  // block number
  number: number;
  // block hash in hex
  hash: string;
  // block timestamp in seconds since the epoch
  timestamp: number;
  // the address of the miner of the block (coinbase)
  miner: string;
  // difficulty of the block
  difficulty: string;
  // total gas limit in this block
  gasLimit: number;
}

// event or log
export interface Event {
  // decoded output values according to the abi
  returnValues: {};
  raw: {
    // raw data that was emitted
    data: string;
    // raw topics that were emitted (with topic0 removed)
    topics: string[];
    // raw topic0 (which identifies which event this is)
    topic0: string;
  };
  // decoded event name according to the abi
  event?: string;
  // the contract address that emitted this event
  address?: string;
}

// options for when making a call
export interface CallOptions {
  // optional address of the caller (default is 0x1111111111111111111111111111111111111111)
  from?: string;
  // can we save time by faking the caller account (ETH balance and nonce) instead of fetching its real content
  fakeFromAccount?: boolean;
  // optionally return a detailed result with gas statistics and emitted logs
  detailedResult?: boolean;
  // optionally set a gas limit for the call
  gas?: number;
}

export type CallResult = any;

// returned call result when detailedResult is true
export interface DetailedCallResult {
  // decoded output values according to the abi, ["0"] is the first output
  returnValues: {};
  // any logs that were emitted during this call
  logs: Event[];
  // gas used by this call
  gasUsed: string;
  // gas left from the original caller gas limit
  gasLeft?: string;
  // total gas refunds made during this call (by deleting data)
  gasRefund?: string;
}

// low level api to query the raw data source directly, normally not used
export interface IData {
  // instruct the engine to track all state changes in contracts, required when running calls
  trackState(): void;
  // instruct the engine to handle EIP2929 accurately with gas costs
  calcAccurateGas(): void;
  // get the latest block number available in raw data (hopefully the tip of the chain)
  getLatestBlockNumber(): Promise<number>;
  // stream block headers one by one until the block number is reached
  findHeaderForBlock(blockNumber: number): Promise<Buffer[]>;
  // stream contract records one by one until the block number is reached
  findContractsForBlock(shard: string, blockNumber: number): Promise<Buffer[]>;
  // have we seen contract records for this address so far
  isTrackedContract(address: string): boolean;
  // get the storage value for a state key in the current block
  getContractState(address: string, stateKey: string): Buffer;
  // get the contract code in the current block
  getContractCode(address: string): Buffer;
  // get the contract ETH balance in the current block
  getContractBalance(address: string): Buffer;
  // getter for calcAccurateGas
  isCalcAccurateGas(): boolean;
}
