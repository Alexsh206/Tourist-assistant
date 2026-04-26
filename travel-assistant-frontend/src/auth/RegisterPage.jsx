import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./LoginPage.css";

export default function RegisterPage({ onRegister }) {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const register = async () => {
        if (!email || !password) {
            alert("Please enter email and password");
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
            alert("Registration failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-shell">
            <div className="auth-card">
                <div className="auth-header">
                    <div>
                        <div className="auth-kicker">Create your journey profile</div>
                        <h1 className="auth-title">Start exploring smarter</h1>
                        <p className="auth-subtitle">
                            Create an account to unlock personalized recommendations,
                            weather-aware suggestions, and travel preferences tailored to you.
                        </p>
                    </div>
                </div>

                <div className="auth-form">
                    <div className="field">
                        <label>Email</label>
                        <input
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                        />
                        <span className="hint">This will be your sign-in email for the app.</span>
                    </div>

                    <div className="field">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Create a secure password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                        <span className="hint">Choose a strong password to keep your profile safe.</span>
                    </div>

                    <button
                        className="auth-primary"
                        onClick={register}
                        disabled={submitting}
                    >
                        {submitting ? "Creating account..." : "Create account"}
                    </button>

                    <div className="auth-divider">
                        <span />
                        <p>Already have an account?</p>
                        <span />
                    </div>

                    <button
                        className="auth-secondary"
                        type="button"
                        onClick={() => navigate("/login")}
                    >
                        Go to login
                    </button>
                </div>

                <div className="auth-footer">
                    A modern assistant for discovering places that fit your mood, distance, and real-time conditions.
                </div>
            </div>
        </div>
    );
}