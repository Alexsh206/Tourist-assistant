import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/axios";
import "./LoginPage.css";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ThemeSwitcher from "../components/ThemeSwitcher.jsx";

export default function RegisterPage({ onRegister }) {
    const { t } = useTranslation();

    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const register = async () => {
        if (!email || !password) {
            alert(t("auth.enterEmailPassword"));
            return;
        }

        try {
            setSubmitting(true);
            const res = await api.post("/auth/register", { email, password });
            localStorage.setItem("token", res.data.token);

            if (onRegister) {
                onRegister();
            } else {
                navigate("/", { replace: true });
            }
        } catch (e) {
            console.error(e);
            alert(t("auth.registrationFailed"));
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
                        Your next adventure <em>starts here.</em>
                    </p>
                    <p className="auth-panel-sub">
                        Build your travel profile once, get personalized recommendations everywhere you go.
                    </p>
                </div>
            </div>
            <div className="auth-form-side">
                <div className="page-language-row">
                    <LanguageSwitcher />
                    <ThemeSwitcher />
                </div>

                <div className="auth-form-header">
                    <div className="auth-kicker">{t("auth.registerKicker")}</div>
                    <h1 className="auth-title">{t("auth.registerTitle")}</h1>
                    <p className="auth-subtitle">
                        {t("auth.registerSubtitle")}
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
                        <span className="hint">{t("auth.registerEmailHint")}</span>
                    </div>

                    <div className="field">
                        <label>{t("auth.password")}</label>
                        <input
                            type="password"
                            placeholder={t("auth.newPasswordPlaceholder")}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                        <span className="hint">{t("auth.registerPasswordHint")}</span>
                    </div>

                    <button
                        className="auth-primary"
                        onClick={register}
                        disabled={submitting}
                    >
                        {submitting ? t("auth.registerLoading") : t("auth.registerButton")}
                    </button>

                    <div className="auth-divider">
                        <span />
                        <p>{t("auth.alreadyHaveAccount")}</p>
                        <span />
                    </div>

                    <button
                        className="auth-secondary"
                        type="button"
                        onClick={() => navigate("/login")}
                    >
                        {t("auth.goToLogin")}
                    </button>
                </div>

                <div className="auth-footer">
                    {t("auth.registerFooter")}
                </div>
            </div>
        </div>
    );
}