import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/axios";

import { MapContainer, TileLayer, Marker, Circle, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "./MapPage.css";
import LanguageSwitcher from "../components/LanguageSwitcher";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import ThemeSwitcher from "../components/ThemeSwitcher.jsx";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const safeRadius = (profile) => {
    const n = Number(profile?.walkingRadiusM);
    return Number.isFinite(n) && n > 0 ? n : 1000;
};

const isValidName = (name) => {
    if (!name) return false;
    const value = String(name).trim().toLowerCase();
    return value && !["unnamed place", "unnamed", "no name", "unknown"].includes(value);
};

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

const getPlaceVisual = (category) => {
    const value = String(category || "").toLowerCase();

    if (value.includes("restaurant") || value === "food") {
        return {
            className: "place-marker place-marker--restaurant",
            type: "restaurant",
            glyph: "R",
            icon: "🍽️",
            label: "Restaurant"
        };
    }

    if (value.includes("cafe") || value.includes("coffee")) {
        return {
            className: "place-marker place-marker--cafe",
            type: "cafe",
            glyph: "C",
            icon: "☕",
            label: "Cafe"
        };
    }

    if (value.includes("museum") || value.includes("gallery")) {
        return {
            className: "place-marker place-marker--culture",
            type: "culture",
            glyph: "M",
            icon: "🏛️",
            label: "Culture"
        };
    }

    if (
        value.includes("park") ||
        value.includes("garden") ||
        value.includes("nature") ||
        value.includes("hiking") ||
        value.includes("leisure")
    ) {
        return {
            className: "place-marker place-marker--nature",
            type: "nature",
            glyph: "N",
            icon: "🌳",
            label: "Nature"
        };
    }

    if (value.includes("hotel") || value.includes("hostel") || value.includes("guest_house")) {
        return {
            className: "place-marker place-marker--hotel",
            type: "hotel",
            glyph: "H",
            icon: "🏨",
            label: "Hotel"
        };
    }

    if (value.includes("shop") || value.includes("mall") || value.includes("marketplace")) {
        return {
            className: "place-marker place-marker--shopping",
            type: "shopping",
            glyph: "S",
            icon: "🛍️",
            label: "Shopping"
        };
    }

    if (
        value.includes("historic") ||
        value.includes("historical") ||
        value.includes("monument") ||
        value.includes("castle") ||
        value.includes("landmark")
    ) {
        return {
            className: "place-marker place-marker--historic",
            type: "historic",
            glyph: "H",
            icon: "🏰",
            label: "Historic"
        };
    }

    if (value.includes("viewpoint") || value.includes("attraction") || value.includes("tourism")) {
        return {
            className: "place-marker place-marker--attraction",
            type: "attraction",
            glyph: "A",
            icon: "👁️",
            label: "Attraction"
        };
    }

    if (value.includes("bar") || value.includes("pub")) {
        return {
            className: "place-marker place-marker--bar",
            type: "bar",
            glyph: "B",
            icon: "🍸",
            label: "Bar"
        };
    }

    if (value.includes("fast_food") || value.includes("fast food")) {
        return {
            className: "place-marker place-marker--fast-food",
            type: "fast-food",
            glyph: "F",
            icon: "🍔",
            label: "Fast food"
        };
    }

    return {
        className: "place-marker place-marker--default",
        type: "default",
        glyph: "P",
        icon: "📍",
        label: "Place"
    };
};

const categoryVisualClass = (category, prefix) => {
    return `${prefix} ${prefix}--${getPlaceVisual(category).type}`;
};

const createPlaceIcon = (category, isSelected = false) => {
    const visual = getPlaceVisual(category);

    return L.divIcon({
        className: "",
        html: `
            <div class="${visual.className} ${isSelected ? "place-marker--selected" : ""}">
                <span>${visual.glyph}</span>
            </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -36],
    });
};

const userLocationIcon = L.divIcon({
    className: "",
    html: `
        <div class="user-location-marker">
            <span>●</span>
        </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
});

const aiRouteIcon = L.divIcon({
    className: "",
    html: `
        <div class="ai-route-marker">
            <span>✨</span>
        </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -38],
});

const formatContextLabel = (value) => {
    if (!value) return "";
    return String(value).replaceAll("_", " ").toLowerCase();
};

const buildRecKey = (r, idx) => {
    if (r?._osmType && r?._osmId != null) {
        return `${r._osmType}:${r._osmId}`;
    }

    return `${r.latitude}-${r.longitude}-${idx}`;
};

const buildAiPointKey = (p, idx) => {
    return `ai-${p.latitude}-${p.longitude}-${idx}`;
};

const normalizeRec = (r) => {
    if (!r) return null;

    if (typeof r.latitude === "number" && typeof r.longitude === "number") {
        return {
            _osmType: r.osmType ?? null,
            _osmId: typeof r.osmId === "number" ? r.osmId : r.osmId ? Number(r.osmId) : null,

            name: r.name ?? "",
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

export default function MapPage() {
    const { t } = useTranslation();
    const tr = useCallback(
        (key, fallback, values = {}) => t(key, { defaultValue: fallback, ...values }),
        [t]
    );

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
    const [timeOfDay, setTimeOfDay] = useState(null);
    const [useWeatherContext, setUseWeatherContext] = useState(true);
    const [useTimeContext, setUseTimeContext] = useState(true);

    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [selectedKey, setSelectedKey] = useState(null);

    const [aiRoute, setAiRoute] = useState(null);
    const [aiRouteLoading, setAiRouteLoading] = useState(false);
    const [aiRouteError, setAiRouteError] = useState("");
    const [showRouteSettings, setShowRouteSettings] = useState(false);
    const [routeDurationMinutes, setRouteDurationMinutes] = useState(180);
    const [routeBudget, setRouteBudget] = useState("");
    const [routeStyle, setRouteStyle] = useState("CULTURAL");

    const radiusM = useMemo(() => safeRadius(profile), [profile]);

    const logout = () => {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
    };

    const getGeoPosition = useCallback(() =>
        new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error(tr("map.geolocationNotSupported", "Geolocation is not supported by this browser.")));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
                (e) => reject(e),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }), [tr]);

    const loadRecommendations = useCallback(
        async (coords, radiusOverride) => {
            try {
                setRecsError("");
                setRecsLoading(true);

                const res = await api.post("/recommendations/me", {
                    latitude: coords.lat,
                    longitude: coords.lng,
                    radiusM: radiusOverride ?? radiusM,
                    useWeatherContext,
                    useTimeContext,
                });

                const data = res.data;

                const raw = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.recommendations)
                        ? data.recommendations
                        : data?.content || [];

                setWeatherKind(data?.weatherKind ?? null);
                setTimeOfDay(data?.timeOfDay ?? null);

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
                setTimeOfDay(null);
                setRecsError(
                    tr(
                        "map.recommendationsLoadFailed",
                        "Failed to load recommendations. Overpass or weather services may be temporarily unavailable."
                    )
                );
            } finally {
                setRecsLoading(false);
            }
        },
        [radiusM, tr, useWeatherContext, useTimeContext]
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
                setGeoError(e?.message || tr("map.failedToLoadMap", "Failed to load the map."));
                setLoading(false);
            }
        })();
    }, [navigate, getGeoPosition, loadRecommendations, tr]);

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
            setGeoError(e?.message || tr("map.failedToGetGeolocation", "Failed to get geolocation."));
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
            setShowRouteSettings(false);

            const res = await api.post("/ai-routes/me", {
                latitude: pos.lat,
                longitude: pos.lng,
                desiredDurationMinutes: Number(routeDurationMinutes),
                maxBudget: Number(routeBudget),
                routeStyle,
            });

            setAiRoute(res.data ?? null);
        } catch (e) {
            console.error(e);
            setAiRoute(null);
            setAiRouteError(tr("map.aiRouteFailed", "Failed to generate AI route."));
        } finally {
            setAiRouteLoading(false);
        }
    };

    const recsWithDistance = useMemo(() => {
        if (!pos) {
            return recs.map((r, idx) => ({
                ...r,
                _key: buildRecKey(r, idx),
                _dist: null
            }));
        }

        return recs.map((r, idx) => {
            const d = distanceM(pos.lat, pos.lng, r.latitude, r.longitude);

            return {
                ...r,
                _key: buildRecKey(r, idx),
                _dist: d
            };
        });
    }, [recs, pos]);

    const categories = useMemo(() => {
        const set = new Set(recs.map((r) => (r.category || "place").toUpperCase()));
        return ["ALL", ...Array.from(set).sort()];
    }, [recs]);

    const legendItems = useMemo(() => {
        const byType = new Map();

        for (const rec of recsWithDistance) {
            const visual = getPlaceVisual(rec.category);
            if (!byType.has(visual.type)) {
                byType.set(visual.type, visual);
            }
        }

        return Array.from(byType.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [recsWithDistance]);

    const aiRouteLine = useMemo(() => {
        const points = Array.isArray(aiRoute?.points)
            ? aiRoute.points
                .filter((point) => typeof point.latitude === "number" && typeof point.longitude === "number")
                .sort((a, b) => (a.stopOrder ?? 0) - (b.stopOrder ?? 0))
                .map((point) => [point.latitude, point.longitude])
            : [];

        if (points.length === 0) return [];
        return pos ? [[pos.lat, pos.lng], ...points] : points;
    }, [aiRoute, pos]);

    const filteredRecs = useMemo(() => {
        const q = search.trim().toLowerCase();

        return recsWithDistance
            .filter((r) => {
                if (categoryFilter !== "ALL" && String(r.category).toUpperCase() !== categoryFilter) {
                    return false;
                }

                if (!q) return true;

                return (
                    String(r.name || "").toLowerCase().includes(q) ||
                    String(r.category || "").toLowerCase().includes(q) ||
                    String(r.address || "").toLowerCase().includes(q)
                );
            })
            .sort((a, b) => {
                const ad = typeof a._dist === "number" ? a._dist : Number.MAX_SAFE_INTEGER;
                const bd = typeof b._dist === "number" ? b._dist : Number.MAX_SAFE_INTEGER;

                return ad - bd;
            });
    }, [recsWithDistance, search, categoryFilter]);

    const selectedRec = useMemo(() => {
        if (!selectedKey) return null;
        return recsWithDistance.find((r) => r._key === selectedKey) ?? null;
    }, [selectedKey, recsWithDistance]);

    const focusOnRec = (r) => {
        setSelectedKey(r._key);

        if (mapRef.current) {
            mapRef.current.setView([r.latitude, r.longitude], 17, {
                animate: true,
            });
        }

        const marker = markerRefs.current[r._key];
        if (marker) {
            marker.openPopup();
        }
    };

    const focusOnAiPoint = (point, idx) => {
        const key = buildAiPointKey(point, idx);

        if (mapRef.current) {
            mapRef.current.setView([point.latitude, point.longitude], 17, {
                animate: true,
            });
        }

        const marker = markerRefs.current[key];
        if (marker) {
            marker.openPopup();
        }
    };

    if (loading) {
        return (
            <div className="map-shell">
                <div className="map-topbar">
                    <div>
                        <div className="map-title">{tr("map.title", "Recommended places")}</div>
                        <div className="map-subtitle">
                            {tr("map.loadingSubtitle", "Preparing your live location, preferences, and nearby suggestions...")}
                        </div>
                    </div>

                    <div className="map-actions">
                        <LanguageSwitcher />
                        <ThemeSwitcher />
                    </div>
                </div>

                <div className="map-panel">
                    <div className="map-error-title">
                        {tr("map.loadingTitle", "Loading your city view")}
                    </div>
                    <div className="map-error">
                        {tr(
                            "map.loadingText",
                            "The app is connecting your profile, location, and real-time recommendation data."
                        )}
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
                        <div className="map-title">
                            {tr("map.mapAccessNeeded", "Map access needed")}
                        </div>
                        <div className="map-subtitle">
                            {tr(
                                "map.mapAccessText",
                                "Your location helps the assistant find places that are actually relevant around you."
                            )}
                        </div>
                    </div>

                    <div className="map-actions">
                        <LanguageSwitcher />
                        <ThemeSwitcher />

                        <button className="map-btn secondary" onClick={() => navigate("/profile")}>
                            {tr("nav.profile", "Profile")}
                        </button>

                        <button className="map-btn secondary" onClick={logout}>
                            {tr("nav.logout", "Logout")}
                        </button>
                    </div>
                </div>

                <div className="map-panel">
                    <div className="map-error-title">
                        {tr("map.couldNotAccessLocation", "We could not access your location")}
                    </div>
                    <div className="map-error">{geoError}</div>

                    <div className="map-inline-actions">
                        <button className="map-btn" onClick={retryGeolocation}>
                            {tr("map.tryAgain", "Try again")}
                        </button>

                        <button className="map-btn secondary" onClick={() => navigate("/profile")}>
                            {tr("map.openProfile", "Open profile")}
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
                    <div className="map-title">
                        {tr("map.title", "Recommended places")}
                    </div>

                    <div className="map-subtitle">
                        {tr("map.radius", "Radius")}: <b>{radiusM} m</b>

                        {profile?.city ? (
                            <>
                                {" "}
                                • {tr("map.city", "City")}: <b>{profile.city}</b>
                            </>
                        ) : null}

                        {" "}
                        • {tr("map.found", "Found")}: <b>{recs.length}</b>
                    </div>

                    {weatherKind && (
                        <div className="map-weather">
                            <span>{formatContextLabel(weatherKind)}</span>
                            <span>
                                — {t(`weatherMessages.${weatherKind}`, {
                                defaultValue: tr("map.weatherContext", "Weather-aware recommendations")
                            })}
                            </span>
                        </div>
                    )}

                    {timeOfDay && (
                        <div className="map-time">
                            <span>{formatContextLabel(timeOfDay)}</span>
                            <span>
                                — {t(`timeMessages.${timeOfDay}`, {
                                defaultValue: tr("map.timeContext", "Time-aware recommendations")
                            })}
                            </span>
                        </div>
                    )}
                </div>

                <div className="map-actions">
                    <LanguageSwitcher />
                    <ThemeSwitcher />

                    <button className="map-btn" onClick={refresh} disabled={recsLoading}>
                        {recsLoading
                            ? tr("map.refreshing", "Refreshing...")
                            : tr("map.refresh", "Refresh")}
                    </button>

                    <button
                        className="map-btn"
                        onClick={() => setShowRouteSettings((value) => !value)}
                        disabled={aiRouteLoading}
                    >
                        {aiRouteLoading
                            ? tr("map.generatingRoute", "Generating route...")
                            : aiRoute
                                ? tr("map.regenerateAiRoute", "Regenerate route")
                                : tr("map.generateAiRoute", "Generate AI route")}
                    </button>

                    <button className="map-btn secondary" onClick={() => navigate("/profile")}>
                        {tr("nav.profile", "Profile")}
                    </button>

                    <button className="map-btn secondary" onClick={logout}>
                        {tr("nav.logout", "Logout")}
                    </button>
                </div>
            </div>

            {recsError && (
                <div className="map-banner">
                    <div className="map-banner-text">{recsError}</div>
                    <button className="map-btn" onClick={refresh} disabled={recsLoading}>
                        {tr("map.retry", "Retry")}
                    </button>
                </div>
            )}

            {showRouteSettings && (
                <div className="route-popover">
                    <div className="route-popover-head">
                        <div>
                            <div className="route-builder-title">
                                {tr("map.routeSettings", "Route settings")}
                            </div>
                            <div className="route-popover-subtitle">
                                {tr("map.routeSettingsSubtitle", "Choose route parameters before generation.")}
                            </div>
                        </div>

                        <button
                            className="route-popover-close"
                            type="button"
                            onClick={() => setShowRouteSettings(false)}
                            aria-label={tr("common.cancel", "Cancel")}
                        >
                            x
                        </button>
                    </div>

                    <div className="route-builder-grid">
                        <label className="sidebar-field">
                            <span>{tr("map.routeDuration", "Duration")}</span>
                            <select
                                value={routeDurationMinutes}
                                onChange={(e) => setRouteDurationMinutes(Number(e.target.value))}
                                disabled={aiRouteLoading}
                            >
                                <option value={90}>90 min</option>
                                <option value={120}>120 min</option>
                                <option value={180}>180 min</option>
                                <option value={240}>240 min</option>
                            </select>
                        </label>

                        <label className="sidebar-field">
                            <span>{tr("map.routeBudget", "Budget")}</span>
                            <input
                                type="number"
                                min="0"
                                step="5"
                                value={routeBudget}
                                onChange={(e) => setRouteBudget(e.target.value)}
                                disabled={aiRouteLoading}
                            />
                        </label>

                        <label className="sidebar-field">
                            <span>{tr("map.routeStyle", "Style")}</span>
                            <select
                                value={routeStyle}
                                onChange={(e) => setRouteStyle(e.target.value)}
                                disabled={aiRouteLoading}
                            >
                                <option value="CULTURAL">{tr("profile.cultural", "Cultural")}</option>
                                <option value="RELAX">{tr("profile.relax", "Relax")}</option>
                                <option value="ACTIVE">{tr("profile.active", "Active")}</option>
                                <option value="ADVENTURE">{tr("profile.adventure", "Adventure")}</option>
                            </select>
                        </label>
                    </div>

                    <div className="route-popover-actions">
                        <button
                            className="map-btn secondary"
                            type="button"
                            onClick={() => setShowRouteSettings(false)}
                        >
                            {tr("common.cancel", "Cancel")}
                        </button>

                        <button
                            className="map-btn primary"
                            type="button"
                            onClick={generateAiRoute}
                            disabled={aiRouteLoading || !pos || routeBudget === ""}
                        >
                            {aiRouteLoading
                                ? tr("map.generatingRoute", "Generating route...")
                                : tr("map.generateAiRoute", "Generate AI route")}
                        </button>
                    </div>
                </div>
            )}

            {aiRouteError && (
                <div className="map-banner">
                    <div className="map-banner-text">{aiRouteError}</div>
                    <button className="map-btn" onClick={() => setShowRouteSettings(true)} disabled={aiRouteLoading}>
                        {tr("map.retryAiRoute", "Retry AI route")}
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

                        <Marker position={pos} icon={userLocationIcon}>
                            <Popup>
                                <div className="popup-card popup-card--user">
                                    <div className="popup-title">
                                        {tr("map.youAreHere", "You are here")}
                                    </div>
                                    <div className="popup-text">
                                        {tr(
                                            "map.yourPositionText",
                                            "Current position used for nearby recommendations and distance calculations."
                                        )}
                                    </div>
                                    <div className="popup-meta">
                                        Lat: {pos.lat.toFixed(5)} • Lng: {pos.lng.toFixed(5)}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>

                        <Circle
                            center={pos}
                            radius={radiusM}
                            pathOptions={{weight: 2, opacity: 0.8}}
                        />

                        {aiRouteLine.length >= 2 && (
                            <Polyline
                                positions={aiRouteLine}
                                pathOptions={{
                                    color: "#8b5cf6",
                                    weight: 5,
                                    opacity: 0.82,
                                    lineCap: "round",
                                    lineJoin: "round",
                                }}
                            />
                        )}

                        {recsWithDistance.map((r) => (
                            <Marker
                                key={r._key}
                                position={[r.latitude, r.longitude]}
                                icon={createPlaceIcon(r.category, selectedKey === r._key)}
                                ref={(ref) => {
                                    if (ref) markerRefs.current[r._key] = ref;
                                }}
                            >
                                <Popup>
                                    <div className="popup-card">
                                        <div className="popup-title">{r.name}</div>

                                        <div className="popup-line">
                                            {tr("map.categoryLabel", "Category")}:{" "}
                                            <span className={categoryVisualClass(r.category, "popup-category")}>
                                                {formatCategory(r.category)}
                                            </span>
                                        </div>

                                        {typeof r.score === "number" && (
                                            <div className="popup-line">
                                                {tr("map.matchScore", "Match score")}:{" "}
                                                <b>{r.score.toFixed(2)}</b>
                                            </div>
                                        )}

                                        {typeof r._dist === "number" && (
                                            <div className="popup-line">
                                                {tr("map.distance", "Distance")}:{" "}
                                                <b>{formatDistance(r._dist)}</b>
                                            </div>
                                        )}

                                        {r.address && (
                                            <div className="popup-line">
                                                {tr("map.address", "Address")}: <b>{r.address}</b>
                                            </div>
                                        )}

                                        {r.openingHours && (
                                            <div className="popup-line">
                                                {tr("map.hours", "Hours")}: <b>{r.openingHours}</b>
                                            </div>
                                        )}

                                        {r.phone && (
                                            <div className="popup-line">
                                                {tr("map.phone", "Phone")}: <b>{r.phone}</b>
                                            </div>
                                        )}

                                        {r.wheelchair != null && (
                                            <div className="popup-line">
                                                {tr("map.wheelchair", "Wheelchair access")}:{" "}
                                                <b>{r.wheelchair ? tr("common.yes", "yes") : tr("common.no", "no")}</b>
                                            </div>
                                        )}

                                        {typeof r.estimatedCostEur === "number" && (
                                            <div className="popup-line">
                                                {tr("map.avgCost", "Avg cost")}:{" "}
                                                <b>~{r.estimatedCostEur.toFixed(0)} €</b>
                                                {r.costLevel ? ` • ${String(r.costLevel).toLowerCase()}` : ""}
                                            </div>
                                        )}

                                        {safeUrl(r.website) && (
                                            <a
                                                className="popup-link"
                                                href={safeUrl(r.website)}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {tr("map.openWebsite", "Open website")}
                                            </a>
                                        )}

                                        <div className="popup-meta">
                                            {tr("map.source", "Source")}: {r.source}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {Array.isArray(aiRoute?.points) &&
                            aiRoute.points.map((point, idx) => {
                                const key = buildAiPointKey(point, idx);

                                if (
                                    typeof point.latitude !== "number" ||
                                    typeof point.longitude !== "number"
                                ) {
                                    return null;
                                }

                                return (
                                    <Marker
                                        key={key}
                                        position={[point.latitude, point.longitude]}
                                        icon={aiRouteIcon}
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
                                                    {tr("map.categoryLabel", "Category")}:{" "}
                                                    <span className={categoryVisualClass(point.category, "popup-category")}>
                                                        {formatCategory(point.category)}
                                                    </span>
                                                </div>

                                                {point.suggestedStayMinutes != null && (
                                                    <div className="popup-line">
                                                        {tr("map.suggestedStay", "Suggested stay")}:{" "}
                                                        <b>{point.suggestedStayMinutes} min</b>
                                                    </div>
                                                )}

                                                {point.reason && (
                                                    <div className="popup-text">
                                                        {point.reason}
                                                    </div>
                                                )}

                                                <div className="popup-meta">
                                                    {tr("map.aiRoutePoint", "AI route point")}
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                    </MapContainer>

                    {legendItems.length > 0 && (
                        <div className="map-legend">
                            {legendItems.map((item) => (
                                <div className="legend-item" key={item.type}>
                                    <span className={`legend-dot legend-dot--${item.type}`} />
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <aside className="map-sidebar">
                    <div className="sidebar-head">
                        <div>
                            <div className="sidebar-title">
                                {tr("map.placesNearYou", "Places near you")}
                            </div>
                            <div className="sidebar-meta">
                                {tr("map.visibleOfTotal", "{{visible}} visible of {{total}} total", {
                                    visible: filteredRecs.length,
                                    total: recs.length
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="sidebar-controls">
                    <div className="sidebar-field">
                            <label>{tr("map.search", "Search")}</label>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={tr("map.searchPlaceholder", "museum, cafe, gallery...")}
                            />
                        </div>

                        <div className="sidebar-field">
                            <label>{tr("map.category", "Category")}</label>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                {categories.map((c) => (
                                    <option key={c} value={c}>
                                        {c === "ALL"
                                            ? tr("map.allCategories", "All categories")
                                            : formatCategory(c)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="sidebar-toggle-grid">
                            <label className="sidebar-toggle">
                                <input
                                    type="checkbox"
                                    checked={useWeatherContext}
                                    onChange={(e) => setUseWeatherContext(e.target.checked)}
                                    disabled={recsLoading}
                                />
                                <span>
                                    {tr("map.useWeatherContext", "Use weather context")}
                                </span>
                            </label>

                            <label className="sidebar-toggle">
                                <input
                                    type="checkbox"
                                    checked={useTimeContext}
                                    onChange={(e) => setUseTimeContext(e.target.checked)}
                                    disabled={recsLoading}
                                />
                                <span>
                                    {tr("map.useTimeContext", "Use time of day")}
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="sidebar-list">
                        {aiRoute && (
                            <div className="selected-card">
                                <div className="selected-label">
                                    {tr("map.aiRoute", "AI route")}
                                </div>

                                <div className="selected-name">
                                    {aiRoute.title}
                                </div>

                                {aiRoute.summary && (
                                    <div className="selected-meta">
                                        {aiRoute.summary}
                                    </div>
                                )}

                                <div className="selected-meta">
                                    {aiRoute.weatherContext
                                        ? `${tr("map.weather", "Weather")}: ${aiRoute.weatherContext}`
                                        : ""}

                                    {aiRoute.estimatedDurationMinutes != null
                                        ? ` • ${tr("map.duration", "Duration")}: ${aiRoute.estimatedDurationMinutes} min`
                                        : ""}

                                    {aiRoute.estimatedBudget != null
                                        ? ` • ${tr("map.budget", "Budget")}: ~${aiRoute.estimatedBudget} €`
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
                                                    <div className={categoryVisualClass(point.category, "rec-pill")}>
                                                        {formatCategory(point.category)}
                                                    </div>
                                                </div>

                                                <div className="rec-bottom">
                                                    {point.suggestedStayMinutes != null && (
                                                        <div className="rec-sub">
                                                            {tr("map.suggestedStay", "Suggested stay")}:{" "}
                                                            {point.suggestedStayMinutes} min
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
                                <div className="selected-label">
                                    {tr("map.selected", "Selected")}
                                </div>

                                <div className="selected-name">
                                    {selectedRec.name}
                                </div>

                                <div className="selected-meta">
                                    <span className={categoryVisualClass(selectedRec.category, "selected-category")}>
                                        {formatCategory(selectedRec.category)}
                                    </span>
                                    {typeof selectedRec._dist === "number"
                                        ? ` • ${formatDistance(selectedRec._dist)}`
                                        : ""}
                                    {selectedRec.address ? ` • ${selectedRec.address}` : ""}
                                </div>
                            </div>
                        )}

                        {filteredRecs.length === 0 ? (
                            <div className="sidebar-empty">
                                {tr("map.noMatches", "No matches were found for the current search and category filters. Try a broader search, another category, or refresh the recommendations.")}
                            </div>
                        ) : (
                            filteredRecs.map((r) => (
                                <button key={r._key} className={`rec-card ${selectedKey === r._key ? "active" : ""}`} onClick={() => focusOnRec(r)}>
                                    <div className="rec-top">
                                        <div className="rec-name">
                                            {r.name}
                                        </div>

                                        <div className={categoryVisualClass(r.category, "rec-pill")}>
                                            {formatCategory(r.category)}
                                        </div>
                                    </div>

                                    <div className="rec-bottom">
                                        <div className="rec-sub">
                                            {typeof r._dist === "number" ? formatDistance(r._dist) : tr("map.distanceUnavailable", "Distance unavailable")}

                                            {typeof r.score === "number" ? ` • ${tr("map.score", "score")} ${r.score.toFixed(1)}` : ""}

                                            {typeof r.estimatedCostEur === "number" ? ` • ~${r.estimatedCostEur.toFixed(0)}€${ r.costLevel ? ` (${String(r.costLevel).toLowerCase()})` : ""}` : ""}
                                        </div>

                                        {r.address && (<div className="rec-sub rec-sub--address">{r.address}</div>)}

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
