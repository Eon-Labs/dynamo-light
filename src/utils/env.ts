import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

const envProjectPath = "./.env.dynamo.light";
const envRelativePath = "../../.env.dynamo.light";

if (existsSync(envProjectPath)) {
  config({ path: resolve(__dirname, envRelativePath) });
}
