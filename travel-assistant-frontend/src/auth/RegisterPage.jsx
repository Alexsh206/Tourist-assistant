import { useState } from "react";
import api from "../api/axios";

export default function RegisterPage({ onRegister }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const register = async () => {
        const res = await api.post("/auth/register", { email, password });
        localStorage.setItem("token", res.data.token);
        onRegister();
    };

    return (
        <div className="p-6">
            <h2>Register</h2>
            <input placeholder="Email" onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
            <button onClick={register}>Register</button>
        </div>
    );
}
