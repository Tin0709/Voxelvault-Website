import { useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import ExplorePage from "./pages/ExplorePage";
import PostDetailPage from "./pages/PostDetailPage";

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const navigate = useNavigate();
  const location = useLocation();

  function handleSearchChange(value) {
    setSearchQuery(value);

    if (location.pathname !== "/") {
      navigate("/");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-body-md text-on-surface">
      <Header searchQuery={searchQuery} onSearchChange={handleSearchChange} />

      <Routes>
        <Route
          path="/"
          element={
            <ExplorePage
              searchQuery={searchQuery}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
          }
        />

        <Route path="/creations/:id" element={<PostDetailPage />} />

        <Route
          path="*"
          element={
            <main className="w-full flex-1 px-6 py-20 text-center">
              <h1 className="text-3xl">Page not found</h1>
              <Link to="/" className="mt-6 inline-block text-primary">
                Back to Explore
              </Link>
            </main>
          }
        />
      </Routes>

      <Footer />
    </div>
  );
}

export default App;
