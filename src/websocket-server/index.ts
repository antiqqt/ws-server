import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import { GameApi } from '../features/game/api';
import { AttackResponseDto, GamePlayer } from '../features/game/model';
import { PlayerApi } from '../features/player/api';
import { RoomApi } from '../features/room/api';

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

            websocket.send(response);

            this.sendUpdateRoomState(websocket);
            this.sendGlobalUpdateWinners();
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
            if (!currentUser) throw new Error('Current user doesn"t exist');

            const currentUserData = currentUser.user;
            if (!currentUserData) throw new Error('Current user data wasn"t initialized');

            const { error } = this.roomApi.addUserToRoom(currentUserData, data);
            if (error) return;

            this.sendGlobalUpdateRoomState();
            this.sendGlobalCreateGame(data);
            return;
        }

        if (commandType === CommandType.AddShips) {
            const { isGameReady, gameId } = this.gameApi.addShips(data);
            if (!isGameReady) return;

            const { currentPlayer, players } = this.sendGlobalStartGame(gameId);
            this.sendGlobalTurn({ currentPlayer, players });

            return;
        }

        if (commandType === CommandType.Attack) {
            this.handleAttackCommand(data);
            return;
        }

        if (commandType === CommandType.RandomAttack) {
            const randomAttack = this.gameApi.getRandomAttack(data);
            this.handleAttackCommand(randomAttack);

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

                    websocket.send(response);
                }
            });
        });
    }

    private sendUpdateRoomState(websocket: WebSocket) {
        const responseData = this.roomApi.updateRoomState();
        const response = this.createResponseJSON(CommandType.UpdateRoom, responseData);

        websocket.send(response);
    }

    private sendGlobalUpdateRoomState() {
        this.activeConnections.forEach((_, websocket) => {
            this.sendUpdateRoomState(websocket);
        });
    }

    private sendStartGame({ ships, indexPlayer }: GamePlayer, websocket: WebSocket) {
        const startGameDto = {
            ships,
            currentPlayerIndex: indexPlayer,
        };
        const response = this.createResponseJSON(CommandType.StartGame, startGameDto);

        websocket.send(response);
    }

    private sendGlobalStartGame(gameId: number) {
        const { players, currentPlayer } = this.gameApi.startGame(gameId);

        this.activeConnections.forEach((connectionData, websocket) => {
            players.forEach((player) => {
                if (!connectionData.user) return;

                if (player.indexPlayer === connectionData.user.index) {
                    this.sendStartGame(player, websocket);
                }
            });
        });

        return { currentPlayer, players };
    }

    private sendTurn(currentPlayer: number, websocket: WebSocket) {
        const turnDto = {
            currentPlayer,
        };
        const response = this.createResponseJSON(CommandType.Turn, turnDto);

        websocket.send(response);
    }

    private sendGlobalTurn({
        players,
        currentPlayer,
    }: {
        players: GamePlayer[];
        currentPlayer: number;
    }) {
        this.activeConnections.forEach((connectionData, websocket) => {
            players.forEach((player) => {
                if (!connectionData.user) return;

                if (player.indexPlayer === connectionData.user.index) {
                    this.sendTurn(currentPlayer, websocket);
                }
            });
        });

        return { currentPlayer };
    }

    private sendAttack(dto: AttackResponseDto, websocket: WebSocket) {
        const response = this.createResponseJSON(CommandType.Attack, dto);

        websocket.send(response);
    }

    private sendGlobalAttack({
        players,
        attackResponse,
    }: {
        attackResponse: AttackResponseDto;
        players: GamePlayer[];
    }) {
        this.activeConnections.forEach((connectionData, websocket) => {
            players.forEach((player) => {
                if (!connectionData.user) return;

                if (player.indexPlayer === connectionData.user.index) {
                    this.sendAttack(attackResponse, websocket);
                }
            });
        });
    }

    private handleAttackCommand(data: unknown) {
        const { attackResponse, missedCellsResponses, gameId } = this.gameApi.handleAttack(data);
        const players = this.gameApi.getPlayers(gameId);

        this.sendGlobalAttack({ players, attackResponse });

        if (attackResponse.status === 'killed' && missedCellsResponses) {
            missedCellsResponses.forEach((missResponse) => {
                this.sendGlobalAttack({ players, attackResponse: missResponse });
            });
        }

        if (attackResponse.status === 'miss') {
            const nextPlayerId = this.gameApi.switchTurn(gameId);
            this.sendGlobalTurn({ players, currentPlayer: nextPlayerId });
        }

        const winner = this.gameApi.getWinner(gameId);
        if (!winner) return;

        this.playerApi.incrementPlayerWins(winner.indexPlayer);
        this.sendGlobalFinish({ players, winPlayer: winner.indexPlayer });
        this.sendGlobalUpdateWinners();
    }

    private sendGlobalFinish({ players, winPlayer }: { winPlayer: number; players: GamePlayer[] }) {
        this.activeConnections.forEach((connectionData, websocket) => {
            players.forEach((player) => {
                if (!connectionData.user) return;

                if (player.indexPlayer === connectionData.user.index) {
                    this.sendFinish(winPlayer, websocket);
                }
            });
        });
    }

    private sendFinish(winPlayer: number, websocket: WebSocket) {
        const finishDto = {
            winPlayer,
        };
        const response = this.createResponseJSON(CommandType.Finish, finishDto);

        websocket.send(response);
    }

    private sendGlobalUpdateWinners() {
        const winners = this.playerApi.findAllWinners();

        this.activeConnections.forEach((connectionData, websocket) => {
            if (!connectionData.user) return;

            this.sendWinners(winners, websocket);
        });
    }

    private sendWinners(
        winners: {
            name: string;
            wins: number;
        }[],
        websocket: WebSocket,
    ) {
        const winnersDto = {
            winners,
        };
        const response = this.createResponseJSON(CommandType.UpdateWinners, winnersDto);

        websocket.send(response);
    }
}
