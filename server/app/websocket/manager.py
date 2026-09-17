from fastapi import WebSocket

class ConnectionManager:

    def __init__(self):
        self.rooms = {}

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()

        if room_id not in self.rooms:
            self.rooms[room_id] = []

        self.rooms[room_id].append(websocket)

    def disconnect(self, room_id: str, websocket: WebSocket):
        if room_id not in self.rooms:
            return

        self.rooms[room_id].remove(websocket)

        if len(self.rooms[room_id]) == 0:
            del self.rooms[room_id]

    async def broadcast(self, room_id: str, message: str):
        if room_id not in self.rooms:
            return

        for connection in self.rooms[room_id]:
            await connection.send_text(message)