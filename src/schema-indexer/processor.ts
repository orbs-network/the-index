import _ from "lodash";
import BN from "bn.js";
import VM from "@ethereumjs/vm";
import EthereumJsBlockchain from "@ethereumjs/blockchain";
import { EIP2929StateManager as EthereumJsStateManager } from "@ethereumjs/vm/dist/state/interface";
import { AccessList as EthereumJsAccessList } from "@ethereumjs/tx";
import { Address as EthereumJsAddress } from "ethereumjs-util/dist/address";
import { Account as EthereumJsAccount } from "ethereumjs-util/dist/account";
import { Block as EthereumJsBlock } from "@ethereumjs/block/dist/block";
import { StorageDump as EthereumJsStorageDump } from "@ethereumjs/vm/dist/state/interface";
import abiDefault, { AbiCoder } from "web3-eth-abi";
import web3Utils, { AbiItem } from "web3-utils";
import {
  ISchema,
  IData,
  IWeb3,
  IContract,
  ICallable,
  Block,
  Event,
  CallOptions,
  CallResult,
  DetailedCallResult,
} from "./interfaces";
import {
  toNumber,
  toHexString,
  blockParser,
  toDecString,
  contractsForBlockParser,
  contractParser,
  logParser,
  toBuffer,
  toBN,
} from "./parser";
import { Perf } from "./perf";
import { EVMResult } from "@ethereumjs/vm/dist/evm/evm";
const abiCoder = abiDefault as unknown as AbiCoder;

export async function processSchema(schemaJsPath: string, data: IData, perf: Perf, schemaArguments: object) {
  const Schema = require(schemaJsPath);
  const schema = new Schema(schemaArguments) as ISchema;
  const processor = new Processor(schema, data, perf);
  await processor.run();
}

class Processor implements IWeb3 {
  protected currentBlockNumber: number = 0;
  protected latestBlockNumber: number = 0;
  protected vm: VM;

  constructor(protected schema: ISchema, protected data: IData, protected perf: Perf) {
    // TODO: pass common: Common to support custom chains like bsc
    this.vm = new VM({
      stateManager: this.stateManager,
      blockchain: this.blockchain,
    });
  }

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
  utils = web3Utils;

  Contract(jsonAbi: string, address: string): IContract {
    return new (class {
      protected abi: AbiItem[];
      protected abiEventsByName: { [event: string]: AbiItem };
      protected abiEventsByTopic0: { [topic0: string]: AbiItem };
      protected abiMethodsByName: { [method: string]: AbiItem };
      protected eventTopic0BufferByName: { [event: string]: Buffer };
      protected shard: string;
      protected addressAsBuffer: Buffer;
      protected addressForEthereumJs: EthereumJsAddress;
      readonly defaultCaller: EthereumJsAddress;

      methods: { [name: string]: (...inputs: any[]) => ICallable };

      constructor(protected processor: Processor, jsonAbi: string | AbiItem[], protected address: string) {
        if (!address.startsWith("0x")) throw new Error("Address does not start with 0x.");
        if (address.length != 42) throw new Error("Address must be a 20 byte hex string.");

        // parse abi
        if (typeof jsonAbi == "string") this.abi = JSON.parse(jsonAbi);
        else this.abi = jsonAbi;
        // index abi
        this.abiEventsByName = _.keyBy(
          _.filter(this.abi, (abiItem: AbiItem) => abiItem.type == "event"),
          "name"
        );
        this.abiEventsByTopic0 = _.keyBy(
          _.filter(this.abi, (abiItem: AbiItem) => abiItem.type == "event"),
          (abiItem: AbiItem) => abiCoder.encodeEventSignature(abiItem)
        );
        this.abiMethodsByName = _.keyBy(
          _.filter(this.abi, (abiItem: AbiItem) => abiItem.type == "function" || abiItem.constant == true),
          "name"
        );
        this.eventTopic0BufferByName = _.mapValues(this.abiEventsByName, (abiItem: AbiItem) =>
          toBuffer(abiCoder.encodeEventSignature(abiItem))
        );
        const self = this;
        this.methods = _.mapValues(this.abiMethodsByName, (abiItem: AbiItem) => {
          return (...inputs: any[]) =>
            new (class {
              async call(options?: CallOptions): Promise<CallResult> {
                return await self.callMethod(abiItem, options || {}, inputs);
              }
            })();
        });
        // other inits
        this.shard = address.substr(2, 2).toLowerCase();
        this.addressAsBuffer = toBuffer(address);
        this.address = address.toLowerCase();
        this.addressForEthereumJs = new EthereumJsAddress(this.addressAsBuffer);
        this.defaultCaller = EthereumJsAddress.fromString("0x1111111111111111111111111111111111111111");
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
        // TODO: more filters

        // go over all contract records in this block
        const res: Event[] = [];
        /**/ this.processor.perf.start("findContractsForBlock");
        const contractsForBlock = await this.processor.data.findContractsForBlock(
          this.shard,
          this.processor.currentBlockNumber
        );
        /**/ this.processor.perf.end("findContractsForBlock");
        if (contractsForBlock.length == 0) return [];

        // parse the records
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
              const topic0AsString = toHexString(topics[0]);
              const abiEvent = this.abiEventsByTopic0[topic0AsString];
              if (!abiEvent) throw new Error(`Assertion! unexpected topic 0 ${topic0AsString}.`);
              const abiEventInputs = abiEvent.inputs || [];
              const dataAsString = toHexString(logParser.getData(log));
              const topicsAsStrings = _.map(topics.slice(1), (topic: Buffer) => toHexString(topic));
              const decodedLog = abiCoder.decodeLog(abiEventInputs, dataAsString, topicsAsStrings);
              /**/ this.processor.perf.end("parseLogForOutput");
              res.push({
                returnValues: decodedLog,
                raw: {
                  data: dataAsString,
                  topics: topicsAsStrings,
                  topic0: topic0AsString,
                },
                event: abiEvent.name,
              });
            }
          }
        }
        return res;
      }

      async isDeployed(): Promise<boolean> {
        // process all blocks until this one
        /**/ this.processor.perf.start("findContractsForBlock");
        await this.processor.data.findContractsForBlock(this.shard, this.processor.currentBlockNumber);
        /**/ this.processor.perf.end("findContractsForBlock");

        const value = this.processor.data.getContractCode(this.address);
        return value.length > 0;
      }

      async getCode(): Promise<string> {
        // process all blocks until this one
        /**/ this.processor.perf.start("findContractsForBlock");
        await this.processor.data.findContractsForBlock(this.shard, this.processor.currentBlockNumber);
        /**/ this.processor.perf.end("findContractsForBlock");

        const value = this.processor.data.getContractCode(this.address);
        if (value.length == 0) return "";
        return toHexString(value);
      }

      async getStorageAt(position: number | string): Promise<string> {
        let stateKey = "";
        if (typeof position == "string") {
          if (!position.startsWith("0x")) throw new Error("Position does not start with 0x.");
          if (position.length != 66) throw new Error("Position must be a 32 byte hex string.");
          stateKey = position.toLowerCase();
        }
        // TODO: handle number

        // process all blocks until this one
        /**/ this.processor.perf.start("findContractsForBlock");
        await this.processor.data.findContractsForBlock(this.shard, this.processor.currentBlockNumber);
        /**/ this.processor.perf.end("findContractsForBlock");

        const value = this.processor.data.getContractState(this.address, stateKey);
        if (value.length == 0) return "";
        return toHexString(value);
      }

      async callMethod(abiItem: AbiItem, options: CallOptions, inputs: any[]): Promise<CallResult> {
        // make sure contract is deployed (this will also process all blocks and warm up the contract account)
        if (!(await this.isDeployed())) {
          throw new Error(`Contract ${this.address} is not deployed, avoid an exception by calling isDeployed().`);
        }

        // make sure we are on the correct hard fork
        /**/ this.processor.perf.start("setHardforkByBlockNumber");
        this.processor.vm._common.setHardforkByBlockNumber(this.processor.currentBlockNumber);
        /**/ this.processor.perf.end("setHardforkByBlockNumber");

        // prepare the call
        const caller = options.from ? EthereumJsAddress.fromString(options.from) : this.defaultCaller;
        /**/ this.processor.perf.start("encodeFunctionCall");
        const data = abiCoder.encodeFunctionCall(abiItem, inputs);
        const dataAsBuffer = toBuffer(data);
        /**/ this.processor.perf.end("encodeFunctionCall");

        // prepare the state manager
        this.processor.stateManager.clearTransientData();
        this.processor.stateManager.clearFakeAccounts();
        if (!options.from || options.fakeFromAccount) {
          this.processor.stateManager.addFakeAccount(caller.toString());
        }

        // call ethereumjs vm
        /**/ this.processor.perf.start("vm.runCall");
        const vmResult = await this.processor.vm.runCall({
          to: this.addressForEthereumJs,
          caller: caller,
          origin: caller, // The tx.origin is also the caller here
          data: dataAsBuffer,
          gasLimit: options.gas ? new BN(options.gas) : undefined,
        });
        /**/ this.processor.perf.end("vm.runCall");

        // parse the result
        // TODO: handle exceptions and reverts
        /**/ this.processor.perf.start("parseCallResultForOutput");
        let res: any = null;
        const returnValue = vmResult.execResult.returnValue;
        let decodedResult;
        if (abiItem.outputs && abiItem.outputs.length > 0) {
          decodedResult = abiCoder.decodeParameters(abiItem.outputs, toHexString(returnValue));
          if (abiItem.outputs.length == 1) res = decodedResult["0"];
          else res = decodedResult;
        }
        if (options.detailedResult) {
          res = this.parseDetailedCallResult(decodedResult || {}, vmResult);
        }
        /**/ this.processor.perf.end("parseCallResultForOutput");

        return res;
      }

      parseDetailedCallResult(returnValues: any, vmResult: EVMResult): DetailedCallResult {
        const res: DetailedCallResult = {
          returnValues,
          logs: [],
          gasUsed: vmResult.gasUsed.toString(),
          gasLeft: vmResult.execResult.gas?.toString() || "",
          gasRefund: vmResult.execResult.gasRefund?.toString() || "",
        };
        if (vmResult.execResult.logs) {
          for (const log of vmResult.execResult.logs) {
            const logContractAddress = log[0];
            const topic0AsString = toHexString(log[1][0]);
            const dataAsString = toHexString(log[2]);
            const topicsAsStrings = _.map(log[1].slice(1), (topic: Buffer) => toHexString(topic));
            const event: Event = {
              returnValues: {},
              raw: {
                data: dataAsString,
                topics: topicsAsStrings,
                topic0: topic0AsString,
              },
              address: toHexString(logContractAddress),
            };
            // enrich events from this contract further
            if (logContractAddress.equals(this.addressAsBuffer) && this.abiEventsByTopic0[topic0AsString]) {
              const abiEvent = this.abiEventsByTopic0[topic0AsString];
              const abiEventInputs = abiEvent.inputs || [];
              const decodedLog = abiCoder.decodeLog(abiEventInputs, dataAsString, topicsAsStrings);
              event.event = abiEvent.name;
              event.returnValues = decodedLog;
            }
            res.logs.push(event);
          }
        }
        return res;
      }

      async hasStateChanges(): Promise<boolean> {
        // go over all contract records in this block
        /**/ this.processor.perf.start("findContractsForBlock");
        const contractsForBlock = await this.processor.data.findContractsForBlock(
          this.shard,
          this.processor.currentBlockNumber
        );
        /**/ this.processor.perf.end("findContractsForBlock");
        if (contractsForBlock.length == 0) return false;

        // parse the records
        const contracts = contractsForBlockParser.getContracts(contractsForBlock);
        for (const contract of contracts) {
          if (this.addressAsBuffer.equals(contractParser.getAddress(contract))) {
            const states = contractParser.getStates(contract);
            if (states.length > 0) return true;
            const balance = contractParser.getBalance(contract);
            if (balance.length > 0) return true;
          }
        }
        return false;
      }
    })(this, jsonAbi, address);
  }

  async getBlock(): Promise<Block | null> {
    /**/ this.perf.start("findHeaderForBlock");
    const block = await this.data.findHeaderForBlock(this.currentBlockNumber);
    /**/ this.perf.end("findHeaderForBlock");
    if (block.length == 0) return null;

    // parse the block
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

  // adapter for ethereumjs vm
  stateManager = new (class implements EthereumJsStateManager {
    protected fakeAccounts: { [address: string]: boolean };
    protected transientAccounts: { [address: string]: EthereumJsAccount };
    protected transientState: { [address: string]: { [stateKey: string]: Buffer } };
    protected warmedAccounts: { [address: string]: boolean }; // needed for EIP2929StateManager

    constructor(protected processor: Processor) {
      this.fakeAccounts = {};
      this.transientAccounts = {};
      this.transientState = {};
      this.warmedAccounts = {};
    }

    clearFakeAccounts() {
      this.fakeAccounts = {};
    }

    addFakeAccount(address: string) {
      this.fakeAccounts[address.toLowerCase()] = true;
    }

    clearTransientData() {
      this.transientAccounts = {};
      this.transientState = {};
    }

    // ethereumjs interface

    copy(): EthereumJsStateManager {
      throw new Error("Not implemented.");
    }

    async getAccount(address: EthereumJsAddress): Promise<EthereumJsAccount> {
      const addressAsString = address.toString();
      if (this.transientAccounts[addressAsString]) {
        // found in our transient cache, return it
        return this.transientAccounts[addressAsString];
      } else {
        // not found in our transient cache, fetch it

        // we can avoid fetching fake accounts
        if (this.fakeAccounts[addressAsString]) {
          const newFakeAccount = new EthereumJsAccount();
          newFakeAccount.balance.iadd(new BN("100000000000000000000")); // 100 ETH
          return newFakeAccount;
        }

        // tracked contracts have their balances well known
        if (this.processor.data.isTrackedContract(addressAsString)) {
          const balanceAsBuffer = this.processor.data.getContractBalance(addressAsString);
          const contractAccount = new EthereumJsAccount();
          contractAccount.balance = toBN(balanceAsBuffer);
          // TODO: do we need to set the other account fields?
          return contractAccount;
        }

        // no choice, we have to fetch it from data
        throw new Error("Not implemented.");
      }
    }

    async putAccount(address: EthereumJsAddress, account: EthereumJsAccount): Promise<void> {
      const addressAsString = address.toString();
      this.transientAccounts[addressAsString] = account;
    }

    async deleteAccount(address: EthereumJsAddress): Promise<void> {
      const addressAsString = address.toString();
      delete this.transientAccounts[addressAsString];
    }

    touchAccount(address: EthereumJsAddress): void {
      throw new Error("Not implemented.");
    }

    async putContractCode(address: EthereumJsAddress, value: Buffer): Promise<void> {
      throw new Error("Not implemented.");
    }

    async getContractCode(address: EthereumJsAddress): Promise<Buffer> {
      const addressAsString = address.toString();
      const code = this.processor.data.getContractCode(addressAsString);
      if (code.length > 0) return code;
      else throw new Error("Assertion! vm.getContractCode called for a non deployed contract.");
    }

    async getContractStorage(address: EthereumJsAddress, key: Buffer): Promise<Buffer> {
      const addressAsString = address.toString();
      const keyAsString = toHexString(key);
      const transientValue = this.transientState[addressAsString]?.[keyAsString];
      if (transientValue) return transientValue;
      return this.processor.data.getContractState(addressAsString, keyAsString);
    }

    async getOriginalContractStorage(address: EthereumJsAddress, key: Buffer): Promise<Buffer> {
      throw new Error("Not implemented.");
    }

    async putContractStorage(address: EthereumJsAddress, key: Buffer, value: Buffer): Promise<void> {
      const addressAsString = address.toString();
      const keyAsString = toHexString(key);
      if (!this.transientState[addressAsString]) this.transientState[addressAsString] = {};
      this.transientState[addressAsString][keyAsString] = value;
    }

    async clearContractStorage(address: EthereumJsAddress): Promise<void> {
      throw new Error("Not implemented.");
    }

    async checkpoint(): Promise<void> {
      // currently all calls are readonly so we don't need to implement anything here
    }

    async commit(): Promise<void> {
      // currently all calls are readonly so we don't need to implement anything here
    }

    async revert(): Promise<void> {
      // forget all transient changes
      this.clearTransientData();
      this.clearWarmedAccounts();
    }

    async getStateRoot(force?: boolean): Promise<Buffer> {
      throw new Error("Not implemented.");
    }

    async setStateRoot(stateRoot: Buffer): Promise<void> {
      throw new Error("Not implemented.");
    }

    async dumpStorage(address: EthereumJsAddress): Promise<EthereumJsStorageDump> {
      throw new Error("Not implemented.");
    }

    async hasGenesisState(): Promise<boolean> {
      throw new Error("Not implemented.");
    }

    async generateCanonicalGenesis(): Promise<void> {
      throw new Error("Not implemented.");
    }

    async generateGenesis(initState: any): Promise<void> {
      throw new Error("Not implemented.");
    }

    async accountIsEmpty(address: EthereumJsAddress): Promise<boolean> {
      throw new Error("Not implemented.");
    }

    async accountExists(address: EthereumJsAddress): Promise<boolean> {
      throw new Error("Not implemented.");
    }

    async cleanupTouchedAccounts(): Promise<void> {
      throw new Error("Not implemented.");
    }

    clearOriginalStorageCache(): void {
      throw new Error("Not implemented.");
    }

    addWarmedAddress(address: Buffer): void {
      if (!this.processor.data.isCalcAccurateGas()) return;
      const addressAsString = toHexString(address);
      this.warmedAccounts[addressAsString] = true;
    }

    isWarmedAddress(address: Buffer): boolean {
      if (!this.processor.data.isCalcAccurateGas()) return false;
      const addressAsString = toHexString(address);
      return !!this.warmedAccounts[addressAsString];
    }

    addWarmedStorage(address: Buffer, slot: Buffer): void {
      if (!this.processor.data.isCalcAccurateGas()) return;
      const addressAsString = toHexString(address);
      const slotAsString = toHexString(slot);
      this.warmedAccounts[addressAsString + "-" + slotAsString] = true;
    }

    isWarmedStorage(address: Buffer, slot: Buffer): boolean {
      if (!this.processor.data.isCalcAccurateGas()) return false;
      const addressAsString = toHexString(address);
      const slotAsString = toHexString(slot);
      return !!this.warmedAccounts[addressAsString + "-" + slotAsString];
    }

    clearWarmedAccounts(): void {
      this.warmedAccounts = {};
    }

    generateAccessList?(
      addressesRemoved: EthereumJsAddress[],
      addressesOnlyStorage: EthereumJsAddress[]
    ): EthereumJsAccessList {
      throw new Error("Not implemented.");
    }
  })(this);

  // adapter for ethereumjs vm
  blockchain = new (class extends EthereumJsBlockchain {
    constructor(protected processor: Processor) {
      super();
    }

    // ethereumjs interface

    async getBlock(hash: Buffer): Promise<EthereumJsBlock> {
      throw new Error("Not implemented.");
    }
  })(this);
}
