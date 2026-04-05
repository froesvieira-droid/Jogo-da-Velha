import { useState, useEffect, useCallback, FormEvent } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import { X, Circle, RefreshCw, Users, Trophy, Hash } from "lucide-react";

type Player = "X" | "O";
type GameState = "lobby" | "waiting" | "playing" | "gameOver";

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState("");
  const [gameState, setGameState] = useState<GameState>("lobby");
  const [board, setBoard] = useState<(Player | null)[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<Player>("X");
  const [mySymbol, setMySymbol] = useState<Player | null>(null);
  const [winner, setWinner] = useState<Player | "Draw" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("player-assignment", (symbol: Player) => {
      setMySymbol(symbol);
      setGameState("waiting");
    });

    newSocket.on("game-start", ({ board, turn }) => {
      setBoard(board);
      setTurn(turn);
      setGameState("playing");
    });

    newSocket.on("move-made", ({ board, turn }) => {
      setBoard(board);
      setTurn(turn);
    });

    newSocket.on("game-over", ({ winner }) => {
      setWinner(winner);
      setGameState("gameOver");
    });

    newSocket.on("player-left", () => {
      setError("Opponent left the game.");
      setGameState("lobby");
      setRoomId("");
    });

    newSocket.on("error", (msg: string) => {
      setError(msg);
      setGameState("lobby");
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const joinRoom = (e: FormEvent) => {
    e.preventDefault();
    if (roomId.trim() && socket) {
      socket.emit("join-room", roomId.trim());
      setError("");
    }
  };

  const makeMove = (index: number) => {
    if (gameState === "playing" && turn === mySymbol && !board[index] && socket) {
      socket.emit("make-move", { roomId, index });
    }
  };

  const resetGame = () => {
    setGameState("lobby");
    setRoomId("");
    setBoard(Array(9).fill(null));
    setWinner(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 bg-indigo-500/20 rounded-2xl">
            <Hash className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Tic-Tac-Toe
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {gameState === "lobby" && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <p className="text-slate-400 text-center">
                Create or join a room to play with a friend.
              </p>
              <form onSubmit={joinRoom} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter Room Code"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                >
                  Join Game
                </button>
              </form>
              {error && (
                <p className="text-rose-400 text-center text-sm font-medium bg-rose-400/10 py-2 rounded-xl">
                  {error}
                </p>
              )}
            </motion.div>
          )}

          {gameState === "waiting" && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6 py-8"
            >
              <div className="relative w-20 h-20 mx-auto">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full"
                />
                <Users className="absolute inset-0 m-auto w-8 h-8 text-indigo-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Waiting for Opponent</h2>
                <p className="text-slate-400">Share room code: <span className="text-indigo-400 font-mono font-bold">{roomId}</span></p>
              </div>
            </motion.div>
          )}

          {(gameState === "playing" || gameState === "gameOver") && (
            <motion.div
              key="game"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center px-2">
                <div className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${turn === "X" ? "bg-indigo-500/20 ring-1 ring-indigo-500/50" : "opacity-40"}`}>
                  <X className="w-6 h-6 text-indigo-400" />
                  <span className="font-bold">Player X</span>
                  {mySymbol === "X" && <span className="text-[10px] bg-indigo-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider">You</span>}
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${turn === "O" ? "bg-cyan-500/20 ring-1 ring-cyan-500/50" : "opacity-40"}`}>
                  <Circle className="w-5 h-5 text-cyan-400" />
                  <span className="font-bold">Player O</span>
                  {mySymbol === "O" && <span className="text-[10px] bg-cyan-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider">You</span>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {board.map((cell, i) => (
                  <button
                    key={i}
                    onClick={() => makeMove(i)}
                    disabled={gameState === "gameOver" || !!cell || turn !== mySymbol}
                    className={`aspect-square rounded-2xl flex items-center justify-center text-4xl transition-all shadow-inner
                      ${!cell && turn === mySymbol && gameState === "playing" ? "bg-slate-700/50 hover:bg-slate-700 cursor-pointer" : "bg-slate-900/50 cursor-default"}
                      ${cell === "X" ? "text-indigo-400" : "text-cyan-400"}
                    `}
                  >
                    {cell === "X" && (
                      <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}>
                        <X className="w-12 h-12" />
                      </motion.div>
                    )}
                    {cell === "O" && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Circle className="w-10 h-10" />
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>

              {gameState === "gameOver" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 text-center space-y-4"
                >
                  <div className="flex items-center justify-center gap-3">
                    <Trophy className="w-8 h-8 text-yellow-400" />
                    <h2 className="text-2xl font-bold">
                      {winner === "Draw" ? "It's a Draw!" : `${winner === mySymbol ? "You Won!" : "Opponent Won!"}`}
                    </h2>
                  </div>
                  <button
                    onClick={resetGame}
                    className="flex items-center justify-center gap-2 w-full bg-slate-700 hover:bg-slate-600 font-semibold py-3 rounded-xl transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Back to Lobby
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <p className="mt-8 text-slate-500 text-sm">
        Room Code: <span className="font-mono">{roomId || "None"}</span>
      </p>
    </div>
  );
}
