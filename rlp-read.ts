import { rlp } from "ethereumjs-util";
import * as fs from "fs";

async function main() {
  const buffer = fs.readFileSync(`${process.env.HOME}/go/src/github.com/orbs-network/the-index-go-ethereum/the-index/blocks.rlp`);

  let result: any = rlp.decode(buffer, true);
  printRlpAsHex(result);

  while (result.remainder.length != 0) {
    result = rlp.decode(result.remainder, true);
    printRlpAsHex(result);
  }
}

function printRlpAsHex(b: any) {
  console.log(`0x${b.data.toString("hex")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
