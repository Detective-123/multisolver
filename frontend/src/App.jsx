import { useEffect, useRef, useState } from "react";
import "./App.css";

/* =========================
   GAME DATA
========================= */

const ROLE_POOL = [
  {
    role: "Puzzle Solver",
    color: "purple",
    initials: "P1",
  },
  {
    role: "Logic",
    color: "blue",
    initials: "P2",
  },
  {
    role: "Clue Hunter",
    color: "green",
    initials: "P3",
  },
  {
    role: "Pattern Master",
    color: "orange",
    initials: "P4",
  },
];

const CLUES = {
  "Puzzle Solver":
    "Look at how each term is formed using its position.",

  Logic:
    "The differences are +4, +6, +8, so the next difference continues the pattern.",

  "Clue Hunter":
    "The first terms can be written as 1×2, 2×3, 3×4 and 4×5.",

  "Pattern Master":
    "Every term follows the rule n × (n + 1).",
};

const GAME_DURATION = 10 * 60;

/* =========================
   HELPERS
========================= */

function generateRoomCode() {
  return Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();
}

/*
  IMPORTANT:
  sessionStorage is used so
  every browser tab gets a
  different player ID.
*/
function createPlayerId() {
  const saved =
    sessionStorage.getItem(
      "multisolver_player_id"
    );

  if (saved) {
    return saved;
  }

  const id =
    crypto.randomUUID?.() ||
    `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}`;

  sessionStorage.setItem(
    "multisolver_player_id",
    id
  );

  return id;
}

function getRoleDetails(role) {
  return (
    ROLE_POOL.find(
      (item) => item.role === role
    ) || ROLE_POOL[0]
  );
}

/* =========================
   APP
========================= */

function App() {
  /* =========================
     NAVIGATION
  ========================= */

  const [screen, setScreen] =
    useState("home");

  /* =========================
     PLAYER
  ========================= */

  const [playerId] = useState(
    () => createPlayerId()
  );

  const [playerName, setPlayerName] =
    useState(
      () =>
        localStorage.getItem(
          "multisolver_name"
        ) || ""
    );

  const [playerRole, setPlayerRole] =
    useState("Puzzle Solver");

  const [isHost, setIsHost] =
    useState(false);

  /* =========================
     ROOM
  ========================= */

  const [roomCode, setRoomCode] =
    useState("");

  const [roomName, setRoomName] =
    useState("");

  const [
    createRoomName,
    setCreateRoomName,
  ] = useState("");

  const [
    joinRoomCode,
    setJoinRoomCode,
  ] = useState("");

  const [
    joinRoomName,
    setJoinRoomName,
  ] = useState("");

  /* =========================
     SOCKET
  ========================= */

  const socketRef = useRef(null);

  const playerRef = useRef(null);

  const playersRef = useRef({});

  const roomNameRef = useRef("");

  const [
    connectionStatus,
    setConnectionStatus,
  ] = useState("disconnected");

  /* =========================
     PLAYERS
  ========================= */

  const [players, setPlayers] =
    useState({});

  /* =========================
     GAME
  ========================= */

  const [
    gameStartedAt,
    setGameStartedAt,
  ] = useState(null);

  const [timeLeft, setTimeLeft] =
    useState(GAME_DURATION);

  const [answer, setAnswer] =
    useState("");

  const [
    answerStatus,
    setAnswerStatus,
  ] = useState("");

  /* =========================
     CLUES
  ========================= */

  const [
    clueShared,
    setClueShared,
  ] = useState(false);

  const [
    sharedClues,
    setSharedClues,
  ] = useState({});

  /* =========================
     CHAT
  ========================= */

  const [messages, setMessages] =
    useState([]);

  const [
    chatMessage,
    setChatMessage,
  ] = useState("");

  /* =========================
     PLAYER REF
  ========================= */

  useEffect(() => {
    const details =
      getRoleDetails(playerRole);

    playerRef.current = {
      id: playerId,
      name:
        playerName.trim() ||
        "Player",
      role: playerRole,
      color: details.color,
      initials: details.initials,
      host: isHost,
    };
  }, [
    playerId,
    playerName,
    playerRole,
    isHost,
  ]);

  /* =========================
     SAVE NAME
  ========================= */

  useEffect(() => {
    localStorage.setItem(
      "multisolver_name",
      playerName
    );
  }, [playerName]);

  /* =========================
     ROOM REF
  ========================= */

  useEffect(() => {
    roomNameRef.current =
      roomName;
  }, [roomName]);

  /* =========================
     UPDATE PLAYERS
  ========================= */

  const updatePlayers = (
    updater
  ) => {
    setPlayers((previous) => {
      const next =
        typeof updater ===
        "function"
          ? updater(previous)
          : updater;

      playersRef.current =
        next;

      return next;
    });
  };

  /* =========================
     SEND SOCKET MESSAGE
  ========================= */

  const sendSocketMessage = (
    payload
  ) => {
    const socket =
      socketRef.current;

    if (
      !socket ||
      socket.readyState !==
        WebSocket.OPEN
    ) {
      return false;
    }

    socket.send(
      JSON.stringify(payload)
    );

    return true;
  };

  /* =========================
     WEBSOCKET

     ONE SOCKET PER ROOM
  ========================= */

  useEffect(() => {
    if (!roomCode) {
      return;
    }

    console.log(
      "Connecting:",
      playerId,
      "Room:",
      roomCode
    );

    const socket =
      new WebSocket(
        `ws://127.0.0.1:8000/ws/${roomCode}`
      );

    socketRef.current =
      socket;

    setConnectionStatus(
      "connecting"
    );

    /* =====================
       OPEN
    ===================== */

    socket.onopen = () => {
      if (
        socketRef.current !==
        socket
      ) {
        return;
      }

      console.log(
        "Connected:",
        playerId
      );

      setConnectionStatus(
        "connected"
      );

      const currentPlayer =
        playerRef.current;

      /*
        Show ourselves locally.
      */
      updatePlayers(
        (previous) => ({
          ...previous,
          [currentPlayer.id]:
            currentPlayer,
        })
      );

      /*
        Tell backend we joined.

        Host sends room name.
      */
      socket.send(
        JSON.stringify({
          type: "join",
          player:
            currentPlayer,
          roomName:
            isHost
              ? roomNameRef.current
              : null,
        })
      );
    };

    /* =====================
       MESSAGE
    ===================== */

    socket.onmessage = (
      event
    ) => {
      try {
        const data =
          JSON.parse(
            event.data
          );

        /* ====================
           PLAYER JOIN
        ==================== */

        if (
          data.type === "join"
        ) {
          if (!data.player) {
            return;
          }

          const joinedPlayer =
            data.player;

          /*
            Add the joining
            player immediately.
          */
          updatePlayers(
            (previous) => ({
              ...previous,
              [joinedPlayer.id]:
                joinedPlayer,
            })
          );

          /*
            IMPORTANT FIX:
            Host assigns a unique
            role to every new player.

            Host = P1
            Player 2 = Logic
            Player 3 = Clue Hunter
            Player 4 = Pattern Master
          */
          if (
            isHost &&
            joinedPlayer.id !==
              playerId
          ) {
            const currentPlayers =
              playersRef.current;

            const playerCount =
              Object.keys(
                currentPlayers
              ).length;

            /*
              Host is position 0.

              First guest:
              playerCount = 2
              roleIndex = 1

              Second guest:
              playerCount = 3
              roleIndex = 2

              Third guest:
              playerCount = 4
              roleIndex = 3
            */
            const roleIndex =
              Math.min(
                playerCount - 1,
                ROLE_POOL.length - 1
              );

            const assignedRole =
              ROLE_POOL[
                roleIndex
              ];

            const assignedPlayer = {
              ...joinedPlayer,
              role:
                assignedRole.role,
              color:
                assignedRole.color,
              initials:
                assignedRole.initials,
              host: false,
            };

            /*
              Tell backend to update
              this player's role.
            */
            socket.send(
              JSON.stringify({
                type:
                  "role_assign",
                targetId:
                  joinedPlayer.id,
                role:
                  assignedRole.role,
                color:
                  assignedRole.color,
                initials:
                  assignedRole.initials,
              })
            );

            /*
              Update host's own copy
              immediately.
            */
            updatePlayers(
              (previous) => ({
                ...previous,
                [joinedPlayer.id]:
                  assignedPlayer,
              })
            );
          }

          return;
        }

        /* ====================
           ROLE ASSIGNMENT
        ==================== */

        if (
          data.type ===
            "role_assign" &&
          data.targetId ===
            playerId
        ) {
          const newRole =
            data.role;

          const details =
            getRoleDetails(
              newRole
            );

          setPlayerRole(
            newRole
          );

          const updatedPlayer = {
            ...playerRef.current,
            role:
              newRole,
            color:
              data.color ||
              details.color,
            initials:
              data.initials ||
              details.initials,
          };

          playerRef.current =
            updatedPlayer;

          updatePlayers(
            (previous) => ({
              ...previous,
              [playerId]:
                updatedPlayer,
            })
          );

          return;
        }

        /* ====================
           ROOM INFO
        ==================== */

        if (
          data.type ===
          "room_info"
        ) {
          if (
            !data.targetId ||
            data.targetId ===
              playerId
          ) {
            if (
              data.roomName
            ) {
              roomNameRef.current =
                data.roomName;

              setRoomName(
                data.roomName
              );
            }
          }

          return;
        }

        /* ====================
           PLAYER SNAPSHOT
        ==================== */

        if (
          data.type ===
            "players_snapshot" &&
          data.targetId ===
            playerId
        ) {
          if (data.players) {
            updatePlayers(
              data.players
            );

            const me =
              data.players[
                playerId
              ];

            if (me) {
              setPlayerRole(
                me.role ||
                  "Puzzle Solver"
              );

              setIsHost(
                Boolean(
                  me.host
                )
              );
            }
          }

          return;
        }

        /* ====================
           SNAPSHOT UPDATE
        ==================== */

        if (
          data.type ===
          "players_snapshot_update"
        ) {
          if (data.players) {
            updatePlayers(
              data.players
            );

            const me =
              data.players[
                playerId
              ];

            if (me) {
              setPlayerRole(
                me.role ||
                  "Puzzle Solver"
              );

              setIsHost(
                Boolean(
                  me.host
                )
              );
            }
          }

          return;
        }

        /* ====================
           PLAYER LEFT
        ==================== */

        if (
          data.type ===
          "player_left"
        ) {
          updatePlayers(
            (previous) => {
              const next = {
                ...previous,
              };

              delete next[
                data.playerId
              ];

              return next;
            }
          );

          setMessages(
            (previous) => [
              ...previous,
              {
                id:
                  `${Date.now()}-${Math.random()}`,
                sender:
                  "System",
                text:
                  "A player left the room.",
                own: false,
                system: true,
              },
            ]
          );

          return;
        }

        /* ====================
           HOST CHANGED
        ==================== */

        if (
          data.type ===
          "host_changed"
        ) {
          const newHostId =
            data.hostId;

          setIsHost(
            newHostId ===
              playerId
          );

          updatePlayers(
            (previous) => {
              const next = {
                ...previous,
              };

              Object.keys(
                next
              ).forEach(
                (id) => {
                  next[id] = {
                    ...next[id],
                    host:
                      id ===
                      newHostId,
                  };
                }
              );

              return next;
            }
          );

          return;
        }

        /* ====================
           ROOM FULL
        ==================== */

        if (
          data.type ===
          "room_full"
        ) {
          alert(
            "This room is full. Maximum 4 players."
          );

          if (
            socketRef.current
          ) {
            socketRef.current.close();

            socketRef.current =
              null;
          }

          setRoomCode("");

          setRoomName("");

          setPlayers({});

          playersRef.current =
            {};

          setIsHost(false);

          setConnectionStatus(
            "disconnected"
          );

          setScreen("home");

          return;
        }

        /* ====================
           GAME START
        ==================== */

        if (
          data.type ===
          "game_start"
        ) {
          const startTime =
            Number(
              data.startedAt
            );

          if (
            Number.isFinite(
              startTime
            )
          ) {
            setGameStartedAt(
              startTime
            );

            setTimeLeft(
              Math.max(
                0,
                Math.ceil(
                  (
                    startTime +
                    GAME_DURATION *
                      1000 -
                    Date.now()
                  ) /
                    1000
                )
              )
            );

            setAnswer("");

            setAnswerStatus("");

            setScreen(
              "game"
            );
          }

          return;
        }

        /* ====================
           CHAT
        ==================== */

        if (
          data.type === "chat"
        ) {
          setMessages(
            (previous) => [
              ...previous,
              {
                id:
                  `${Date.now()}-${Math.random()}`,
                sender:
                  data.name ||
                  "Player",
                text:
                  data.text ||
                  "",
                own:
                  data.playerId ===
                  playerId,
                system: false,
              },
            ]
          );

          return;
        }

        /* ====================
           CLUE SHARED
        ==================== */

        if (
          data.type ===
          "clue_shared"
        ) {
          if (
            !data.playerId
          ) {
            return;
          }

          /*
            One clue per player.
          */
          setSharedClues(
            (previous) => ({
              ...previous,
              [data.playerId]: {
                name:
                  data.name ||
                  "Player",
                role:
                  data.role ||
                  "Teammate",
                clue:
                  data.clue ||
                  "",
              },
            })
          );

          /*
            Mark immediately for
            the current player.
          */
          if (
            data.playerId ===
            playerId
          ) {
            setClueShared(
              true
            );
          }

          /*
            One notification.
          */
          setMessages(
            (previous) => [
              ...previous,
              {
                id:
                  `${Date.now()}-${Math.random()}`,
                sender:
                  data.name ||
                  "Player",
                text:
                  "Shared a clue with the team.",
                own:
                  data.playerId ===
                  playerId,
                system: true,
              },
            ]
          );

          return;
        }

        /* ====================
           ANSWER RESULT
        ==================== */

        if (
          data.type ===
          "answer_result"
        ) {
          setAnswerStatus(
            data.correct
              ? "correct"
              : "wrong"
          );

          if (
            data.correct
          ) {
            setMessages(
              (previous) => [
                ...previous,
                {
                  id:
                    `${Date.now()}-${Math.random()}`,
                  sender:
                    "System",
                  text:
                    "🎉 Your team solved the puzzle!",
                  own: false,
                  system: true,
                },
              ]
            );
          }

          return;
        }

        /* ====================
           SYSTEM
        ==================== */

        if (
          data.type ===
          "system"
        ) {
          setMessages(
            (previous) => [
              ...previous,
              {
                id:
                  `${Date.now()}-${Math.random()}`,
                sender:
                  "System",
                text:
                  data.text ||
                  "",
                own: false,
                system: true,
              },
            ]
          );

          return;
        }

        /* ====================
           SERVER ERROR
        ==================== */

        if (
          data.type ===
          "error"
        ) {
          console.error(
            "Server error:",
            data.message
          );

          return;
        }
      } catch {
        setMessages(
          (previous) => [
            ...previous,
            {
              id:
                `${Date.now()}-${Math.random()}`,
              sender:
                "Player",
              text:
                event.data,
              own: false,
              system: false,
            },
          ]
        );
      }
    };

    /* =====================
       SOCKET ERROR
    ===================== */

    socket.onerror = (
      error
    ) => {
      console.error(
        "WebSocket error:",
        error
      );

      if (
        socketRef.current ===
        socket
      ) {
        setConnectionStatus(
          "error"
        );
      }
    };

    /* =====================
       SOCKET CLOSED
    ===================== */

    socket.onclose = () => {
      if (
        socketRef.current ===
        socket
      ) {
        socketRef.current =
          null;

        setConnectionStatus(
          "disconnected"
        );
      }
    };

    /* =====================
       CLEANUP
    ===================== */

    return () => {
      if (
        socketRef.current ===
        socket
      ) {
        socketRef.current =
          null;
      }

      socket.close();
    };
  }, [roomCode]);

  /* =========================
     TIMER
  ========================= */

  useEffect(() => {
    if (
      screen !== "game" ||
      !gameStartedAt
    ) {
      return;
    }

    const updateTimer =
      () => {
        const endTime =
          Number(
            gameStartedAt
          ) +
          GAME_DURATION *
            1000;

        const remaining =
          Math.max(
            0,
            Math.ceil(
              (
                endTime -
                Date.now()
              ) /
                1000
            )
          );

        setTimeLeft(
          remaining
        );
      };

    updateTimer();

    const timer =
      setInterval(
        updateTimer,
        1000
      );

    return () =>
      clearInterval(
        timer
      );
  }, [
    screen,
    gameStartedAt,
  ]);

  /* =========================
     CREATE ROOM
  ========================= */

  const openCreateRoom = () => {
    setCreateRoomName("");

    setPlayerName(
      localStorage.getItem(
        "multisolver_name"
      ) || ""
    );

    setScreen("create");
  };

  const createRoom = () => {
    const name =
      playerName.trim();

    const teamName =
      createRoomName.trim();

    if (!name) {
      alert(
        "Enter your name first."
      );

      return;
    }

    if (!teamName) {
      alert(
        "Enter a room name."
      );

      return;
    }

    if (socketRef.current) {
      socketRef.current.close();

      socketRef.current =
        null;
    }

    const code =
      generateRoomCode();

    const hostPlayer = {
      id: playerId,
      name,
      role: "Puzzle Solver",
      color: "purple",
      initials: "P1",
      host: true,
    };

    setIsHost(true);

    setPlayerRole(
      "Puzzle Solver"
    );

    playerRef.current =
      hostPlayer;

    playersRef.current = {
      [playerId]:
        hostPlayer,
    };

    setPlayers({
      [playerId]:
        hostPlayer,
    });

    roomNameRef.current =
      teamName;

    setRoomName(
      teamName
    );

    setRoomCode(
      code
    );

    setSharedClues({});

    setMessages([]);

    setClueShared(
      false
    );

    setGameStartedAt(
      null
    );

    setAnswer("");

    setAnswerStatus("");

    setConnectionStatus(
      "connecting"
    );

    setScreen("lobby");
  };

  /* =========================
     JOIN ROOM
  ========================= */

  const openJoinRoom = () => {
    setJoinRoomCode("");

    setJoinRoomName("");

    setScreen("join");
  };

  const joinRoom = () => {
    const name =
      joinRoomName.trim();

    const code =
      joinRoomCode
        .trim()
        .toUpperCase();

    if (!name) {
      alert(
        "Enter your name first."
      );

      return;
    }

    if (
      code.length !== 6
    ) {
      alert(
        "Enter a valid 6-character room code."
      );

      return;
    }

    if (socketRef.current) {
      socketRef.current.close();

      socketRef.current =
        null;
    }

    const joiningPlayer = {
      id: playerId,
      name,
      role: "Puzzle Solver",
      color: "purple",
      initials: "P1",
      host: false,
    };

    setPlayerName(
      name
    );

    setIsHost(false);

    /*
      Temporary role.
      Host will replace this
      with Logic / Clue Hunter /
      Pattern Master.
    */
    setPlayerRole(
      "Puzzle Solver"
    );

    playerRef.current =
      joiningPlayer;

    playersRef.current = {
      [playerId]:
        joiningPlayer,
    };

    setPlayers({
      [playerId]:
        joiningPlayer,
    });

    setRoomName(
      "Connecting..."
    );

    roomNameRef.current =
      "Connecting...";

    setRoomCode(
      code
    );

    setSharedClues({});

    setMessages([]);

    setClueShared(
      false
    );

    setGameStartedAt(
      null
    );

    setAnswer("");

    setAnswerStatus("");

    setConnectionStatus(
      "connecting"
    );

    setScreen("lobby");
  };

  /* =========================
     START GAME
  ========================= */

  const startGame = () => {
    if (!isHost) {
      return;
    }

    if (
      !socketRef.current ||
      socketRef.current.readyState !==
        WebSocket.OPEN
    ) {
      alert(
        "Room is not connected yet."
      );

      return;
    }

    const startTime =
      Date.now();

    setGameStartedAt(
      startTime
    );

    setTimeLeft(
      GAME_DURATION
    );

    setAnswer("");

    setAnswerStatus("");

    setMessages([]);

    setSharedClues({});

    setClueShared(
      false
    );

    sendSocketMessage({
      type:
        "game_start",
      startedAt:
        startTime,
    });

    setScreen("game");
  };

  /* =========================
     SHARE CLUE
  ========================= */

  const shareClue = () => {
    if (clueShared) {
      return;
    }

    const clue =
      CLUES[playerRole];

    if (!clue) {
      return;
    }

    const success =
      sendSocketMessage({
        type:
          "clue_shared",
        playerId,
        name:
          playerName ||
          "Player",
        role:
          playerRole,
        clue,
      });

    if (!success) {
      alert(
        "Room connection is not ready."
      );

      return;
    }

    /*
      Set immediately so
      double-click cannot send
      the same clue twice.
    */
    setClueShared(
      true
    );
  };

  /* =========================
     CHAT
  ========================= */

  const sendMessage = () => {
    const text =
      chatMessage.trim();

    if (!text) {
      return;
    }

    const success =
      sendSocketMessage({
        type:
          "chat",
        playerId,
        name:
          playerName ||
          "Player",
        text,
      });

    if (!success) {
      alert(
        "Room connection is not ready."
      );

      return;
    }

    setChatMessage("");
  };

  const handleChatKeyDown =
    (event) => {
      if (
        event.key ===
        "Enter"
      ) {
        sendMessage();
      }
    };

  /* =========================
     ANSWER
  ========================= */

  const submitAnswer = () => {
    const value =
      answer.trim();

    if (!value) {
      return;
    }

    const success =
      sendSocketMessage({
        type:
          "answer_submit",
        answer:
          value,
        playerId,
        name:
          playerName ||
          "Player",
      });

    if (!success) {
      alert(
        "Room connection is not ready."
      );
    }
  };

  /* =========================
     LEAVE
  ========================= */

  const leaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.close();

      socketRef.current =
        null;
    }

    setRoomCode("");

    setRoomName("");

    setPlayers({});

    playersRef.current =
      {};

    setSharedClues({});

    setMessages([]);

    setGameStartedAt(
      null
    );

    setClueShared(
      false
    );

    setAnswer("");

    setAnswerStatus("");

    setIsHost(false);

    setPlayerRole(
      "Puzzle Solver"
    );

    setConnectionStatus(
      "disconnected"
    );

    setScreen("home");
  };

  /* =========================
     DISPLAY DATA
  ========================= */

  const playerList =
    Object.values(
      players
    );

  const sharedClueCount =
    Object.keys(
      sharedClues
    ).length;

  const progress =
    answerStatus ===
    "correct"
      ? 100
      : Math.min(
          25 +
            sharedClueCount *
              18,
          90
        );

  const connectionText = {
    connected:
      "CONNECTED",

    connecting:
      "CONNECTING",

    disconnected:
      "OFFLINE",

    error:
      "CONNECTION ERROR",
  };

  const privateClue =
    CLUES[playerRole] ||
    CLUES[
      "Puzzle Solver"
    ];

  /* =========================
     UI
  ========================= */

  return (
    <div className="app">
      <div className="ambient ambient-one"></div>

      <div className="ambient ambient-two"></div>

      <div className="grid-bg"></div>

      {/* ================= NAVBAR ================= */}

      <header className="navbar">
        <div
          className="brand"
          onClick={
            leaveRoom
          }
        >
          <div className="brand-mark">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div>
            <h1>
              MultiSolver
            </h1>

            <p>
              Think Together.
              Solve Together.
            </p>
          </div>
        </div>

        <div className="nav-right">
          {roomCode && (
            <div className="live-badge">
              <span className="live-dot"></span>

              {
                connectionText[
                  connectionStatus
                ]
              }
            </div>
          )}

          <div className="version">
            v1.0
          </div>
        </div>
      </header>

      {/* ================= HOME ================= */}

      {screen === "home" && (
        <main className="home">
          <section className="hero">
            <div className="hero-badge">
              <span>
                ✦
              </span>

              CO-OP PUZZLE EXPERIENCE
            </div>

            <h2>
              One Puzzle.
              <br />

              <span>
                Many Minds.
              </span>
            </h2>

            <p className="hero-text">
              A multiplayer puzzle
              game where every player
              holds a different piece
              of information.
              Communicate, collaborate
              and solve the challenge
              together.
            </p>

            <div className="hero-actions">
              <button
                className="primary-btn"
                onClick={
                  openCreateRoom
                }
              >
                <span>
                  ＋
                </span>

                Create Room

                <b>
                  →
                </b>
              </button>

              <button
                className="secondary-btn"
                onClick={
                  openJoinRoom
                }
              >
                Join with Code
              </button>
            </div>

            <div className="hero-note">
              <span className="mini-dot"></span>

              Teamwork • Communication
              • Problem Solving
            </div>
          </section>

          <section className="concept-section">
            <div className="section-heading">
              <span className="section-label">
                WHY MULTISOLVER
              </span>

              <h3>
                You can't solve
                everything
                <span>
                  alone.
                </span>
              </h3>
            </div>

            <div className="feature-grid">
              <FeatureCard
                number="01"
                icon="◈"
                title="Divide"
                text="Every player receives a different piece of information."
              />

              <FeatureCard
                number="02"
                icon="⌁"
                title="Communicate"
                text="Players share clues and ideas with their teammates."
              />

              <FeatureCard
                number="03"
                icon="✦"
                title="Collaborate"
                text="The team combines every clue to reach one final answer."
              />
            </div>
          </section>

          <section className="challenge-banner">
            <div>
              <span className="section-label">
                THE CORE IDEA
              </span>

              <h3>
                Every player has a piece
                of the answer.
              </h3>
            </div>

            <div className="challenge-stat">
              <strong>
                4
              </strong>

              <span>
                Players
                <br />
                working together
              </span>
            </div>

            <div className="challenge-stat">
              <strong>
                1
              </strong>

              <span>
                Shared
                <br />
                objective
              </span>
            </div>

            <div className="challenge-stat">
              <strong>
                ∞
              </strong>

              <span>
                Ways to
                <br />
                think
              </span>
            </div>
          </section>
        </main>
      )}

      {/* ================= CREATE ================= */}

      {screen === "create" && (
        <main className="room-page">
          <button
            className="back-btn"
            onClick={() =>
              setScreen("home")
            }
          >
            ← Back
          </button>

          <div className="room-card">
            <div className="card-icon">
              +
            </div>

            <span className="section-label">
              CREATE A TEAM
            </span>

            <h2>
              Set up your room
            </h2>

            <p>
              Choose your player name
              and give your team a name.
            </p>

            <label className="field-label">
              YOUR NAME
            </label>

            <input
              className="name-input"
              value={
                playerName
              }
              onChange={(event) =>
                setPlayerName(
                  event.target.value
                )
              }
              placeholder="e.g. Alex"
              maxLength={
                20
              }
            />

            <label className="field-label">
              ROOM NAME
            </label>

            <input
              className="name-input"
              value={
                createRoomName
              }
              onChange={(event) =>
                setCreateRoomName(
                  event.target.value
                )
              }
              placeholder="e.g. Brain Squad"
              maxLength={
                30
              }
            />

            <button
              className="primary-btn full-btn"
              onClick={
                createRoom
              }
            >
              Create Team Room

              <b>
                →
              </b>
            </button>
          </div>
        </main>
      )}

      {/* ================= JOIN ================= */}

      {screen === "join" && (
        <main className="room-page">
          <button
            className="back-btn"
            onClick={() =>
              setScreen("home")
            }
          >
            ← Back
          </button>

          <div className="room-card">
            <div className="card-icon">
              ↗
            </div>

            <span className="section-label">
              JOIN A TEAM
            </span>

            <h2>
              Join the challenge
            </h2>

            <p>
              Enter your name and the
              room code shared by your
              teammate.
            </p>

            <label className="field-label">
              YOUR NAME
            </label>

            <input
              className="name-input"
              value={
                joinRoomName
              }
              onChange={(event) =>
                setJoinRoomName(
                  event.target.value
                )
              }
              placeholder="e.g. Sam"
              maxLength={
                20
              }
            />

            <label className="field-label">
              ROOM CODE
            </label>

            <input
              className="room-input"
              value={
                joinRoomCode
              }
              onChange={(event) =>
                setJoinRoomCode(
                  event.target.value
                    .replace(
                      /[^a-zA-Z0-9]/g,
                      ""
                    )
                    .toUpperCase()
                )
              }
              placeholder="ABC123"
              maxLength={
                6
              }
            />

            <button
              className="primary-btn full-btn"
              onClick={
                joinRoom
              }
            >
              Join Room

              <b>
                →
              </b>
            </button>
          </div>
        </main>
      )}

      {/* ================= LOBBY ================= */}

      {screen === "lobby" && (
        <main className="lobby-page">
          <div className="lobby-header">
            <div>
              <span className="section-label">
                GAME ROOM
              </span>

              <h2>
                {roomName ||
                  "Connecting..."}
              </h2>

              <p>
                {isHost
                  ? "You are the host. Share the room code with your teammates."
                  : "You joined the team. Wait for the host to start the challenge."}
              </p>

              <div className="name-display">
                Playing as:

                <strong>
                  {
                    playerName ||
                    "Player"
                  }
                </strong>
              </div>

              <div className="name-display">
                Role:

                <strong>
                  {
                    playerRole
                  }
                </strong>
              </div>
            </div>

            <div>
              <div className="room-code-box">
                <small>
                  ROOM CODE
                </small>

                <strong>
                  {
                    roomCode
                  }
                </strong>

                <button
                  onClick={() =>
                    navigator.clipboard?.writeText(
                      roomCode
                    )
                  }
                >
                  Copy
                </button>
              </div>

              <div
                className={`connection-status ${connectionStatus}`}
              >
                <span></span>

                {connectionStatus ===
                  "connected" &&
                  "Room connected"}

                {connectionStatus ===
                  "connecting" &&
                  "Connecting..."}

                {connectionStatus ===
                  "disconnected" &&
                  "Disconnected"}

                {connectionStatus ===
                  "error" &&
                  "Connection error"}
              </div>
            </div>
          </div>

          <div className="lobby-layout">
            <section className="players-panel">
              <div className="panel-top">
                <div>
                  <span className="section-label">
                    YOUR TEAM
                  </span>

                  <h3>
                    Players
                  </h3>
                </div>

                <span className="player-count">
                  {
                    Math.min(
                      playerList.length,
                      4
                    )
                  }{" "}
                  / 4
                </span>
              </div>

              <div className="players-grid">
                {playerList.map(
                  (player) => (
                    <div
                      className="player-card"
                      key={
                        player.id
                      }
                    >
                      <div
                        className={`avatar ${
                          player.color ||
                          "purple"
                        }`}
                      >
                        {
                          player.initials ||
                          "P"
                        }
                      </div>

                      <div className="player-info">
                        <strong>
                          {
                            player.name
                          }
                        </strong>

                        <span>
                          {
                            player.role
                          }
                        </span>
                      </div>

                      <div
                        className={`player-status ${
                          player.host
                            ? "you"
                            : ""
                        }`}
                      >
                        {player.host
                          ? "Host"
                          : player.id ===
                            playerId
                          ? "You"
                          : "Ready"}
                      </div>
                    </div>
                  )
                )}

                {playerList.length <
                  4 &&
                  Array.from({
                    length:
                      4 -
                      playerList.length,
                  }).map(
                    (_, index) => (
                      <div
                        className="player-card waiting-card"
                        key={`wait-${index}`}
                      >
                        <div className="avatar">
                          ?
                        </div>

                        <div className="player-info">
                          <strong>
                            Waiting...
                          </strong>

                          <span>
                            Teammate
                          </span>
                        </div>

                        <div className="player-status">
                          Open
                        </div>
                      </div>
                    )
                  )}
              </div>
            </section>

            <aside className="mission-panel">
              <span className="section-label">
                MISSION
              </span>

              <div className="mission-icon">
                ◆
              </div>

              <h3>
                How the challenge works
              </h3>

              <p>
                Every player gets a
                different clue. Share
                information, connect the
                patterns and solve one
                final answer together.
              </p>

              <div className="mission-rules">
                <div>
                  <span>
                    01
                  </span>

                  Receive a private clue
                </div>

                <div>
                  <span>
                    02
                  </span>

                  Share & discuss
                </div>

                <div>
                  <span>
                    03
                  </span>

                  Combine information
                </div>

                <div>
                  <span>
                    04
                  </span>

                  Solve together
                </div>
              </div>

              {isHost ? (
                <button
                  className="primary-btn full-btn"
                  onClick={
                    startGame
                  }
                >
                  Start Challenge

                  <b>
                    →
                  </b>
                </button>
              ) : (
                <div className="host-waiting">
                  <span className="mini-dot"></span>

                  Waiting for host to
                  start the challenge...
                </div>
              )}
            </aside>
          </div>
        </main>
      )}

      {/* ================= GAME ================= */}

      {screen === "game" && (
        <main className="game-page">
          <div className="game-topbar">
            <div>
              <span className="section-label">
                {roomName ||
                  "MULTISOLVER ROOM"}
              </span>

              <h2>
                The Hidden Pattern
              </h2>

              <p className="game-subtitle">
                Your clue is private.
                Your team's puzzle is
                shared.
              </p>
            </div>

            <div className="timer">
              <span>
                TIME LEFT
              </span>

              <strong>
                {String(
                  Math.floor(
                    timeLeft /
                      60
                  )
                ).padStart(
                  2,
                  "0"
                )}
                :
                {String(
                  timeLeft %
                    60
                ).padStart(
                  2,
                  "0"
                )}
              </strong>
            </div>
          </div>

          <section className="how-to-play">
            <div className="how-title">
              <span className="how-icon">
                ?
              </span>

              <div>
                <strong>
                  HOW TO PLAY
                </strong>

                <p>
                  Read your private clue,
                  share it with your team,
                  combine everyone's
                  information and submit
                  one final answer.
                </p>
              </div>
            </div>

            <div className="how-steps">
              <div
                className={
                  clueShared
                    ? "step done"
                    : "step"
                }
              >
                <span>
                  01
                </span>

                Share clue
              </div>

              <div className="step">
                <span>
                  02
                </span>

                Discuss
              </div>

              <div className="step">
                <span>
                  03
                </span>

                Combine
              </div>

              <div
                className={
                  answerStatus ===
                  "correct"
                    ? "step done"
                    : "step"
                }
              >
                <span>
                  04
                </span>

                Solve
              </div>
            </div>
          </section>

          <div
            className={`game-connection ${connectionStatus}`}
          >
            <span></span>

            {connectionStatus ===
              "connected" &&
              `Live multiplayer • Room ${roomCode}`}

            {connectionStatus ===
              "connecting" &&
              "Connecting to multiplayer room..."}

            {connectionStatus ===
              "disconnected" &&
              "Disconnected from room"}

            {connectionStatus ===
              "error" &&
              "Unable to connect to room"}
          </div>

          <div className="game-layout">
            <section className="game-main-column">
              {/* PRIVATE CLUE */}

              <section className="private-clue-panel">
                <div className="private-clue-header">
                  <div>
                    <span className="section-label">
                      YOUR PRIVATE CLUE
                    </span>

                    <h3>
                      Your information
                    </h3>
                  </div>

                  <div className="locked-badge">
                    🔒 PRIVATE
                  </div>
                </div>

                <div className="private-clue-content">
                  <div className="clue-lock">
                    🔐
                  </div>

                  <p>
                    {
                      privateClue
                    }
                  </p>
                </div>

                <div className="private-clue-action">
                  {clueShared ? (
                    <div className="shared-success">
                      ✓ Your clue is now
                      visible to the team
                    </div>
                  ) : (
                    <button
                      className="primary-btn"
                      onClick={
                        shareClue
                      }
                    >
                      Share Clue with Team

                      <b>
                        →
                      </b>
                    </button>
                  )}
                </div>
              </section>

              {/* PUZZLE */}

              <section className="puzzle-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-label">
                      SHARED TEAM PUZZLE
                    </span>

                    <h3>
                      Find the missing number
                    </h3>
                  </div>

                  <div className="difficulty">
                    MEDIUM
                  </div>
                </div>

                <div className="puzzle-box">
                  <p>
                    Everyone sees the same
                    puzzle, but each player
                    has different information
                    needed to solve it.
                  </p>

                  <div className="sequence">
                    <span>
                      2
                    </span>

                    <i>
                      →
                    </i>

                    <span>
                      6
                    </span>

                    <i>
                      →
                    </i>

                    <span>
                      12
                    </span>

                    <i>
                      →
                    </i>

                    <span>
                      20
                    </span>

                    <i>
                      →
                    </i>

                    <span className="missing">
                      ?
                    </span>
                  </div>

                  <div className="sequence-hint">
                    <span>
                      TEAM PUZZLE
                    </span>

                    <p>
                      Combine the private
                      clues shared by your
                      teammates to find the
                      answer.
                    </p>
                  </div>
                </div>

                <div className="answer-section">
                  <label>
                    TEAM ANSWER
                  </label>

                  <div className="answer-row">
                    <input
                      type="number"
                      value={
                        answer
                      }
                      onChange={(event) =>
                        setAnswer(
                          event.target
                            .value
                        )
                      }
                      placeholder="Enter final answer"
                    />

                    <button
                      className="primary-btn"
                      onClick={
                        submitAnswer
                      }
                    >
                      Submit

                      <b>
                        →
                      </b>
                    </button>
                  </div>

                  {answerStatus ===
                    "wrong" && (
                    <div className="answer-feedback wrong">
                      ✕ Not correct yet.
                      Discuss the clues
                      again.
                    </div>
                  )}

                  {answerStatus ===
                    "correct" && (
                    <div className="answer-feedback correct">
                      ✓ Correct! The team
                      solved the puzzle.
                    </div>
                  )}
                </div>
              </section>
            </section>

            {/* RIGHT */}

            <aside className="team-sidebar">
              <section className="team-board">
                <div className="panel-heading">
                  <div>
                    <span className="section-label">
                      TEAM BOARD
                    </span>

                    <h3>
                      Shared clues
                    </h3>
                  </div>

                  <span className="shared-count">
                    {
                      sharedClueCount
                    }{" "}
                    shared
                  </span>
                </div>

                {sharedClueCount ===
                0 ? (
                  <div className="empty-board">
                    No clues shared yet.
                    <br />
                    Start by sharing your
                    private clue.
                  </div>
                ) : (
                  Object.entries(
                    sharedClues
                  ).map(
                    ([
                      id,
                      clue,
                    ]) => (
                      <div
                        className="team-clue revealed"
                        key={id}
                      >
                        <div className="team-avatar purple">
                          {
                            clue.name
                              .substring(
                                0,
                                2
                              )
                              .toUpperCase()
                          }
                        </div>

                        <div>
                          <strong>
                            {
                              clue.name
                            }
                          </strong>

                          <p>
                            {
                              clue.clue
                            }
                          </p>
                        </div>
                      </div>
                    )
                  )
                )}
              </section>

              <section className="progress-panel">
                <div>
                  <span>
                    TEAM PROGRESS
                  </span>

                  <strong>
                    {progress}%
                  </strong>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width:
                        `${progress}%`,
                    }}
                  ></div>
                </div>
              </section>
            </aside>
          </div>

          {/* CHAT */}

          <section className="chat-panel">
            <div className="chat-header">
              <div>
                <span className="section-label">
                  LIVE TEAM CHAT
                </span>

                <h3>
                  Communicate to solve
                </h3>
              </div>

              <span className="online-status">
                <span></span>

                {connectionStatus ===
                "connected"
                  ? "Connected"
                  : "Connecting"}
              </span>
            </div>

            <div className="messages">
              {messages.length ===
              0 ? (
                <div className="empty-chat">
                  No messages yet.
                  Share a clue or
                  start discussing.
                </div>
              ) : (
                messages.map(
                  (message) => (
                    <div
                      key={
                        message.id
                      }
                      className={
                        message.system
                          ? "message system"
                          : message.own
                          ? "message yours"
                          : "message"
                      }
                    >
                      <strong>
                        {
                          message.sender
                        }
                      </strong>

                      <p>
                        {
                          message.text
                        }
                      </p>
                    </div>
                  )
                )
              )}
            </div>

            <div className="chat-input">
              <input
                value={
                  chatMessage
                }
                onChange={(event) =>
                  setChatMessage(
                    event.target
                      .value
                  )
                }
                onKeyDown={
                  handleChatKeyDown
                }
                placeholder="Share a clue or idea with your team..."
              />

              <button
                onClick={
                  sendMessage
                }
              >
                Send
              </button>
            </div>
          </section>
        </main>
      )}

      <footer>
        <span>
          MultiSolver
        </span>

        <p>
          Built around teamwork,
          communication and
          collaborative problem-solving.
        </p>
      </footer>
    </div>
  );
}

/* =========================
   FEATURE CARD
========================= */

function FeatureCard({
  number,
  icon,
  title,
  text,
}) {
  return (
    <div className="feature-card">
      <div className="feature-top">
        <span className="feature-number">
          {number}
        </span>

        <span className="feature-icon">
          {icon}
        </span>
      </div>

      <h4>
        {title}
      </h4>

      <p>
        {text}
      </p>

      <div className="feature-line"></div>
    </div>
  );
}

export default App;