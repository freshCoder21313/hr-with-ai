import type { Plugin, Connect, ViteDevServer } from 'vite';
import { IncomingMessage, ServerResponse } from 'http';

// Helper to parse body
const parseBody = (req: IncomingMessage): Promise<any> => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
};

export const localApiPlugin = (): Plugin => ({
  name: 'local-api-server',
  configureServer(server: ViteDevServer) {
    server.middlewares.use('/api/sync', async (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
      try {
         // Use ssrLoadModule to handle TS files and HMR
         const apiModule = await server.ssrLoadModule('./api/sync.ts');
         const handler = apiModule.default;

         // Mock Vercel Request
         const body = await parseBody(req);
         const protocol = (req as any).protocol || 'http';
         const host = req.headers.host || 'localhost';
         const url = new URL(req.url || '', `${protocol}://${host}`);
         const query = Object.fromEntries(url.searchParams.entries());

         const vercelReq: any = {
             ...req,
             body,
             query,
             cookies: {}, 
             headers: req.headers,
             method: req.method,
         };

         // Mock Vercel Response
         const vercelRes: any = {
             status: (code: number) => {
                 res.statusCode = code;
                 return vercelRes;
             },
             json: (data: any) => {
                 res.setHeader('Content-Type', 'application/json');
                 res.end(JSON.stringify(data));
                 return vercelRes;
             },
             setHeader: (name: string, value: string) => {
                 res.setHeader(name, value);
                 return vercelRes;
             },
             end: (data: any) => res.end(data),
         };

         await handler(vercelReq, vercelRes);

      } catch (err) {
          console.error('Local API Error:', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal Server Error', details: String(err) }));
      }
    });
  }
});
