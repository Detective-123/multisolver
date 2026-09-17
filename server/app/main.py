from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.websocket.manager import ConnectionManager

app = FastAPI()

manager = ConnectionManager()


@app.get("/")
def home():
    return {"message": "Multiplayer Puzzle Game Server"}


@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):

    await manager.connect(room_id, websocket)

    try:
        while True:

            message = await websocket.receive_text()
            await manager.broadcast(room_id, message)

    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
