import * as fs from "fs";
import { Perf } from "../perf";
import { processSchema } from "../processor";
import { LocalTestData } from "./data";

async function main() {
  const schemaName = process.argv[2];
  if (!schemaName) {
    console.log("Usage: test-schema <name>");
    console.log(" name: blocks|events");
    console.log("");
    process.exit(0);
  }

  const jsFilePath = `${__dirname}/schemas/${schemaName}.js`;
  if (!fs.existsSync(jsFilePath)) {
    console.error("ERROR: Invalid schema, see usage for available test schemas.");
    process.exit(0);
  }

  const perf = new Perf();
  const data = new LocalTestData(`${__dirname}/data`, perf);

  console.log(`Processing schema:\n${jsFilePath}\n`);
  await processSchema(jsFilePath, data, perf);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
