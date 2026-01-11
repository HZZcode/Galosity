import fs from 'fs';
import http from 'http';
import mime from 'mime-types';

import { filename } from '../arg-parser.js';
import { launch } from '../common.js';
import { configs } from '../configs.js';
import { handlers } from '../handlers.js';
import { logger } from '../logger.js';
import { WebHandlers } from './handlers.js';

const server = http.createServer(async (req, res) => {
    try {
        const url = req.url?.replace(/\/$/, '');
        if (req.method === 'POST' && url?.startsWith('/api')) {
            let body = '';
            const channel = url.replace(/^\/api\//, '');
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                logger.log(`Requesting ${url}, args ${body}`);
                try {
                    const args = (JSON.parse(body) as any[]).map(value => value === null ? undefined : value);
                    const result = await WebHandlers.handlers[channel](...args);
                    res.writeHead(200, { 'content-type': 'application/json' });
                    res.end(result === undefined ? '{}' : JSON.stringify(result));
                } catch (error) {
                    res.writeHead(404);
                    res.end(`Error: ${error}`);
                    // eslint-disable-next-line no-console
                    console.error(error);
                }
            });
        }
        else {
            const redirect = (location: string) => {
                res.writeHead(302, { location });
                res.end();
            };
            if (url === '') return redirect(configs.edit ? '/html/editor.html' : '/html/engine.html');
            if (url === '/editor') return redirect('/html/editor.html');
            if (url === '/engine') return redirect('/html/engine.html');
            const path = './' + url;
            const type = mime.contentType(path.split('/').at(-1)!) || 'application/octet-stream';
            const content = await fs.promises.readFile(path, 'utf-8');
            logger.log(`Requesting ${url}, type ${type}`);
            res.writeHead(200, { 'content-type': type });
            res.end(content, 'utf-8');
        }
    } catch (error) {
        res.writeHead(404);
        res.end(`Error: ${error}`);
        logger.error(error);
    }
});

async function start() {
    if (await launch()) return;

    handlers.add('get-data', () => ({ configs, filename }));

    const port = 3456;
    // eslint-disable-next-line no-console
    server.listen(port, () => console.log(`Server start on localhost:${port}`));
}

await start();