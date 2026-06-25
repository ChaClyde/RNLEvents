// import {
//   createContext,
//   useContext,
//   useEffect,
//   useState,
//   type FC,
//   type ReactNode,
// } from "react";

// type Theme = "light" | "dark";

// type ThemeContextType = {
//   theme: Theme;
//   toggleTheme: () => void;
// };

// const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// const STORAGE_KEY = "evms-theme";

// const getInitialTheme = (): Theme => {
//   const stored = localStorage.getItem(STORAGE_KEY);
//   if (stored === "light" || stored === "dark") return stored;

//   const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
//   return prefersDark ? "dark" : "light";
// };

// export const useTheme = () => {
//   const context = useContext(ThemeContext);

//   if (!context) {
//     throw new Error("useTheme must be used within a ThemeProvider");
//   }

//   return context;
// };

// export const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
//   const [theme, setTheme] = useState<Theme>(getInitialTheme);

//   useEffect(() => {
//     const root = document.documentElement;
//     root.classList.toggle("dark", theme === "dark");
//     localStorage.setItem(STORAGE_KEY, theme);
//   }, [theme]);

//   const toggleTheme = () => {
//     setTheme((prev) => (prev === "light" ? "dark" : "light"));
//   };

//   return (
//     <ThemeContext.Provider value={{ theme, toggleTheme }}>
//       {children}
//     </ThemeContext.Provider>
//   );
// };
