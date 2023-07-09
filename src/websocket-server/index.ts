import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import { PlayerApi } from '../features/player/api';
import { RoomApi } from '../features/room/api';
import { GameApi } from '../features/game/api';

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
        index: number;
    };
}

export default class GameWebsocketServer {
    private server: WebSocketServer;

    constructor(
        port: number,
        private activeConnections = new Map<WebSocket, ConnectionData>(),
        private playerApi = new PlayerApi(),
        private roomApi = new RoomApi(),
        private gameApi = new GameApi(),
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

                this.handleCommand(request.type, request.data, websocket);
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
            const response = this.createResponseJSON(commandType, responseData);

            console.log('Response', response);
            websocket.send(response);

            this.sendUpdateRoomState(websocket);
            return;
        }

        if (commandType === CommandType.CreateRoom) {
            const currentUser = this.activeConnections.get(websocket);
            if (!currentUser) throw Error('Current user doesn"t exist');

            const currentUserData = currentUser.user;
            if (!currentUserData) throw Error('Current user data wasn"t initialized');

            this.roomApi.createRoom(currentUserData);
            this.sendGlobalUpdateRoomState();
            return;
        }

        if (commandType === CommandType.AddUserToRoom) {
            const currentUser = this.activeConnections.get(websocket);
            if (!currentUser) throw Error('Current user doesn"t exist');

            const currentUserData = currentUser.user;
            if (!currentUserData) throw Error('Current user data wasn"t initialized');

            const { error } = this.roomApi.addUserToRoom(currentUserData, data);
            if (error) return;

            this.sendGlobalUpdateRoomState();
            this.sendGlobalCreateGame(data);
            return;
        }

        if (commandType === CommandType.AddShips) {
            const { isGameReady, gameId } = this.gameApi.addShips(data);
            if (!isGameReady) return;

            const initialPlayersData = this.gameApi.startGame(gameId);

            this.activeConnections.forEach((connectionData, websocket) => {
                initialPlayersData.forEach((player) => {
                    if (!connectionData.user) return;

                    if (player.indexPlayer === connectionData.user.index) {
                        const startGameDto = {
                            ships: player.ships,
                            currentPlayerIndex: player.indexPlayer,
                        };
                        const response = this.createResponseJSON(
                            CommandType.StartGame,
                            startGameDto,
                        );

                        console.log('Response', response);
                        websocket.send(response);
                    }
                });
            });

            return;
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
        { name, index }: { name: string; index: number },
        websocket: WebSocket,
    ) {
        this.activeConnections.set(websocket, {
            ...(this.activeConnections.get(websocket) ?? {}),
            user: {
                name,
                index,
            },
        });
    }

    private sendGlobalCreateGame(data: unknown) {
        const gameParticipants = this.roomApi.createGame(data);

        this.activeConnections.forEach((connectionData, websocket) => {
            gameParticipants.forEach((gameDto) => {
                if (!connectionData.user) return;

                if (gameDto.idPlayer === connectionData.user.index) {
                    const response = this.createResponseJSON(CommandType.CreateGame, gameDto);

                    console.log('Response', response);
                    websocket.send(response);
                }
            });
        });
    }

    private sendUpdateRoomState(websocket: WebSocket) {
        const responseData = this.roomApi.updateRoomState();
        const response = this.createResponseJSON(CommandType.UpdateRoom, responseData);

        console.log('Response', response);
        websocket.send(response);
    }

    private sendGlobalUpdateRoomState() {
        this.activeConnections.forEach((_, websocket) => {
            this.sendUpdateRoomState(websocket);
        });
    }
}
