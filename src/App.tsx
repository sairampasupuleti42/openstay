import { cn } from "./lib/utils";

function App() {
  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-primary-50 to-white text-foreground"
      )}
    >
      <div className="container mx-auto py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-full mb-4">
              <span className="text-2xl font-bold text-white">O</span>
            </div>
            <h1 className="text-4xl font-bold mb-4 font-heading bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-primary">
              Openstay
            </h1>
            <p className="text-muted-foreground text-lg font-sans">
              Please reach out to us with any questions or feedback.
              <br />
              <a
                href="mailto:sairampasupuleti.42@gmail.com"
                className="italic text-primary hover:text-primary-600 transition-colors underline decoration-primary-300 hover:decoration-primary-500"
              >
                sairampasupuleti.42@gmail.com
              </a>
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm text-center border border-primary-200 rounded-lg p-6 mb-8 shadow-lg shadow-primary-100/50">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-4">
              <div className="w-6 h-6 bg-primary-500 rounded animate-pulse"></div>
            </div>
            <h2 className="text-2xl font-semibold mb-4 font-heading text-primary-800">
              Under development
            </h2>
            <p className="text-muted-foreground font-sans">
              We're working hard to improve our platform. Stay tuned for
              updates!
            </p>
            <div className="mt-6 flex justify-center space-x-2">
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-primary-300 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </div>

          {/* Theme showcase */}
          <div className="mt-8 craft-showcase grid grid-cols-12 gap-4">
            <div className="col-span-9 p-4 rounded-lg "></div>
            <div className="col-span-3">
              <div className="bg-primary/85 text-primary-foreground p-4 rounded-lg border border-primary-200 h-full flex items-center justify-center">
                <div className="text-center">
                  <h3 className="font-heading font-semibold">Crafted by</h3>
                  <p className="text-sm">Sairam Pasupuleti</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
