import * as dotenv from 'dotenv';
import { httpServer } from './http_server/index.js';
import GameWebsocketServer from './websocket-server/index.js';

dotenv.config();

const HTTP_PORT = Number(process.env.PORT) || 8181;
httpServer.listen(HTTP_PORT);
console.log(`Start http server on the ${HTTP_PORT} port!`);

const WS_PORT = Number(process.env.PORT) || 3000;
const server = new GameWebsocketServer(WS_PORT);
console.log(`Start websocket server on the ${WS_PORT} port!`);

