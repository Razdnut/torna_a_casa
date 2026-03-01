import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const menuItems = [
  { to: "/", label: "Home" },
  { to: "/tracker", label: "Tracker" },
  { to: "/calendario", label: "Calendario" },
  { to: "/archivio", label: "Archivio" },
  { to: "/impostazioni", label: "Impostazioni" },
];

const AppMenu = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 p-3">
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
      </nav>
    </header>
  );
};

export default AppMenu;