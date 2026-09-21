import { Link, useParams } from "react-router";
import PostEditor from "../components/post/PostEditor";
import { creations } from "../data/creations";

function EditPostPage() {
  const { id } = useParams();

  const creation = creations.find((item) => item.id === id);

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
