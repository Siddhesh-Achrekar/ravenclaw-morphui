import { useState } from "react";
import { FloatingActionButton } from "@/components/MorphUI/FloatingActionButton";
import { Sidebar } from "@/components/MorphUI/Sidebar";

const Index = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Content */}
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-12 pt-12">
          <h1 className="text-4xl font-bold gradient-text mb-4">MorphUI Demo</h1>
          <p className="text-muted-foreground text-lg">
            Click the sparkle button in the bottom-right corner to open the MorphUI sidebar.
          </p>
        </div>

        {/* Sample Content */}
        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl">
            <h2 className="text-xl font-semibold mb-3">Sample Article</h2>
            <p className="text-muted-foreground leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
              incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
              exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-4 rounded-xl">
              <h3 className="font-medium mb-2">Feature One</h3>
              <p className="text-sm text-muted-foreground">
                Transform any webpage with a single click.
              </p>
            </div>
            <div className="glass p-4 rounded-xl">
              <h3 className="font-medium mb-2">Feature Two</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered accessibility improvements.
              </p>
            </div>
          </div>

          <div className="glass p-6 rounded-2xl">
            <h2 className="text-xl font-semibold mb-3">More Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu 
              fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in 
              culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </div>
        </div>
      </div>

      {/* MorphUI Components */}
      <FloatingActionButton
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        isOpen={isSidebarOpen}
      />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </div>
  );
};

export default Index;
