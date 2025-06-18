
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
};
