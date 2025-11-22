import { Service } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';

type MessageRole = "user" | "system" | "assistant";

interface Message {
  role: MessageRole;
  content: string;
}

interface RequestBody {
  prompt?: string;
  messages?: Message[];
}

export default class extends Service<Env> {
  async fetch(request: Request): Promise<Response> {
    try {
      // Parse the incoming request body to get the user's prompt
      const body = await request.json() as RequestBody;
      
      // Support both simple prompt and full messages array
      const messages: Message[] = body.messages || [{ role: "user", content: body.prompt || "Hello, AI!" }];

      // AI interface available as this.env.AI
      const result = await this.env.AI.run(
        'gpt-oss-20b',
        {
          model: 'gpt-oss-20b',
          messages
        }
      );

      return new Response(
        JSON.stringify({
          response: result.choices?.[0]?.message?.content || 'No response from AI',
          model: 'gpt-oss-20b'
        }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request. Please send JSON with "prompt" field or "messages" array.' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}