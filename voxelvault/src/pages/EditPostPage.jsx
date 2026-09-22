import { Link, useParams } from "react-router";
import PostEditor from "../components/post/PostEditor";
import { useApi } from "../lib/useApi";
import { useAuth } from "../auth/AuthContext";
import RequestState from "../components/ui/RequestState";

function EditPostPage() {
  const { id } = useParams();

  const { user } = useAuth();
  const { data: creation, loading, error } = useApi(`/posts/${encodeURIComponent(id)}`);
  if (loading || error) return <RequestState loading={loading} error={error} />;
  if (creation && creation.ownerId !== user.id) return <RequestState error="You can only edit your own posts." />;

  if (!creation) {
    return (
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-20 lg:px-10">
        <h1 className="font-headline-lg text-3xl">Creation not found</h1>

        <Link to="/" className="mt-6 inline-block text-primary">
          ← Back to Explore
        </Link>
      </main>
    );
  }

  return <PostEditor key={creation.id} creation={creation} />;
}

export default EditPostPage;
