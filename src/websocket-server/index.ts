import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import { PlayerApi } from '../features/player/api';

export enum CommandType {
    Reg = 'reg',
    UpdateWinners = 'update_winners',
    CreateRoom = 'create_room',
    UpdateRoom = 'update_room',
    AddUserToRoom = 'add_user_to_room',
    CreateGame = 'create_game',
    StartGame = 'start_game',
    AddShips = 'add_ships',
    Attack = 'attack',
    RandomAttack = 'randomAttack',
    Turn = 'turn',
    Finish = 'finish',
}

interface ValidRequest {
    type: string;
    data: unknown;
    id: number;
}

interface ConnectionData {
    user?: {
        name: string;
        password: string;
    };
}

export default class GameWebsocketServer {
    private server: WebSocketServer;

    constructor(
        port: number,
        private activeConnections = new Map<WebSocket, ConnectionData>(),
        private playerApi = new PlayerApi(),
    ) {
        this.server = new WebSocketServer({
            port,
        });

        this.server.on('connection', this.handleConnection.bind(this));
    }

    private handleConnection(websocket: WebSocket) {
        websocket.on('error', console.error);

        websocket.on('open', () => {
            this.activeConnections.set(websocket, {});
        });

        websocket.on('close', () => {
            this.activeConnections.delete(websocket);
        });

        websocket.on('message', (rawRequest) => {
            try {
                const request = this.unwrapRawRequest(rawRequest);

                const responseData = this.handleCommand(request.type, request.data, websocket);
                const response = this.createResponseJSON(request.type, responseData);

                console.log('Response', response);
                websocket.send(response);
            } catch (error) {
                console.log('Received: %s', JSON.parse(rawRequest.toString()));
                console.error(error);
            }
        });
    }

    private handleCommand(commandType: string, data: unknown, websocket: WebSocket) {
        if (commandType === CommandType.Reg) {
            const responseData = this.playerApi.login(data);

            if (!responseData.error) this.updateActiveUser(responseData, websocket);
            return responseData;
        }

        if (commandType === CommandType.CreateRoom) {
            return this.playerApi.login(data);
        }

        throw Error('Invalid command');
    }

    private createResponseJSON<D>(type: string, data: D) {
        return JSON.stringify({
            type,
            data: JSON.stringify(data),
            id: 0,
        });
    }

    private unwrapRawRequest(rawRequest: RawData): ValidRequest {
        const request = JSON.parse(rawRequest.toString());
        request.data = request.data.length > 0 ? JSON.parse(request.data) : {};
        console.log('Request', request);

        if (!this.isValidRequest) throw new Error('Invalid client request');

        return request;
    }

    private isValidRequest(request: unknown): request is ValidRequest {
        if (typeof request !== 'object' || request == null) return false;
        if (!('name' in request) || typeof request.name !== 'string') return false;
        if (!('id' in request) || typeof request.id !== 'number') return false;

        return true;
    }

    private updateActiveUser(
        { name, password }: { name: string; password: string },
        websocket: WebSocket,
    ) {
        this.activeConnections.set(websocket, {
            ...(this.activeConnections.get(websocket) ?? {}),
            user: {
                name,
                password,
            },
        });
    }
}
