import { rlp } from "ethereumjs-util";
import * as fs from "fs";
import bn from "bn.js";

async function main() {
  const blob = process.argv[2];
  if (!blob) {
    console.log('Usage: rlp-read <blob>');
    console.log(' blob: cursor|blocks|accounts|contracts17');
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
  if (blob == 'cursor') {
    console.log(`  "BlockNumber": ${toInt(data[0])},`);
    console.log(`  "Time": ${toInt(data[1])},`);
  }
  if (blob.startsWith('blocks')) {
    console.log(`  "BlockNumber": ${toInt(data[0])},`);
    console.log(`  "Time": ${toInt(data[1])},`);
    console.log(`  "Hash": "${toHex(data[2])}",`);
    console.log(`  "Coinbase": "${toHex(data[3])}",`);
    console.log(`  "Difficulty": ${toInt(data[4])},`);
    console.log(`  "GasLimit": ${toInt(data[5])},`);
  }
  if (blob.startsWith('accounts')) {
    console.log(`  "BlockNumber": ${toInt(data[0])},`);
    console.log('  "Changes": [');
    for (const account of data[1]) {
      console.log('    {');
      console.log(`      "Address": "${toHex(account[0])}",`);
      console.log(`      "Balance": ${toInt(account[1])},`);
      console.log(`      "CodeHash": "${toHex(account[2])}",`);
      console.log('    },');
    }
    console.log('  ],');
  }
  if (blob.startsWith('contracts')) {
    console.log(`  "BlockNumber": ${toInt(data[0])},`);
    console.log('  "Contracts": [');
    for (const contract of data[1]) {
      console.log('    {');
      console.log(`      "Address": "${toHex(contract[0])}",`);
      console.log('      "Logs": [');
      for (const log of contract[1]) {
        console.log('        "Topics": [');
        for (const topic of log[0]) {
          console.log(`          "${toHex(topic)}",`);
        }
        console.log('        ],');
        console.log(`        "Data": "${toHex(log[1])}",`);
      }
      console.log('      ],');
      console.log(`      "Code": "${toHex(contract[2])}",`);
      console.log('      "States": [');
      for (const state of contract[3]) {
        console.log('        {');
        console.log(`          "Key": "${toHex(state[0])}",`);
        console.log(`          "Value": "${toHex(state[1])}",`);
        console.log('        },');
      }
      console.log('      ],');
      if (contract[4].length > 0) {
        console.log(`      "Balance": ${toInt(contract[4][0])},`);
      }
      console.log('    },');
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

function toHex(obj: Buffer): string {
  return `0x${obj.toString('hex')}`;
}

function toInt(obj: Buffer): string {
  return new bn(`${obj.toString('hex')}`, 16).toString();
}