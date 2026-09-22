import PostEditor from "../components/post/PostEditor";

const emptyCreation = {
  id: "new-post",
  title: "",
  category: "uncategorized",
  creator: "You",
  location: "",
  description: "",
  revisionNotes: "",
  minecraftVersion: "",
  image: "",
  alt: "",
  gallery: [],
  ownerId: null,
  originalCreator: "",
  originalSource: "",
  creditUrl: "",
  attachments: [],
  externalDownloads: [],
};

function CreatePostPage() {
  return (
    <PostEditor key="create-post" creation={emptyCreation} mode="create" />
  );
}

export default CreatePostPage;
