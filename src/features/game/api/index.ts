import { GameDto, GameModel, ShipDto } from '../model';

export class GameApi {
    constructor(private model = new GameModel()) {}

    public addShips(gameDto: unknown) {
        if (!this.isValidGameDto(gameDto)) {
            throw Error('Invalid game data');
        }

        return this.model.addShips(gameDto);
    }

    public startGame(gameId: number) {
        return this.model.startGame(gameId);
    }

    private isValidGameDto(dto: unknown): dto is GameDto {
        if (typeof dto !== 'object' || dto == null) return false;
        if (!('indexPlayer' in dto) || typeof dto.indexPlayer !== 'number') return false;
        if (!('gameId' in dto) || typeof dto.gameId !== 'number') return false;
        if (
            !('ships' in dto) ||
            !(dto.ships instanceof Array) ||
            !dto.ships.every(this.isValidShipDto)
        )
            return false;

        return true;
    }

    private isValidShipDto(dto: unknown): dto is ShipDto {
        if (typeof dto !== 'object' || dto == null) return false;

        if (!('position' in dto) || typeof dto.position !== 'object' || dto.position == null)
            return false;
        if (!('x' in dto.position) || typeof dto.position.x !== 'number') return false;
        if (!('y' in dto.position) || typeof dto.position.y !== 'number') return false;

        if (!('direction' in dto) || typeof dto.direction !== 'boolean') return false;
        if (!('length' in dto) || typeof dto.length !== 'number') return false;

        if (
            !('type' in dto) ||
            (dto.type !== 'small' &&
                dto.type !== 'medium' &&
                dto.type !== 'large' &&
                dto.type !== 'huge')
        )
            return false;

        return true;
    }
}
