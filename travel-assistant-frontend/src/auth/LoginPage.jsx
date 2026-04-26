import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./LoginPage.css";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const navigate = useNavigate();

    const login = async () => {
        if (!email || !password) {
            alert("Please enter email and password");
            return;
        }

        try {
            setSubmitting(true);
            const res = await api.post("/auth/login", { email, password });
            localStorage.setItem("token", res.data.token);
            navigate("/", { replace: true });
        } catch (e) {
            console.error(e);
            alert("Login failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-shell">
            <div className="auth-card">
                <div className="auth-header">
                    <div>
                        <div className="auth-kicker">Smart travel companion</div>
                        <h1 className="auth-title">Welcome back</h1>
                        <p className="auth-subtitle">
                            Sign in to get live weather-aware recommendations, nearby places,
                            and a personalized city experience built around your travel style.
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
                        <span className="hint">Used to securely sync your profile and preferences.</span>
                    </div>

                    <div className="field">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                        <span className="hint">Use your existing account credentials to continue.</span>
                    </div>

                    <button
                        className="auth-primary"
                        onClick={login}
                        disabled={submitting}
                    >
                        {submitting ? "Signing in..." : "Enter the app"}
                    </button>

                    <div className="auth-divider">
                        <span />
                        <p>New here?</p>
                        <span />
                    </div>

                    <button
                        className="auth-secondary"
                        type="button"
                        onClick={() => navigate("/register")}
                    >
                        Create account
                    </button>
                </div>

                <div className="auth-footer">
                    Designed for smooth city discovery, personalized routes, and context-aware recommendations.
                </div>
            </div>
        </div>
    );
}
