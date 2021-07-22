import { IERC20 } from "@defi.org/web3-candies";
import { IContract } from "../interfaces";

export function itoken(_t: any) {
  return _t as IToken;
}

export type IToken = IERC20 & IContract;
