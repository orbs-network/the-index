import * as fs from "fs";
import { Perf } from "../perf";
import { processSchema } from "../processor";
import { LocalTestData } from "./data";

async function main() {
  console.log(process.argv);
  const schemaName = process.argv[2];
  let schemaArguments;
  try {
    schemaArguments = JSON.parse(process.argv[3]) || {};
  } catch (e) {
    schemaArguments = {};
  }
  if (!schemaName) {
    console.log("Usage: test-schema <name>");
    console.log(" name: blocks|events|calls|calls-detailed|storage|code|fast-holders");
    console.log("");
    process.exit(0);
  }

  const jsFilePath = `${__dirname}/schemas/${schemaName}.js`;
  if (!fs.existsSync(jsFilePath)) {
    console.error("ERROR: Invalid schema, see usage for available test schemas.", jsFilePath);
    process.exit(0);
  }

  const perf = new Perf();
  const data = new LocalTestData(process.env.THE_INDEX_DATA_DIR || `${__dirname}/data`, perf);

  console.log(`Processing schema:\n${jsFilePath}\n args ${schemaArguments}`);
  await processSchema(jsFilePath, data, perf, schemaArguments);

  perf.report();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
