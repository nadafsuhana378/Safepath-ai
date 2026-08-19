import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Home as HomeIcon, GraduationCap, TrainFront, ShoppingBag, Bus,
  Landmark, Waves, ChevronRight, ChevronDown, Siren, Users, Check,
  ShieldAlert, ArrowLeft, Sun, Moon, TrendingUp, Route, Footprints,
  Phone, PhoneOff, Flag, Vibrate, Pause, Gauge, Satellite, MapIcon,
  Star, X
} from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from "recharts";

/* SafePath AI — interactive prototype (light theme, high contrast)
   Page bg   #EEF2F8   Phone bg #FFFFFF   Card bg #FFFFFF / border #E2E7F0
   Ink-0 (headings) #101828   Ink-1 (body) #4A5468   Ink-2 (faint) #8A94A6
   Safe teal #0D9488   Risk red #DC2626   Amber #D97706
   Type: display "Space Grotesk", body "Inter", data "IBM Plex Mono"

   Map note: uses Google's no-key "output=embed" endpoint
   (maps.google.com/maps?q=...&output=embed). It's the same trick most
   no-signup embeds use, but Google doesn't officially document or
   guarantee it — a production build should switch to the official
   Maps Embed/JS API with a billed API key for reliability.
*/

const FONTS_LINK = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap";
function useFonts() {
  useEffect(() => {
    if (document.getElementById("sp-fonts")) return;
    const l = document.createElement("link");
    l.id = "sp-fonts"; l.rel = "stylesheet"; l.href = FONTS_LINK;
    document.head.appendChild(l);
  }, []);
}

/* ---------------- mock data ---------------- */

const CITIES = {
  Satara: {
    lat: 17.6805, lon: 74.0183,
    suggestions: [
      { icon: HomeIcon, label: "Home", sub: "Shivaji Nagar" },
      { icon: TrainFront, label: "Railway Station", sub: "Satara Rd" },
      { icon: GraduationCap, label: "KBPCOE College", sub: "Campus Rd" },
      { icon: ShoppingBag, label: "Powai Naka Market", sub: "City centre" },
      { icon: Bus, label: "Kas Bus Stand", sub: "MSRTC depot" },
    ],
  },
  Pune: {
    lat: 18.5204, lon: 73.8567,
    suggestions: [
      { icon: HomeIcon, label: "Home", sub: "Katraj" },
      { icon: TrainFront, label: "Pune Railway Station", sub: "Station Rd" },
      { icon: Landmark, label: "FC Road", sub: "Shivajinagar" },
      { icon: ShoppingBag, label: "Hinjawadi IT Park", sub: "Phase 1" },
      { icon: GraduationCap, label: "Deccan Gymkhana", sub: "College area" },
    ],
  },
  Mumbai: {
    lat: 19.0760, lon: 72.8777,
    suggestions: [
      { icon: HomeIcon, label: "Home", sub: "Powai" },
      { icon: TrainFront, label: "Andheri Station", sub: "Western line" },
      { icon: Landmark, label: "Bandra-Kurla Complex", sub: "BKC" },
      { icon: Waves, label: "Marine Drive", sub: "South Mumbai" },
      { icon: ShoppingBag, label: "Dadar Market", sub: "Dadar West" },
    ],
  },
  Nagpur: {
    lat: 21.1458, lon: 79.0882,
    suggestions: [
      { icon: HomeIcon, label: "Home", sub: "Dharampeth" },
      { icon: TrainFront, label: "Nagpur Railway Station", sub: "Station Rd" },
      { icon: ShoppingBag, label: "Sitabuldi Market", sub: "City centre" },
      { icon: GraduationCap, label: "VNIT Campus", sub: "South Ambazari Rd" },
      { icon: Landmark, label: "Civil Lines", sub: "Central Nagpur" },
    ],
  },
  Kolhapur: {
    lat: 16.7050, lon: 74.2433,
    suggestions: [
      { icon: HomeIcon, label: "Home", sub: "Rajarampuri" },
      { icon: Waves, label: "Rankala Lake", sub: "Lakeside" },
      { icon: TrainFront, label: "Kolhapur Railway Station", sub: "Station Rd" },
      { icon: GraduationCap, label: "Shivaji University", sub: "Vidyanagar" },
      { icon: Landmark, label: "Mahalaxmi Temple", sub: "Old city" },
    ],
  },
};
const CITY_LIST = Object.keys(CITIES);

const CONTACTS = [
  { name: "Aai (Mom)", number: "+91 98765 43210", calls: 128 },
  { name: "Pragati", number: "+91 91234 56780", calls: 76 },
  { name: "Samruddhi", number: "+91 90909 12345", calls: 54 },
  { name: "Rahul (Brother)", number: "+91 89999 11223", calls: 41 },
  { name: "Hostel Warden", number: "+91 87000 22110", calls: 12 },
].sort((a, b) => b.calls - a.calls);

const WEEKLY = [
  { d: "Mon", score: 78 }, { d: "Tue", score: 85 }, { d: "Wed", score: 91 },
  { d: "Thu", score: 74 }, { d: "Fri", score: 88 }, { d: "Sat", score: 95 },
  { d: "Sun", score: 82 },
];

const RECENT_TRIPS = [
  { from: "College", to: "Home", city: "Satara", time: "Yesterday, 8:52 PM", score: 91, mode: "Safest" },
  { from: "Home", to: "Railway Station", city: "Satara", time: "2 days ago, 6:10 AM", score: 88, mode: "Safest" },
  { from: "FC Road", to: "Hinjawadi", city: "Pune", time: "5 days ago, 9:30 PM", score: 64, mode: "Fastest" },
];

const HAZARD_TYPES = [
  { key: "lighting", label: "Poor lighting" },
  { key: "activity", label: "Suspicious activity" },
  { key: "blocked", label: "Road blocked" },
  { key: "unsafe", label: "I feel unsafe here" },
];

const FORECAST_SCORES = [78, 89, 84, 91, 72, 68];

const FEEDBACK_CHIPS = ["Well lit", "Felt safe", "Busy street", "Would repeat"];

/* ---------------- helpers ---------------- */

function useTimeMode() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const hour = now.getHours();
  const isNight = hour >= 19 || hour < 6;
  const label = isNight ? "Night mode" : "Day mode";
  const Icon = isNight ? Moon : Sun;
  const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return { isNight, label, Icon, timeStr, now };
}

function buildForecast(now) {
  const slots = [0, 30, 60, 90, 120, 150];
  return slots.map((m, i) => {
    const t = new Date(now.getTime() + m * 60000);
    return { mins: m, time: t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), score: FORECAST_SCORES[i] };
  });
}

const ROUTE_SHAPES = {
  safe: {
    label: "Safest", extraMin: 6, scoreBase: 91, color: "#0D9488",
    path: "M30,230 C80,222 95,175 145,163 C200,150 222,110 262,88 C302,66 322,54 360,20",
    lights: [[90,213],[150,158],[228,102],[310,58]],
    incidents: [],
    whyNight: "Follows the lit market road and stays within sight of two police help points.",
    whyDay: "Follows the main road with steady foot traffic and shop frontage the whole way.",
  },
  fast: {
    label: "Fastest", extraMin: 0, scoreBase: 38, color: "#DC2626",
    path: "M30,230 C95,175 130,200 185,135 C230,82 265,95 360,20",
    lights: [],
    incidents: [[150,192],[255,75]],
    whyNight: "Cuts through an unlit service lane and passes two locations with recent incident reports.",
    whyDay: "Cuts through a quiet back lane — fine by daylight, but low visibility after dark.",
  },
};

function routeFor(key, isNight, hazardPenalty = 0) {
  const s = ROUTE_SHAPES[key];
  const dayBoost = key === "fast" && !isNight ? 22 : key === "safe" && !isNight ? 3 : 0;
  return {
    ...s,
    score: Math.max(5, Math.min(97, s.scoreBase + dayBoost - hazardPenalty)),
    time: `${11 + s.extraMin} min`,
    why: isNight ? s.whyNight : s.whyDay,
  };
}

/* ---------------- small UI atoms ---------------- */

function ScoreBadge({ value, color, size = "md" }) {
  const big = size === "lg";
  return (
    <div
      className="flex items-center justify-center rounded-full font-mono font-semibold shrink-0"
      style={{
        width: big ? 56 : 40, height: big ? 56 : 40,
        background: `${color}17`, color, border: `2px solid ${color}`,
        fontSize: big ? 18 : 13,
      }}
    >
      {value}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-[#E2E7F0] bg-white p-3.5">
      <Icon size={15} color="#0D9488" className="mb-2" />
      <p className="text-lg font-semibold text-[#101828] leading-none" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{value}</p>
      <p className="text-[11px] text-[#8A94A6] mt-1">{label}</p>
      {sub && <p className="text-[10px] text-[#0D9488] mt-0.5">{sub}</p>}
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-[#101828] text-white text-[12px] px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap">
      {msg}
    </div>
  );
}

/* ---------------- real Google Map + overlay ---------------- */

function LiveMap({ city, route, progress, view, hazardPin }) {
  const pathRef = useRef(null);
  const [dot, setDot] = useState({ x: 30, y: 230 });
  const c = CITIES[city];
  const src = `https://maps.google.com/maps?q=${c.lat},${c.lon}&z=16&t=${view === "satellite" ? "k" : "m"}&output=embed`;

  useEffect(() => {
    if (!pathRef.current) return;
    const len = pathRef.current.getTotalLength();
    const p = pathRef.current.getPointAtLength(len * progress);
    setDot({ x: p.x, y: p.y });
  }, [progress, route]);

  return (
    <div className="relative w-full h-full bg-[#F0F3F8]">
      <iframe
        title="live-map"
        src={src}
        className="w-full h-full border-0"
        loading="lazy"
      />
      <svg viewBox="0 0 390 250" className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <filter id="pglow"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <path ref={pathRef} d={route.path} fill="none" stroke={route.color} strokeWidth="5" strokeLinecap="round" filter="url(#pglow)" opacity="0.92" />
        {route.lights.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#D97706" filter="url(#pglow)" />)}
        {route.incidents.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="5.5" fill="#DC2626" />
            <circle cx={x} cy={y} r="10" fill="none" stroke="#DC2626" strokeWidth="1.2" opacity="0.5" />
          </g>
        ))}
        {hazardPin && (
          <g>
            <circle cx={hazardPin.x} cy={hazardPin.y} r="6" fill="#7C3AED" />
            <circle cx={hazardPin.x} cy={hazardPin.y} r="11" fill="none" stroke="#7C3AED" strokeWidth="1.4" opacity="0.5" />
          </g>
        )}
        <circle cx="30" cy="230" r="6" fill="#101828" />
        <circle cx="360" cy="20" r="6" fill="#FFFFFF" stroke="#101828" strokeWidth="2.5" />
        <circle cx={dot.x} cy={dot.y} r="7" fill="#101828" />
        <circle cx={dot.x} cy={dot.y} r="12" fill="none" stroke="#101828" strokeWidth="1.5" opacity="0.35" />
      </svg>
      <span className="absolute bottom-1.5 right-2 text-[9px] text-[#4A5468] bg-white/85 px-1.5 py-0.5 rounded">
        Google Maps
      </span>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */

function Dashboard({ mode, onPlanTrip, tripsThisMonth, avgScore, hazardsReportedCount, tripHistory }) {
  const { label, Icon, timeStr } = mode;
  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] text-[#8A94A6]">{timeStr}</p>
            <h2 className="text-xl font-semibold text-[#101828]" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
              Hi, Suhana
            </h2>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-[#E2E7F0] bg-[#F3F5FA] px-3 py-1.5">
            <Icon size={13} color="#B45309" />
            <span className="text-[11px] font-medium text-[#4A5468]">{label}</span>
          </div>
        </div>

        <div className="rounded-2xl p-4 text-white mb-5" style={{ background: "linear-gradient(135deg,#0D9488,#0F766E)" }}>
          <p className="text-[11px] opacity-80 mb-1">Area safety index · Satara</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>84<span className="text-sm opacity-70">/100</span></span>
            <span className="flex items-center gap-1 text-[11px] bg-white/15 px-2 py-1 rounded-full"><TrendingUp size={12} /> +6 this week</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <StatCard icon={Route} label="Trips this month" value={tripsThisMonth} sub="4 in Pune" />
          <StatCard icon={Gauge} label="Average safety score" value={avgScore} />
          <StatCard icon={Flag} label="Hazards reported" value={hazardsReportedCount} sub="By you & nearby users" />
          <StatCard icon={Footprints} label="Safe distance covered" value="46 km" />
        </div>

        <div className="rounded-xl border border-[#E2E7F0] bg-white p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-medium text-[#101828]">This week's safety score</p>
            <span className="text-[10px] text-[#8A94A6]">daily avg</span>
          </div>
          <div style={{ width: "100%", height: 90 }}>
            <ResponsiveContainer>
              <BarChart data={WEEKLY} barCategoryGap={10}>
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "#8A94A6" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#F3F5FA" }}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E2E7F0" }}
                />
                <Bar dataKey="score" radius={[5, 5, 0, 0]}>
                  {WEEKLY.map((w, i) => (
                    <Cell key={i} fill={w.score >= 80 ? "#0D9488" : w.score >= 60 ? "#D97706" : "#DC2626"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-medium text-[#101828]">Recent trips</p>
        </div>
        <div className="flex flex-col gap-2 mb-5">
          {tripHistory.map((t, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-[#E2E7F0] px-3.5 py-3">
              <ScoreBadge value={t.score} color={t.score >= 80 ? "#0D9488" : t.score >= 60 ? "#D97706" : "#DC2626"} />
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-[#101828] truncate">{t.from} → {t.to}</p>
                <p className="text-[10.5px] text-[#8A94A6]">{t.city} · {t.time} · {t.mode}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 px-5 pb-5 pt-3 bg-gradient-to-t from-white via-white to-transparent">
        <button
          onClick={onPlanTrip}
          className="w-full rounded-full py-3.5 font-semibold text-sm text-white flex items-center justify-center gap-2"
          style={{ background: "#0D9488", fontFamily: "'Space Grotesk',sans-serif" }}
        >
          <Search size={15} /> Plan a new trip
        </button>
      </div>
    </div>
  );
}

/* ---------------- Search / city + suggestions ---------------- */

function SearchScreen({ citySearch, setCitySearch, activeCity, onBack, onGo }) {
  const matched = CITY_LIST.find((c) => c.toLowerCase().startsWith(citySearch.trim().toLowerCase()));
  const city = citySearch.trim() ? (matched || activeCity) : activeCity;
  const suggestions = CITIES[city].suggestions;

  return (
    <div className="flex flex-col h-full px-5 pt-4 pb-6 bg-white">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-[#F3F5FA] border border-[#E2E7F0] flex items-center justify-center">
          <ArrowLeft size={14} color="#4A5468" />
        </button>
        <h2 className="text-base font-semibold text-[#101828]" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Plan a trip</h2>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-[#F3F5FA] border border-[#E2E7F0] px-3.5 py-3 mb-3">
        <Search size={16} color="#8A94A6" />
        <input
          value={citySearch}
          onChange={(e) => setCitySearch(e.target.value)}
          placeholder="Search a city — try Pune, Mumbai…"
          className="bg-transparent outline-none text-sm text-[#101828] placeholder-[#8A94A6] flex-1"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {CITY_LIST.map((c) => (
          <button
            key={c}
            onClick={() => setCitySearch(c)}
            className="shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-medium border transition-colors"
            style={{
              borderColor: c === city ? "#0D9488" : "#E2E7F0",
              background: c === city ? "#0D948814" : "white",
              color: c === city ? "#0D9488" : "#4A5468",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="text-[11px] uppercase tracking-wide text-[#8A94A6] mb-3">
        Your most-visited places in {city}
      </p>
      <div className="flex flex-col gap-2">
        {suggestions.map(({ icon: Icon, label, sub }) => (
          <button
            key={label}
            onClick={() => onGo(city, label)}
            className="flex items-center gap-3 rounded-xl border border-[#E2E7F0] hover:border-[#0D9488]/50 bg-white px-3.5 py-3 text-left transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-[#FDF3E7] flex items-center justify-center shrink-0">
              <Icon size={15} color="#B45309" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#101828] font-medium truncate">{label}</p>
              <p className="text-[11px] text-[#8A94A6] truncate">{sub}</p>
            </div>
            <ChevronRight size={14} color="#B0B8C6" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Routes (+ safety forecast) ---------------- */

function RoutesScreen({ city, dest, selected, setSelected, isNight, now, onBack, onStart }) {
  const safe = routeFor("safe", isNight);
  const fast = routeFor("fast", isNight);
  const routes = { safe, fast };
  const forecast = buildForecast(now);
  const bestMins = forecast.reduce((a, b) => (b.score > a.score ? b : a)).mins;

  return (
    <div className="flex flex-col h-full px-5 pt-4 pb-6 bg-white overflow-y-auto">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-[#F3F5FA] border border-[#E2E7F0] flex items-center justify-center">
          <ArrowLeft size={14} color="#4A5468" />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] text-[#8A94A6]">{city} · To</p>
          <p className="text-sm text-[#101828] font-medium truncate">{dest}</p>
        </div>
      </div>

      <p className="text-[11px] uppercase tracking-wide text-[#8A94A6] mb-2.5">Safety forecast · next 2.5 hrs</p>
      <div className="flex gap-2 mb-5 overflow-x-auto -mx-1 px-1">
        {forecast.map((f) => {
          const isBest = f.mins === bestMins;
          const color = f.score >= 80 ? "#0D9488" : f.score >= 60 ? "#D97706" : "#DC2626";
          return (
            <div
              key={f.mins}
              className="shrink-0 w-[52px] rounded-xl border flex flex-col items-center py-2.5 relative"
              style={{ borderColor: isBest ? "#0D9488" : "#E2E7F0", background: isBest ? "#0D948810" : "white" }}
            >
              {isBest && <Star size={10} color="#0D9488" fill="#0D9488" className="absolute -top-1.5" />}
              <span className="text-[9.5px] text-[#8A94A6] mb-1">{f.mins === 0 ? "Now" : f.time}</span>
              <span className="text-[12px] font-mono font-semibold" style={{ color }}>{f.score}</span>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] uppercase tracking-wide text-[#8A94A6] mb-3">Choose a route</p>
      <div className="flex flex-col gap-3 mb-auto">
        {Object.entries(routes).map(([key, r]) => {
          const active = selected === key;
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className="rounded-xl border-2 px-4 py-3.5 text-left transition-colors"
              style={{
                borderColor: active ? r.color : "#E2E7F0",
                background: active ? `${r.color}0F` : "#FFFFFF",
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-[#101828]" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                  {r.label} route
                </span>
                <ScoreBadge value={r.score} color={r.color} />
              </div>
              <div className="flex items-center gap-3 text-[12px] text-[#4A5468]">
                <span>{r.time}</span>
                <span>·</span>
                <span>{r.incidents.length === 0 ? "No recent incidents" : `${r.incidents.length} incident reports nearby`}</span>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onStart}
        className="mt-5 w-full rounded-full py-3.5 font-semibold text-sm text-white"
        style={{ background: routes[selected].color, fontFamily: "'Space Grotesk',sans-serif" }}
      >
        Start {routes[selected].label.toLowerCase()} route
      </button>
    </div>
  );
}

/* ---------------- Nav / live trip ---------------- */

function QuickAction({ icon: Icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-colors"
      style={{ borderColor: active ? "#0D9488" : "#E2E7F0", background: active ? "#0D948810" : "white" }}
    >
      <Icon size={16} color={active ? "#0D9488" : "#4A5468"} />
      <span className="text-[9.5px] leading-none" style={{ color: active ? "#0D9488" : "#4A5468" }}>{label}</span>
    </button>
  );
}

function NavScreen({
  city, route, isNight, progress, whyOpen, setWhyOpen, mapView, setMapView,
  sharedContacts, onOpenContacts, onSos, onStopAlert, onFakeCall, onHazard,
  shakeOn, onToggleShake, hazardPin, onExit,
}) {
  const r = routeFor(route, isNight, hazardPin ? 6 : 0);
  const arrived = progress >= 1;
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <button onClick={onExit} className="w-8 h-8 rounded-full bg-[#F3F5FA] border border-[#E2E7F0] flex items-center justify-center">
          <ArrowLeft size={14} color="#4A5468" />
        </button>
        <div className="flex items-center gap-2">
          <ScoreBadge value={r.score} color={r.color} />
          <div className="text-left">
            <p className="text-[10px] text-[#8A94A6] leading-none mb-0.5">Safety score</p>
            <p className="text-[11px] text-[#4A5468] leading-none">{arrived ? "Arrived" : "Live"}</p>
          </div>
        </div>
      </div>

      <div className="relative flex-1">
        <LiveMap city={city} route={r} progress={progress} view={mapView} hazardPin={hazardPin} />
        <div className="absolute top-3 left-5 right-5 flex items-center justify-between">
          <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full" style={{ background: `${r.color}1A`, color: r.color }}>
            ● {r.label} route
          </span>
          <button
            onClick={() => setMapView((v) => v === "roadmap" ? "satellite" : "roadmap")}
            className="flex items-center gap-1 text-[11px] font-mono text-[#4A5468] bg-white/90 border border-[#E2E7F0] px-2.5 py-1 rounded-full"
          >
            {mapView === "roadmap" ? <Satellite size={11} /> : <MapIcon size={11} />}
            {mapView === "roadmap" ? "Satellite" : "Road"}
          </button>
        </div>
      </div>

      <div className="px-5 pt-3 pb-5 bg-white border-t border-[#E2E7F0] rounded-t-2xl -mt-3 relative z-10 shadow-[0_-8px_20px_-12px_rgba(16,24,40,0.15)]">
        <button
          onClick={() => setWhyOpen((v) => !v)}
          className="w-full flex items-center justify-between py-2 text-left"
        >
          <span className="text-[13px] font-medium text-[#101828]">Why this route?</span>
          <ChevronDown size={14} color="#4A5468" style={{ transform: whyOpen ? "rotate(180deg)" : "none", transition: "transform 200ms" }} />
        </button>
        {whyOpen && (
          <p className="text-[12px] text-[#4A5468] leading-relaxed pb-3">
            {r.why}{hazardPin ? " A hazard was just reported nearby, so the score has been adjusted." : ""}
          </p>
        )}

        <button
          onClick={onOpenContacts}
          className="w-full flex items-center justify-between py-2.5 border-t border-[#E2E7F0] mt-1 text-left"
        >
          <div className="flex items-center gap-2">
            <Users size={15} color="#0D9488" />
            <span className="text-[13px] text-[#101828]">Share live location</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11.5px] text-[#8A94A6]">
              {sharedContacts.length === 0 ? "Off" : `${sharedContacts.length} contact${sharedContacts.length > 1 ? "s" : ""}`}
            </span>
            <ChevronRight size={13} color="#B0B8C6" />
          </div>
        </button>

        <div className="flex gap-2 mt-3">
          <QuickAction icon={Phone} label="Fake call" onClick={onFakeCall} />
          <QuickAction icon={Flag} label="Report hazard" onClick={onHazard} />
          <QuickAction icon={Pause} label="Stop test" onClick={onStopAlert} />
          <QuickAction icon={Vibrate} label="Shake→SOS" onClick={onToggleShake} active={shakeOn} />
        </div>

        <button
          onClick={onSos}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-full py-3 text-[14px] font-semibold text-white"
          style={{ background: "#DC2626", fontFamily: "'Space Grotesk',sans-serif" }}
        >
          <Siren size={16} /> SOS
        </button>
      </div>
    </div>
  );
}

/* ---------------- Arrived / trip summary ---------------- */

function ArrivedScreen({ city, dest, route, isNight, hadHazard, rating, setRating, feedback, setFeedback, onDone }) {
  const r = routeFor(route, isNight, hadHazard ? 6 : 0);
  const toggleChip = (c) => setFeedback((f) => f.includes(c) ? f.filter((x) => x !== c) : [...f, c]);

  return (
    <div className="flex flex-col h-full bg-white px-5 pt-10 pb-6 items-center text-center overflow-y-auto">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: "#E6F6F4", animation: "popIn 420ms cubic-bezier(.34,1.56,.64,1)" }}
      >
        <Check size={28} color="#0D9488" strokeWidth={3} />
      </div>
      <style>{`@keyframes popIn{from{transform:scale(0.4);opacity:0}to{transform:scale(1);opacity:1}}`}</style>

      <h2 className="text-xl font-semibold text-[#101828] mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
        You arrived safely
      </h2>
      <p className="text-[12.5px] text-[#8A94A6] mb-6">{dest} · {city}</p>

      <div className="w-full rounded-xl border border-[#E2E7F0] p-4 mb-6 text-left">
        <div className="flex items-center justify-between py-1.5">
          <span className="text-[12.5px] text-[#4A5468]">Route taken</span>
          <span className="text-[12.5px] font-medium" style={{ color: r.color }}>● {r.label}</span>
        </div>
        <div className="flex items-center justify-between py-1.5 border-t border-[#F0F2F7]">
          <span className="text-[12.5px] text-[#4A5468]">Safety score</span>
          <ScoreBadge value={r.score} color={r.color} />
        </div>
        <div className="flex items-center justify-between py-1.5 border-t border-[#F0F2F7]">
          <span className="text-[12.5px] text-[#4A5468]">Trip time</span>
          <span className="text-[12.5px] font-mono text-[#101828]">{r.time}</span>
        </div>
        <div className="flex items-center justify-between py-1.5 border-t border-[#F0F2F7]">
          <span className="text-[12.5px] text-[#4A5468]">Hazards reported this trip</span>
          <span className="text-[12.5px] font-mono text-[#101828]">{hadHazard ? 1 : 0}</span>
        </div>
      </div>

      <p className="text-[12.5px] font-medium text-[#101828] mb-2 w-full text-left">Rate this route</p>
      <div className="flex gap-1.5 mb-5 w-full">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} onClick={() => setRating(i)}>
            <Star size={24} color="#D97706" fill={i <= rating ? "#D97706" : "none"} strokeWidth={1.6} />
          </button>
        ))}
      </div>

      <p className="text-[12.5px] font-medium text-[#101828] mb-2 w-full text-left">Quick feedback</p>
      <div className="flex flex-wrap gap-2 mb-8 w-full">
        {FEEDBACK_CHIPS.map((c) => {
          const on = feedback.includes(c);
          return (
            <button
              key={c}
              onClick={() => toggleChip(c)}
              className="rounded-full px-3 py-1.5 text-[11.5px] font-medium border transition-colors"
              style={{ borderColor: on ? "#0D9488" : "#E2E7F0", background: on ? "#0D948814" : "white", color: on ? "#0D9488" : "#4A5468" }}
            >
              {c}
            </button>
          );
        })}
      </div>

      <button
        onClick={onDone}
        className="mt-auto w-full rounded-full py-3.5 font-semibold text-sm text-white"
        style={{ background: "#0D9488", fontFamily: "'Space Grotesk',sans-serif" }}
      >
        Done
      </button>
    </div>
  );
}

/* ---------------- sheets ---------------- */

function Sheet({ children, onClose }) {
  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-[#101828]/45" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-white border-t border-[#E2E7F0] rounded-t-2xl p-5 shadow-[0_-10px_30px_-10px_rgba(16,24,40,0.25)] max-h-[85%] overflow-y-auto animate-[slideUp_220ms_ease-out]"
      >
        {children}
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}

function ContactSheet({ selected, setSelected, onClose }) {
  const toggle = (name) => setSelected((s) => s.includes(name) ? s.filter((n) => n !== name) : [...s, name]);
  return (
    <Sheet onClose={onClose}>
      <p className="text-sm font-semibold text-[#101828] mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Share with</p>
      <p className="text-[12px] text-[#8A94A6] mb-4">Sorted by who you call most</p>
      <div className="flex flex-col gap-2 mb-4">
        {CONTACTS.map((c) => {
          const checked = selected.includes(c.name);
          return (
            <button
              key={c.name}
              onClick={() => toggle(c.name)}
              className="flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors"
              style={{ borderColor: checked ? "#0D9488" : "#E2E7F0", background: checked ? "#0D948810" : "white" }}
            >
              <div className="w-9 h-9 rounded-full bg-[#F3F5FA] flex items-center justify-center text-[12px] font-semibold text-[#4A5468] shrink-0">
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#101828] truncate">{c.name}</p>
                <p className="text-[11px] text-[#8A94A6] font-mono truncate">{c.number}</p>
              </div>
              <div className="flex items-center gap-1 text-[10.5px] text-[#0D9488] bg-[#E6F6F4] px-2 py-1 rounded-full shrink-0">
                <Phone size={10} /> {c.calls}
              </div>
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{ borderColor: checked ? "#0D9488" : "#D8DEEA", background: checked ? "#0D9488" : "white" }}
              >
                {checked && <Check size={12} color="white" />}
              </div>
            </button>
          );
        })}
      </div>
      <button onClick={onClose} className="w-full rounded-full py-2.5 text-[13px] font-semibold text-white" style={{ background: "#0D9488" }}>
        Done — sharing with {selected.length}
      </button>
    </Sheet>
  );
}

function HazardSheet({ onClose, onSubmit }) {
  const [choice, setChoice] = useState(null);
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-[#F3EBFE] flex items-center justify-center shrink-0">
          <Flag size={16} color="#7C3AED" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#101828]" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Report what you see</p>
          <p className="text-[12px] text-[#4A5468] mt-1">Helps re-score this stretch for the next person walking it.</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 mb-4">
        {HAZARD_TYPES.map((h) => (
          <button
            key={h.key}
            onClick={() => setChoice(h.key)}
            className="flex items-center justify-between rounded-xl border px-3.5 py-3 text-left"
            style={{ borderColor: choice === h.key ? "#7C3AED" : "#E2E7F0", background: choice === h.key ? "#7C3AED0F" : "white" }}
          >
            <span className="text-[13px] text-[#101828]">{h.label}</span>
            <div
              className="w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: choice === h.key ? "#7C3AED" : "#D8DEEA", background: choice === h.key ? "#7C3AED" : "white", width: 18, height: 18 }}
            >
              {choice === h.key && <Check size={11} color="white" />}
            </div>
          </button>
        ))}
      </div>
      <button
        disabled={!choice}
        onClick={() => onSubmit(choice)}
        className="w-full rounded-full py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
        style={{ background: "#7C3AED" }}
      >
        Submit report
      </button>
    </Sheet>
  );
}

function FakeCallOverlay({ stage, onAccept, onDecline, seconds }) {
  if (!stage) return null;
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between py-16 px-6" style={{ background: "linear-gradient(180deg,#101828,#1C2A48)" }}>
      {stage === "ringing" ? (
        <>
          <div className="text-center mt-6">
            <p className="text-white/60 text-[12px] mb-1">Incoming call</p>
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-2xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>A</span>
            </div>
            <p className="text-white text-lg font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Aai (Mom)</p>
            <p className="text-white/60 text-[12px] mt-1">mobile</p>
          </div>
          <div className="flex items-center justify-center gap-16 w-full">
            <div className="flex flex-col items-center gap-2">
              <button onClick={onDecline} className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#DC2626" }}>
                <PhoneOff size={22} color="white" />
              </button>
              <span className="text-white/70 text-[11px]">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button onClick={onAccept} className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#0D9488" }}>
                <Phone size={22} color="white" />
              </button>
              <span className="text-white/70 text-[11px]">Accept</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="text-center mt-6">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>A</span>
            </div>
            <p className="text-white text-lg font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Aai (Mom)</p>
            <p className="text-white/60 text-[12px] mt-1 font-mono">{`00:${String(seconds).padStart(2, "0")}`}</p>
          </div>
          <button onClick={onDecline} className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#DC2626" }}>
            <PhoneOff size={22} color="white" />
          </button>
        </>
      )}
    </div>
  );
}

/* ---------------- phone shell ---------------- */

function PhoneFrame({ children }) {
  return (
    <div className="relative w-[340px] h-[680px] rounded-[2.5rem] border-[6px] border-[#D8DEEA] bg-white shadow-[0_30px_80px_-20px_rgba(16,24,40,0.35)] overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-[#D8DEEA] rounded-b-2xl z-30" />
      <div className="relative w-full h-full overflow-hidden">{children}</div>
    </div>
  );
}

export default function SafePathPrototype() {
  useFonts();
  const mode = useTimeMode();

  const [screen, setScreen] = useState("dashboard"); // dashboard | search | routes | nav | arrived
  const [citySearch, setCitySearch] = useState("");
  const [activeCity, setActiveCity] = useState("Satara");
  const [dest, setDest] = useState("");
  const [route, setRoute] = useState("safe");
  const [progress, setProgress] = useState(0);
  const [whyOpen, setWhyOpen] = useState(false);
  const [mapView, setMapView] = useState("roadmap");
  const [sharedContacts, setSharedContacts] = useState(["Aai (Mom)", "Pragati"]);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [sosStage, setSosStage] = useState(null); // null | 'confirm' | 'sent'
  const [stopAlert, setStopAlert] = useState(false);
  const [hazardOpen, setHazardOpen] = useState(false);
  const [hazardPin, setHazardPin] = useState(null);
  const [toast, setToast] = useState("");
  const [fakeCallStage, setFakeCallStage] = useState(null); // null | 'ringing' | 'active'
  const [callSeconds, setCallSeconds] = useState(0);
  const [shakeOn, setShakeOn] = useState(false);

  const [tripHistory, setTripHistory] = useState(RECENT_TRIPS);
  const [tripsThisMonth, setTripsThisMonth] = useState(14);
  const [hazardsReportedCount, setHazardsReportedCount] = useState(6);
  const [tripRating, setTripRating] = useState(0);
  const [tripFeedback, setTripFeedback] = useState([]);

  const avgScore = Math.round(tripHistory.reduce((s, t) => s + t.score, 0) / tripHistory.length);

  const intervalRef = useRef(null);
  const callTimerRef = useRef(null);
  const shakeRef = useRef({ x: 0, y: 0, z: 0, t: 0 });

  const goToSearch = () => { setCitySearch(""); setScreen("search"); };
  const pickSuggestion = (city, place) => { setActiveCity(city); setDest(place); setRoute("safe"); setScreen("routes"); };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  const startTrip = useCallback(() => {
    setProgress(0);
    setScreen("nav");
    setWhyOpen(false);
    setStopAlert(false);
    setSosStage(null);
    setHazardPin(null);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 1) { clearInterval(intervalRef.current); return 1; }
        return Math.min(1, p + 0.006);
      });
    }, 60);
  }, []);

  useEffect(() => () => { clearInterval(intervalRef.current); clearInterval(callTimerRef.current); }, []);

  useEffect(() => {
    if (progress >= 1 && screen === "nav") {
      const t = setTimeout(() => setScreen("arrived"), 700);
      return () => clearTimeout(t);
    }
  }, [progress, screen]);

  const handleDone = () => {
    const r = routeFor(route, mode.isNight, hazardPin ? 6 : 0);
    setTripHistory((h) => [
      { from: "Trip", to: dest || "Destination", city: activeCity, time: "Just now", score: r.score, mode: r.label },
      ...h,
    ].slice(0, 6));
    setTripsThisMonth((n) => n + 1);
    setProgress(0);
    setHazardPin(null);
    setTripRating(0);
    setTripFeedback([]);
    setScreen("dashboard");
  };

  const pauseTrip = () => clearInterval(intervalRef.current);
  const resumeTrip = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setProgress((p) => Math.min(1, p + 0.006)), 60);
  };

  const triggerSos = () => { pauseTrip(); setFakeCallStage(null); clearInterval(callTimerRef.current); setSosStage("confirm"); };

  /* fake call */
  const startFakeCall = () => {
    setFakeCallStage("ringing");
    showToast("Calling in 1.5s…");
  };
  const acceptFakeCall = () => {
    setFakeCallStage("active");
    setCallSeconds(0);
    callTimerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
  };
  const endFakeCall = () => { setFakeCallStage(null); clearInterval(callTimerRef.current); };

  /* shake to SOS */
  const toggleShake = async () => {
    if (shakeOn) { setShakeOn(false); showToast("Shake to SOS turned off"); return; }
    try {
      if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
        const res = await DeviceMotionEvent.requestPermission();
        if (res !== "granted") { showToast("Motion permission denied"); return; }
      }
      if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
        showToast("Shake detection isn't supported here");
        return;
      }
      setShakeOn(true);
      showToast("Shake your phone hard to trigger SOS");
    } catch {
      showToast("Shake detection isn't supported here");
    }
  };

  useEffect(() => {
    if (!shakeOn) return;
    const handler = (e) => {
      const a = e.accelerationIncludingGravity || e.acceleration;
      if (!a) return;
      const now = Date.now();
      const prev = shakeRef.current;
      if (now - prev.t < 100) return;
      const delta = Math.abs((a.x || 0) - prev.x) + Math.abs((a.y || 0) - prev.y) + Math.abs((a.z || 0) - prev.z);
      shakeRef.current = { x: a.x || 0, y: a.y || 0, z: a.z || 0, t: now };
      if (delta > 28) { setShakeOn(false); triggerSos(); }
    };
    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, [shakeOn]);

  const hazardCenter = { x: 190, y: 120 };

  return (
    <div className="min-h-screen w-full flex flex-col items-center py-14 px-5" style={{ background: "#EEF2F8", fontFamily: "'Inter',sans-serif" }}>
      <div className="text-center mb-8 max-w-md">
        <p className="text-[11px] font-mono uppercase tracking-widest text-[#B45309] mb-2">Interactive prototype</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#101828] mb-2" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
          SafePath AI
        </h1>
        <p className="text-[#4A5468] text-sm leading-relaxed">
          Real Google Maps underneath your route, a safety forecast before you leave, a discreet
          fake-call escape, shake-to-SOS, and live community hazard reports.
        </p>
      </div>

      <PhoneFrame>
        <Toast msg={toast} />

        {screen === "dashboard" && (
          <Dashboard
            mode={mode} onPlanTrip={goToSearch}
            tripsThisMonth={tripsThisMonth} avgScore={avgScore}
            hazardsReportedCount={hazardsReportedCount} tripHistory={tripHistory}
          />
        )}

        {screen === "search" && (
          <SearchScreen
            citySearch={citySearch} setCitySearch={setCitySearch} activeCity={activeCity}
            onBack={() => setScreen("dashboard")} onGo={pickSuggestion}
          />
        )}

        {screen === "routes" && (
          <RoutesScreen
            city={activeCity} dest={dest} selected={route} setSelected={setRoute}
            isNight={mode.isNight} now={mode.now} onBack={() => setScreen("search")} onStart={startTrip}
          />
        )}

        {screen === "nav" && (
          <>
            <NavScreen
              city={activeCity} route={route} isNight={mode.isNight} progress={progress}
              whyOpen={whyOpen} setWhyOpen={setWhyOpen} mapView={mapView} setMapView={setMapView}
              sharedContacts={sharedContacts}
              onOpenContacts={() => { pauseTrip(); setContactsOpen(true); }}
              onSos={triggerSos}
              onStopAlert={() => { pauseTrip(); setStopAlert(true); }}
              onFakeCall={() => { pauseTrip(); setTimeout(startFakeCall, 1400); }}
              onHazard={() => { pauseTrip(); setHazardOpen(true); }}
              shakeOn={shakeOn} onToggleShake={toggleShake}
              hazardPin={hazardPin}
              onExit={() => { clearInterval(intervalRef.current); setScreen("routes"); }}
            />

            <FakeCallOverlay
              stage={fakeCallStage} seconds={callSeconds}
              onAccept={acceptFakeCall}
              onDecline={() => { endFakeCall(); resumeTrip(); }}
            />

            {contactsOpen && (
              <ContactSheet
                selected={sharedContacts} setSelected={setSharedContacts}
                onClose={() => { setContactsOpen(false); resumeTrip(); }}
              />
            )}

            {hazardOpen && (
              <HazardSheet
                onClose={() => { setHazardOpen(false); resumeTrip(); }}
                onSubmit={(choice) => {
                  setHazardOpen(false);
                  setHazardPin(hazardCenter);
                  setHazardsReportedCount((c) => c + 1);
                  showToast("Reported — thanks, this helps others");
                  resumeTrip();
                }}
              />
            )}

            {stopAlert && (
              <Sheet onClose={() => {}}>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-[#FDF3E7] flex items-center justify-center shrink-0">
                    <ShieldAlert size={17} color="#B45309" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#101828]" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                      You've stopped moving
                    </p>
                    <p className="text-[12px] text-[#4A5468] mt-1">No movement for 3 minutes near your route. Just checking in — are you okay?</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setStopAlert(false); resumeTrip(); }} className="flex-1 rounded-full py-2.5 text-[13px] font-semibold text-white" style={{ background: "#0D9488" }}>
                    I'm fine, continue
                  </button>
                  <button onClick={() => { setStopAlert(false); setSosStage("confirm"); }} className="flex-1 rounded-full py-2.5 text-[13px] font-semibold text-white" style={{ background: "#DC2626" }}>
                    Send SOS
                  </button>
                </div>
              </Sheet>
            )}

            {sosStage === "confirm" && (
              <Sheet onClose={() => { setSosStage(null); resumeTrip(); }}>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-[#FEECEC] flex items-center justify-center shrink-0">
                    <Siren size={17} color="#DC2626" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#101828]" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Send SOS?</p>
                    <p className="text-[12px] text-[#4A5468] mt-1">
                      Your live location and trip details go to {sharedContacts.length > 0 ? sharedContacts.join(", ") : "your trusted contacts"} immediately.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setSosStage(null); resumeTrip(); }} className="flex-1 rounded-full py-2.5 text-[13px] font-medium border border-[#E2E7F0] text-[#4A5468]">
                    Cancel
                  </button>
                  <button onClick={() => setSosStage("sent")} className="flex-1 rounded-full py-2.5 text-[13px] font-semibold text-white" style={{ background: "#DC2626" }}>
                    Send now
                  </button>
                </div>
              </Sheet>
            )}

            {sosStage === "sent" && (
              <Sheet onClose={() => {}}>
                <div className="flex flex-col items-center text-center py-2">
                  <div className="w-12 h-12 rounded-full bg-[#E6F6F4] flex items-center justify-center mb-3">
                    <Check size={22} color="#0D9488" />
                  </div>
                  <p className="text-sm font-semibold text-[#101828] mb-1" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Alert sent</p>
                  <p className="text-[12px] text-[#4A5468] mb-5">
                    {sharedContacts.length > 0 ? sharedContacts.join(", ") : "Your trusted contacts"} now have your live location and can call you.
                  </p>
                  <button onClick={() => { setSosStage(null); resumeTrip(); }} className="w-full rounded-full py-2.5 text-[13px] font-semibold text-white" style={{ background: "#0D9488" }}>
                    Back to trip
                  </button>
                </div>
              </Sheet>
            )}
          </>
        )}

        {screen === "arrived" && (
          <ArrivedScreen
            city={activeCity} dest={dest} route={route} isNight={mode.isNight}
            hadHazard={!!hazardPin}
            rating={tripRating} setRating={setTripRating}
            feedback={tripFeedback} setFeedback={setTripFeedback}
            onDone={handleDone}
          />
        )}
      </PhoneFrame>
    </div>
  );
}
