import type { Plugin, Connect, ViteDevServer } from 'vite';
import { IncomingMessage, ServerResponse } from 'http';
import { VercelRequest, VercelResponse } from '@vercel/node';

// Helper to parse body
const parseBody = (req: IncomingMessage): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
};

export const localApiPlugin = (): Plugin => ({
  name: 'local-api-server',
  configureServer(server: ViteDevServer) {
    server.middlewares.use('/api/sync', async (req: Connect.IncomingMessage, res: ServerResponse, _next: Connect.NextFunction) => {
      try {
         // Use ssrLoadModule to handle TS files and HMR
         const apiModule = await server.ssrLoadModule('./api/sync.ts');
         const handler = apiModule.default;

         // Mock Vercel Request
         const body = await parseBody(req);
         const protocol = 'http';
         const host = req.headers.host || 'localhost';
         const url = new URL(req.url || '', `${protocol}://${host}`);
         const query = Object.fromEntries(url.searchParams.entries());

         const vercelReq = {
             ...req,
             body,
             query,
             cookies: {}, 
             headers: req.headers,
             method: req.method,
         } as VercelRequest;

         // Mock Vercel Response
         const vercelRes = {
             status: (code: number) => {
                 res.statusCode = code;
                 return vercelRes as unknown as VercelResponse;
             },
             json: (data: unknown) => {
                 res.setHeader('Content-Type', 'application/json');
                 res.end(JSON.stringify(data));
                 return vercelRes as unknown as VercelResponse;
             },
             setHeader: (name: string, value: string) => {
                 res.setHeader(name, value);
                 return vercelRes as unknown as VercelResponse;
             },
             end: (data: unknown) => res.end(data),
         } as unknown as VercelResponse;

         await handler(vercelReq, vercelRes);

      } catch (err) {
          console.error('Local API Error:', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal Server Error', details: String(err) }));
      }
    });
  }
});
