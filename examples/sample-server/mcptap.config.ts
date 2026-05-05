import { defineConfig } from 'mcptap';

export default defineConfig({
  slug: 'sample-server',
  server: {
    command: 'node',
    args: ['./server.mjs'],
  },
  tests: [
    {
      name: 'lists expected tools',
      assert: async (server) => {
        const tools = await server.listTools();
        const names = tools.map((t) => t.name).sort();
        if (names.join(',') !== 'add,echo') {
          throw new Error(`expected ['add','echo'], got [${names.join(',')}]`);
        }
      },
    },
    {
      name: 'echo returns the input text',
      assert: async (server) => {
        const result = await server.callTool('echo', { text: 'hello' });
        const first = result.content[0];
        if (!first || first.type !== 'text' || first.text !== 'hello') {
          throw new Error(`expected echo to return 'hello', got: ${JSON.stringify(result)}`);
        }
      },
    },
    {
      name: 'tool surface snapshot',
      snapshot: true,
      run: async (server) => {
        const tools = await server.listTools();
        return tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        }));
      },
    },
    {
      name: 'add tool result snapshot',
      snapshot: true,
      run: async (server) => server.callTool('add', { a: 7, b: 8 }),
    },
  ],
});
