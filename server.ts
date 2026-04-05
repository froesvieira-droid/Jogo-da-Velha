import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Game state management
  const rooms = new Map<string, {
    board: (string | null)[];
    turn: string;
    players: { [id: string]: "X" | "O" };
  }>();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId: string) => {
      const room = rooms.get(roomId);
      
      if (!room) {
        // Create new room
        rooms.set(roomId, {
          board: Array(9).fill(null),
          turn: "X",
          players: { [socket.id]: "X" }
        });
        socket.join(roomId);
        socket.emit("player-assignment", "X");
      } else {
        const playerIds = Object.keys(room.players);
        if (playerIds.length >= 2) {
          socket.emit("error", "Room is full");
          return;
        }
        
        // Join existing room as O
        room.players[socket.id] = "O";
        socket.join(roomId);
        socket.emit("player-assignment", "O");
        
        // Notify both players that game can start
        io.to(roomId).emit("game-start", {
          board: room.board,
          turn: room.turn
        });
      }
    });

    socket.on("make-move", ({ roomId, index }: { roomId: string, index: number }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const playerSymbol = room.players[socket.id];
      if (playerSymbol !== room.turn) return;
      if (room.board[index]) return;

      room.board[index] = playerSymbol;
      room.turn = playerSymbol === "X" ? "O" : "X";

      io.to(roomId).emit("move-made", {
        board: room.board,
        turn: room.turn
      });

      // Check for winner
      const winner = calculateWinner(room.board);
      if (winner) {
        io.to(roomId).emit("game-over", { winner });
        rooms.delete(roomId); // Reset room after game over
      } else if (!room.board.includes(null)) {
        io.to(roomId).emit("game-over", { winner: "Draw" });
        rooms.delete(roomId);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      // Clean up rooms if a player leaves
      for (const [roomId, room] of rooms.entries()) {
        if (room.players[socket.id]) {
          io.to(roomId).emit("player-left");
          rooms.delete(roomId);
        }
      }
    });
  });

  function calculateWinner(squares: (string | null)[]) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
