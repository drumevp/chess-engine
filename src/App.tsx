import "./App.css";
import ChessBoard from "./frontend/components/ChessBoard";
import ChessEngine from "./engine/main";

function App() {
  const chessEngine = new ChessEngine();

  return <ChessBoard pieceAt={chessEngine.position.pieceAt}/>;
}

export default App;
