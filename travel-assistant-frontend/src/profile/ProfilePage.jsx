import { useEffect, useState } from "react";
import api from "../api/axios";
import "./ProfilePage.css";

const emptyProfile = {
    id: null,
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

    const [allInterests, setAllInterests] = useState([]);
    const [userInterests, setUserInterests] = useState([]);

    const [showAddInterest, setShowAddInterest] = useState(false);
    const [selectedInterestId, setSelectedInterestId] = useState("");
    const [newWeight, setNewWeight] = useState(1);

    /* ================= LOAD ================= */

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
                    dailyBudget: profileRes.data.dailyBudget ?? "",
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
                alert("Failed to load profile");
            });
    }, []);




    const onChange = (e) => {
        const { name, value, type, checked } = e.target;
        setProfile(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const saveProfile = async () => {
        await api.post("/profile/me", {
            ...profile,
            dailyBudget: profile.dailyBudget === "" ? null : Number(profile.dailyBudget),
            walkingRadiusM: Number(profile.walkingRadiusM),
            preferredLanguage: profile.preferredLanguage || null,
            travelStyle: profile.travelStyle || null
        });

        const interestsDto = userInterests.map(ui => ({
            interestId: ui.interestId,
            weight: ui.weight
        }));

        await api.put("/user-interests/me", interestsDto);

        alert("Profile saved");
    };

    if (loading) return <p>Loading...</p>;

    return (
        <div className="profile-shell">
            <div className="profile-card glass">
                <header className="profile-header">
                    <h2>My Profile</h2>
                    <p className="subtitle">Personal travel preferences</p>
                </header>

                <section className="profile-section">
                    <h3>Personal information</h3>

                    <div className="form-grid">

                        <div className="field">
                            <label>First name</label>
                            <input
                                name="firstName"
                                value={profile.firstName}
                                onChange={onChange}
                            />
                            <span className="hint">Your given name</span>
                        </div>

                        <div className="field">
                            <label>Last name</label>
                            <input
                                name="lastName"
                                value={profile.lastName}
                                onChange={onChange}
                            />
                            <span className="hint">Your family name</span>
                        </div>

                        <div className="field">
                            <label>Date of birth</label>
                            <input
                                type="date"
                                name="birthDate"
                                value={profile.birthDate}
                                onChange={onChange}
                            />
                            <span className="hint">Used to personalize recommendations</span>
                        </div>

                        <div className="field">
                            <label>Country</label>
                            <input
                                name="country"
                                value={profile.country}
                                onChange={onChange}
                            />
                            <span className="hint">Your home country</span>
                        </div>

                        <div className="field">
                            <label>City</label>
                            <input
                                name="city"
                                value={profile.city}
                                onChange={onChange}
                            />
                            <span className="hint">City you usually start trips from</span>
                        </div>

                        <div className="field">
                            <label>Preferred language</label>
                            <select
                                name="preferredLanguage"
                                value={profile.preferredLanguage}
                                onChange={onChange}
                            >
                                <option value="">Select language</option>
                                <option value="EN">English</option>
                                <option value="UA">Ukrainian</option>
                                <option value="PL">Polish</option>
                            </select>
                            <span className="hint">Language for the app and guides</span>
                        </div>

                        <div className="field">
                            <label>Travel style</label>
                            <select
                                name="travelStyle"
                                value={profile.travelStyle}
                                onChange={onChange}
                            >
                                <option value="">Select style</option>
                                <option value="RELAX">Relax</option>
                                <option value="ACTIVE">Active</option>
                                <option value="CULTURAL">Cultural</option>
                                <option value="ADVENTURE">Adventure</option>
                            </select>
                            <span className="hint">What kind of trips you prefer</span>
                        </div>

                        <div className="field">
                            <label>Daily budget (€)</label>
                            <input
                                type="number"
                                name="dailyBudget"
                                value={profile.dailyBudget}
                                onChange={onChange}
                            />
                            <span className="hint">Approximate spending per day</span>
                        </div>

                        <div className="field">
                            <label>Walking radius (meters)</label>
                            <input
                                type="number"
                                name="walkingRadiusM"
                                value={profile.walkingRadiusM}
                                onChange={onChange}
                            />
                            <span className="hint">How far you are willing to walk</span>
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
                            <strong>Accessibility needs</strong>
                            <div className="hint">Wheelchair access, elevators, etc.</div>
                        </div>
                    </label>
                </section>


                <section className="profile-section">
                    <h3>My interests</h3>

                    {userInterests.length === 0 ? (
                        <p className="empty-text">No interests added yet</p>
                    ) : (
                        <ul className="interest-list">
                            {userInterests.map(ui => (
                                <li key={ui.interestId} className="interest-pill">
                                    <span>{ui.interestName}</span>
                                    <span className="badge">{ui.weight}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!showAddInterest && (
                        <button className="ghost-btn" onClick={() => setShowAddInterest(true)}>
                            + Add interest
                        </button>
                    )}

                    {showAddInterest && (
                        <div className="add-interest-section">

                            <div className="form-grid two-cols">

                                <div className="field">
                                    <label>Interest</label>
                                    <select
                                        value={selectedInterestId}
                                        onChange={e => setSelectedInterestId(e.target.value)}
                                    >
                                        <option value="">Select interest</option>

                                        {allInterests
                                            .filter(i =>
                                                !userInterests.some(ui => ui.interestId === i.id)
                                            )
                                            .map(i => (
                                                <option key={i.id} value={i.id}>
                                                    {i.name} ({i.category})
                                                </option>
                                            ))}
                                    </select>
                                    <span className="hint">
                    Choose what you are interested in
                </span>
                                </div>

                                <div className="field">
                                    <label>Priority</label>
                                    <select
                                        value={newWeight}
                                        onChange={e => setNewWeight(Number(e.target.value))}
                                    >
                                        <option value={1}>1 – Low</option>
                                        <option value={2}>2</option>
                                        <option value={3}>3 – Medium</option>
                                        <option value={4}>4</option>
                                        <option value={5}>5 – High</option>
                                    </select>
                                    <span className="hint">
                    How important this interest is for you
                </span>
                                </div>

                            </div>

                            <div className="actions">
                                <button
                                    className="primary"
                                    disabled={!selectedInterestId}
                                    onClick={() => {
                                        const interest = allInterests.find(
                                            i => i.id === Number(selectedInterestId)
                                        );

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
                                    }}
                                >
                                    Add interest
                                </button>

                                <button
                                    className="secondary"
                                    onClick={() => setShowAddInterest(false)}
                                >
                                    Cancel
                                </button>
                            </div>

                        </div>
                    )}

                </section>

                <button className="primary-btn" onClick={saveProfile}>
                    Save profile
                </button>
            </div>
        </div>
    );

}
