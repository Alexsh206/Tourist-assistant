// src/profile/ProfilePage.jsx
import { useEffect, useState } from "react";
import api from "../api/axios";

export default function ProfilePage() {
    const [profile, setProfile] = useState({
        firstName: "",
        lastName: "",
        age: "",
        country: "",
        city: "",
        walkingRadiusM: ""
    });

    useEffect(() => {
        api.get("/profile/me").then(res => setProfile(res.data));
    }, []);

    const save = async () => {
        await api.post("/profile/me", profile);
        alert("Saved");
    };

    return (
        <div className="p-6">
            <h2>Profile</h2>

            {Object.keys(profile).map(key => (
                <input
                    key={key}
                    placeholder={key}
                    value={profile[key] || ""}
                    onChange={e => setProfile({ ...profile, [key]: e.target.value })}
                />
            ))}

            <button onClick={save}>Save</button>
        </div>
    );
}
