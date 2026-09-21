import { useState } from "react";
import Header from "./components/layout/Header";
import ExplorePage from "./pages/ExplorePage";

function App() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <ExplorePage searchQuery={searchQuery} />
    </div>
  );
}

export default App;
