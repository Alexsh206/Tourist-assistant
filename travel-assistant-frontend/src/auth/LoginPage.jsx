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
                        <h1 className="auth-title">Welcome back</h1>
                        <p className="auth-subtitle">Sign in to get your personalized recommendations</p>
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
                        <span className="hint">We’ll never share your email.</span>
                    </div>

                    <div className="field">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                        <span className="hint">Use at least 8 characters.</span>
                    </div>

                    <button
                        className="auth-primary"
                        onClick={login}
                        disabled={submitting}
                    >
                        {submitting ? "Signing in..." : "Login"}
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
                    By continuing you agree to the app’s basic usage rules.
                </div>
            </div>
        </div>
    );
}
