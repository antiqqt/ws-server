import { Player, PlayerModel } from '../model';

export type PlayerLoginData = Omit<Player, 'wins' | 'index'>;
export type PlayerUpdateWinsData = Omit<Player, 'password' | 'index'>;

export class PlayerApi {
    constructor(private model = new PlayerModel()) {}

    public login(data: unknown) {
        try {
            return this.isValidLoginData(data)
                ? this.createDataResponse(this.model.loginPlayer(data))
                : this.createErrorResponse();
        } catch (error) {
            console.error(error);
            return this.createErrorResponse();
        }
    }

    public updateWins(data: Omit<Player, 'password'>) {
        this.model.updatePlayerWins(data);
    }

    private isValidLoginData(data: unknown): data is PlayerLoginData {
        if (typeof data !== 'object' || data == null) return false;
        if (!('name' in data) || typeof data.name !== 'string' || data.name.length < 5) return false;
        if (!('password' in data) || typeof data.password !== 'string' || data.password.length < 5) return false;

        return true;
    }

    private isValidUpdateWinsDto(data: unknown): data is PlayerUpdateWinsData {
        if (typeof data !== 'object' || data == null) return false;
        if (!('name' in data) || typeof data.name !== 'string') return false;
        if (!('wins' in data) || typeof data.wins !== 'number') return false;

        return true;
    }

    private createErrorResponse() {
        return {
            name: '',
            index: 0,
            error: true,
            errorText: 'invalid user data',
        };
    }

    private createDataResponse<D>(data: D) {
        return {
            ...data,
            error: false,
            errorText: '',
        };
    }
}
