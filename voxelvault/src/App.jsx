import { useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import HomePage from './pages/HomePage';
import ExplorePage from "./pages/ExplorePage";
import PostDetailPage from "./pages/PostDetailPage";
import EditPostPage from "./pages/EditPostPage";
import CreatePostPage from "./pages/CreatePostPage";
import MyPostsPage from "./pages/MyPostsPage";
import AuthPage from "./pages/AuthPage";
import CreatorProfilePage from "./pages/CreatorProfilePage";
import RequireAuth from "./auth/RequireAuth";
import ProfileBasicsPage from "./pages/ProfileBasicsPage";
import Notifications from './components/ui/Notifications';
import ConfirmHost from './components/ui/ConfirmHost';
import DraftPage from './pages/DraftPage';

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const navigate = useNavigate();
  const location = useLocation();

  function resetExplore() {
    setSearchQuery('');
    setActiveCategory('all');
  }

  function handleSearchChange(value) {
    setSearchQuery(value);

    if (location.pathname !== "/explore") {
      navigate("/explore");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-body-md text-on-surface">
      <Header searchQuery={searchQuery} onSearchChange={handleSearchChange} onExplore={resetExplore} />
      <div key={location.pathname} className="vault-route flex flex-1 flex-col min-w-0">

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/explore"
          element={
            <ExplorePage
              searchQuery={searchQuery}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
          }
        />
        <Route path="/create" element={<RequireAuth><CreatePostPage /></RequireAuth>} />
        <Route path="/drafts/:id" element={<RequireAuth><DraftPage /></RequireAuth>} />
        <Route path="/my-posts" element={<RequireAuth><MyPostsPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><CreatorProfilePage own /></RequireAuth>} />
        <Route path="/profile/edit" element={<RequireAuth><ProfileBasicsPage /></RequireAuth>} />
        <Route path="/creations/:id/edit" element={<RequireAuth><EditPostPage /></RequireAuth>} />

        <Route path="/creations/:id" element={<PostDetailPage />} />

        <Route
          path="*"
          element={
            <main className="w-full flex-1 px-6 py-20 text-center">
              <h1 className="text-3xl">Page not found</h1>
              <Link to="/explore" className="mt-6 inline-block text-primary">
                Back to Explore
              </Link>
            </main>
          }
        />
        <Route path="/login" element={<AuthPage key="login" mode="login" />} />

        <Route
          path="/register"
          element={<AuthPage key="register" mode="register" />}
        />
        <Route path="/creators/:creatorId" element={<CreatorProfilePage />} />
      </Routes>
      </div>
      <Notifications />
      <ConfirmHost />

      <Footer onExplore={resetExplore} />
    </div>
  );
}

export default App;
