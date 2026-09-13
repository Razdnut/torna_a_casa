import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";
import { APP_THEMES } from "@/lib/theme";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="torna-a-casa-theme"
      themes={[...APP_THEMES]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
