import { IERC20, web3 } from "@defi.org/web3-candies";
import { IContract, IWeb3 } from "../interfaces";
import Web3 from "web3";

export function itoken(_t: any) {
  return _t as IToken;
}

export function iweb3() {
  return web3() as Web3 & IWeb3;
}

export type IToken = IERC20 & IContract;
