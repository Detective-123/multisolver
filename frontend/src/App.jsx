import { useEffect, useState } from "react";
import "./App.css";

const PRIVATE_CLUE =
  "The pattern is based on multiplying each position by the next number.";

const TEAMMATES = [
  {
    name: "You",
    role: "Puzzle Solver",
    color: "purple",
    initials: "YO",
  },
  {
    name: "Player 2",
    role: "Logic",
    color: "blue",
    initials: "P2",
  },
  {
    name: "Player 3",
    role: "Clue Hunter",
    color: "green",
    initials: "P3",
  },
  {
    name: "Player 4",
    role: "Pattern Master",
    color: "orange",
    initials: "P4",
  },
];

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function App() {
  const [screen, setScreen] = useState("home");

  const [roomCode, setRoomCode] = useState("");
  const [createdCode, setCreatedCode] = useState("");

  const [clueShared, setClueShared] = useState(false);

  const [chatMessage, setChatMessage] = useState("");

  const [messages, setMessages] = useState([
    {
      sender: "Player 2",
      text: "Difference is +4, +6, +8...",
      own: false,
    },
    {
      sender: "Player 3",
      text: "So the next difference should be +10.",
      own: false,
    },
  ]);

  const [answer, setAnswer] = useState("");
  const [answerStatus, setAnswerStatus] = useState("");
  const [gameStarted, setGameStarted] = useState(false);

  const [timeLeft, setTimeLeft] = useState(10 * 60);

  /* ---------------- TIMER ---------------- */

  useEffect(() => {
    if (screen !== "game" || !gameStarted) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, gameStarted]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  /* ---------------- ROOM ---------------- */

  const createRoom = () => {
    const code = generateRoomCode();

    setCreatedCode(code);
    setScreen("lobby");
  };

  const joinRoom = () => {
    const code = roomCode.trim().toUpperCase();

    if (code.length !== 6) {
      alert("Enter a valid 6-character room code.");
      return;
    }

    setCreatedCode(code);
    setScreen("lobby");
  };

  /* ---------------- GAME ---------------- */

  const startGame = () => {
    setGameStarted(true);
    setClueShared(false);
    setAnswer("");
    setAnswerStatus("");
    setTimeLeft(10 * 60);

    setMessages([
      {
        sender: "Player 2",
        text: "Difference is +4, +6, +8...",
        own: false,
      },
      {
        sender: "Player 3",
        text: "So the next difference should be +10.",
        own: false,
      },
    ]);

    setScreen("game");
  };

  /* ---------------- SHARE CLUE ---------------- */

  const shareClue = () => {
    if (clueShared) {
      return;
    }

    setClueShared(true);

    setMessages((prev) => [
      ...prev,
      {
        sender: "You",
        text: PRIVATE_CLUE,
        own: true,
      },
    ]);
  };

  /* ---------------- CHAT ---------------- */

  const sendMessage = () => {
    const text = chatMessage.trim();

    if (!text) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        sender: "You",
        text,
        own: true,
      },
    ]);

    setChatMessage("");
  };

  const handleChatKeyDown = (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  /* ---------------- ANSWER ---------------- */

  const submitAnswer = () => {
    if (!answer.trim()) {
      return;
    }

    if (answer.trim() === "30") {
      setAnswerStatus("correct");

      setMessages((prev) => [
        ...prev,
        {
          sender: "System",
          text: "🎉 Team solved the puzzle!",
          own: false,
        },
      ]);
    } else {
      setAnswerStatus("wrong");
    }
  };

  return (
    <div className="app">
      <div className="ambient ambient-one"></div>
      <div className="ambient ambient-two"></div>
      <div className="grid-bg"></div>

      {/* ================= NAVBAR ================= */}

      <header className="navbar">
        <div
          className="brand"
          onClick={() => setScreen("home")}
        >
          <div className="brand-mark">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div>
            <h1>MultiSolver</h1>
            <p>Think Together. Solve Together.</p>
          </div>
        </div>

        <div className="nav-right">
          <div className="live-badge">
            <span className="live-dot"></span>
            MULTIPLAYER
          </div>

          <div className="version">v1.0</div>
        </div>
      </header>

      {/* ================= HOME ================= */}

      {screen === "home" && (
        <main className="home">
          <section className="hero">
            <div className="hero-badge">
              <span>✦</span>
              CO-OP PUZZLE EXPERIENCE
            </div>

            <h2>
              One Puzzle.
              <br />
              <span>Many Minds.</span>
            </h2>

            <p className="hero-text">
              A multiplayer puzzle game where players receive
              different pieces of information and must communicate,
              collaborate and solve the challenge together.
            </p>

            <div className="hero-actions">
              <button
                className="primary-btn"
                onClick={createRoom}
              >
                <span>＋</span>
                Create Room
                <b>→</b>
              </button>

              <button
                className="secondary-btn"
                onClick={() => setScreen("join")}
              >
                Join with Code
              </button>
            </div>

            <div className="hero-note">
              <span className="mini-dot"></span>
              Teamwork • Communication • Problem Solving
            </div>
          </section>

          <section className="concept-section">
            <div className="section-heading">
              <span className="section-label">
                WHY MULTISOLVER
              </span>

              <h3>
                You can't solve everything
                <span> alone.</span>
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
                text="The team combines all clues to reach one final answer."
              />
            </div>
          </section>

          <section className="challenge-banner">
            <div>
              <span className="section-label">
                THE CORE IDEA
              </span>

              <h3>
                Every player has a piece of the answer.
              </h3>
            </div>

            <div className="challenge-stat">
              <strong>4</strong>
              <span>
                Players
                <br />
                working together
              </span>
            </div>

            <div className="challenge-stat">
              <strong>1</strong>
              <span>
                Shared
                <br />
                objective
              </span>
            </div>

            <div className="challenge-stat">
              <strong>∞</strong>
              <span>
                Ways to
                <br />
                think
              </span>
            </div>
          </section>
        </main>
      )}

      {/* ================= JOIN ================= */}

      {screen === "join" && (
        <main className="room-page">
          <button
            className="back-btn"
            onClick={() => setScreen("home")}
          >
            ← Back
          </button>

          <div className="room-card">
            <div className="card-icon">↗</div>

            <span className="section-label">
              JOIN A TEAM
            </span>

            <h2>Enter your room code</h2>

            <p>
              Enter the code shared by your teammate to join their
              puzzle room.
            </p>

            <input
              value={roomCode}
              maxLength={6}
              onChange={(e) =>
                setRoomCode(
                  e.target.value
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .toUpperCase()
                )
              }
              placeholder="ABC123"
              className="room-input"
            />

            <button
              className="primary-btn full-btn"
              onClick={joinRoom}
            >
              Join Room
              <b>→</b>
            </button>

            <div className="secure-note">
              <span>●</span>
              Shared only with your team
            </div>
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

              <h2>Ready to solve?</h2>

              <p>
                Invite teammates and prepare for the challenge.
              </p>
            </div>

            <div className="room-code-box">
              <small>ROOM CODE</small>

              <strong>{createdCode}</strong>

              <button
                onClick={() =>
                  navigator.clipboard?.writeText(createdCode)
                }
              >
                Copy
              </button>
            </div>
          </div>

          <div className="lobby-layout">
            <section className="players-panel">
              <div className="panel-top">
                <div>
                  <span className="section-label">
                    YOUR TEAM
                  </span>

                  <h3>Players</h3>
                </div>

                <span className="player-count">
                  1 / 4
                </span>
              </div>

              <div className="players-grid">
                {TEAMMATES.map((player, index) => (
                  <div
                    className="player-card"
                    key={index}
                  >
                    <div
                      className={`avatar ${player.color}`}
                    >
                      {player.initials}
                    </div>

                    <div className="player-info">
                      <strong>{player.name}</strong>

                      <span>{player.role}</span>
                    </div>

                    <div
                      className={`player-status ${
                        index === 0 ? "you" : ""
                      }`}
                    >
                      {index === 0 ? "You" : "Open"}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="mission-panel">
              <span className="section-label">
                MISSION
              </span>

              <div className="mission-icon">
                ◆
              </div>

              <h3>How the challenge works</h3>

              <p>
                Each player gets different information.
                Your team must share clues, connect the
                information and submit one answer.
              </p>

              <div className="mission-rules">
                <div>
                  <span>01</span>
                  Receive a private clue
                </div>

                <div>
                  <span>02</span>
                  Share & discuss
                </div>

                <div>
                  <span>03</span>
                  Combine information
                </div>

                <div>
                  <span>04</span>
                  Solve together
                </div>
              </div>

              <button
                className="primary-btn full-btn"
                onClick={startGame}
              >
                Start Challenge
                <b>→</b>
              </button>
            </aside>
          </div>
        </main>
      )}

      {/* ================= GAME ================= */}

      {screen === "game" && (
        <main className="game-page">
          {/* GAME HEADER */}

          <div className="game-topbar">
            <div>
              <span className="section-label">
                MISSION 01 / TEAM CHALLENGE
              </span>

              <h2>The Hidden Pattern</h2>

              <p className="game-subtitle">
                Combine the clues. Find the pattern. Solve as a team.
              </p>
            </div>

            <div className="timer">
              <span>TIME LEFT</span>

              <strong>
                {formatTime(timeLeft)}
              </strong>
            </div>
          </div>

          {/* HOW TO PLAY */}

          <section className="how-to-play">
            <div className="how-title">
              <span className="how-icon">?</span>

              <div>
                <strong>HOW TO PLAY</strong>

                <p>
                  Your clue is private. Share it with your
                  team, combine everyone's information,
                  then submit one final answer.
                </p>
              </div>
            </div>

            <div className="how-steps">
              <div className={clueShared ? "step done" : "step"}>
                <span>01</span>
                Share clue
              </div>

              <div className="step">
                <span>02</span>
                Discuss
              </div>

              <div className="step">
                <span>03</span>
                Combine
              </div>

              <div
                className={
                  answerStatus === "correct"
                    ? "step done"
                    : "step"
                }
              >
                <span>04</span>
                Solve
              </div>
            </div>
          </section>

          <div className="game-layout">
            {/* LEFT SIDE */}

            <section className="game-main-column">
              {/* PRIVATE CLUE */}

              <section className="private-clue-panel">
                <div className="private-clue-header">
                  <div>
                    <span className="section-label">
                      YOUR PRIVATE CLUE
                    </span>

                    <h3>
                      Information only you receive
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

                  <p>{PRIVATE_CLUE}</p>
                </div>

                <div className="private-clue-action">
                  {clueShared ? (
                    <div className="shared-success">
                      ✓ Clue shared with your team
                    </div>
                  ) : (
                    <button
                      className="primary-btn"
                      onClick={shareClue}
                    >
                      Share Clue with Team
                      <b>→</b>
                    </button>
                  )}
                </div>
              </section>

              {/* TEAM PUZZLE */}

              <section className="puzzle-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-label">
                      TEAM PUZZLE
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
                    Your team has different pieces of
                    information. Use them together to
                    find the missing number.
                  </p>

                  <div className="sequence">
                    <span>2</span>

                    <i>→</i>

                    <span>6</span>

                    <i>→</i>

                    <span>12</span>

                    <i>→</i>

                    <span>20</span>

                    <i>→</i>

                    <span className="missing">
                      ?
                    </span>
                  </div>

                  <div className="sequence-hint">
                    <span>HINT</span>
                    <p>
                      Think about how each number can
                      be represented as:
                      <strong> n × (n + 1)</strong>
                    </p>
                  </div>
                </div>

                <div className="answer-section">
                  <label>TEAM ANSWER</label>

                  <div className="answer-row">
                    <input
                      type="number"
                      value={answer}
                      onChange={(e) =>
                        setAnswer(e.target.value)
                      }
                      placeholder="Enter final answer"
                    />

                    <button
                      className="primary-btn"
                      onClick={submitAnswer}
                    >
                      Submit
                      <b>→</b>
                    </button>
                  </div>

                  {answerStatus === "wrong" && (
                    <div className="answer-feedback wrong">
                      ✕ Not quite. Combine the clues again.
                    </div>
                  )}

                  {answerStatus === "correct" && (
                    <div className="answer-feedback correct">
                      ✓ Correct! Your team solved the puzzle.
                    </div>
                  )}
                </div>
              </section>
            </section>

            {/* RIGHT SIDE */}

            <aside className="team-sidebar">
              {/* TEAM BOARD */}

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
                    {clueShared ? "2 / 4" : "1 / 4"}
                  </span>
                </div>

                <div className="team-clue">
                  <div className="team-avatar purple">
                    P2
                  </div>

                  <div>
                    <strong>Player 2</strong>
                    <p>
                      Difference increases by 2 each time.
                    </p>
                  </div>
                </div>

                <div className="team-clue">
                  <div className="team-avatar purple">
                    P3
                  </div>

                  <div>
                    <strong>Player 3</strong>
                    <p>
                      First term starts from 1 × 2.
                    </p>
                  </div>
                </div>

                <div
                  className={
                    clueShared
                      ? "team-clue revealed"
                      : "team-clue waiting"
                  }
                >
                  <div className="team-avatar you">
                    YOU
                  </div>

                  <div>
                    <strong>Your clue</strong>

                    <p>
                      {clueShared
                        ? "n × (n + 1)"
                        : "Waiting for you to share..."}
                    </p>
                  </div>
                </div>

                <div className="team-clue waiting">
                  <div className="team-avatar">
                    P4
                  </div>

                  <div>
                    <strong>Player 4</strong>

                    <p>
                      Waiting for clue...
                    </p>
                  </div>
                </div>
              </section>

              {/* PROGRESS */}

              <section className="progress-panel">
                <div>
                  <span>TEAM PROGRESS</span>

                  <strong>
                    {answerStatus === "correct"
                      ? "100%"
                      : clueShared
                      ? "50%"
                      : "25%"}
                  </strong>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width:
                        answerStatus === "correct"
                          ? "100%"
                          : clueShared
                          ? "50%"
                          : "25%",
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
                3 online
              </span>
            </div>

            <div className="messages">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={
                    message.own
                      ? "message yours"
                      : message.sender === "System"
                      ? "message system"
                      : "message"
                  }
                >
                  <strong>
                    {message.sender}
                  </strong>

                  <p>{message.text}</p>
                </div>
              ))}
            </div>

            <div className="chat-input">
              <input
                value={chatMessage}
                onChange={(e) =>
                  setChatMessage(e.target.value)
                }
                onKeyDown={handleChatKeyDown}
                placeholder="Share a clue or idea with your team..."
              />

              <button onClick={sendMessage}>
                Send
              </button>
            </div>
          </section>
        </main>
      )}

      <footer>
        <span>MultiSolver</span>

        <p>
          Built around teamwork, communication and
          collaborative problem-solving.
        </p>
      </footer>
    </div>
  );
}

/* ================= FEATURE CARD ================= */

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

      <h4>{title}</h4>

      <p>{text}</p>

      <div className="feature-line"></div>
    </div>
  );
}

export default App;