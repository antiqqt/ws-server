import { Player } from '../../player/model';
import { RoomData, RoomModel } from '../model';

export class RoomApi {
    constructor(private model = new RoomModel()) {}

    public createRoom(playerDto: Omit<Player, 'wins' | 'password'>) {
        this.model.createRoom(playerDto);
    }

    public addUserToRoom(playerData: Omit<Player, 'wins' | 'password'>, roomData: unknown) {
        if (!this.isValidRoomData(roomData)) {
            throw Error('Invalid room data');
        }

        this.model.addUserToRoom(playerData, roomData);
    }

    public updateRoomState() {
        return this.model.updateRoomState();
    }

    public isValidRoomData(data: unknown): data is RoomData {
        if (typeof data !== 'object' || data == null) return false;
        if (!('indexRoom' in data) || typeof data.indexRoom !== 'number') return false;

        return true;
    }

    public createGame(data: unknown) {
        if (!this.isValidRoomData(data)) {
            throw Error('Invalid room data');
        }

        return this.model.createGame(data);
    }
}
