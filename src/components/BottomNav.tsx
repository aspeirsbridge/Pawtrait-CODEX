import { Home, Image, Settings } from "lucide-react";
import { NavLink } from "./NavLink";
import { cn } from "@/lib/utils";

export const BottomNav = () => {
  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/gallery", icon: Image, label: "Gallery" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-20 max-w-md mx-auto px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-2xl transition-all duration-300 flex-1 overflow-hidden"
            activeClassName="bg-gradient-primary text-primary-foreground shadow-primary"
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-6 h-6", isActive && "animate-float")} />
                <span className="text-xs font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
