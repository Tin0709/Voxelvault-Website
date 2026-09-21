import Header from "./components/layout/Header";
import ExplorePage from "./pages/ExplorePage";

function App() {
  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface">
      <Header />
      <ExplorePage />
    </div>
  );
}

export default App;
