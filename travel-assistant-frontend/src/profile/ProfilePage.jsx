import { useEffect, useState } from "react";
import api from "../api/axios";
import "./ProfilePage.css";

const emptyProfile = {
    firstName: "",
    lastName: "",
    birthDate: "",
    country: "",
    city: "",
    preferredLanguage: "",
    travelStyle: "",
    dailyBudget: "",
    walkingRadiusM: "",
    accessibilityNeeds: false
};

export default function ProfilePage() {
    const [profile, setProfile] = useState(emptyProfile);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/profile/me").then(res => {
            setProfile({
                ...emptyProfile,
                ...res.data,
                dailyBudget: res.data.dailyBudget ?? "",
                preferredLanguage: res.data.preferredLanguage ?? "",
                travelStyle: res.data.travelStyle ?? "",
                accessibilityNeeds: res.data.accessibilityNeeds ?? false
            });
            setLoading(false);
        });
    }, []);

    const onChange = (e) => {
        const { name, value, type, checked } = e.target;
        setProfile(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const save = async () => {
        await api.post("/profile/me", {
            ...profile,
            dailyBudget: profile.dailyBudget === "" ? null : Number(profile.dailyBudget),
            walkingRadiusM: Number(profile.walkingRadiusM),
            preferredLanguage: profile.preferredLanguage || null,
            travelStyle: profile.travelStyle || null
        });
        alert("Profile saved");
    };

    if (loading) return <p>Loading...</p>;

    return (
        <div className="profile-container">
            <h2>My Profile</h2>

            <div className="grid">
                <input name="firstName" placeholder="First name" value={profile.firstName} onChange={onChange} />
                <input name="lastName" placeholder="Last name" value={profile.lastName} onChange={onChange} />
                <input type="date" name="birthDate" value={profile.birthDate} onChange={onChange} />
                <input name="country" placeholder="Country" value={profile.country} onChange={onChange} />
                <input name="city" placeholder="City" value={profile.city} onChange={onChange} />

                <select name="preferredLanguage" value={profile.preferredLanguage} onChange={onChange}>
                    <option value="">Preferred language</option>
                    <option value="EN">English</option>
                    <option value="UA">Ukrainian</option>
                    <option value="PL">Polish</option>
                </select>

                <select name="travelStyle" value={profile.travelStyle} onChange={onChange}>
                    <option value="">Travel style</option>
                    <option value="RELAX">Relax</option>
                    <option value="ACTIVE">Active</option>
                    <option value="CULTURAL">Cultural</option>
                    <option value="ADVENTURE">Adventure</option>
                </select>

                <input
                    type="number"
                    name="dailyBudget"
                    placeholder="Daily budget (€)"
                    value={profile.dailyBudget}
                    onChange={onChange}
                />

                <input
                    type="number"
                    name="walkingRadiusM"
                    placeholder="Walking radius (m)"
                    value={profile.walkingRadiusM}
                    onChange={onChange}
                />
            </div>

            <label className="checkbox">
                <input
                    type="checkbox"
                    name="accessibilityNeeds"
                    checked={profile.accessibilityNeeds}
                    onChange={onChange}
                />
                Accessibility needs
            </label>

            <button onClick={save}>Save profile</button>
        </div>
    );
}
