import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

const envProjectPath = "./.env";
const envRelativePath = "../../.env";

if (existsSync(envProjectPath)) {
  config({ path: resolve(__dirname, envRelativePath) });
}
