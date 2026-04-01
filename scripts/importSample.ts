import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { importDataset } from "../lib/importService";

async function main() {
  const filePath = join(process.cwd(), "public", "samples", "sample-accreditation.csv");
  const contents = await readFile(filePath);
  const buffer = contents.buffer.slice(contents.byteOffset, contents.byteOffset + contents.byteLength);
  const result = await importDataset("sample-accreditation.csv", "text/csv", buffer);
  console.log(result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
