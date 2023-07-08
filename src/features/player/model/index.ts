export interface Player {
    name: string;
    password: string;
    wins: number;
}

export class PlayerModel {
    constructor(private players: Player[] = []) {}

    public loginPlayer(data: Omit<Player, 'wins' | 'index'>) {
        const searchIndex = this.players.findIndex((player) => player.name === data.name);
        const isPlayerFound = searchIndex >= 0;

        const player = isPlayerFound ? this.players[searchIndex] : this.createPlayer(data);
        const playerIndex = isPlayerFound ? searchIndex : this.players.push(player) - 1;

        if (player.password !== data.password) {
            throw new Error('User password is incorrect');
        }

        return {
            name: player.name,
            password: player.password,
            index: playerIndex,
        };
    }

    private createPlayer({ name, password }: Omit<Player, 'wins' | 'index'>) {
        return {
            name,
            password,
            wins: 0,
        };
    }

    public updatePlayerWins({ name, wins }: Omit<Player, 'password'>) {
        const searchIndex = this.players.findIndex((player) => player.name === name);
        const isPlayerFound = searchIndex >= 0;

        if (!isPlayerFound) {
            throw new Error('Player with this name does not exist');
        }

        const player = this.players[searchIndex];
        player.wins = wins;

        return player;
    }
}
