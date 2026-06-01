import { ReactNode } from "react";
import { ConsultoriaSidebar } from "./ConsultoriaSidebar";

interface ConsultoriaLayoutProps {
  children: ReactNode;
}

export const ConsultoriaLayout = ({ children }: ConsultoriaLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-background">
      <ConsultoriaSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
