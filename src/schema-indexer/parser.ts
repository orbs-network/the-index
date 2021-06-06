import BN from "bn.js";
import { rlp } from "ethereumjs-util";

// record parsers

export class cursorParser {
  static getBlockNumber(data: Buffer[]): Buffer {
    return data[0];
  }
  static getTime(data: Buffer[]): Buffer {
    return data[1];
  }
}

export class blockParser {
  static getBlockNumber(data: Buffer[]): Buffer {
    return data[0];
  }
  static getTime(data: Buffer[]): Buffer {
    return data[1];
  }
  static getHash(data: Buffer[]): Buffer {
    return data[2];
  }
  static getCoinbase(data: Buffer[]): Buffer {
    return data[3];
  }
  static getDifficulty(data: Buffer[]): Buffer {
    return data[4];
  }
  static getGasLimit(data: Buffer[]): Buffer {
    return data[5];
  }
}

export class contractsForBlockParser {
  static getBlockNumber(data: Buffer[]): Buffer {
    return data[0];
  }
  static getContracts(data: Buffer[]): Buffer[][] {
    return data[1] as unknown as Buffer[][];
  }
}

export class contractParser {
  static getAddress(data: Buffer[]): Buffer {
    return data[0];
  }
  static getLogs(data: Buffer[]): Buffer[][] {
    return data[1] as unknown as Buffer[][];
  }
  static getCode(data: Buffer[]): Buffer {
    return data[2];
  }
  static getStates(data: Buffer[]): Buffer[][] {
    return data[3] as unknown as Buffer[][];
  }
  static hasBalance(data: Buffer[]): boolean {
    return data[4].length > 0;
  }
  static getBalance(data: Buffer[]): Buffer {
    if (data[4].length == 0) return emptyBuffer;
    else return (data[4] as unknown as Buffer[])[0];
  }
}

export class logParser {
  static getTopics(data: Buffer[]): Buffer[] {
    return data[0] as unknown as Buffer[];
  }
  static getData(data: Buffer[]): Buffer {
    return data[1];
  }
}

export class stateParser {
  static getKey(data: Buffer[]): Buffer {
    return data[0];
  }
  static getValue(data: Buffer[]): Buffer {
    return data[1];
  }
}

// utility functions

export interface Decoded {
  data: Buffer | Buffer[];
  remainder: Buffer;
}

export function decodeFromStream(buffer: Buffer): Decoded {
  return rlp.decode(buffer as rlp.Input, true) as rlp.Decoded;
}

export function toNumber(buffer: Buffer): number {
  return Number(`0x${buffer.toString("hex")}`);
}

export function toHexString(buffer: Buffer): string {
  return `0x${buffer.toString("hex")}`;
}

export function toDecString(buffer: Buffer): string {
  return new BN(`${buffer.toString("hex")}`, 16).toString();
}

export function toBN(buffer: Buffer): BN {
  if (buffer.length == 0) return new BN(0);
  return new BN(`${buffer.toString("hex")}`, 16);
}

export function toBuffer(hexString: string): Buffer {
  if (!hexString.startsWith("0x")) throw new Error("Hex string does not start with 0x.");
  return Buffer.from(hexString.slice(2), "hex");
}

export const emptyBuffer = Buffer.alloc(0);
