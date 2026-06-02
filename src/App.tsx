import "./App.css";
import ChessEngine from "./engine/main";
const chessEngine = new ChessEngine();
console.log(chessEngine.perft(5));

function App() {
  return <div></div>;
}

export default App;
