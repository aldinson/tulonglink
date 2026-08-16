import { createApp } from "./app.js";
import { connectDb } from "./db/mongoose.js";
import { env } from "./config/env.js";

async function main(): Promise<void> {
  await connectDb();
  const app = createApp();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`TulongLink API listening on :${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
