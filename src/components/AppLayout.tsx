import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 z-10">
          <header className="h-16 flex items-center border-b border-white/5 bg-background/60 backdrop-blur-xl px-6 shrink-0 sticky top-0 z-20">
            <SidebarTrigger className="mr-4 hover:bg-accent hover:text-accent-foreground transition-colors" />
            <h2 className="text-sm font-medium text-muted-foreground/80 tracking-wide uppercase">Vendor Management System</h2>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8 relative">
            <div className="mx-auto max-w-7xl relative z-10 w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
