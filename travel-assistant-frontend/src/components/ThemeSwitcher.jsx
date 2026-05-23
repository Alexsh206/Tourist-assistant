import { useEffect, useState } from "react";

export default function ThemeSwitcher() {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("appTheme") || "light";
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("appTheme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };

    return (
        <button
            type="button"
            className="theme-switcher"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
            {theme === "dark" ? "☀️" : "🌙"}
        </button>
    );
}