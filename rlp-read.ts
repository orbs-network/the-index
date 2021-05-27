import { rlp } from "ethereumjs-util";
import * as fs from "fs";

async function main() {
  const blob = process.argv[2];
  if (!blob) {
    console.log('Usage: rlp-read <blob>');
    console.log(' blob: blocks|contract-0xA5b27D06B81FF128f06e6B506E30a71e8230576C');
    console.log('');
    process.exit(0);
  }

  const buffer = fs.readFileSync(`${process.env.HOME}/go/src/github.com/orbs-network/the-index-go-ethereum/the-index/${blob}.rlp`);

  let result: any = rlp.decode(buffer, true);
  printRlp(result.data, blob);

  while (result.remainder.length != 0) {
    result = rlp.decode(result.remainder, true);
    printRlp(result.data, blob);
  }
}

function printRlp(data: any, blob: string) {
  console.log('{');
  if (blob == 'blocks') {
    console.log(`  "BlockNumber": "0x${data[0].toString('hex')}",`)
    console.log(`  "Time": "0x${data[1].toString('hex')}",`)
  }
  if (blob.startsWith('contract-')) {
    console.log(`  "BlockNumber": "0x${data[0].toString('hex')}",`)
    console.log('  "Logs": [');
    for (const log of data[1]) {
      console.log('    "Topics": [');
      for (const topic of log[0]) {
        console.log(`      "0x${topic.toString('hex')}",`)
      }
      console.log('    ],');  
      console.log(`    "Data": "0x${log[1].toString('hex')}",`)
    }
    console.log('  ],');
  }
  console.log('},');
  // console.dir(data, { depth: null });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
