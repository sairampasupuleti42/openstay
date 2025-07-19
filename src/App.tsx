import { cn } from "./lib/utils";

function App() {
  return (
    <div className={cn("min-h-screen bg-background text-foreground")}>
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Openstay</h1>
            <p className="text-muted-foreground text-lg">
              Please reach out to us with any questions or feedback.
              <br />
              <a
                href="mailto:sairampasupuleti.42@gmail.com"
                className="italic text-primary hover:text-primary/80 transition-colors underline"
              >
                sairampasupuleti.42@gmail.com
              </a>
            </p>
          </div>

          <div className="bg-card text-center border rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4 ">Under development</h2>
            <p className="text-muted-foreground">
              We're working hard to improve our platform. Stay tuned for
              updates!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
