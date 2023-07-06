import { WebSocketServer } from 'ws';

export const createWebsocketServer = (port: number) =>
    new WebSocketServer({
        port,
    });
