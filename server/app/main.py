import json

from fastapi import (
    FastAPI,
    WebSocket,
    WebSocketDisconnect,
)

from app.websocket.manager import (
    ConnectionManager,
)


app = FastAPI()

manager = ConnectionManager()


# =========================
# SERVER HEALTH
# =========================

@app.get("/")
def home():
    return {
        "message":
        "MultiPlayer Puzzle Game Server",
        "status": "online",
    }


# =========================
# ROOM STATUS
# =========================

@app.get("/rooms/{room_id}")
def room_status(room_id: str):
    snapshot = manager.get_snapshot(
        room_id
    )

    if not snapshot:
        return {
            "exists": False,
            "room_id": room_id,
        }

    return {
        "exists": True,
        "room_id": room_id,
        "room_name": snapshot[
            "roomName"
        ],
        "host_id": snapshot[
            "hostId"
        ],
        "players": list(
            snapshot["players"].values()
        ),
        "game_started_at": snapshot[
            "gameStartedAt"
        ],
    }


# =========================
# WEBSOCKET
# =========================

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
):
    await manager.connect(
        room_id,
        websocket,
    )

    try:
        while True:
            raw_message = (
                await websocket.receive_text()
            )

            try:
                data = json.loads(
                    raw_message
                )
            except json.JSONDecodeError:
                await websocket.send_text(
                    json.dumps(
                        {
                            "type":
                            "error",
                            "message":
                            "Invalid JSON.",
                        }
                    )
                )
                continue

            message_type = data.get(
                "type"
            )

            # =====================
            # JOIN
            # =====================

            if message_type == "join":
                player = data.get(
                    "player"
                )

                if not player:
                    continue

                room_name = data.get(
                    "roomName"
                )

                registered_player = (
                    manager.register_player(
                        room_id,
                        player,
                        websocket,
                        room_name,
                    )
                )

                # Room full
                if registered_player is None:
                    await websocket.send_text(
                        json.dumps(
                            {
                                "type":
                                "room_full",
                                "message":
                                "This room already has 4 players.",
                            }
                        )
                    )

                    await websocket.close()
                    continue

                # Tell everyone that a player joined
                await manager.broadcast(
                    room_id,
                    json.dumps(
                        {
                            "type":
                            "join",
                            "player":
                            registered_player,
                        }
                    ),
                )

                # Send room information
                snapshot = manager.get_snapshot(
                    room_id
                )

                await manager.send_to_player(
                    room_id,
                    registered_player["id"],
                    json.dumps(
                        {
                            "type":
                            "room_info",
                            "targetId":
                            registered_player[
                                "id"
                            ],
                            "roomName":
                            snapshot[
                                "roomName"
                            ],
                        }
                    ),
                )

                # Send current players
                await manager.send_to_player(
                    room_id,
                    registered_player["id"],
                    json.dumps(
                        {
                            "type":
                            "players_snapshot",
                            "targetId":
                            registered_player[
                                "id"
                            ],
                            "players":
                            snapshot[
                                "players"
                            ],
                        }
                    ),
                )

                # Sync running game
                if snapshot[
                    "gameStartedAt"
                ]:
                    await manager.send_to_player(
                        room_id,
                        registered_player[
                            "id"
                        ],
                        json.dumps(
                            {
                                "type":
                                "game_start",
                                "startedAt":
                                snapshot[
                                    "gameStartedAt"
                                ],
                            }
                        ),
                    )

                continue

            # =====================
            # ROLE ASSIGN
            # =====================

            if message_type == "role_assign":
                target_id = data.get(
                    "targetId"
                )

                if not target_id:
                    continue

                manager.update_player(
                    room_id,
                    target_id,
                    {
                        "role":
                        data.get(
                            "role"
                        ),
                        "color":
                        data.get(
                            "color"
                        ),
                        "initials":
                        data.get(
                            "initials"
                        ),
                    },
                )

                await manager.send_to_player(
                    room_id,
                    target_id,
                    json.dumps(data),
                )

                # Tell everyone about
                # updated player role
                snapshot = manager.get_snapshot(
                    room_id
                )

                if snapshot:
                    await manager.broadcast(
                        room_id,
                        json.dumps(
                            {
                                "type":
                                "players_snapshot_update",
                                "players":
                                snapshot[
                                    "players"
                                ],
                            }
                        ),
                    )

                continue

            # =====================
            # ROOM INFO
            # =====================

            if message_type == "room_info":
                room_name = data.get(
                    "roomName"
                )

                if room_name:
                    manager.set_room_name(
                        room_id,
                        room_name,
                    )

                target_id = data.get(
                    "targetId"
                )

                if target_id:
                    await manager.send_to_player(
                        room_id,
                        target_id,
                        json.dumps(data),
                    )
                else:
                    await manager.broadcast(
                        room_id,
                        json.dumps(data),
                    )

                continue

            # =====================
            # PLAYERS SNAPSHOT
            # =====================

            if (
                message_type
                == "players_snapshot"
            ):
                target_id = data.get(
                    "targetId"
                )

                if target_id:
                    await manager.send_to_player(
                        room_id,
                        target_id,
                        json.dumps(data),
                    )

                continue

            # =====================
            # CURRENT STATE
            # =====================

            if (
                message_type
                == "request_state"
            ):
                requester_id = data.get(
                    "requesterId"
                )

                snapshot = manager.get_snapshot(
                    room_id
                )

                if (
                    snapshot
                    and requester_id
                ):
                    await manager.send_to_player(
                        room_id,
                        requester_id,
                        json.dumps(
                            {
                                "type":
                                "state",
                                "roomName":
                                snapshot[
                                    "roomName"
                                ],
                                "players":
                                snapshot[
                                    "players"
                                ],
                                "gameStartedAt":
                                snapshot[
                                    "gameStartedAt"
                                ],
                            }
                        ),
                    )

                continue

            # =====================
            # START GAME
            # =====================

            if (
                message_type
                == "game_start"
            ):
                sender_id = (
                    manager.get_player_id_by_socket(
                        room_id,
                        websocket,
                    )
                )

                snapshot = manager.get_snapshot(
                    room_id
                )

                if (
                    not snapshot
                    or sender_id
                    != snapshot["hostId"]
                ):
                    await websocket.send_text(
                        json.dumps(
                            {
                                "type":
                                "error",
                                "message":
                                "Only the host can start the game.",
                            }
                        )
                    )
                    continue

                started_at = data.get(
                    "startedAt"
                )

                if started_at is None:
                    continue

                manager.set_game_started(
                    room_id,
                    started_at,
                )

                await manager.broadcast(
                    room_id,
                    json.dumps(
                        {
                            "type":
                            "game_start",
                            "startedAt":
                            started_at,
                        }
                    ),
                )

                continue

            # =====================
            # CHAT
            # =====================

            if message_type == "chat":
                player_id = data.get(
                    "playerId"
                )

                snapshot = manager.get_snapshot(
                    room_id
                )

                if (
                    snapshot
                    and player_id
                    in snapshot["players"]
                ):
                    await manager.broadcast(
                        room_id,
                        json.dumps(
                            {
                                "type":
                                "chat",
                                "playerId":
                                player_id,
                                "name":
                                data.get(
                                    "name",
                                    "Player",
                                ),
                                "text":
                                data.get(
                                    "text",
                                    "",
                                ),
                            }
                        ),
                    )

                continue

            # =====================
            # CLUE SHARING
            # =====================

            if (
                message_type
                == "clue_shared"
            ):
                player_id = data.get(
                    "playerId"
                )

                snapshot = manager.get_snapshot(
                    room_id
                )

                if (
                    snapshot
                    and player_id
                    in snapshot["players"]
                ):
                    await manager.broadcast(
                        room_id,
                        json.dumps(
                            {
                                "type":
                                "clue_shared",
                                "playerId":
                                player_id,
                                "name":
                                data.get(
                                    "name",
                                    "Player",
                                ),
                                "role":
                                data.get(
                                    "role",
                                    "Teammate",
                                ),
                                "clue":
                                data.get(
                                    "clue",
                                    "",
                                ),
                            }
                        ),
                    )

                continue

            # =====================
            # ANSWER
            # =====================

            if (
                message_type
                == "answer_submit"
            ):
                player_id = data.get(
                    "playerId"
                )

                snapshot = manager.get_snapshot(
                    room_id
                )

                if (
                    not snapshot
                    or player_id
                    not in snapshot[
                        "players"
                    ]
                ):
                    continue

                answer = str(
                    data.get(
                        "answer",
                        "",
                    )
                ).strip()

                correct = (
                    answer == "30"
                )

                await manager.broadcast(
                    room_id,
                    json.dumps(
                        {
                            "type":
                            "answer_result",
                            "correct":
                            correct,
                            "submittedBy":
                            player_id,
                        }
                    ),
                )

                if correct:
                    await manager.broadcast(
                        room_id,
                        json.dumps(
                            {
                                "type":
                                "system",
                                "text":
                                "🎉 Your team solved the puzzle!",
                            }
                        ),
                    )

                continue

            # =====================
            # SYSTEM
            # =====================

            if (
                message_type
                == "system"
            ):
                await manager.broadcast(
                    room_id,
                    json.dumps(data),
                )

                continue

            # =====================
            # UNKNOWN
            # =====================

            await manager.broadcast(
                room_id,
                json.dumps(data),
            )

    except WebSocketDisconnect:
        (
            disconnected_id,
            new_host_id,
        ) = manager.disconnect(
            room_id,
            websocket,
        )

        if disconnected_id:
            await manager.broadcast(
                room_id,
                json.dumps(
                    {
                        "type":
                        "player_left",
                        "playerId":
                        disconnected_id,
                    }
                ),
            )

        if new_host_id:
            snapshot = manager.get_snapshot(
                room_id
            )

            if snapshot:
                new_host = snapshot[
                    "players"
                ].get(new_host_id)

                await manager.broadcast(
                    room_id,
                    json.dumps(
                        {
                            "type":
                            "host_changed",
                            "hostId":
                            new_host_id,
                            "player":
                            new_host,
                        }
                    ),
                )