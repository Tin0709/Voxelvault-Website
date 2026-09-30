import {useApi} from './lib/useApi';
import {categoryOptions} from './lib/categories';
import RequestState from './components/ui/RequestState';
import SiteBackground from './components/ui/SiteBackground';
import { lazy, Suspense, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
const HomePage=lazy(()=>import('./pages/HomePage'));
const ExplorePage=lazy(()=>import('./pages/ExplorePage'));
const PostDetailPage=lazy(()=>import('./pages/PostDetailPage'));
const EditPostPage=lazy(()=>import('./pages/EditPostPage'));
const CreatePostPage=lazy(()=>import('./pages/CreatePostPage'));
const MyPostsPage=lazy(()=>import('./pages/MyPostsPage'));
const AuthPage=lazy(()=>import('./pages/AuthPage'));
const CreatorProfilePage=lazy(()=>import('./pages/CreatorProfilePage'));
import RequireAuth from "./auth/RequireAuth";
const ProfileBasicsPage=lazy(()=>import('./pages/ProfileBasicsPage'));
import Notifications from './components/ui/Notifications';
import ConfirmHost from './components/ui/ConfirmHost';
const DraftPage=lazy(()=>import('./pages/DraftPage'));

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const {data:categoryData}=useApi('/categories');
  const customCategories=categoryData?.categories??[];
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
    <div className="vv-app flex min-h-screen flex-col font-body-md text-on-surface">
      <SiteBackground/><Header searchQuery={searchQuery} onSearchChange={handleSearchChange} onExplore={resetExplore} categories={categoryOptions(customCategories)} onCategorySelect={id=>{setActiveCategory(id);setSearchQuery('');navigate('/explore');}} />
      <div key={location.pathname} className="vault-route flex flex-1 flex-col min-w-0">

      <Suspense fallback={<RequestState loading/>}><Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/explore"
          element={
            <ExplorePage
              customCategories={customCategories}
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
      </Routes></Suspense>
      </div>
      <Notifications />
      <ConfirmHost />

      <Footer onExplore={resetExplore} />
    </div>
  );
}

export default App;
