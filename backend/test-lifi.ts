import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "lifi-mcp"],
    env: { ...process.env, LIFI_API_KEY: "2bdd3fe7-af91-41c6-bb2c-28e063304e01.e09914b8-ab17-4e7c-90d5-2568e9c6f201" }
  });
  
  const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);
  
  const tools = await client.listTools();
  console.log("Tools:", JSON.stringify(tools, null, 2));
  
  process.exit(0);
}

main().catch(console.error);
