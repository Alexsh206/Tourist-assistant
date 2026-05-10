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

const formatCategory = (category) => {
    if (!category) return "Place";
    const s = String(category).replaceAll("_", " ").trim();
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const formatWeatherLabel = (weatherKind) => {
    if (!weatherKind) return "";
    return String(weatherKind).replaceAll("_", " ").toLowerCase();
};

const buildRecKey = (r, idx) => {
    if (r?._osmType && r?._osmId != null) return `${r._osmType}:${r._osmId}`;
    return `${r.latitude}-${r.longitude}-${idx}`;
};

const buildAiPointKey = (p, idx) => {
    return `ai-${p.latitude}-${p.longitude}-${idx}`;
};

export default function MapPage() {
    const navigate = useNavigate();

    const mapRef = useRef(null);
    const markerRefs = useRef({});

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    const [pos, setPos] = useState(null);
    const [geoError, setGeoError] = useState("");

    const [recs, setRecs] = useState([]);
    const [recsLoading, setRecsLoading] = useState(false);
    const [recsError, setRecsError] = useState("");

    const [weatherKind, setWeatherKind] = useState(null);
    const [weatherMessage, setWeatherMessage] = useState("");

    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [selectedKey, setSelectedKey] = useState(null);

    const [aiRoute, setAiRoute] = useState(null);
    const [aiRouteLoading, setAiRouteLoading] = useState(false);
    const [aiRouteError, setAiRouteError] = useState("");

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
                    radiusM: radiusOverride ?? radiusM,
                });

                const data = res.data;

                const raw = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.recommendations)
                        ? data.recommendations
                        : data?.content || [];

                setWeatherKind(data?.weatherKind ?? null);
                setWeatherMessage(data?.weatherMessage ?? "");

                const normalized = raw
                    .map(normalizeRec)
                    .filter(Boolean)
                    .filter((x) => typeof x.latitude === "number" && typeof x.longitude === "number")
                    .filter((x) => isValidName(x.name));

                setRecs(normalized);
            } catch (e) {
                console.error(e);
                setRecs([]);
                setWeatherKind(null);
                setWeatherMessage("");
                setRecsError("Failed to load recommendations. Overpass or weather services may be temporarily unavailable.");
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
                setGeoError(e?.message || "Failed to load the map.");
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

    const generateAiRoute = async () => {
        if (!pos) return;

        try {
            setAiRouteError("");
            setAiRouteLoading(true);

            const res = await api.post("/ai-routes/me", {
                latitude: pos.lat,
                longitude: pos.lng,
                desiredDurationMinutes: 180,
                maxBudget: profile?.budgetMax ?? 30,
                routeStyle: profile?.travelStyle ?? "cultural",
            });

            setAiRoute(res.data ?? null);
        } catch (e) {
            console.error(e);
            setAiRoute(null);
            setAiRouteError("Failed to generate AI route.");
        } finally {
            setAiRouteLoading(false);
        }
    };

    const recsWithDistance = useMemo(() => {
        if (!pos) {
            return recs.map((r, idx) => ({ ...r, _key: buildRecKey(r, idx), _dist: null }));
        }

        return recs.map((r, idx) => {
            const d = distanceM(pos.lat, pos.lng, r.latitude, r.longitude);
            return { ...r, _key: buildRecKey(r, idx), _dist: d };
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

    const selectedRec = useMemo(
        () =>
            filteredRecs.find((r) => r._key === selectedKey) ||
            recsWithDistance.find((r) => r._key === selectedKey) ||
            null,
        [filteredRecs, recsWithDistance, selectedKey]
    );

    const focusOnRec = (r) => {
        if (!r || !mapRef.current) return;

        const key = r._key;
        setSelectedKey(key);

        mapRef.current.flyTo([r.latitude, r.longitude], 16, {
            animate: true,
            duration: 0.7,
        });

        setTimeout(() => {
            const marker = markerRefs.current[key];
            if (marker && typeof marker.openPopup === "function") {
                marker.openPopup();
            }
        }, 320);
    };

    const focusOnAiPoint = (point, idx) => {
        if (!point || !mapRef.current) return;

        const key = buildAiPointKey(point, idx);
        mapRef.current.flyTo([point.latitude, point.longitude], 16, {
            animate: true,
            duration: 0.7,
        });

        setTimeout(() => {
            const marker = markerRefs.current[key];
            if (marker && typeof marker.openPopup === "function") {
                marker.openPopup();
            }
        }, 320);
    };

    if (loading) {
        return (
            <div className="map-shell">
                <div className="map-topbar">
                    <div>
                        <div className="map-title">Recommended places</div>
                        <div className="map-subtitle">
                            Preparing your live location, preferences, and nearby suggestions...
                        </div>
                    </div>
                </div>

                <div className="map-panel">
                    <div className="map-error-title">Loading your city view</div>
                    <div className="map-error">
                        The app is connecting your profile, location, and real-time recommendation data.
                    </div>
                </div>
            </div>
        );
    }

    if (geoError) {
        return (
            <div className="map-shell">
                <div className="map-topbar">
                    <div>
                        <div className="map-title">Map access needed</div>
                        <div className="map-subtitle">
                            Your location helps the assistant find places that are actually relevant around you.
                        </div>
                    </div>

                    <div className="map-actions">
                        <button className="map-btn secondary" onClick={() => navigate("/profile")}>
                            Profile
                        </button>
                        <button className="map-btn secondary" onClick={logout}>
                            Logout
                        </button>
                    </div>
                </div>

                <div className="map-panel">
                    <div className="map-error-title">We could not access your location</div>
                    <div className="map-error">{geoError}</div>

                    <div className="map-inline-actions">
                        <button className="map-btn" onClick={retryGeolocation}>
                            Try again
                        </button>
                        <button className="map-btn secondary" onClick={() => navigate("/profile")}>
                            Open profile
                        </button>
                    </div>
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
                        {pos ? (
                            <>
                                {" "}
                                • Near: <b>{pos.lat.toFixed(3)}, {pos.lng.toFixed(3)}</b>
                            </>
                        ) : null}
                        {" • "}Found: <b>{recs.length}</b>
                    </div>

                    {weatherKind && (
                        <div className="map-weather">
                            <span>{formatWeatherLabel(weatherKind)}</span>
                            {weatherMessage ? <span>— {weatherMessage}</span> : null}
                        </div>
                    )}
                </div>

                <div className="map-actions">
                    <button className="map-btn" onClick={refresh} disabled={recsLoading}>
                        {recsLoading ? "Refreshing..." : "Refresh"}
                    </button>

                    <button className="map-btn" onClick={generateAiRoute} disabled={aiRouteLoading}>
                        {aiRouteLoading ? "Generating AI route..." : "Generate AI route"}
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

            {aiRouteError && (
                <div className="map-banner">
                    <div className="map-banner-text">{aiRouteError}</div>
                    <button className="map-btn" onClick={generateAiRoute} disabled={aiRouteLoading}>
                        Retry AI route
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
                        whenCreated={(map) => {
                            mapRef.current = map;
                        }}
                    >
                        <TileLayer
                            attribution="&copy; OpenStreetMap contributors"
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <Marker position={pos}>
                            <Popup>
                                <div className="popup-card popup-card--user">
                                    <div className="popup-title">You are here</div>
                                    <div className="popup-text">
                                        Current position used for nearby recommendations and distance calculations.
                                    </div>
                                    <div className="popup-meta">
                                        Lat: {pos.lat.toFixed(5)} • Lng: {pos.lng.toFixed(5)}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>

                        <Circle center={pos} radius={radiusM} pathOptions={{ weight: 2, opacity: 0.8 }} />

                        {recsWithDistance.map((r) => (
                            <Marker
                                key={r._key}
                                position={[r.latitude, r.longitude]}
                                ref={(ref) => {
                                    if (ref) markerRefs.current[r._key] = ref;
                                }}
                            >
                                <Popup>
                                    <div className="popup-card">
                                        <div className="popup-title">{r.name}</div>

                                        <div className="popup-line">
                                            Category: <b>{formatCategory(r.category)}</b>
                                        </div>

                                        {typeof r.score === "number" && (
                                            <div className="popup-line">
                                                Match score: <b>{r.score.toFixed(2)}</b>
                                            </div>
                                        )}

                                        {typeof r._dist === "number" && (
                                            <div className="popup-line">
                                                Distance: <b>{formatDistance(r._dist)}</b>
                                            </div>
                                        )}

                                        {r.address && (
                                            <div className="popup-line">
                                                Address: <b>{r.address}</b>
                                            </div>
                                        )}

                                        {r.openingHours && (
                                            <div className="popup-line">
                                                Hours: <b>{r.openingHours}</b>
                                            </div>
                                        )}

                                        {r.phone && (
                                            <div className="popup-line">
                                                Phone: <b>{r.phone}</b>
                                            </div>
                                        )}

                                        {r.wheelchair != null && (
                                            <div className="popup-line">
                                                Wheelchair access: <b>{r.wheelchair ? "yes" : "no"}</b>
                                            </div>
                                        )}

                                        {typeof r.estimatedCostEur === "number" && (
                                            <div className="popup-line">
                                                Avg cost: <b>~{r.estimatedCostEur.toFixed(0)} €</b>
                                                {r.costLevel ? ` • ${String(r.costLevel).toLowerCase()}` : ""}
                                            </div>
                                        )}

                                        {safeUrl(r.website) && (
                                            <div className="popup-link-row">
                                                <a
                                                    href={safeUrl(r.website)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="popup-link"
                                                >
                                                    Open website
                                                </a>
                                            </div>
                                        )}

                                        <div className="popup-meta">
                                            Source: {r.source}
                                            {r._osmType && r._osmId != null ? ` • OSM ${r._osmType}/${r._osmId}` : ""}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {aiRoute?.points?.map((point, idx) => {
                            const key = buildAiPointKey(point, idx);

                            return (
                                <Marker
                                    key={key}
                                    position={[point.latitude, point.longitude]}
                                    ref={(ref) => {
                                        if (ref) markerRefs.current[key] = ref;
                                    }}
                                >
                                    <Popup>
                                        <div className="popup-card">
                                            <div className="popup-title">
                                                {point.stopOrder ? `${point.stopOrder}. ` : ""}
                                                {point.placeName}
                                            </div>

                                            <div className="popup-line">
                                                Category: <b>{formatCategory(point.category)}</b>
                                            </div>

                                            {point.suggestedStayMinutes != null && (
                                                <div className="popup-line">
                                                    Suggested stay: <b>{point.suggestedStayMinutes} min</b>
                                                </div>
                                            )}

                                            {point.reason && (
                                                <div className="popup-text">{point.reason}</div>
                                            )}

                                            <div className="popup-meta">AI route point</div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>

                <aside className="map-sidebar">
                    <div className="sidebar-head">
                        <div>
                            <div className="sidebar-title">Places near you</div>
                            <div className="sidebar-meta">
                                {filteredRecs.length} visible of {recs.length} total
                            </div>
                        </div>
                    </div>

                    <div className="sidebar-controls">
                        <div className="sidebar-field">
                            <label>Search</label>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="museum, cafe, gallery..."
                            />
                        </div>

                        <div className="sidebar-field">
                            <label>Category</label>
                            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                                {categories.map((c) => (
                                    <option key={c} value={c}>
                                        {c === "ALL" ? "All categories" : formatCategory(c)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="sidebar-list">
                        {aiRoute && (
                            <div className="selected-card">
                                <div className="selected-label">AI route</div>
                                <div className="selected-name">{aiRoute.title}</div>

                                {aiRoute.summary && (
                                    <div className="selected-meta">{aiRoute.summary}</div>
                                )}

                                <div className="selected-meta">
                                    {aiRoute.weatherContext ? `Weather: ${aiRoute.weatherContext}` : ""}
                                    {aiRoute.estimatedDurationMinutes != null
                                        ? ` • Duration: ${aiRoute.estimatedDurationMinutes} min`
                                        : ""}
                                    {aiRoute.estimatedBudget != null
                                        ? ` • Budget: ~${aiRoute.estimatedBudget} €`
                                        : ""}
                                </div>

                                {Array.isArray(aiRoute.points) && aiRoute.points.length > 0 && (
                                    <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                                        {aiRoute.points.map((point, idx) => (
                                            <button
                                                key={buildAiPointKey(point, idx)}
                                                className="rec-card"
                                                onClick={() => focusOnAiPoint(point, idx)}
                                            >
                                                <div className="rec-top">
                                                    <div className="rec-name">
                                                        {point.stopOrder ? `${point.stopOrder}. ` : ""}
                                                        {point.placeName}
                                                    </div>
                                                    <div className="rec-pill">
                                                        {formatCategory(point.category)}
                                                    </div>
                                                </div>

                                                <div className="rec-bottom">
                                                    {point.suggestedStayMinutes != null && (
                                                        <div className="rec-sub">
                                                            Suggested stay: {point.suggestedStayMinutes} min
                                                        </div>
                                                    )}
                                                    {point.reason && (
                                                        <div className="rec-sub rec-sub--address">
                                                            {point.reason}
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {selectedRec && (
                            <div className="selected-card">
                                <div className="selected-label">Selected</div>
                                <div className="selected-name">{selectedRec.name}</div>
                                <div className="selected-meta">
                                    {formatCategory(selectedRec.category)}
                                    {typeof selectedRec._dist === "number" ? ` • ${formatDistance(selectedRec._dist)}` : ""}
                                    {selectedRec.address ? ` • ${selectedRec.address}` : ""}
                                </div>
                            </div>
                        )}

                        {filteredRecs.length === 0 ? (
                            <div className="sidebar-empty">
                                No matches were found for the current search and category filters.
                                Try a broader search, another category, or refresh the recommendations.
                            </div>
                        ) : (
                            filteredRecs.map((r) => (
                                <button
                                    key={r._key}
                                    className={`rec-card ${selectedKey === r._key ? "active" : ""}`}
                                    onClick={() => focusOnRec(r)}
                                >
                                    <div className="rec-top">
                                        <div className="rec-name">{r.name}</div>
                                        <div className="rec-pill">{formatCategory(r.category)}</div>
                                    </div>

                                    <div className="rec-bottom">
                                        <div className="rec-sub">
                                            {typeof r._dist === "number" ? formatDistance(r._dist) : "Distance unavailable"}
                                            {typeof r.score === "number" ? ` • score ${r.score.toFixed(1)}` : ""}
                                            {typeof r.estimatedCostEur === "number"
                                                ? ` • ~${r.estimatedCostEur.toFixed(0)}€${r.costLevel ? ` (${String(r.costLevel).toLowerCase()})` : ""}`
                                                : ""}
                                        </div>

                                        {r.address && (
                                            <div className="rec-sub rec-sub--address">
                                                {r.address}
                                            </div>
                                        )}

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