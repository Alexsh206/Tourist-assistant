import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

const safeRadius = (profile) => {
    const r = profile?.walkingRadiusM;
    const n = Number(r);
    return Number.isFinite(n) && n > 0 ? n : 1000;
};

function isValidName(name) {
    if (!name) return false;
    const n = String(name).trim().toLowerCase();
    if (!n) return false;
    return !["unnamed place", "unnamed", "no name", "unknown"].includes(n);
}

const distanceM = (aLat, aLng, bLat, bLng) => {
    const R = 6371000;
    const toRad = (x) => (x * Math.PI) / 180;

    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);

    const lat1 = toRad(aLat);
    const lat2 = toRad(bLat);

    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(s));
};

const formatDistance = (m) => {
    if (m == null) return "";
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(1)} km`;
};

const normalizeRec = (r) => {
    if (!r) return null;

    if (typeof r.latitude === "number" && typeof r.longitude === "number") {
        const name = r.name ?? "";

        return {
            _osmType: r.osmType ?? null,
            _osmId: typeof r.osmId === "number" ? r.osmId : r.osmId ? Number(r.osmId) : null,

            name,
            latitude: r.latitude,
            longitude: r.longitude,
            category: r.category ?? "place",
            score: typeof r.score === "number" ? r.score : null,
            source: r.source ?? "OSM",

            address: r.address ?? null,
            website: r.website ?? null,
            phone: r.phone ?? null,
            openingHours: r.openingHours ?? null,
            wheelchair: typeof r.wheelchair === "boolean" ? r.wheelchair : null,

            estimatedCostEur:
                typeof r.estimatedCostEur === "number"
                    ? r.estimatedCostEur
                    : r.estimatedCostEur != null
                        ? Number(r.estimatedCostEur)
                        : null,

            costLevel: r.costLevel ?? null,

            tags: r.tags ?? null,
        };
    }

    // fallback (if ever raw Overpass element)
    const lat =
        typeof r.lat === "number"
            ? r.lat
            : typeof r?.center?.lat === "number"
                ? r.center.lat
                : null;

    const lon =
        typeof r.lon === "number"
            ? r.lon
            : typeof r?.center?.lon === "number"
                ? r.center.lon
                : null;

    if (lat == null || lon == null) return null;

    const tags = r.tags || {};
    const name = tags.name || tags["name:en"] || "";

    const category =
        tags.amenity || tags.tourism || tags.shop || tags.leisure || tags.historic || "place";

    return {
        _osmType: r.type ?? null,
        _osmId: typeof r.id === "number" ? r.id : null,

        name,
        latitude: lat,
        longitude: lon,
        category,
        score: null,
        source: "OSM",

        address: null,
        website: tags.website || tags["contact:website"] || tags.url || null,
        phone: tags.phone || tags["contact:phone"] || null,
        openingHours: tags.opening_hours || null,
        wheelchair: tags.wheelchair === "yes" ? true : tags.wheelchair === "no" ? false : null,

        estimatedCostEur: null,
        costLevel: null,

        tags,
    };
};


const safeUrl = (url) => {
    if (!url) return null;
    const s = String(url).trim();
    if (!s) return null;
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    return `https://${s}`;
};

export default function MapPage() {
    const navigate = useNavigate();

    const mapRef = useRef(null);
    const markerRefs = useRef({}); // key -> Leaflet marker instance

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    const [pos, setPos] = useState(null); // { lat, lng }
    const [geoError, setGeoError] = useState("");

    const [recs, setRecs] = useState([]);
    const [recsLoading, setRecsLoading] = useState(false);
    const [recsError, setRecsError] = useState("");

    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [selectedKey, setSelectedKey] = useState(null);

    const radiusM = useMemo(() => safeRadius(profile), [profile]);

    const logout = () => {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
    };

    const getGeoPosition = () =>
        new Promise((resolve, reject) => {
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

    const loadRecommendations = useCallback(
        async (coords, radiusOverride) => {
            try {
                setRecsError("");
                setRecsLoading(true);

                const res = await api.post("/recommendations/me", {
                    latitude: coords.lat,
                    longitude: coords.lng,
                    radiusM: radiusOverride ?? radiusM, // якщо бекенд ігнорує — ок
                });

                const data = res.data;
                const raw = Array.isArray(data) ? data : data?.content || [];

                const normalized = raw
                    .map(normalizeRec)
                    .filter(Boolean)
                    .filter((x) => typeof x.latitude === "number" && typeof x.longitude === "number")
                    .filter((x) => isValidName(x.name)); // ✅ прибираємо безіменні

                setRecs(normalized);
            } catch (e) {
                console.error(e);
                setRecs([]);
                setRecsError("Failed to load recommendations (Overpass may be overloaded). Try Refresh.");
            } finally {
                setRecsLoading(false);
            }
        },
        [radiusM]
    );

    useEffect(() => {
        (async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    navigate("/login", { replace: true });
                    return;
                }

                const profileRes = await api.get("/profile/me");
                const profileData = profileRes.data;
                setProfile(profileData);

                const coords = await getGeoPosition();
                setPos(coords);

                await loadRecommendations(coords, safeRadius(profileData));
                setLoading(false);
            } catch (e) {
                console.error(e);
                setGeoError(e?.message || "Failed to load map.");
                setLoading(false);
            }
        })();
    }, [navigate, loadRecommendations]);

    const retryGeolocation = async () => {
        try {
            setGeoError("");
            setLoading(true);

            const coords = await getGeoPosition();
            setPos(coords);

            await loadRecommendations(coords);
            setLoading(false);
        } catch (e) {
            console.error(e);
            setGeoError(e?.message || "Failed to get geolocation.");
            setLoading(false);
        }
    };

    const refresh = async () => {
        if (!pos) return;
        await loadRecommendations(pos);
    };

    const recsWithDistance = useMemo(() => {
        const buildKey = (r, idx) => {
            if (r?._osmType && r?._osmId != null) return `${r._osmType}:${r._osmId}`;
            return `${r.latitude}-${r.longitude}-${idx}`;
        };

        if (!pos) {
            return recs.map((r, idx) => ({ ...r, _key: buildKey(r, idx), _dist: null }));
        }

        return recs.map((r, idx) => {
            const d = distanceM(pos.lat, pos.lng, r.latitude, r.longitude);
            return { ...r, _key: buildKey(r, idx), _dist: d };
        });
    }, [recs, pos]);

    const categories = useMemo(() => {
        const set = new Set(recs.map((r) => (r.category || "place").toUpperCase()));
        return ["ALL", ...Array.from(set).sort()];
    }, [recs]);

    const filteredRecs = useMemo(() => {
        const q = search.trim().toLowerCase();

        return recsWithDistance.filter((r) => {
            const cat = (r.category || "place").toUpperCase();
            const okCat = categoryFilter === "ALL" || cat === categoryFilter;

            const okSearch =
                !q ||
                (r.name || "").toLowerCase().includes(q) ||
                (r.category || "").toLowerCase().includes(q) ||
                (r.address || "").toLowerCase().includes(q);

            return okCat && okSearch;
        });
    }, [recsWithDistance, search, categoryFilter]);

    const focusOnRec = (r) => {
        if (!r || !mapRef.current) return;

        const key = r._key;
        setSelectedKey(key);

        const target = [r.latitude, r.longitude];
        const zoom = 16;

        mapRef.current.flyTo(target, zoom, { animate: true, duration: 0.7 });

        setTimeout(() => {
            const m = markerRefs.current[key];
            if (m && typeof m.openPopup === "function") {
                m.openPopup();
            }
        }, 350);
    };

    if (loading) {
        return (
            <div className="map-shell">
                <div className="map-topbar">
                    <div>
                        <div className="map-title">Recommended places</div>
                        <div className="map-subtitle">Loading…</div>
                    </div>
                </div>
                <div className="map-panel">Loading map…</div>
            </div>
        );
    }

    if (geoError) {
        return (
            <div className="map-shell">
                <div className="map-topbar">
                    <div className="map-title">Map</div>
                    <div className="map-actions">
                        <button className="map-btn secondary" onClick={logout}>
                            Logout
                        </button>
                    </div>
                </div>

                <div className="map-panel">
                    <div className="map-error-title">Something went wrong</div>
                    <div className="map-error">{geoError}</div>

                    <button className="map-btn" onClick={retryGeolocation} style={{ marginTop: 14 }}>
                        Try again
                    </button>
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
                        {profile?.city ? (
                            <>
                                {" "}
                                • City: <b>{profile.city}</b>
                            </>
                        ) : null}
                        {" • "}Found: <b>{recs.length}</b>
                    </div>
                </div>

                <div className="map-actions">
                    <button className="map-btn" onClick={refresh} disabled={recsLoading}>
                        {recsLoading ? "Refreshing..." : "Refresh"}
                    </button>

                    <button className="map-btn secondary" onClick={() => navigate("/profile")}>
                        Profile
                    </button>

                    <button className="map-btn secondary" onClick={logout}>
                        Logout
                    </button>
                </div>
            </div>

            {recsError && (
                <div className="map-banner">
                    <div className="map-banner-text">{recsError}</div>
                    <button className="map-btn" onClick={refresh} disabled={recsLoading}>
                        Retry
                    </button>
                </div>
            )}

            <div className="map-layout">
                <div className="map-wrap">
                    <MapContainer
                        center={pos}
                        zoom={14}
                        className="map-canvas"
                        scrollWheelZoom
                        whenCreated={(map) => (mapRef.current = map)}
                    >
                        <TileLayer
                            attribution="&copy; OpenStreetMap contributors"
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <Marker position={pos}>
                            <Popup>
                                <b>You are here</b>
                                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                                    Lat: {pos.lat.toFixed(5)}, Lng: {pos.lng.toFixed(5)}
                                </div>
                            </Popup>
                        </Marker>

                        <Circle center={pos} radius={radiusM} pathOptions={{ weight: 2 }} />

                        {recsWithDistance.map((r) => (
                            <Marker
                                key={r._key}
                                position={[r.latitude, r.longitude]}
                                ref={(ref) => {
                                    // react-leaflet v4 ref -> Leaflet marker instance
                                    if (ref) markerRefs.current[r._key] = ref;
                                }}
                            >
                                <Popup>
                                    <div style={{ minWidth: 240 }}>
                                        <div style={{ fontWeight: 800, fontSize: 14 }}>{r.name}</div>

                                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                                            Category: <b>{r.category}</b>
                                        </div>

                                        {typeof r.score === "number" && (
                                            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.9 }}>
                                                Score: <b>{r.score.toFixed(2)}</b>
                                            </div>
                                        )}

                                        {typeof r._dist === "number" && (
                                            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.9 }}>
                                                Distance: <b>{formatDistance(r._dist)}</b>
                                            </div>
                                        )}

                                        {/* ✅ extra info from DTO */}
                                        {r.address && (
                                            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
                                                Address: <b>{r.address}</b>
                                            </div>
                                        )}

                                        {r.openingHours && (
                                            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.9 }}>
                                                Hours: <b>{r.openingHours}</b>
                                            </div>
                                        )}

                                        {r.phone && (
                                            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.9 }}>
                                                Phone: <b>{r.phone}</b>
                                            </div>
                                        )}

                                        {r.wheelchair != null && (
                                            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.9 }}>
                                                Wheelchair: <b>{r.wheelchair ? "yes" : "no"}</b>
                                            </div>
                                        )}

                                        {typeof r.estimatedCostEur === "number" && (
                                            <div style={{ marginTop: 4, fontSize: 12, opacity: 0.9 }}>
                                                Avg cost: <b>~{r.estimatedCostEur.toFixed(0)} €</b>
                                                {r.costLevel ? ` • ${r.costLevel.toLowerCase()}` : ""}
                                            </div>
                                        )}


                                        {safeUrl(r.website) && (
                                            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.95 }}>
                                                <a
                                                    href={safeUrl(r.website)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ textDecoration: "underline" }}
                                                >
                                                    Website
                                                </a>
                                            </div>
                                        )}

                                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                                            Source: {r.source}
                                            {r._osmType && r._osmId != null ? ` • OSM: ${r._osmType}/${r._osmId}` : ""}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>

                <aside className="map-sidebar">
                    <div className="sidebar-head">
                        <div className="sidebar-title">Results</div>
                        <div className="sidebar-meta">
                            {filteredRecs.length} of {recs.length}
                        </div>
                    </div>

                    <div className="sidebar-controls">
                        <div className="sidebar-field">
                            <label>Search</label>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="museum, cafe, park…"
                            />
                        </div>

                        <div className="sidebar-field">
                            <label>Category</label>
                            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                                {categories.map((c) => (
                                    <option key={c} value={c}>
                                        {c === "ALL" ? "All" : c.toLowerCase()}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="sidebar-list">
                        {filteredRecs.length === 0 ? (
                            <div className="sidebar-empty">No matches. Try another search or change category.</div>
                        ) : (
                            filteredRecs.map((r) => (
                                <button
                                    key={r._key}
                                    className={`rec-card ${selectedKey === r._key ? "active" : ""}`}
                                    onClick={() => focusOnRec(r)}
                                >
                                    <div className="rec-top">
                                        <div className="rec-name">{r.name}</div>
                                        <div className="rec-pill">{(r.category || "place").toLowerCase()}</div>
                                    </div>

                                    <div className="rec-bottom">
                                        <div className="rec-sub">
                                            {typeof r._dist === "number" ? formatDistance(r._dist) : "—"}
                                            {typeof r.score === "number" ? ` • score ${r.score.toFixed(1)}` : ""}
                                            {typeof r.estimatedCostEur === "number"
                                                ? ` • ~${r.estimatedCostEur.toFixed(0)}€${r.costLevel ? ` (${r.costLevel.toLowerCase()})` : ""}`
                                                : ""}
                                            {r.address ? ` • ${r.address}` : ""}
                                        </div>
                                        <div className="rec-src">{r.source}</div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}
