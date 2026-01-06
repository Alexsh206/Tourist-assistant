import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";


import "./MapPage.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

export default function MapPage() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [pos, setPos] = useState(null); // { lat, lng }
    const [error, setError] = useState("");
    const navigate = useNavigate();


    const radiusM = useMemo(() => {
        const r = profile?.walkingRadiusM;
        return Number.isFinite(r) && r > 0 ? r : 1000;
    }, [profile]);

    useEffect(() => {
        (async () => {
            try {
                const profileRes = await api.get("/profile/me");
                setProfile(profileRes.data);


                const geoPos = await new Promise((resolve, reject) => {
                    if (!navigator.geolocation) {
                        reject(new Error("Geolocation is not supported by this browser."));
                        return;
                    }
                    navigator.geolocation.getCurrentPosition(
                        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
                        (e) => reject(e),
                        { enableHighAccuracy: true, timeout: 10000 }
                    );
                });

                setPos(geoPos);
                setLoading(false);
            } catch (e) {
                console.error(e);
                setError(e?.message || "Failed to load map.");
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div className="map-shell">
                <div className="map-topbar">
                    <div>
                        <div className="map-title">Map</div>
                        <div className="map-subtitle">Loading…</div>
                    </div>
                </div>
                <div className="map-panel">Loading map…</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="map-shell">
                <div className="map-topbar">
                    <div className="map-title">Map</div>
                </div>
                <div className="map-panel">
                    <b>Something went wrong:</b>
                    <div className="map-error">{error}</div>
                </div>
            </div>
        );
    }



    return (

        <div className="map-shell">
            <div className="map-topbar">
                <div>
                    <div className="map-title">Recommended places</div>
                    <div className="map-subtitle">
                        Radius: <b>{radiusM} m</b>
                        {profile?.city ? <> • City: <b>{profile.city}</b></> : null}
                    </div>
                </div>
            </div>

            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <h2>My Profile</h2>
                <button onClick={() => navigate("/profile")}>Profile</button>
            </div>

            <div className="map-wrap">
            <MapContainer
                    center={pos}
                    zoom={14}
                    className="map-canvas"
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <Marker position={pos}/>

                    <Circle
                        center={pos}
                        radius={radiusM}
                        pathOptions={{weight: 2}}
                    />
                </MapContainer>
            </div>
        </div>
    );
}
