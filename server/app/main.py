from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.websocket.manager import ConnectionManager

from app.game.game_manager import GameManager

app = FastAPI()

manager = ConnectionManager()

game_manager = GameManager()

# home controller
@app.get("/")
def home():
    return {"message": "Multiplayer Puzzle Game Server"}

# websocket endpoint controller
@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):

    await manager.connect(room_id, websocket)

    try:
        while True:

            message = await websocket.receive_text()
            await manager.broadcast(room_id, message)

    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)

@app.post("/rooms")
def create_room():

    room_id = "ABC123"

    room = game_manager.create_room(room_id)

    return {
        "room_id": room.room_id
    }