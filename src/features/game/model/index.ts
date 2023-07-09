const MAX_PLAYERS = 2;

export interface ShipDto {
    position: {
        x: number;
        y: number;
    };
    direction: boolean;
    length: number;
    type: 'small' | 'medium' | 'large' | 'huge';
}

export interface Game {
    gameId: number;
    players: {
        ships: ShipDto[];
        indexPlayer: number;
    }[];
}

export interface GameDto {
    gameId: number;
    ships: ShipDto[];
    indexPlayer: number;
}

export class GameModel {
    constructor(private activeGames: Game[] = []) {}

    public addShips(gameDto: GameDto) {
        let game = this.activeGames.find((game) => game.gameId === gameDto.gameId);

        if (!game) {
            game = this.createActiveGame(gameDto);
            this.activeGames.push(game);
        }

        game.players.push({
            indexPlayer: gameDto.indexPlayer,
            ships: gameDto.ships,
        });

        return {
            isGameReady: this.checkIsGameReady(game),
            gameId: game.gameId,
        };
    }

    private createActiveGame({ gameId }: GameDto) {
        return {
            gameId,
            players: [],
        };
    }

    public startGame(gameId: number) {
        const game = this.activeGames.find((game) => game.gameId === gameId);
        if (!game) throw new Error('Game does"nt exist');
        if (!this.checkIsGameReady(game)) throw new Error('Game is not ready');

        return game.players;
    }

    private checkIsGameReady(game: Game) {
        return game.players.length === MAX_PLAYERS;
    }
}
