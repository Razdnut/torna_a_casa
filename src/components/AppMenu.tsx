import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menuItems = [
  { to: "/", label: "Home" },
  { to: "/tracker", label: "Tracker" },
  { to: "/calendario", label: "Calendario" },
  { to: "/archivio", label: "Archivio" },
  { to: "/impostazioni", label: "Impostazioni" },
];

const AppMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur">
      <div className="mx-auto w-full max-w-5xl p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Menu</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls="app-menu-panel"
          >
            {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span className="sr-only">Apri o chiudi il menu</span>
          </Button>
        </div>

        <nav
          id="app-menu-panel"
          className={cn(
            "grid overflow-hidden transition-all duration-200",
            isOpen ? "mt-3 max-h-96 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="grid gap-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-700 hover:bg-gray-100",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default AppMenu;