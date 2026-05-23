import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api/axios";
import "./ProfilePage.css";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import ThemeSwitcher from "../components/ThemeSwitcher.jsx";
import {useNavigate} from "react-router-dom";

const emptyProfile = {
    id: null,
    firstName: "",
    lastName: "",
    birthDate: "",
    country: "",
    city: "",
    preferredLanguage: "",
    travelStyle: "",
    walkingRadiusM: "",
    accessibilityNeeds: false
};

export default function ProfilePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const tr = useCallback(
        (key, fallback) => t(key, { defaultValue: fallback }),
        [t]
    );

    const [profile, setProfile] = useState(emptyProfile);
    const [loading, setLoading] = useState(true);

    const [allInterests, setAllInterests] = useState([]);
    const [userInterests, setUserInterests] = useState([]);

    const [showAddInterest, setShowAddInterest] = useState(false);
    const [selectedInterestId, setSelectedInterestId] = useState("");
    const [newWeight, setNewWeight] = useState(1);

    useEffect(() => {
        Promise.all([
            api.get("/profile/me"),
            api.get("/interests"),
            api.get("/user-interests/me")
        ])
            .then(([profileRes, interestsRes, userInterestsRes]) => {
                setProfile({
                    ...emptyProfile,
                    ...profileRes.data,
                    preferredLanguage: profileRes.data.preferredLanguage ?? "",
                    travelStyle: profileRes.data.travelStyle ?? "",
                    accessibilityNeeds: profileRes.data.accessibilityNeeds ?? false
                });

                const interestsData = interestsRes.data;
                setAllInterests(
                    Array.isArray(interestsData)
                        ? interestsData
                        : interestsData?.content ?? []
                );

                const userInterestsData = userInterestsRes.data;
                setUserInterests(
                    Array.isArray(userInterestsData)
                        ? userInterestsData
                        : userInterestsData?.content ?? []
                );

                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                alert(tr("profile.failedToLoad", "Failed to load profile"));
                setLoading(false);
            });
    }, [tr]);

    const onChange = (e) => {
        const { name, value, type, checked } = e.target;

        setProfile(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const goToMap = () => {
        navigate("/", { replace: true });
    };

    const logout = () => {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
    };

    const removeInterest = (interestId) => {
        setUserInterests(prev =>
            prev.filter(ui => String(ui.interestId) !== String(interestId))
        );
    };

    const saveProfile = async () => {
        try {
            await api.post("/profile/me", {
                ...profile,
                dailyBudget: null,
                walkingRadiusM: profile.walkingRadiusM === "" ? null : Number(profile.walkingRadiusM),
                preferredLanguage: profile.preferredLanguage || null,
                travelStyle: profile.travelStyle || null
            });

            const interestsDto = userInterests.map(ui => ({
                interestId: ui.interestId,
                weight: ui.weight
            }));

            await api.put("/user-interests/me", interestsDto);

            alert(tr("profile.profileSaved", "Profile saved"));
        } catch (e) {
            console.error(e);
            alert(tr("profile.saveFailed", "Failed to save profile"));
        }
    };

    const addInterest = () => {
        const interest = allInterests.find(i => String(i.id) === String(selectedInterestId));

        if (!interest) return;

        setUserInterests(prev => [
            ...prev,
            {
                interestId: interest.id,
                interestName: interest.name,
                weight: newWeight
            }
        ]);

        setShowAddInterest(false);
        setSelectedInterestId("");
        setNewWeight(3);
    };

    if (loading) {
        return (
            <div className="profile-shell">
                <div className="profile-card">
                    <p>{tr("common.loading", "Loading...")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-shell">
            <div className="profile-card">
                <header className="profile-header">
                    <div className="profile-header-top">
                        <div>
                            <h2>{tr("profile.title", "Build your travel profile")}</h2>
                            <p className="subtitle">
                                {tr(
                                    "profile.subtitle",
                                    "Set your language, travel style, budget, distance, and interests so the assistant can recommend places that truly match your pace, mood, and current context."
                                )}
                            </p>
                        </div>

                        <div className="profile-top-actions">
                            <div className="top-switchers">
                                <LanguageSwitcher/>
                                <ThemeSwitcher/>
                            </div>

                            <button
                                type="button"
                                className="profile-nav-btn"
                                onClick={goToMap}
                            >
                                {tr("profile.backToMap", "Back to map")}
                            </button>

                            <button
                                type="button"
                                className="profile-nav-btn danger"
                                onClick={logout}
                            >
                                {tr("nav.logout", "Logout")}
                            </button>
                        </div>
                    </div>
                </header>

                <div className="profile-body">
                    <section className="profile-section">
                        <div className="section-header">
                            <div className="section-icon">👤</div>
                            <h3>{tr("profile.personalInformation", "Personal information")}</h3>
                        </div>

                        <div className="form-grid">
                            <div className="field">
                                <label>{tr("profile.firstName", "First name")}</label>
                                <input
                                    name="firstName"
                                    value={profile.firstName}
                                    onChange={onChange}
                                />
                                <span className="hint">
                                {tr("profile.firstNameHint", "Your given name")}
                            </span>
                            </div>

                            <div className="field">
                                <label>{tr("profile.lastName", "Last name")}</label>
                                <input
                                    name="lastName"
                                    value={profile.lastName}
                                    onChange={onChange}
                                />
                                <span className="hint">
                                {tr("profile.lastNameHint", "Your family name")}
                            </span>
                            </div>

                            <div className="field">
                                <label>{tr("profile.birthDate", "Date of birth")}</label>
                                <input
                                    type="date"
                                    name="birthDate"
                                    value={profile.birthDate}
                                    onChange={onChange}
                                />
                                <span className="hint">
                                {tr("profile.birthDateHint", "Used to personalize recommendations")}
                            </span>
                            </div>

                            <div className="field">
                                <label>{tr("profile.country", "Country")}</label>
                                <input
                                    name="country"
                                    value={profile.country}
                                    onChange={onChange}
                                />
                                <span className="hint">
                                {tr("profile.countryHint", "Your home country")}
                            </span>
                            </div>

                            <div className="field">
                                <label>{tr("profile.city", "City")}</label>
                                <input
                                    name="city"
                                    value={profile.city}
                                    onChange={onChange}
                                />
                                <span className="hint">
                                {tr("profile.cityHint", "City you usually start trips from")}
                            </span>
                            </div>

                            <div className="field">
                                <label>{tr("profile.language", "Preferred language")}</label>
                                <select
                                    name="preferredLanguage"
                                    value={profile.preferredLanguage}
                                    onChange={onChange}
                                >
                                    <option value="">
                                        {tr("profile.selectLanguage", "Select language")}
                                    </option>
                                    <option value="EN">{tr("profile.english", "English")}</option>
                                    <option value="UA">{tr("profile.ukrainian", "Ukrainian")}</option>
                                    <option value="PL">{tr("profile.polish", "Polish")}</option>
                                </select>
                                <span className="hint">
                                {tr("profile.languageHint", "Language for the app and guides")}
                            </span>
                            </div>

                            <div className="field">
                                <label>{tr("profile.travelStyle", "Travel style")}</label>
                                <select
                                    name="travelStyle"
                                    value={profile.travelStyle}
                                    onChange={onChange}
                                >
                                    <option value="">
                                        {tr("profile.selectStyle", "Select style")}
                                    </option>
                                    <option value="RELAX">{tr("profile.relax", "Relax")}</option>
                                    <option value="ACTIVE">{tr("profile.active", "Active")}</option>
                                    <option value="CULTURAL">{tr("profile.cultural", "Cultural")}</option>
                                    <option value="ADVENTURE">{tr("profile.adventure", "Adventure")}</option>
                                </select>
                                <span className="hint">
                                {tr("profile.travelStyleHint", "What kind of trips you prefer")}
                            </span>
                            </div>

                            <div className="field">
                                <label>{tr("profile.walkingRadius", "Walking radius (meters)")}</label>
                                <input
                                    type="number"
                                    name="walkingRadiusM"
                                    value={profile.walkingRadiusM}
                                    onChange={onChange}
                                />
                                <span className="hint">
                                {tr("profile.walkingRadiusHint", "How far you are willing to walk")}
                            </span>
                            </div>
                        </div>

                        <label className="checkbox-row">
                            <input
                                type="checkbox"
                                name="accessibilityNeeds"
                                checked={profile.accessibilityNeeds}
                                onChange={onChange}
                            />
                            <div>
                                <strong>{tr("profile.accessibility", "Accessibility needs")}</strong>
                                <div className="hint">
                                    {tr("profile.accessibilityHint", "Wheelchair access, elevators, etc.")}
                                </div>
                            </div>
                        </label>
                    </section>

                    <section className="profile-section">
                        <div className="section-header">
                            <div className="section-icon">🗺️</div>
                            <h3>{tr("profile.myInterests", "My interests")}</h3>
                        </div>

                        {userInterests.length === 0 ? (
                            <p className="empty-text">
                                {tr("profile.noInterests", "No interests added yet")}
                            </p>
                        ) : (
                            <ul className="interest-list">
                                {userInterests.map(ui => (
                                    <li key={ui.interestId} className="interest-pill">
                                        <span>{ui.interestName}</span>

                                        <span className="badge">
                {ui.weight}
            </span>

                                        <button
                                            type="button"
                                            className="interest-remove-btn"
                                            onClick={() => removeInterest(ui.interestId)}
                                            title={tr("profile.removeInterest", "Remove interest")}
                                            aria-label={tr("profile.removeInterest", "Remove interest")}
                                        >
                                            ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {!showAddInterest && (
                            <button
                                className="ghost-btn"
                                onClick={() => setShowAddInterest(true)}
                            >
                                + {tr("profile.addInterest", "Add interest")}
                            </button>
                        )}

                        {showAddInterest && (
                            <div className="add-interest-section">
                                <div className="form-grid two-cols">
                                    <div className="field">
                                    <label>{tr("profile.interest", "Interest")}</label>
                                        <select
                                            value={selectedInterestId}
                                            onChange={e => setSelectedInterestId(e.target.value)}
                                        >
                                            <option value="">
                                                {tr("profile.selectInterest", "Select interest")}
                                            </option>

                                            {allInterests
                                                .filter(i => !userInterests.some(ui => ui.interestId === i.id))
                                                .map(i => (
                                                    <option key={i.id} value={i.id}>
                                                        {i.name} ({i.category})
                                                    </option>
                                                ))}
                                        </select>
                                        <span className="hint">
                                        {tr("profile.interestHint", "Choose what you are interested in")}
                                    </span>
                                    </div>

                                    <div className="field">
                                        <label>{tr("profile.priority", "Priority")}</label>
                                        <select
                                            value={newWeight}
                                            onChange={e => setNewWeight(Number(e.target.value))}
                                        >
                                            <option value={1}>{tr("profile.priorityLow", "1 – Low")}</option>
                                            <option value={2}>2</option>
                                            <option value={3}>{tr("profile.priorityMedium", "3 – Medium")}</option>
                                            <option value={4}>4</option>
                                            <option value={5}>{tr("profile.priorityHigh", "5 – High")}</option>
                                        </select>
                                        <span className="hint">
                                        {tr("profile.priorityHint", "How important this interest is for you")}
                                    </span>
                                    </div>
                                </div>

                                <div className="actions">
                                    <button
                                        className="primary"
                                        disabled={!selectedInterestId}
                                        onClick={addInterest}
                                    >
                                        {tr("profile.addInterest", "Add interest")}
                                    </button>

                                    <button
                                        className="secondary"
                                        onClick={() => setShowAddInterest(false)}
                                    >
                                        {tr("common.cancel", "Cancel")}
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>

                </div>
                <div className="profile-save-bar">
                    <button className="primary-btn" onClick={saveProfile}>
                        {tr("profile.save", "Save profile")}
                    </button>
                </div>
            </div>
        </div>
    );
}
