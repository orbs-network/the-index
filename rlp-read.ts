import { rlp } from "ethereumjs-util";
import * as fs from "fs";

async function main() {
  const buffer = fs.readFileSync(`${process.env.HOME}/go/src/github.com/orbs-network/the-index-go-ethereum/blob.rlp`);

  let result: any = rlp.decode(buffer, true);
  console.dir(rlpToHex(result));

  while (result.remainder.length != 0) {
    result = rlp.decode(result.remainder, true);
    console.dir(rlpToHex(result));
  }
}

function rlpToHex(b: any) {
  return `0x${b.data.toString("hex")}`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
