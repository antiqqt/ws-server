import { Player } from '../../player/model';

export interface Room {
    roomUsers: {
        name: string;
        index: number;
    }[];
    roomId: number;
}

export interface RoomData {
    indexRoom: number;
}

export class RoomModel {
    constructor(
        private rooms: Room[] = [],
        private activeUsers = new Set<string>(),
    ) {}

    public createRoom(playerData: Omit<Player, 'wins' | 'password'>) {
        const isUserAlreadyActive = this.activeUsers.has(playerData.name);
        if (isUserAlreadyActive) return;
        this.activeUsers.add(playerData.name);

        this.rooms.push({ roomUsers: [playerData], roomId: this.rooms.length });
    }

    public addUserToRoom(playerData: Omit<Player, 'wins' | 'password'>, { indexRoom }: RoomData) {
        const room = this.rooms[indexRoom];
        const roomIsAvailable = room.roomUsers.length < 2;
        if (!roomIsAvailable) throw Error('Room is full');

        const isUserAlreadyActive = this.activeUsers.has(playerData.name);
        if (isUserAlreadyActive) return;
        this.activeUsers.add(playerData.name);

        room.roomUsers.push(playerData);
    }

    public createGame({ indexRoom }: RoomData) {
        const room = this.rooms[indexRoom];

        return room.roomUsers.map((player) => ({
            idGame: indexRoom,
            idPlayer: player.index,
        }));
    }

    public updateRoomState() {
        const roomsWithOnePlayer = this.rooms.filter(({ roomUsers }) => roomUsers.length === 1);
        return roomsWithOnePlayer;
    }
}
