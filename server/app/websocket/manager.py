from typing import Optional

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.rooms = {}

    async def connect(
        self,
        room_id: str,
        websocket: WebSocket,
    ):
        await websocket.accept()

        if room_id not in self.rooms:
            self.rooms[room_id] = {
                "room_name": "MultiSolver Room",
                "host_id": None,
                "players": {},
                "connections": {},
                "game_started_at": None,
            }

    def register_player(
        self,
        room_id: str,
        player: dict,
        websocket: WebSocket,
        room_name: Optional[str] = None,
    ):
        room = self.rooms[room_id]

        player_id = player["id"]

        # Maximum 4 players
        if (
            player_id not in room["players"]
            and len(room["players"]) >= 4
        ):
            return None

        # First player becomes host
        if room["host_id"] is None:
            room["host_id"] = player_id
            player["host"] = True

            if room_name:
                room["room_name"] = room_name
        else:
            player["host"] = (
                player_id == room["host_id"]
            )

        room["players"][player_id] = player
        room["connections"][player_id] = websocket

        return player

    def update_player(
        self,
        room_id: str,
        player_id: str,
        updates: dict,
    ):
        room = self.rooms.get(room_id)

        if not room:
            return

        player = room["players"].get(
            player_id
        )

        if not player:
            return

        player.update(updates)

    def set_room_name(
        self,
        room_id: str,
        room_name: str,
    ):
        room = self.rooms.get(room_id)

        if room and room_name:
            room["room_name"] = room_name

    def set_game_started(
        self,
        room_id: str,
        started_at,
    ):
        room = self.rooms.get(room_id)

        if room:
            room["game_started_at"] = started_at

    def get_player_id_by_socket(
        self,
        room_id: str,
        websocket: WebSocket,
    ):
        room = self.rooms.get(room_id)

        if not room:
            return None

        for player_id, connection in room[
            "connections"
        ].items():
            if connection is websocket:
                return player_id

        return None

    def get_snapshot(
        self,
        room_id: str,
    ):
        room = self.rooms.get(room_id)

        if not room:
            return None

        return {
            "roomName": room["room_name"],
            "hostId": room["host_id"],
            "players": room["players"].copy(),
            "gameStartedAt": room[
                "game_started_at"
            ],
        }

    async def send_to_player(
        self,
        room_id: str,
        player_id: str,
        message: str,
    ):
        room = self.rooms.get(room_id)

        if not room:
            return

        connection = room[
            "connections"
        ].get(player_id)

        if not connection:
            return

        try:
            await connection.send_text(message)
        except Exception:
            pass

    def disconnect(
        self,
        room_id: str,
        websocket: WebSocket,
    ):
        room = self.rooms.get(room_id)

        if not room:
            return None, None

        disconnected_player_id = None

        for player_id, connection in list(
            room["connections"].items()
        ):
            if connection is websocket:
                disconnected_player_id = player_id
                del room["connections"][player_id]
                break

        if not disconnected_player_id:
            return None, None

        room["players"].pop(
            disconnected_player_id,
            None,
        )

        new_host_id = None

        # If host left, promote another player
        if (
            disconnected_player_id
            == room["host_id"]
        ):
            remaining_players = list(
                room["players"].keys()
            )

            if remaining_players:
                new_host_id = (
                    remaining_players[0]
                )

                room["host_id"] = (
                    new_host_id
                )

                room["players"][
                    new_host_id
                ]["host"] = True

            else:
                room["host_id"] = None

        # Delete empty room
        if not room["connections"]:
            del self.rooms[room_id]

        return (
            disconnected_player_id,
            new_host_id,
        )

    async def broadcast(
        self,
        room_id: str,
        message: str,
    ):
        room = self.rooms.get(room_id)

        if not room:
            return

        dead_connections = []

        for player_id, connection in list(
            room["connections"].items()
        ):
            try:
                await connection.send_text(
                    message
                )
            except Exception:
                dead_connections.append(
                    (
                        player_id,
                        connection,
                    )
                )

        for player_id, _ in dead_connections:
            room["connections"].pop(
                player_id,
                None,
            )
            room["players"].pop(
                player_id,
                None,
            )