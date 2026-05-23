import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/axios";
import "./LoginPage.css";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ThemeSwitcher from "../components/ThemeSwitcher.jsx";

export default function LoginPage() {
    const { t } = useTranslation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const navigate = useNavigate();

    const login = async () => {
        if (!email || !password) {
            alert(t("auth.enterEmailPassword"));
            return;
        }

        try {
            setSubmitting(true);
            const res = await api.post("/auth/login", { email, password });
            localStorage.setItem("token", res.data.token);
            navigate("/", { replace: true });
        } catch (e) {
            console.error(e);
            alert(t("auth.loginFailed"));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-shell">
            <div className="auth-panel">
                <div className="auth-dots">
                    <div className="auth-dot" />
                    <div className="auth-dot" />
                    <div className="auth-dot" />
                </div>
                <div className="auth-panel-brand">
                    <p className="auth-panel-tagline">
                        Discover places <em>made for you,</em> on the map.
                    </p>
                    <p className="auth-panel-sub">
                        Personalized travel recommendations based on your interests, style, and pace.
                    </p>
                </div>
            </div>
            <div className="auth-form-side">
                <div className="page-language-row">
                    <LanguageSwitcher />
                    <ThemeSwitcher />
                </div>

                <div className="auth-form-header">
                    <div className="auth-kicker">{t("app.tagline")}</div>
                    <h1 className="auth-title">{t("auth.loginTitle")}</h1>
                    <p className="auth-subtitle">
                        {t("auth.loginSubtitle")}
                    </p>
                </div>

                <div className="auth-form">
                    <div className="field">
                        <label>{t("auth.email")}</label>
                        <input
                            placeholder={t("auth.emailPlaceholder")}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                        />
                        <span className="hint">{t("auth.emailHint")}</span>
                    </div>

                    <div className="field">
                        <label>{t("auth.password")}</label>
                        <input
                            type="password"
                            placeholder={t("auth.passwordPlaceholder")}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                        <span className="hint">{t("auth.passwordHint")}</span>
                    </div>

                    <button
                        className="auth-primary"
                        onClick={login}
                        disabled={submitting}
                    >
                        {submitting ? t("auth.loginLoading") : t("auth.loginButton")}
                    </button>

                    <div className="auth-divider">
                        <span />
                        <p>{t("auth.newHere")}</p>
                        <span />
                    </div>

                    <button
                        className="auth-secondary"
                        type="button"
                        onClick={() => navigate("/register")}
                    >
                        {t("auth.createAccount")}
                    </button>
                </div>

                <div className="auth-footer">
                    {t("auth.loginFooter")}
                </div>
            </div>
        </div>
    );
}