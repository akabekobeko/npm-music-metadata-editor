import { Button } from "@/components/ui/button";

function App() {
  const versions = window.mme?.versions;

  return (
    <div className="mx-auto max-w-3xl p-8 text-center">
      <h1 className="text-4xl font-bold leading-tight">Music Metadata Editor</h1>
      <p className="mt-2 text-sm text-muted-foreground">Phase 1 foundation skeleton.</p>
      <div className="py-8">
        <Button variant="outline">Ready</Button>
      </div>
      {versions && (
        <div className="mt-8 space-y-1 text-sm text-muted-foreground">
          <p>Electron: {versions.electron}</p>
          <p>Chrome: {versions.chrome}</p>
          <p>Node: {versions.node}</p>
        </div>
      )}
    </div>
  );
}

export default App;
