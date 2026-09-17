from app.game.game_room import GameRoom

class GameManager:

    def __init__(self):
        self.rooms = {}

    def create_room(self, room_id: str):
        room = GameRoom(room_id)

        self.rooms[room_id] = room

        return room

    def get_room(self, room_id: str):
        return self.rooms.get(room_id)

    def delete_room(self, room_id: str):
        if room_id in self.rooms:
            del self.rooms[room_id]