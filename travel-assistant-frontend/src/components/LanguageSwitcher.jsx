import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const changeLanguage = async (lang) => {
        await i18n.changeLanguage(lang);
        localStorage.setItem("appLanguage", lang);
    };

    const currentLanguage = i18n.language?.startsWith("uk") ? "uk" : "en";

    return (
        <div className="language-switcher">
            <button
                type="button"
                className={currentLanguage === "en" ? "active" : ""}
                onClick={() => changeLanguage("en")}
            >
                EN
            </button>

            <button
                type="button"
                className={currentLanguage === "uk" ? "active" : ""}
                onClick={() => changeLanguage("uk")}
            >
                UA
            </button>
        </div>
    );
}