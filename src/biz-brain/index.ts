import { Service } from '@liquidmetal-ai/raindrop-framework';
import { Env } from './raindrop.gen';

export default class extends Service<Env> {
  async fetch(request: Request): Promise<Response> {
    // AI interface available as this.env.AI
    const result = await this.env.AI.run(
      'gpt-oss-20b',
      {
        model: 'gpt-oss-20b',
        messages: [{ role: "user", content: "Hello, AI!" }]
      }
    );

    return new Response(result.choices?.[0]?.message?.content || 'No response from AI');
  }
}