from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.websocket.manager import ConnectionManager

app = FastAPI()

manager = ConnectionManager()


@app.get("/")
def home():
    return {
        "message": "Multiplayer Puzzle Game Server"
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):

    await manager.connect(websocket)

    try:
        while True:

            message = await websocket.receive_text()
            await manager.broadcast(message)

    except WebSocketDisconnect:
        manager.disconnect(websocket)