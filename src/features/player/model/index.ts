export interface Player {
    name: string;
    password: string;
    wins: number;
    index: number;
}

export class PlayerModel {
    constructor(private players: Player[] = []) {}

    public loginPlayer(data: Omit<Player, 'wins' | 'index'>) {
        const searchIndex = this.players.findIndex((player) => player.name === data.name);
        const isPlayerFound = searchIndex >= 0;

        const player = isPlayerFound ? this.players[searchIndex] : this.createPlayer(data);

        if (player.password !== data.password) {
            throw new Error('User password is incorrect');
        }

        return {
            name: player.name,
            index: player.index,
        };
    }

    private createPlayer({ name, password }: Omit<Player, 'wins' | 'index'>) {
        const player = {
            name,
            password,
            wins: 0,
            index: this.players.length,
        };
        this.players.push(player);

        return player;
    }

    public incrementPlayerWins(winnerIndex: number) {
        const searchIndex = this.players.findIndex((player) => player.index === winnerIndex);
        const isPlayerFound = searchIndex >= 0;

        if (!isPlayerFound) {
            throw new Error('Player with this name does not exist');
        }

        const player = this.players[searchIndex];
        player.wins += 1;

        return player;
    }

    public findAllWinners() {
        return this.players.map(({ name, wins }) => ({
            name,
            wins,
        }));
    }
}
