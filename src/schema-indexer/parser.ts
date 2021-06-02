import bn from "bn.js";

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

export function toNumber(buffer: Buffer): number {
  return Number(`0x${buffer.toString("hex")}`);
}

export function toHexString(buffer: Buffer): string {
  return `0x${buffer.toString("hex")}`;
}

export function toDecString(buffer: Buffer): string {
  return new bn(`${buffer.toString("hex")}`, 16).toString();
}
