function App() {
  return (
    <main className="min-h-screen bg-background text-on-surface font-body-md">
      <div className="p-margin">
        <h1 className="font-headline-lg text-headline-lg">VoxelVault</h1>

        <p className="mt-4 text-on-surface-variant">
          Monumental voxel architecture archive.
        </p>

        <button
          className="
            mt-6
            rounded-full
            bg-primary
            px-5
            py-2.5
            font-label-md
            text-on-primary
          "
        >
          Create
        </button>
      </div>
    </main>
  );
}

export default App;
