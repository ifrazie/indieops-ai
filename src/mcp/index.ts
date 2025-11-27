import { ActorState } from "@liquidmetal-ai/raindrop-framework";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Env } from './raindrop.gen.js';

export const implementation = {
  name: "indieops-mcp",
  version: "1.0.0",
}

export default (server: McpServer, env: Env, state: ActorState) => {
  server.registerTool("add",
    {
      title: "Addition Tool",
      description: "Add two numbers",
      inputSchema: {
        a: z.number(),
        b: z.number(),
      },
    },
    async ({ a, b }: { a: number; b: number }, { sendNotification }) => {
      await sendNotification({
        method: "notifications/message",
        params: {
          level: "info",
          data: "Addition operation is in progress...",
        },
      });
      // Simulate some processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { content: [{ type: "text", text: String(a + b) }] };
    });

  server.registerResource(
    "greeting",
    new ResourceTemplate("greeting://{name}", { 
      list: async () => {
        // Return a list of available greetings
        return {
          resources: [
            { uri: "greeting://World", name: "Default Greeting" },
            { uri: "greeting://Friend", name: "Friendly Greeting" },
            { uri: "greeting://Developer", name: "Developer Greeting" },
          ]
        };
      }
    }),
    {
      title: "Greeting Resource",
      description: "Dynamic greeting generator",
    },
    async (uri: URL, { name }, _extra) => {
      const greeting = {
        response: `Hello, ${name ?? "World"}!`,
      };
      return {
        contents: [{
          uri: uri.toString(),
          text: greeting.response || 'World',
        }]
      };
    }
  );
}
