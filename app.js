const { useState, useEffect, useMemo, useRef } = React;
const MAD = { format: (v) => `${Math.round(Number(v) || 0).toLocaleString("fr-FR")} DH` };
const EUR = MAD;
const fmtDate = (v) => v ? (/* @__PURE__ */ new Date(v + "T12:00")).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "\u2014";
const todayISO = () => {
  const d = /* @__PURE__ */ new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const isSlotInPast = (dateStr, slotHourStr) => {
  if (!dateStr) return false;
  const today = todayISO();
  if (dateStr < today) return true;
  if (dateStr > today) return false;
  const now = /* @__PURE__ */ new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const [slotH] = (slotHourStr || "00:00").split(":").map(Number);
  if (slotH < currentHour) return true;
  if (slotH === currentHour && currentMin >= 0) return true;
  return false;
};
const U = (id, w = 900) => !id ? "" : id.startsWith("http") ? id : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
const serializeNodes = (nodes) => {
  if (!Array.isArray(nodes)) return "";
  return nodes.map((n) => {
    if (!Array.isArray(n)) return "";
    const [t, a = {}, ch = []] = n;
    const attrs = Object.entries(a || {}).map(([k, v]) => `${k}="${v}"`).join(" ");
    return `<${t} ${attrs}>${Array.isArray(ch) && ch.length ? serializeNodes(ch) : ""}</${t}>`;
  }).join("");
};
const Icon = ({ n, size = 18, sw = 2, className = "", fill = "none" }) => {
  const html = useMemo(() => {
    if (!window.lucide || !window.lucide.icons) return "";
    const p = n.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
    const icon = window.lucide.icons[p] || window.lucide.icons[n];
    if (!icon) return "";
    if (Array.isArray(icon)) {
      if (typeof icon[0] === "string" && icon[0] === "svg" && Array.isArray(icon[2])) {
        return serializeNodes(icon[2]);
      }
      return serializeNodes(icon);
    }
    return "";
  }, [n]);
  return /* @__PURE__ */ React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: size,
      height: size,
      fill,
      stroke: "currentColor",
      strokeWidth: sw,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      "aria-hidden": "true",
      dangerouslySetInnerHTML: { __html: html }
    }
  );
};
const smoothPath = (pts) => {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
};
const API_BASE = "http://localhost:5000/api";
const SUPABASE_URL = "https://yhtgqugdsfwgqvmpulcy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Ju2xF0_S1YInzEMXECbL5A_XuKfXubO";
const SpotworkAPI = {
  token: "mock-token-client",
  managerToken: "mock-token-manager",
  supabaseUrl: SUPABASE_URL,
  supabaseKey: SUPABASE_ANON_KEY,
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2500) });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  },
  async getSpaces(params = {}) {
    try {
      const q = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/spaces?${q}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data.spaces;
    } catch {
      return null;
    }
  },
  async getSpaceById(id) {
    try {
      const res = await fetch(`${API_BASE}/spaces/${id}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },
  async createBooking(booking) {
    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SpotworkAPI.token}` },
        body: JSON.stringify(booking)
      });
      return await res.json();
    } catch (e) {
      return { status: "error", message: e.message };
    }
  },
  async getUserBookings() {
    try {
      const res = await fetch(`${API_BASE}/bookings/user`, {
        headers: { "Authorization": `Bearer ${SpotworkAPI.token}` }
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data.bookings;
    } catch {
      return null;
    }
  },
  async getRecommendations() {
    try {
      const res = await fetch(`${API_BASE}/recommendations`, {
        headers: { "Authorization": `Bearer ${SpotworkAPI.token}` }
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data.recommendations;
    } catch {
      return null;
    }
  },
  async clickRecommendation(id) {
    try {
      await fetch(`${API_BASE}/recommendations/${id}/click`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${SpotworkAPI.token}` }
      });
    } catch {
    }
  },
  async submitAIFeedback(spaceId, feedback) {
    try {
      const res = await fetch(`${API_BASE}/recommendations/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SpotworkAPI.token}` },
        body: JSON.stringify({ space_id: spaceId, feedback })
      });
      return await res.json();
    } catch {
      return null;
    }
  },
  async getManagerMetrics() {
    try {
      const res = await fetch(`${API_BASE}/manager/dashboard`, {
        headers: { "Authorization": `Bearer ${SpotworkAPI.token || SpotworkAPI.managerToken}` }
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },
  async createSpace(spaceData) {
    try {
      const res = await fetch(`${API_BASE}/spaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SpotworkAPI.token || SpotworkAPI.managerToken}` },
        body: JSON.stringify(spaceData)
      });
      return await res.json();
    } catch (e) {
      return { status: "error", message: e.message };
    }
  },
  async updateSpace(id, updates) {
    try {
      const res = await fetch(`${API_BASE}/spaces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SpotworkAPI.token || SpotworkAPI.managerToken}` },
        body: JSON.stringify(updates)
      });
      return await res.json();
    } catch (e) {
      return { status: "error", message: e.message };
    }
  },
  async deleteSpace(id) {
    try {
      const res = await fetch(`${API_BASE}/spaces/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${SpotworkAPI.token || SpotworkAPI.managerToken}` }
      });
      return await res.json();
    } catch (e) {
      return { status: "error", message: e.message };
    }
  },
  async getManagerBookings() {
    try {
      const res = await fetch(`${API_BASE}/manager/bookings`, {
        headers: { "Authorization": `Bearer ${SpotworkAPI.token || SpotworkAPI.managerToken}` }
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data.bookings;
    } catch {
      return null;
    }
  },
  async updateBookingStatus(id, status) {
    try {
      const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SpotworkAPI.token || SpotworkAPI.managerToken}` },
        body: JSON.stringify({ status })
      });
      return await res.json();
    } catch (e) {
      return { status: "error", message: e.message };
    }
  },
  async getPayments() {
    try {
      const res = await fetch(`${API_BASE}/manager/payments`, {
        headers: { "Authorization": `Bearer ${SpotworkAPI.token || SpotworkAPI.managerToken}` }
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },
  async updatePreferences(preferences) {
    try {
      const res = await fetch(`${API_BASE}/auth/preferences`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SpotworkAPI.token}`
        },
        body: JSON.stringify(preferences)
      });
      return await res.json();
    } catch (e) {
      return { status: "error", message: e.message };
    }
  },
  async cancelBooking(id) {
    try {
      const res = await fetch(`${API_BASE}/bookings/${id}/cancel`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${SpotworkAPI.token}` }
      });
      return await res.json();
    } catch (e) {
      return { status: "error", message: e.message };
    }
  },
  async getProfile() {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { "Authorization": `Bearer ${SpotworkAPI.token}` }
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }
};
const PRESET_ACCOUNTS = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    email: "youssef@proptech.ma",
    name: "Youssef Amrani",
    firstName: "Youssef",
    initials: "YA",
    role: "client",
    roleLabel: "Client",
    city: "Casablanca",
    avatarBg: "bg-brand-600",
    badgeCls: "bg-blue-50 text-brand-700 border-brand-200",
    desc: "Compte Client : recherche, r\xE9servation d'espaces au Maroc, recommandations IA personnalis\xE9es."
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    email: "mehdi@spotwork.ma",
    name: "Mehdi El Fassi",
    firstName: "Mehdi",
    initials: "ME",
    role: "manager",
    roleLabel: "Gestionnaire",
    city: "Casablanca",
    avatarBg: "bg-indigo-600",
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200",
    desc: "Compte Gestionnaire : pilotage des espaces, occupation, revenus et gestion des r\xE9servations."
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    email: "admin@spotwork.ma",
    name: "Fatima Zahra Alaoui",
    firstName: "Fatima Zahra",
    initials: "FA",
    role: "admin",
    roleLabel: "Administratrice",
    city: "Rabat",
    avatarBg: "bg-navy",
    badgeCls: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Compte Administrateur : vue globale sur la plateforme PropTech Maroc et ses utilisateurs."
  }
];
const CITIES = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "F\xE8s"];
const TYPES = [
  { id: "open", label: "Open space", icon: "layout-grid" },
  { id: "office", label: "Bureau priv\xE9", icon: "door-closed" },
  { id: "meeting", label: "Salle de r\xE9union", icon: "users" },
  { id: "studio", label: "Studio cr\xE9atif", icon: "palette" },
  { id: "booth", label: "Cabine focus", icon: "headphones" }
];
const AMENITIES = [
  { id: "wifi", label: "Wifi fibre", icon: "wifi" },
  { id: "coffee", label: "Th\xE9 & Caf\xE9 illimit\xE9s", icon: "coffee" },
  { id: "screen", label: "\xC9cran & visio 4K", icon: "monitor" },
  { id: "board", label: "Tableau blanc", icon: "pen-tool" },
  { id: "print", label: "Impression", icon: "printer" },
  { id: "access", label: "Acc\xE8s 24/7", icon: "key-round" },
  { id: "terrace", label: "Rooftop / Terrasse", icon: "sun" },
  { id: "bike", label: "Parking s\xE9curis\xE9", icon: "bike" }
];
const IMG = {
  a: "photo-1497366216548-37526070297c",
  b: "photo-1497366811353-6870744d04b2",
  c: "photo-1524758631624-e2822e304c36",
  d: "photo-1556761175-b413da4baf72",
  e: "photo-1497215728101-856f4ea42174",
  f: "photo-1600508774634-4e11d34730e2",
  g: "photo-1522202176988-66273c2fd55f",
  h: "photo-1519389950473-47ba0277781c",
  i: "photo-1504384308090-c894fdcc538d",
  j: "photo-1462826303086-329426d1aef5",
  k: "photo-1568992687947-868a62a9f598",
  l: "photo-1553877522-43269d4ea984",
  m: "photo-1593115057322-e94b77572f20",
  n: "photo-1541746972996-4e0b0f43e02a",
  q: "photo-1431540015161-0bf868a2d407",
  s: "photo-1521737604893-d14cc237f11d"
};
const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const MONTHS = ["Jan", "F\xE9v", "Mar", "Avr", "Mai", "Juin", "Juil", "Ao\xFB", "Sep", "Oct", "Nov", "D\xE9c"];
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const normalizeSpaceFromDB = (s) => {
  if (!s) return null;
  const numId = typeof s.id === "number" ? s.id : parseInt(String(s.id).split("-").pop(), 10) || s.id;
  const city = s.city || (s.location ? s.location.split("\xB7")[0].trim() : "Casablanca");
  const district = s.district || (s.location && s.location.includes("\xB7") ? s.location.split("\xB7")[1].trim() : s.location || "Centre-ville");
  const imgs = Array.isArray(s.imgs) && s.imgs.length > 0 ? s.imgs : Array.isArray(s.photos) && s.photos.length > 0 ? s.photos : [s.photos || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=70"];
  const am = Array.isArray(s.am) && s.am.length > 0 ? s.am : Array.isArray(s.amenities) && s.amenities.length > 0 ? s.amenities : typeof s.amenities === "string" ? s.amenities.split(" ") : ["wifi", "coffee", "screen"];
  const price = Number(s.price !== void 0 ? s.price : s.price_per_hour) || 45;
  const cap = Number(s.cap !== void 0 ? s.cap : s.capacity) || 10;
  return {
    ...s,
    id: numId,
    dbId: s.id,
    name: s.name,
    city,
    district,
    address: s.address || `${district}, ${city}, Maroc`,
    lat: s.lat || s.latitude || 33.5855,
    lng: s.lng || s.longitude || -7.6322,
    transport: s.transport || "Acc\xE8s transports & taxis \xE0 proximit\xE9",
    type: s.type || (cap > 20 ? "open" : cap > 10 ? "studio" : cap > 5 ? "meeting" : cap === 1 ? "booth" : "office"),
    price,
    unit: s.unit || "heure",
    rating: Number(s.rating) || 4.8,
    rev: s.rev || 48,
    cap,
    surface: s.surface || `${cap * 6} m\xB2`,
    imgs,
    am,
    badge: s.badge || (s.rating >= 4.9 ? "Coup de c\u0153ur" : s.rating >= 4.8 ? "Populaire" : "Recommand\xE9"),
    featured: s.featured !== void 0 ? s.featured : typeof numId === "number" ? numId <= 4 : true,
    host: s.host || (s.users?.full_name || "Mehdi El Fassi"),
    desc: s.desc || s.description || "",
    busy: s.busy || []
  };
};
const getSpaceAvailability = (space, dateStr, bookings = []) => {
  if (!space) {
    return {
      availableSeats: 0,
      totalCapacity: 0,
      isSoldOut: false,
      isFullDay: false,
      isPast: false,
      allHoursPast: false,
      bookedHours: [],
      pastHours: [],
      hourlyFreeSeats: {},
      hourlyBookedSeats: {},
      minFreeSeats: 0,
      maxFreeSeats: 0
    };
  }
  const cap = space.cap || 1;
  const today = todayISO();
  const isPastDate = Boolean(dateStr && dateStr < today);
  const isToday = Boolean(dateStr && dateStr === today);
  const hourlyBookedSeats = {};
  const hourlyFreeSeats = {};
  const pastHours = [];
  HOURS.forEach((h) => {
    hourlyBookedSeats[h] = 0;
    if (isPastDate || isToday && isSlotInPast(dateStr, h)) {
      pastHours.push(h);
    }
  });
  if (!dateStr) {
    HOURS.forEach((h) => {
      hourlyFreeSeats[h] = cap;
    });
    return {
      availableSeats: cap,
      totalCapacity: cap,
      isSoldOut: false,
      isFullDay: false,
      isPast: false,
      allHoursPast: false,
      bookedHours: [],
      pastHours: [],
      hourlyFreeSeats,
      hourlyBookedSeats,
      minFreeSeats: cap,
      maxFreeSeats: cap
    };
  }
  if (isPastDate) {
    HOURS.forEach((h) => {
      hourlyFreeSeats[h] = 0;
    });
    return {
      availableSeats: 0,
      totalCapacity: cap,
      isSoldOut: true,
      isFullDay: true,
      isPast: true,
      allHoursPast: true,
      bookedHours: [...HOURS],
      pastHours: [...HOURS],
      hourlyFreeSeats,
      hourlyBookedSeats,
      minFreeSeats: 0,
      maxFreeSeats: 0
    };
  }
  const dayBookings = (bookings || []).filter(
    (b) => (b.spaceId === space.id || b.id === space.id) && b.date === dateStr && b.status !== "cancelled"
  );
  const isExclusiveRoom = ["office", "booth"].includes(space.type);
  for (const b of dayBookings) {
    const isJournee = b.timeSlot && b.timeSlot.includes("Journ\xE9e") || b.meta && b.meta.includes("Journ\xE9e") || b.hours && b.hours >= 8;
    const seatsTaken = isExclusiveRoom ? cap : b.seats !== void 0 ? Math.max(1, Number(b.seats)) : 1;
    if (isJournee) {
      HOURS.forEach((h) => {
        hourlyBookedSeats[h] = Math.min(cap, (hourlyBookedSeats[h] || 0) + seatsTaken);
      });
    } else if (Array.isArray(b.slots) && b.slots.length > 0) {
      b.slots.forEach((h) => {
        if (hourlyBookedSeats[h] !== void 0) {
          hourlyBookedSeats[h] = Math.min(cap, hourlyBookedSeats[h] + seatsTaken);
        }
      });
    } else {
      const slotText = b.timeSlot || b.meta || "";
      const match = slotText.match(/(\d{2}:\d{2})\s*–\s*(\d{2}:\d{2})/);
      if (match) {
        const start = match[1];
        const end = match[2];
        const startIdx = HOURS.indexOf(start);
        const endIdx = HOURS.indexOf(end);
        if (startIdx !== -1 && endIdx !== -1) {
          for (let i = startIdx; i < endIdx; i++) {
            const h = HOURS[i];
            hourlyBookedSeats[h] = Math.min(cap, hourlyBookedSeats[h] + seatsTaken);
          }
        }
      }
    }
  }
  const soldOutHoursList = [];
  HOURS.forEach((h) => {
    if (pastHours.includes(h)) {
      hourlyFreeSeats[h] = 0;
      soldOutHoursList.push(h);
    } else {
      const free = Math.max(0, cap - (hourlyBookedSeats[h] || 0));
      hourlyFreeSeats[h] = free;
      if (free === 0) {
        soldOutHoursList.push(h);
      }
    }
  });
  const futureHours = HOURS.filter((h) => !pastHours.includes(h));
  const futureFreeValues = futureHours.map((h) => hourlyFreeSeats[h]);
  const maxFreeSeats = futureFreeValues.length > 0 ? Math.max(...futureFreeValues) : 0;
  const minFreeSeats = futureFreeValues.length > 0 ? Math.min(...futureFreeValues) : 0;
  const allFutureSoldOut = futureFreeValues.length === 0 || futureFreeValues.every((f) => f === 0);
  const allHoursPast = pastHours.length === HOURS.length;
  const isSoldOut = isPastDate || allHoursPast || allFutureSoldOut;
  const isFullDay = isSoldOut;
  return {
    availableSeats: maxFreeSeats,
    minFreeSeats,
    totalCapacity: cap,
    isSoldOut,
    isFullDay,
    isPast: isPastDate,
    allHoursPast,
    bookedHours: soldOutHoursList,
    pastHours,
    hourlyFreeSeats,
    hourlyBookedSeats
  };
};
const getNextAvailableDates = (space, bookings = [], daysAhead = 7) => {
  const dates = [];
  const base = /* @__PURE__ */ new Date();
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    const avail = getSpaceAvailability(space, dateStr, bookings);
    dates.push({
      date: dateStr,
      availableSeats: avail.availableSeats,
      minFreeSeats: avail.minFreeSeats,
      totalCapacity: avail.totalCapacity,
      isSoldOut: avail.isSoldOut,
      isPast: avail.isPast,
      allHoursPast: avail.allHoursPast,
      label: i === 0 ? "Aujourd'hui" : d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
    });
  }
  return dates;
};
const Stars = ({ v, size = 13 }) => /* @__PURE__ */ React.createElement("span", { className: "inline-flex gap-0.5 text-amber-400" }, [1, 2, 3, 4, 5].map((i) => /* @__PURE__ */ React.createElement(Icon, { key: i, n: "star", size, fill: i <= Math.round(v) ? "currentColor" : "none", className: i <= Math.round(v) ? "" : "text-slate-300" })));
const Badge = ({ label }) => {
  if (!label) return null;
  const eco = label.includes("\xC9co");
  return /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${eco ? "bg-emerald-100 text-emerald-700" : "bg-white/95 text-ink shadow-sm"}` }, eco && /* @__PURE__ */ React.createElement(Icon, { n: "leaf", size: 11 }), label);
};
const Kicker = ({ children }) => /* @__PURE__ */ React.createElement("p", { className: "flex items-center gap-2 text-[11px] md:text-xs font-semibold uppercase tracking-[0.18em] text-brand-600" }, /* @__PURE__ */ React.createElement("span", { className: "h-px w-6 bg-brand-500" }), children);
const SecHead = ({ kicker, title, action }) => /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-end justify-between gap-4 mb-7", "data-reveal": true }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Kicker, null, kicker), /* @__PURE__ */ React.createElement("h2", { className: "font-display text-2xl md:text-[2rem] font-bold tracking-tight mt-2" }, title)), action);
const Toggle = ({ on, onClick }) => /* @__PURE__ */ React.createElement("button", { onClick, className: `relative w-11 h-6 rounded-full transition-colors ${on ? "bg-brand-600" : "bg-slate-200"}` }, /* @__PURE__ */ React.createElement("span", { className: `absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}` }));
const Field = ({ label, err, children }) => /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-semibold text-slate-600 mb-1.5" }, label), children, err && /* @__PURE__ */ React.createElement("p", { className: "flex items-center gap-1 text-xs text-rose-600 mt-1.5" }, /* @__PURE__ */ React.createElement(Icon, { n: "alert-circle", size: 12 }), err));
const inp = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const inpErr = "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10";
const AccessDenied = ({ nav, currentUser, onSelectUser }) => {
  return /* @__PURE__ */ React.createElement("main", { className: "min-h-[75vh] flex items-center justify-center py-12 px-4 bg-mist" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-lg w-full text-center bg-white rounded-3xl border border-slate-200/90 p-8 md:p-10 shadow-card" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-5 shadow-sm" }, /* @__PURE__ */ React.createElement(Icon, { n: "shield-alert", size: 32 })), /* @__PURE__ */ React.createElement("span", { className: "inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-700 mb-3" }, "Erreur 403 \xB7 Acc\xE8s Restreint"), /* @__PURE__ */ React.createElement("h1", { className: "font-display text-2xl font-bold text-slate-900 mb-2" }, "Espace R\xE9serv\xE9 aux Gestionnaires"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-500 mb-6 leading-relaxed" }, currentUser ? /* @__PURE__ */ React.createElement(React.Fragment, null, "Vous \xEAtes actuellement connect\xE9 en tant que ", /* @__PURE__ */ React.createElement("b", null, currentUser.name), " (", /* @__PURE__ */ React.createElement("span", { className: "text-brand-600 font-semibold" }, currentUser.roleLabel || currentUser.role), "). Ce tableau de bord est strictement r\xE9serv\xE9 aux gestionnaires d'espaces et administrateurs autoris\xE9s.") : /* @__PURE__ */ React.createElement(React.Fragment, null, "Vous devez \xEAtre connect\xE9 avec un compte gestionnaire ou administrateur pour acc\xE9der \xE0 la gestion des espaces, aux plannings et aux revenus.")), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 text-left" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-1" }, "Basculer sur un compte autoris\xE9 :"), PRESET_ACCOUNTS.filter((a) => a.role === "manager" || a.role === "admin").map((acc) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: acc.id,
      onClick: () => {
        if (onSelectUser) onSelectUser(acc);
        nav({ name: "admin" });
      },
      className: "w-full flex items-center justify-between p-3.5 rounded-2xl border border-brand-200 bg-brand-50/50 hover:bg-brand-50 hover:border-brand-300 transition text-left text-xs font-semibold text-brand-900"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: `w-8 h-8 rounded-xl text-white font-bold grid place-items-center text-xs shadow-sm ${acc.avatarBg}` }, acc.initials), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-ink" }, acc.name), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-500" }, acc.roleLabel, " \xB7 ", acc.city))),
    /* @__PURE__ */ React.createElement("span", { className: "text-brand-600 font-bold flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-brand-200 shadow-2xs" }, "Se connecter ", /* @__PURE__ */ React.createElement(Icon, { n: "arrow-right", size: 13 }))
  )), /* @__PURE__ */ React.createElement("div", { className: "pt-3 flex gap-2.5" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => nav({ name: "explore" }),
      className: "flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition text-center"
    },
    "Explorer les espaces"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => nav({ name: "home" }),
      className: "flex-1 py-2.5 px-4 rounded-xl bg-navy text-xs font-bold text-white hover:bg-slate-800 transition text-center"
    },
    "Retour \xE0 l'accueil"
  )))));
};
const InvoiceModal = ({ invoice, isOpen, onClose }) => {
  if (!isOpen || !invoice) return null;
  const [downloading, setDownloading] = useState(false);
  const handlePrint = () => {
    window.print();
  };
  const handleDownloadPdf = () => {
    const element = document.getElementById("invoice-print-area");
    if (!element) return;
    if (window.html2pdf) {
      setDownloading(true);
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `${invoiceNum}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      };
      window.html2pdf().from(element).set(opt).save().then(() => {
        setDownloading(false);
      }).catch((err) => {
        console.warn("Erreur g\xE9n\xE9ration PDF:", err);
        setDownloading(false);
        window.print();
      });
    } else {
      window.print();
    }
  };
  const invoiceNum = invoice.invoiceNumber || invoice.invoiceRef || `FACT-2026-00${invoice.id || "01"}`;
  const clientName = invoice.clientName || invoice.name || "Client PropTech";
  const clientEmail = invoice.clientEmail || invoice.email || "client@proptech.ma";
  const clientPhone = invoice.clientPhone || "+212 6 61 00 00 00";
  const clientCity = invoice.clientCity || invoice.city || "Casablanca";
  const spaceName = invoice.spaceName || invoice.name || "Espace Coworking";
  const dateStr = invoice.date || "01/10/2026";
  const timeSlot = invoice.timeSlot || invoice.meta || "09:00 \u2013 18:00 (Journ\xE9e)";
  const gross = Number(invoice.grossAmount || invoice.totalPrice || invoice.total || 300);
  const fee = Number(invoice.feeAmount || (gross * 0.08).toFixed(2));
  const net = Number(invoice.netAmount || (gross - fee).toFixed(2));
  const ht = (gross / 1.2).toFixed(2);
  const vat = (gross - Number(ht)).toFixed(2);
  const paymentMethod = invoice.paymentMethod || "Carte Bancaire Maroc CMI (3D Secure)";
  const paidAt = invoice.paidAt || "01/10/2026 10:15";
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 my-8 text-ink" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-slate-100 pb-4 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("span", { className: "p-2.5 rounded-2xl bg-brand-50 text-brand-700" }, /* @__PURE__ */ React.createElement(Icon, { n: "file-text", size: 22 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-display font-bold text-base" }, "Facture L\xE9gale & Re\xE7u CMI"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400 font-mono" }, invoiceNum))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleDownloadPdf,
      disabled: downloading,
      className: "inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 transition shadow-sm disabled:opacity-50"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: downloading ? "loader" : "download", size: 14, className: downloading ? "animate-spin" : "" }),
    downloading ? "G\xE9n\xE9ration..." : "T\xE9l\xE9charger PDF"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handlePrint,
      className: "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: "printer", size: 14 }),
    " Imprimer"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onClose,
      className: "p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: "x", size: 18 })
  ))), /* @__PURE__ */ React.createElement("div", { id: "invoice-print-area", className: "border border-slate-200 rounded-2xl p-6 bg-white space-y-6 text-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white font-bold text-sm" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 16 })), /* @__PURE__ */ React.createElement("span", { className: "font-display text-lg font-bold" }, "SPOTWORK MAROC SARL AU")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 mt-1" }, "142 Boulevard d'Anfa, 5\xE8me \xE9tage"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, "20050 Casablanca, Maroc"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400 mt-1 font-mono leading-tight" }, "IF : 45892014 \xB7 ICE : 002938475000089", /* @__PURE__ */ React.createElement("br", null), "RC Casablanca : 512948 \xB7 Patente : 34109284")), /* @__PURE__ */ React.createElement("div", { className: "text-right" }, /* @__PURE__ */ React.createElement("span", { className: "inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-2" }, "\u2713 Facture Acquitt\xE9e"), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-slate-500" }, "R\xE9f : ", /* @__PURE__ */ React.createElement("b", { className: "font-mono text-ink" }, invoiceNum)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, "Date d'\xE9mission : ", /* @__PURE__ */ React.createElement("b", null, dateStr)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, "R\xE8glement : ", /* @__PURE__ */ React.createElement("b", null, paymentMethod)))), /* @__PURE__ */ React.createElement("div", { className: "rounded-xl bg-slate-50 p-4 border border-slate-100" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1" }, "Client factur\xE9 :"), /* @__PURE__ */ React.createElement("p", { className: "font-bold text-sm text-ink" }, clientName), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, clientEmail, " \xB7 ", clientPhone), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, clientCity, ", Maroc")), /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-left text-xs" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]" }, /* @__PURE__ */ React.createElement("th", { className: "py-2.5" }, "Description de la prestation"), /* @__PURE__ */ React.createElement("th", { className: "py-2.5 text-center" }, "Date & Cr\xE9neau"), /* @__PURE__ */ React.createElement("th", { className: "py-2.5 text-right" }, "Prix HT"), /* @__PURE__ */ React.createElement("th", { className: "py-2.5 text-right" }, "TVA (20%)"), /* @__PURE__ */ React.createElement("th", { className: "py-2.5 text-right" }, "Total TTC"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { className: "py-3.5 font-semibold text-ink" }, "Location Espace : ", spaceName, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 font-normal" }, "Acc\xE8s garanti coworking & \xE9quipements inclus")), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 text-center text-slate-500" }, dateStr, /* @__PURE__ */ React.createElement("br", null), timeSlot), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 text-right font-mono" }, ht, " DH"), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 text-right font-mono" }, vat, " DH"), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 text-right font-bold font-mono text-ink" }, gross.toFixed(2), " DH"))))), /* @__PURE__ */ React.createElement("div", { className: "border-t border-slate-200 pt-4 flex justify-end" }, /* @__PURE__ */ React.createElement("div", { className: "w-72 space-y-1.5 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, "Sous-total HT :"), /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, ht, " DH")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, "TVA marocaine (20%) :"), /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, vat, " DH")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, "Frais de service plateforme (8%) :"), /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, fee.toFixed(2), " DH")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-ink" }, /* @__PURE__ */ React.createElement("span", null, "Total TTC R\xE9gl\xE9 :"), /* @__PURE__ */ React.createElement("span", { className: "font-display font-bold text-brand-600" }, gross.toFixed(2), " DH")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-[11px] text-slate-400 pt-1" }, /* @__PURE__ */ React.createElement("span", null, "Net revers\xE9 au gestionnaire :"), /* @__PURE__ */ React.createElement("span", { className: "font-mono font-semibold text-emerald-700" }, net.toFixed(2), " DH")))), /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-dashed border-slate-200 p-3.5 bg-slate-50/70 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Icon, { n: "shield-check", size: 17, className: "text-emerald-600" }), /* @__PURE__ */ React.createElement("span", null, "Certifi\xE9 CMI Maroc \xB7 3D-Secure v2.2 \xB7 Transaction confirm\xE9e (", paidAt, ")")), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200" }, "Cachet \xC9lectronique Spotwork"))), /* @__PURE__ */ React.createElement("div", { className: "mt-5 flex justify-end" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onClose,
      className: "rounded-full bg-slate-100 hover:bg-slate-200 px-5 py-2 text-xs font-bold text-slate-700 transition"
    },
    "Fermer"
  ))));
};
const SpaceCard = ({ s, nav, favs, toggleFav, date, bookings = [] }) => {
  const liked = favs.has(s.id);
  const avail = getSpaceAvailability(s, date, bookings);
  return /* @__PURE__ */ React.createElement(
    "article",
    {
      onClick: () => nav({ name: "space", params: { id: s.id, date } }),
      className: `group cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift ${avail.isSoldOut ? "border-rose-200" : "border-slate-200/80"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: "relative h-44 md:h-48 overflow-hidden" }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: U(s.imgs[0], 700),
        alt: s.name,
        loading: "lazy",
        className: "h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]"
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "absolute left-3 top-3 flex flex-col gap-1 items-start" }, /* @__PURE__ */ React.createElement(Badge, { label: s.badge }), date && (avail.isPast || avail.allHoursPast ? /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold bg-slate-600 text-white shadow-md" }, /* @__PURE__ */ React.createElement("span", { className: "h-1.5 w-1.5 rounded-full bg-white" }), "Journ\xE9e pass\xE9e") : avail.isSoldOut ? /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold bg-rose-600 text-white shadow-md" }, /* @__PURE__ */ React.createElement("span", { className: "h-1.5 w-1.5 rounded-full bg-white animate-pulse" }), "COMPLET (0 place)") : /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold bg-emerald-600 text-white shadow-md" }, /* @__PURE__ */ React.createElement("span", { className: "h-1.5 w-1.5 rounded-full bg-white" }), avail.availableSeats, " place", avail.availableSeats > 1 ? "s" : "", " libre", avail.availableSeats > 1 ? "s" : ""))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          toggleFav(s.id);
        },
        className: `absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full backdrop-blur transition ${liked ? "bg-white text-rose-500" : "bg-white/85 text-slate-500 hover:text-rose-500"}`
      },
      /* @__PURE__ */ React.createElement(Icon, { n: "heart", size: 16, fill: liked ? "currentColor" : "none", className: liked ? "pop" : "" })
    ), /* @__PURE__ */ React.createElement("span", { className: "absolute bottom-3 right-3 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur" }, s.unit === "heure" ? "\xC0 l'heure" : "\xC0 la journ\xE9e")),
    /* @__PURE__ */ React.createElement("div", { className: "p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("h3", { className: "font-display font-semibold text-[15px] leading-snug" }, s.name), /* @__PURE__ */ React.createElement("span", { className: "flex shrink-0 items-center gap-1 text-sm font-semibold" }, /* @__PURE__ */ React.createElement(Icon, { n: "star", size: 13, fill: "currentColor", className: "text-amber-400" }), s.rating.toLocaleString("fr-FR"))), /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 flex items-center gap-1 text-[13px] text-slate-500" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 12 }), s.city, " \xB7 ", s.district), /* @__PURE__ */ React.createElement("div", { className: "mt-1 flex items-center justify-between text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-400" }, TYPES.find((t) => t.id === s.type).label, " \xB7 ", s.surface), avail.isSoldOut ? /* @__PURE__ */ React.createElement("span", { className: "font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200" }, "0 / ", avail.totalCapacity, " place") : /* @__PURE__ */ React.createElement("span", { className: "font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200" }, avail.availableSeats, " / ", avail.totalCapacity, " places libres")), /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex items-center justify-between border-t border-slate-100 pt-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-[15px]" }, /* @__PURE__ */ React.createElement("b", { className: "font-display" }, EUR.format(s.price)), /* @__PURE__ */ React.createElement("span", { className: "text-slate-400 text-xs" }, " /", s.unit)), /* @__PURE__ */ React.createElement("span", { className: `flex items-center gap-1 text-xs font-semibold transition-transform group-hover:translate-x-1 ${avail.isSoldOut ? "text-slate-400" : "text-brand-600"}` }, avail.isSoldOut ? "Voir planning" : "Voir l'espace", /* @__PURE__ */ React.createElement(Icon, { n: "arrow-right", size: 13 }))))
  );
};
const Navbar = ({ view, nav, cartCount, menuOpen, setMenuOpen, currentUser, onSelectUser, onLogout, toast }) => {
  const [scrolled, setScrolled] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const isManagerOrAdmin = currentUser && (currentUser.role === "manager" || currentUser.role === "admin");
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    f();
    window.addEventListener("scroll", f);
    return () => window.removeEventListener("scroll", f);
  }, []);
  const link = (label, target, icon) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: label,
      onClick: () => {
        nav(target);
        setUserMenu(false);
        setMenuOpen(false);
      },
      className: `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${view.name === target.name ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:text-ink hover:bg-slate-50"}`
    },
    icon && /* @__PURE__ */ React.createElement(Icon, { n: icon, size: 15 }),
    label
  );
  return /* @__PURE__ */ React.createElement("header", { className: `sticky top-0 z-50 transition-all ${scrolled ? "bg-white/92 backdrop-blur-md shadow-[0_1px_0_rgba(13,44,90,.08)]" : "bg-white"}` }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6" }, /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "home" }), className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/30" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 18 })), /* @__PURE__ */ React.createElement("div", { className: "text-left" }, /* @__PURE__ */ React.createElement("span", { className: "font-display text-lg font-bold tracking-tight block leading-tight" }, "Spotwork"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-semibold tracking-wider uppercase text-brand-600 hidden sm:block" }, "PropTech Maroc"))), /* @__PURE__ */ React.createElement("nav", { className: "hidden lg:flex items-center gap-1" }, link("Accueil", { name: "home" }), link("Explorer", { name: "explore" }, "search"), link("Mes r\xE9servations", { name: "user" }, "calendar-days"), isManagerOrAdmin && link("Gestionnaire", { name: "admin" }, "bar-chart-3"), !currentUser && link("Connexion", { name: "login" }, "user")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "checkout" }), className: "relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:border-brand-300 hover:text-brand-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "shopping-cart", size: 17 }), cartCount > 0 && /* @__PURE__ */ React.createElement("span", { key: cartCount, className: "pop absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white" }, cartCount)), currentUser ? /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setUserMenu(!userMenu), className: "flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 transition hover:border-brand-300 bg-white" }, /* @__PURE__ */ React.createElement("span", { className: `grid h-8 w-8 place-items-center rounded-full font-bold text-white text-[11px] shadow-sm ${currentUser.avatarBg || "bg-brand-600"}` }, currentUser.initials || "U"), /* @__PURE__ */ React.createElement("div", { className: "hidden sm:flex items-center gap-1.5 text-left" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold text-slate-800" }, currentUser.firstName || currentUser.name), /* @__PURE__ */ React.createElement("span", { className: `text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${currentUser.badgeCls || "bg-blue-50 text-brand-700 border-brand-200"}` }, currentUser.roleLabel || currentUser.role)), /* @__PURE__ */ React.createElement(Icon, { n: "chevron-down", size: 14, className: "text-slate-400" })), userMenu && /* @__PURE__ */ React.createElement("div", { className: "absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-lift z-50" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-mist rounded-xl mb-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("span", { className: `grid h-9 w-9 place-items-center rounded-xl font-bold text-white text-xs ${currentUser.avatarBg || "bg-brand-600"}` }, currentUser.initials || "U"), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-sm text-ink truncate" }, currentUser.name), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400 truncate" }, currentUser.email))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex items-center justify-between text-[11px]" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-500 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 11 }), currentUser.city || "Maroc"), /* @__PURE__ */ React.createElement("span", { className: `px-2 py-0.5 rounded-full font-bold border ${currentUser.badgeCls || "bg-blue-50 text-brand-700 border-brand-200"}` }, currentUser.roleLabel || currentUser.role))), [
    ["Mon espace client", "layout-grid", () => nav({ name: "user" })],
    ["Mes favoris", "heart", () => nav({ name: "user", params: { tab: "favoris" } })],
    ...isManagerOrAdmin ? [["Espace gestionnaire / Admin", "bar-chart-3", () => nav({ name: "admin" })]] : []
  ].map(([l, i, f]) => /* @__PURE__ */ React.createElement("button", { key: l, onClick: () => {
    f();
    setUserMenu(false);
  }, className: "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-mist hover:text-ink" }, /* @__PURE__ */ React.createElement(Icon, { n: i, size: 15, className: "text-slate-400" }), l)), /* @__PURE__ */ React.createElement("div", { className: "border-t border-slate-100 my-1.5 pt-1.5" }, /* @__PURE__ */ React.createElement("p", { className: "px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400" }, "Changer de compte (1 clic)"), PRESET_ACCOUNTS.map((acc) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: acc.id,
      onClick: () => {
        onSelectUser(acc);
        setUserMenu(false);
        if (toast) toast(`Connect\xE9 : ${acc.name} (${acc.roleLabel})`, "user-check");
      },
      className: `flex w-full items-center justify-between px-3 py-1.5 text-xs rounded-lg transition ${currentUser.id === acc.id ? "bg-brand-50 text-brand-700 font-bold" : "text-slate-600 hover:bg-slate-50"}`
    },
    /* @__PURE__ */ React.createElement("span", { className: "truncate" }, acc.name),
    /* @__PURE__ */ React.createElement("span", { className: `text-[10px] px-1.5 py-0.5 rounded border ${acc.badgeCls}` }, acc.roleLabel)
  ))), /* @__PURE__ */ React.createElement("div", { className: "border-t border-slate-100 mt-1.5 pt-1.5 flex gap-1.5" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
    nav({ name: "login" });
    setUserMenu(false);
  }, className: "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition" }, /* @__PURE__ */ React.createElement(Icon, { n: "user", size: 13 }), "G\xE9rer"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    onLogout();
    setUserMenu(false);
  }, className: "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition" }, /* @__PURE__ */ React.createElement(Icon, { n: "log-out", size: 13 }), "D\xE9connexion")))) : /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "login" }), className: "flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-brand-700 transition" }, /* @__PURE__ */ React.createElement(Icon, { n: "log-in", size: 15 }), /* @__PURE__ */ React.createElement("span", null, "Se connecter")), /* @__PURE__ */ React.createElement("button", { onClick: () => setMenuOpen(!menuOpen), className: "grid h-10 w-10 place-items-center rounded-full border border-slate-200 lg:hidden" }, /* @__PURE__ */ React.createElement(Icon, { n: menuOpen ? "x" : "menu", size: 18 })))), menuOpen && /* @__PURE__ */ React.createElement("div", { className: "border-t border-slate-100 bg-white px-4 py-3 lg:hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1" }, link("Accueil", { name: "home" }, "home"), link("Explorer les espaces", { name: "explore" }, "search"), link("Mes r\xE9servations", { name: "user" }, "calendar-days"), isManagerOrAdmin && link("Tableau de bord gestionnaire", { name: "admin" }, "bar-chart-3"), currentUser ? /* @__PURE__ */ React.createElement("button", { onClick: () => {
    onLogout();
    setMenuOpen(false);
  }, className: "flex w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50" }, /* @__PURE__ */ React.createElement(Icon, { n: "log-out", size: 16 }), "D\xE9connexion (", currentUser.firstName || currentUser.name, ")") : link("Se connecter", { name: "login" }, "log-in"), link("Panier", { name: "checkout" }, "shopping-cart"))));
};
const SearchPanel = ({ nav }) => {
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [budget, setBudget] = useState("150");
  const [errs, setErrs] = useState({});
  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!city) er.city = "Choisissez une ville";
    if (!date) er.date = "S\xE9lectionnez une date";
    setErrs(er);
    if (Object.keys(er).length) return;
    nav({ name: "explore", params: { city, type, budget, date } });
  };
  const sel = (has) => `${inp} appearance-none ${has ? "" : "text-slate-400"}`;
  return /* @__PURE__ */ React.createElement("form", { onSubmit: submit, className: "rounded-2xl border border-slate-200/80 bg-white p-4 shadow-lift md:p-5" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" }, /* @__PURE__ */ React.createElement(Field, { label: "Ville", err: errs.city }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 15, className: "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" }), /* @__PURE__ */ React.createElement("select", { value: city, onChange: (e) => setCity(e.target.value), className: `${sel(city)} pl-9` }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Toutes les villes"), CITIES.map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, c))))), /* @__PURE__ */ React.createElement(Field, { label: "Type d'espace" }, /* @__PURE__ */ React.createElement("select", { value: type, onChange: (e) => setType(e.target.value), className: sel(type) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Tous les types"), TYPES.map((t) => /* @__PURE__ */ React.createElement("option", { key: t.id, value: t.id }, t.label)))), /* @__PURE__ */ React.createElement(Field, { label: "Date", err: errs.date }, /* @__PURE__ */ React.createElement("input", { type: "date", min: todayISO(), value: date, onChange: (e) => setDate(e.target.value), className: `${inp} ${errs.date ? inpErr : ""}` })), /* @__PURE__ */ React.createElement(Field, { label: "Budget max" }, /* @__PURE__ */ React.createElement("select", { value: budget, onChange: (e) => setBudget(e.target.value), className: sel(true) }, /* @__PURE__ */ React.createElement("option", { value: "35" }, "\u2264 35 DH"), /* @__PURE__ */ React.createElement("option", { value: "60" }, "\u2264 60 DH"), /* @__PURE__ */ React.createElement("option", { value: "100" }, "\u2264 100 DH"), /* @__PURE__ */ React.createElement("option", { value: "200" }, "Tous budgets")))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center" }, /* @__PURE__ */ React.createElement("p", { className: "flex items-center gap-2 text-xs text-slate-500" }, /* @__PURE__ */ React.createElement(Icon, { n: "shield-check", size: 14, className: "text-emerald-500" }), "Annulation gratuite jusqu'\xE0 24 h avant"), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[.98] sm:w-auto" }, /* @__PURE__ */ React.createElement(Icon, { n: "search", size: 16 }), "Rechercher un espace")));
};
const Hero = ({ nav }) => /* @__PURE__ */ React.createElement("section", { className: "relative overflow-hidden bg-mist" }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-dots opacity-60" }), /* @__PURE__ */ React.createElement("div", { className: "absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-brand-100 blur-3xl opacity-70" }), /* @__PURE__ */ React.createElement("div", { className: "relative mx-auto max-w-7xl px-4 pb-16 pt-10 md:px-6 md:pt-16 lg:pb-20" }, /* @__PURE__ */ React.createElement("div", { className: "grid items-center gap-10 lg:grid-cols-12" }, /* @__PURE__ */ React.createElement("div", { className: "lg:col-span-6" }, /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm" }, /* @__PURE__ */ React.createElement("span", { className: "dot-live h-2 w-2 rounded-full bg-emerald-500" }), "320+ espaces v\xE9rifi\xE9s \xB7 6 villes marocaines"), /* @__PURE__ */ React.createElement("h1", { className: "mt-5 font-display text-[2.4rem] font-bold leading-[1.04] tracking-tight md:text-6xl" }, /* @__PURE__ */ React.createElement("span", { className: "mask-line" }, /* @__PURE__ */ React.createElement("span", { style: { animationDelay: ".05s" } }, "Des espaces qui")), /* @__PURE__ */ React.createElement("span", { className: "mask-line" }, /* @__PURE__ */ React.createElement("span", { style: { animationDelay: ".16s" } }, "donnent envie de")), /* @__PURE__ */ React.createElement("span", { className: "mask-line" }, /* @__PURE__ */ React.createElement("span", { style: { animationDelay: ".27s" }, className: "text-brand-600" }, "travailler."))), /* @__PURE__ */ React.createElement("p", { className: "mt-5 max-w-md text-[15px] leading-relaxed text-slate-600" }, "Bureaux priv\xE9s, open spaces, salles de r\xE9union : comparez, visitez en photos et r\xE9servez en moins de deux minutes \xE0 Casablanca, Rabat, Marrakech et dans tout le Maroc."), /* @__PURE__ */ React.createElement("div", { className: "mt-6 flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex -space-x-2.5" }, ["YA", "ME", "FA", "ST"].map((x, i) => /* @__PURE__ */ React.createElement(
  "span",
  {
    key: x,
    className: "grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white",
    style: { background: ["#1F56D6", "#0D2C5A", "#5B90F7", "#142F7A"][i] }
  },
  x
))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, /* @__PURE__ */ React.createElement("b", { className: "text-ink" }, "12 400+"), " professionnels au Maroc nous font confiance")), /* @__PURE__ */ React.createElement("div", { className: "mt-8" }, /* @__PURE__ */ React.createElement(SearchPanel, { nav }))), /* @__PURE__ */ React.createElement("div", { className: "relative hidden lg:col-span-6 lg:block" }, /* @__PURE__ */ React.createElement("div", { className: "relative ml-auto w-[92%]" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-hidden rounded-3xl shadow-lift" }, /* @__PURE__ */ React.createElement("img", { src: U(IMG.f, 900), alt: "Espace de coworking lumineux au Maroc", className: "h-[430px] w-full object-cover" })), /* @__PURE__ */ React.createElement("div", { className: "absolute -bottom-8 -left-10 w-52 overflow-hidden rounded-2xl border-4 border-mist shadow-lift" }, /* @__PURE__ */ React.createElement("img", { src: U(IMG.g, 500), alt: "Professionnels au travail", className: "h-32 w-full object-cover" })), /* @__PURE__ */ React.createElement("div", { className: "floaty absolute -right-4 top-8 rounded-2xl bg-white p-3.5 shadow-lift" }, /* @__PURE__ */ React.createElement("p", { className: "flex items-center gap-1.5 text-[11px] font-semibold text-slate-500" }, /* @__PURE__ */ React.createElement("span", { className: "dot-live h-1.5 w-1.5 rounded-full bg-emerald-500" }), "Occupation en direct"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 font-display text-sm font-bold" }, "L'Atelier Maarif \xB7 Casablanca"), /* @__PURE__ */ React.createElement("div", { className: "mt-2 h-1.5 w-36 overflow-hidden rounded-full bg-slate-100" }, /* @__PURE__ */ React.createElement("div", { className: "h-full w-[86%] rounded-full bg-brand-600" })), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-[11px] font-semibold text-brand-700" }, "86 % occup\xE9")), /* @__PURE__ */ React.createElement("div", { className: "floaty absolute -left-16 top-40 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-lift", style: { animationDelay: "1.4s" } }, /* @__PURE__ */ React.createElement("span", { className: "grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-amber-500" }, /* @__PURE__ */ React.createElement(Icon, { n: "star", size: 16, fill: "currentColor" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-display text-sm font-bold" }, "4,9 / 5"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400" }, "2 140 avis v\xE9rifi\xE9s"))))))));
const AreaChart = ({ data, labels }) => {
  const [hov, setHov] = useState(-1);
  const W = 560, H = 210, P = 16, color = "#1F56D6";
  const min = Math.min(...data) * 0.88, max = Math.max(...data) * 1.05;
  const X = (i) => P + i * (W - 2 * P) / (data.length - 1);
  const Y = (v) => H - 30 - (v - min) / (max - min) * (H - 58);
  const pts = data.map((v, i) => [X(i), Y(v)]);
  const line = smoothPath(pts);
  return /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, className: "w-full" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "ag", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0", stopColor: color, stopOpacity: ".22" }), /* @__PURE__ */ React.createElement("stop", { offset: "1", stopColor: color, stopOpacity: "0" }))), [0.22, 0.5, 0.78].map((t) => /* @__PURE__ */ React.createElement("line", { key: t, x1: P, x2: W - P, y1: 14 + (H - 50) * t, y2: 14 + (H - 50) * t, stroke: "#E6ECF5", strokeDasharray: "3 6" })), /* @__PURE__ */ React.createElement("path", { d: line + ` L${X(data.length - 1)},${H - 26} L${X(0)},${H - 26} Z`, fill: "url(#ag)" }), /* @__PURE__ */ React.createElement("path", { d: line, fill: "none", stroke: color, strokeWidth: "2.5", className: "chart-line" }), pts.map(([x, y], i) => /* @__PURE__ */ React.createElement("g", { key: i }, hov === i && /* @__PURE__ */ React.createElement("g", null, /* @__PURE__ */ React.createElement("line", { x1: x, x2: x, y1: 16, y2: H - 28, stroke: color, strokeDasharray: "3 4", strokeWidth: "1" }), /* @__PURE__ */ React.createElement("circle", { cx: x, cy: y, r: "4.5", fill: "#fff", stroke: color, strokeWidth: "2.5" })), /* @__PURE__ */ React.createElement("rect", { x: x - 22, y: "0", width: "44", height: H, fill: "transparent", onMouseEnter: () => setHov(i), onMouseLeave: () => setHov(-1) }))), labels.map((l, i) => /* @__PURE__ */ React.createElement("text", { key: i, x: X(i), y: H - 8, fontSize: "9.5", fill: "#8CA0B8", textAnchor: "middle", fontWeight: "600" }, l))), hov >= 0 && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "pointer-events-none absolute -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg",
      style: { left: `${X(hov) / W * 100}%`, top: `${Y(data[hov]) / H * 100}%` }
    },
    /* @__PURE__ */ React.createElement("span", { className: "opacity-60" }, labels[hov], " \xB7 "),
    /* @__PURE__ */ React.createElement("b", null, EUR.format(data[hov] * 1e3))
  ));
};
const WeekBars = ({ data, labels }) => {
  const best = data.indexOf(Math.max(...data));
  return /* @__PURE__ */ React.createElement("div", { className: "flex h-40 items-end gap-2.5" }, data.map((v, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "group flex flex-1 flex-col items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex h-full w-full items-end" }, /* @__PURE__ */ React.createElement("div", { className: "grow w-full rounded-md", style: { height: `${v}%`, background: i === best ? "#1F56D6" : "#D9E4F7", animationDelay: `${i * 70}ms` } }), /* @__PURE__ */ React.createElement("span", { className: "absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100" }, v, "%")), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-semibold text-slate-400" }, labels[i]))));
};
const Donut = ({ items, center }) => {
  const total = items.reduce((s, x) => s + x.v, 0);
  const r = 52, C = 2 * Math.PI * r;
  let acc = 0;
  return /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-6" }, /* @__PURE__ */ React.createElement("svg", { width: "140", height: "140", viewBox: "0 0 140 140" }, /* @__PURE__ */ React.createElement("circle", { cx: "70", cy: "70", r, fill: "none", stroke: "#EEF2F8", strokeWidth: "16" }), items.map((it, i) => {
    const frac = it.v / total, len = Math.max(frac * C - 3, 1);
    const el = /* @__PURE__ */ React.createElement(
      "circle",
      {
        key: i,
        cx: "70",
        cy: "70",
        r,
        fill: "none",
        stroke: it.c,
        strokeWidth: "16",
        strokeDasharray: `${len} ${C - len}`,
        strokeDashoffset: -acc * C,
        transform: "rotate(-90 70 70)"
      }
    );
    acc += frac;
    return el;
  }), /* @__PURE__ */ React.createElement("text", { x: "70", y: "66", textAnchor: "middle", fontSize: "20", fontWeight: "700", fill: "#0A1B33", fontFamily: "Space Grotesk" }, center[0]), /* @__PURE__ */ React.createElement("text", { x: "70", y: "82", textAnchor: "middle", fontSize: "9", fill: "#8CA0B8" }, center[1])), /* @__PURE__ */ React.createElement("ul", { className: "space-y-2" }, items.map((it) => /* @__PURE__ */ React.createElement("li", { key: it.label, className: "flex items-center gap-2 text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "h-2.5 w-2.5 rounded-sm", style: { background: it.c } }), /* @__PURE__ */ React.createElement("span", { className: "text-slate-600" }, it.label), /* @__PURE__ */ React.createElement("b", { className: "text-ink" }, Math.round(it.v / total * 100), "%")))));
};
const Spark = ({ data, color }) => {
  const W = 88, H = 30, max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => `${i / (data.length - 1) * W},${H - 3 - (v - min) / (max - min || 1) * (H - 8)}`).join(" ");
  return /* @__PURE__ */ React.createElement("svg", { width: W, height: H, className: "overflow-visible" }, /* @__PURE__ */ React.createElement("polyline", { points: pts, fill: "none", stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }));
};
const Ring = ({ v }) => /* @__PURE__ */ React.createElement("svg", { width: "46", height: "46", viewBox: "0 0 40 40" }, /* @__PURE__ */ React.createElement("circle", { cx: "20", cy: "20", r: "16", fill: "none", stroke: "#E4EBF5", strokeWidth: "4" }), /* @__PURE__ */ React.createElement(
  "circle",
  {
    cx: "20",
    cy: "20",
    r: "16",
    fill: "none",
    stroke: "#1F56D6",
    strokeWidth: "4",
    strokeLinecap: "round",
    pathLength: "100",
    strokeDasharray: `${v} ${100 - v}`,
    transform: "rotate(-90 20 20)"
  }
), /* @__PURE__ */ React.createElement("text", { x: "20", y: "24", textAnchor: "middle", fontSize: "10", fontWeight: "700", fill: "#0A1B33" }, v, "%"));
const Home = ({ nav, favs, toggleFav, spaces = [], bookings = [], currentUser = null, userBookings = [] }) => {
  const featured = spaces.filter((s) => s.featured);
  const homeAiRecs = useMemo(() => {
    if (!currentUser) return [];
    const p = currentUser.preferences || {};
    const prefCity = (p.city || currentUser.city || "Casablanca").toLowerCase();
    const prefType = (p.type || "open").toLowerCase();
    return spaces.map((s) => {
      let score = 55 + Math.round((s.rating - 4) * 14);
      const tags = [];
      let reason = "";
      if (s.city.toLowerCase() === prefCity) {
        score += 24;
        tags.push(`\u{1F4CD} ${s.city}`);
      }
      if (s.type.toLowerCase() === prefType) {
        score += 20;
        tags.push(`\u{1F3E2} ${TYPES.find((t) => t.id === s.type)?.label || s.type}`);
      }
      if (favs.has(s.id)) {
        score += 15;
        tags.push("\u2764\uFE0F Coup de c\u0153ur");
      }
      if (userBookings.some((b) => b.spaceId === s.id)) {
        score += 12;
        tags.push("\u{1F504} Habitude");
      }
      const matchScore = Math.min(99, Math.max(75, score));
      if (s.city.toLowerCase() === prefCity && s.type.toLowerCase() === prefType) {
        reason = `Align\xE9 sur votre pr\xE9f\xE9rence active : ${TYPES.find((t) => t.id === s.type)?.label} \xE0 ${s.city}.`;
      } else if (s.city.toLowerCase() === prefCity) {
        reason = `Recommand\xE9 selon vos habitudes \xE0 ${s.city} \xB7 Not\xE9 ${s.rating}/5.`;
      } else {
        reason = `Espace pris\xE9 des coworkers marocains avec \xE9quipement complet.`;
      }
      return { s, score: matchScore, reason, tags };
    }).sort((a, b) => b.score - a.score).slice(0, 3);
  }, [currentUser, userBookings, favs, spaces]);
  return /* @__PURE__ */ React.createElement("main", null, /* @__PURE__ */ React.createElement(Hero, { nav }), /* @__PURE__ */ React.createElement("div", { className: "border-y border-slate-100 bg-white py-4" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "marquee flex w-max items-center gap-10 text-sm font-semibold text-slate-400" }, [0, 1].map((k) => /* @__PURE__ */ React.createElement("div", { key: k, className: "flex items-center gap-10" }, [...CITIES, ...CITIES].map((c, i) => /* @__PURE__ */ React.createElement("span", { key: c + i, className: "flex items-center gap-10 whitespace-nowrap" }, /* @__PURE__ */ React.createElement("span", { className: "font-display" }, c), /* @__PURE__ */ React.createElement(Icon, { n: "asterisk", size: 12, className: "text-brand-300" })))))))), /* @__PURE__ */ React.createElement("section", { className: "mx-auto max-w-7xl px-4 py-14 md:px-6" }, /* @__PURE__ */ React.createElement(SecHead, { kicker: "Parcourir", title: "Explorer par type d'espace" }), /* @__PURE__ */ React.createElement("div", { className: "no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0", "data-reveal": true }, TYPES.map((t, i) => {
    const count = spaces.filter((s) => s.type === t.id).length;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: t.id,
        onClick: () => nav({ name: "explore", params: { type: t.id } }),
        className: "group flex shrink-0 items-center gap-3 rounded-full border border-slate-200 bg-white py-2.5 pl-3.5 pr-5 transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-card",
        style: { transitionDelay: `${i * 40}ms` }
      },
      /* @__PURE__ */ React.createElement("span", { className: "grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white" }, /* @__PURE__ */ React.createElement(Icon, { n: t.icon, size: 16 })),
      /* @__PURE__ */ React.createElement("span", { className: "text-left" }, /* @__PURE__ */ React.createElement("span", { className: "block text-sm font-bold" }, t.label), /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] text-slate-400" }, count, " espace", count > 1 ? "s" : ""))
    );
  }))), currentUser && homeAiRecs.length > 0 && /* @__PURE__ */ React.createElement("section", { className: "mx-auto max-w-7xl px-4 pb-14 md:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-brand-200/90 bg-gradient-to-r from-brand-50/70 via-white to-indigo-50/40 p-6 md:p-8 shadow-card" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-4 mb-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-bold text-brand-700 shadow-2xs" }, /* @__PURE__ */ React.createElement(Icon, { n: "sparkles", size: 13, className: "text-brand-600" }), "Recommandations IA pour vous"), /* @__PURE__ */ React.createElement("h2", { className: "mt-2 font-display text-2xl font-bold text-ink" }, "S\xE9lectionn\xE9 pour ", currentUser.firstName || currentUser.name), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-slate-500" }, "D'apr\xE8s vos pr\xE9f\xE9rences (", currentUser.city || "Casablanca", ") et vos habitudes de travail.")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => nav({ name: "user", params: { tab: "ia" } }),
      className: "inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 transition shadow-sm"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: "brain", size: 13 }),
    "Voir mon profil IA complet"
  )), /* @__PURE__ */ React.createElement("div", { className: "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" }, homeAiRecs.map(({ s, score, reason, tags }) => /* @__PURE__ */ React.createElement("div", { key: s.id, className: "relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-lift transition flex flex-col justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "relative h-36 overflow-hidden rounded-xl mb-3" }, /* @__PURE__ */ React.createElement("img", { src: U(s.imgs[0], 500), alt: s.name, className: "h-full w-full object-cover" }), /* @__PURE__ */ React.createElement("span", { className: "absolute left-2.5 top-2.5 rounded-full bg-ink/80 backdrop-blur px-2.5 py-0.5 text-[10px] font-bold text-white flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "sparkles", size: 10, className: "text-amber-400" }), "Match ", score, "%")), /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-display font-bold text-sm text-ink" }, s.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, s.city, " \xB7 ", s.district)), /* @__PURE__ */ React.createElement("span", { className: "font-display font-bold text-xs text-brand-700" }, s.price, " DH/h")), /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex flex-wrap gap-1" }, tags.map((t, idx) => /* @__PURE__ */ React.createElement("span", { key: idx, className: "rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600" }, t))), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-[11px] text-slate-600 leading-snug flex items-start gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "sparkles", size: 11, className: "mt-0.5 shrink-0 text-brand-600" }), reason)), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => nav({ name: "space", params: { id: s.id } }),
      className: "mt-3.5 w-full rounded-xl bg-slate-50 border border-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition"
    },
    "D\xE9couvrir l'espace"
  )))))), /* @__PURE__ */ React.createElement("section", { className: "bg-mist py-14" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-7xl px-4 md:px-6" }, /* @__PURE__ */ React.createElement(
    SecHead,
    {
      kicker: "S\xE9lection",
      title: "Espaces en vedette cette semaine",
      action: /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "explore" }), className: "flex items-center gap-1.5 text-sm font-bold text-brand-600 transition hover:gap-2.5" }, "Tout voir", /* @__PURE__ */ React.createElement(Icon, { n: "arrow-right", size: 15 }))
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" }, featured.map((s, i) => /* @__PURE__ */ React.createElement("div", { key: s.id, "data-reveal": true, style: { transitionDelay: `${i * 70}ms` } }, /* @__PURE__ */ React.createElement(SpaceCard, { s, nav, favs, toggleFav, bookings })))))), /* @__PURE__ */ React.createElement("section", { className: "mx-auto max-w-7xl px-4 py-16 md:px-6" }, /* @__PURE__ */ React.createElement(SecHead, { kicker: "Simple et rapide", title: "R\xE9servez en trois temps" }), /* @__PURE__ */ React.createElement("div", { className: "relative grid gap-10 md:grid-cols-3 md:gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-slate-200 md:block" }), [
    { n: "01", i: "search", t: "Cherchez & comparez", d: "Filtrez par ville, type, budget et \xE9quipements. Photos r\xE9elles, avis v\xE9rifi\xE9s, tarifs transparents." },
    { n: "02", i: "badge-check", t: "R\xE9servez en 2 min", d: "Choisissez votre cr\xE9neau, payez en ligne de fa\xE7on s\xE9curis\xE9e. Confirmation instantan\xE9e par e-mail." },
    { n: "03", i: "calendar-check", t: "Installez-vous", d: "Acc\xE8s direct le jour J. Annulation gratuite jusqu'\xE0 24 h avant, report en un clic." }
  ].map((s, i) => /* @__PURE__ */ React.createElement("div", { key: s.n, className: "relative flex gap-4 md:flex-col md:gap-0", "data-reveal": true, style: { transitionDelay: `${i * 100}ms` } }, /* @__PURE__ */ React.createElement("div", { className: "relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-navy text-white shadow-lg" }, /* @__PURE__ */ React.createElement(Icon, { n: s.i, size: 22 })), /* @__PURE__ */ React.createElement("div", { className: "md:mt-5" }, /* @__PURE__ */ React.createElement("p", { className: "font-display text-xs font-bold tracking-[0.25em] text-brand-500" }, s.n), /* @__PURE__ */ React.createElement("h3", { className: "mt-1 font-display text-lg font-bold" }, s.t), /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 text-sm leading-relaxed text-slate-500" }, s.d)))))), /* @__PURE__ */ React.createElement("section", { className: "mx-auto max-w-7xl px-4 pb-16 md:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "relative overflow-hidden rounded-3xl bg-navy p-8 md:p-12", "data-reveal": true }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-grid" }), /* @__PURE__ */ React.createElement("div", { className: "absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl" }), /* @__PURE__ */ React.createElement("div", { className: "relative grid items-center gap-10 lg:grid-cols-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Kicker, null, /* @__PURE__ */ React.createElement("span", { className: "text-brand-300" }, "Vous g\xE9rez un espace ?")), /* @__PURE__ */ React.createElement("h2", { className: "mt-3 font-display text-2xl font-bold tracking-tight text-white md:text-4xl" }, "Remplissez vos salles pendant qu'elles dorment."), /* @__PURE__ */ React.createElement("p", { className: "mt-4 max-w-md text-sm leading-relaxed text-slate-300" }, "Tableau de bord temps r\xE9el : occupation, revenus, r\xE9servations. Synchronisez vos disponibilit\xE9s et laissez la demande venir \xE0 vous."), /* @__PURE__ */ React.createElement("div", { className: "mt-6 flex flex-wrap items-center gap-6 text-white" }, [["+32 %", "d'occupation moyenne"], ["0 \u20AC", "avant la premi\xE8re r\xE9servation"]].map(([v, l]) => /* @__PURE__ */ React.createElement("div", { key: l }, /* @__PURE__ */ React.createElement("p", { className: "font-display text-2xl font-bold text-brand-300" }, v), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400" }, l)))), /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "admin" }), className: "mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-navy transition hover:bg-brand-50 active:scale-[.98]" }, "D\xE9couvrir le dashboard gestionnaire", /* @__PURE__ */ React.createElement(Icon, { n: "arrow-right", size: 15 }))), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "rotate-2 rounded-2xl bg-white p-4 shadow-lift transition-transform duration-500 hover:rotate-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold" }, "Revenus \xB7 Ce mois"), /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600" }, "+12,4 %")), /* @__PURE__ */ React.createElement("p", { className: "font-display text-2xl font-bold" }, "231 000 DH"), /* @__PURE__ */ React.createElement(Spark, { data: [8, 10, 9, 13, 12, 15, 17, 16, 19], color: "#1F56D6" }), /* @__PURE__ */ React.createElement("div", { className: "mt-3 space-y-2" }, [["L'Atelier Maarif", 86], ["Le Hub Agdal", 91], ["Studio Gu\xE9liz", 82]].map(([n, v]) => /* @__PURE__ */ React.createElement("div", { key: n, className: "flex items-center gap-2 text-[11px]" }, /* @__PURE__ */ React.createElement("span", { className: "w-24 truncate font-semibold text-slate-500" }, n), /* @__PURE__ */ React.createElement("div", { className: "h-1.5 flex-1 rounded-full bg-slate-100" }, /* @__PURE__ */ React.createElement("div", { className: "h-full rounded-full bg-brand-500", style: { width: v + "%" } })), /* @__PURE__ */ React.createElement("b", null, v, "%"))))))))), /* @__PURE__ */ React.createElement("section", { className: "bg-mist py-16" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-7xl px-4 md:px-6" }, /* @__PURE__ */ React.createElement(SecHead, { kicker: "Ils en parlent mieux que nous", title: "La communaut\xE9 Spotwork Maroc" }), /* @__PURE__ */ React.createElement("div", { className: "grid gap-5 lg:grid-cols-3" }, /* @__PURE__ */ React.createElement("figure", { className: "relative rounded-3xl bg-navy p-8 text-white lg:col-span-2", "data-reveal": true }, /* @__PURE__ */ React.createElement(Icon, { n: "quote", size: 34, className: "text-brand-400" }), /* @__PURE__ */ React.createElement("blockquote", { className: "mt-4 font-display text-xl font-semibold leading-relaxed md:text-2xl" }, `"J'ai test\xE9 quatre espaces entre Casablanca et Rabat en deux semaines sans aucune friction. Le dashboard me suit partout, mes factures en Dirhams sont centralis\xE9es."`), /* @__PURE__ */ React.createElement("figcaption", { className: "mt-6 flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-11 w-11 place-items-center rounded-full bg-brand-500 font-bold" }, "ST"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold" }, "Salma Tazi"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400" }, "Consultante Strat\xE9gie \xB7 Rabat")), /* @__PURE__ */ React.createElement("div", { className: "ml-auto" }, /* @__PURE__ */ React.createElement(Stars, { v: 5 })))), /* @__PURE__ */ React.createElement("div", { className: "grid gap-5" }, [
    { t: "La gestion de nos 3 espaces \xE0 Casablanca est devenue limpide. L'occupation a augment\xE9 de 28 points en un trimestre.", n: "Karim B.", r: "G\xE9rant Coworking \xB7 Casablanca", d: "KB" },
    { t: "R\xE9servation un dimanche soir \xE0 23 h pour le lundi matin \xE0 Marrakech. Exp\xE9rience digitale remarquable.", n: "Youssef A.", r: "D\xE9veloppeur Cloud \xB7 Marrakech", d: "YA" }
  ].map((x, i) => /* @__PURE__ */ React.createElement("figure", { key: x.n, className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card", "data-reveal": true, style: { transitionDelay: `${i * 120}ms` } }, /* @__PURE__ */ React.createElement("blockquote", { className: "text-sm leading-relaxed text-slate-600" }, '"', x.t, '"'), /* @__PURE__ */ React.createElement("figcaption", { className: "mt-4 flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700" }, x.d), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold" }, x.n), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400" }, x.r))))))))));
};
const FilterPanel = ({ f, setF }) => {
  const flipType = (id) => setF((p) => ({ ...p, types: p.types.includes(id) ? p.types.filter((t) => t !== id) : [...p.types, id] }));
  const flipAm = (id) => setF((p) => ({ ...p, am: p.am.includes(id) ? p.am.filter((t) => t !== id) : [...p.am, id] }));
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500" }, "Ville"), /* @__PURE__ */ React.createElement("select", { value: f.city, onChange: (e) => setF({ ...f, city: e.target.value }), className: inp }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Toutes les villes"), CITIES.map((c) => /* @__PURE__ */ React.createElement("option", { key: c }, c)))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500" }, "Type"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, TYPES.map((t) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: t.id,
      onClick: () => flipType(t.id),
      className: `flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${f.types.includes(t.id) ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"}`
    },
    /* @__PURE__ */ React.createElement(Icon, { n: t.icon, size: 12 }),
    t.label
  )))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "mb-1 flex justify-between text-xs font-bold uppercase tracking-wide text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, "Prix max"), /* @__PURE__ */ React.createElement("span", { className: "text-brand-600" }, f.max >= 150 ? "Illimit\xE9" : EUR.format(f.max))), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "10",
      max: "150",
      step: "5",
      value: f.max,
      onChange: (e) => setF({ ...f, max: +e.target.value }),
      className: "w-full accent-[#1F56D6]"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-[10px] text-slate-400" }, /* @__PURE__ */ React.createElement("span", null, "10 DH"), /* @__PURE__ */ React.createElement("span", null, "150 DH+"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500" }, "\xC9quipements"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2.5" }, AMENITIES.slice(0, 6).map((a) => /* @__PURE__ */ React.createElement("label", { key: a.id, className: "flex cursor-pointer items-center gap-2.5 text-sm text-slate-600" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: f.am.includes(a.id), onChange: () => flipAm(a.id), className: "h-4 w-4 rounded accent-[#1F56D6]" }), /* @__PURE__ */ React.createElement(Icon, { n: a.icon, size: 14, className: "text-slate-400" }), a.label)))), /* @__PURE__ */ React.createElement("button", { onClick: () => setF({ city: "", types: [], max: 150, am: [] }), className: "flex items-center gap-1.5 text-xs font-bold text-rose-500 transition hover:text-rose-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "x", size: 13 }), "R\xE9initialiser les filtres"));
};
const Explore = ({ params, nav, favs, toggleFav, spaces = [], bookings = [] }) => {
  const [f, setF] = useState(() => ({
    city: params?.city || "",
    types: params?.type ? [params.type] : [],
    max: params?.budget ? +params.budget : 150,
    am: [],
    date: params?.date || "2026-10-01",
    onlyAvailable: false
  }));
  const [sort, setSort] = useState("reco");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    let r = spaces.filter((s) => {
      const matchCity = !f.city || s.city === f.city;
      const matchType = !f.types.length || f.types.includes(s.type);
      const matchBudget = f.max >= 150 || s.price <= f.max;
      const matchAm = f.am.every((a) => s.am.includes(a));
      if (!matchCity || !matchType || !matchBudget || !matchAm) return false;
      if (f.onlyAvailable && f.date) {
        const avail = getSpaceAvailability(s, f.date, bookings);
        if (avail.isSoldOut) return false;
      }
      return true;
    });
    if (sort === "asc") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "desc") r = [...r].sort((a, b) => b.price - a.price);
    if (sort === "note") r = [...r].sort((a, b) => b.rating - a.rating);
    return r;
  }, [f, sort, spaces, bookings]);
  return /* @__PURE__ */ React.createElement("main", { className: "mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-end justify-between gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Kicker, null, "Catalogue & Disponibilit\xE9s en temps r\xE9el"), /* @__PURE__ */ React.createElement("h1", { className: "mt-2 font-display text-3xl font-bold tracking-tight" }, "Explorer les espaces"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm text-slate-500" }, /* @__PURE__ */ React.createElement("b", { className: "text-ink" }, results.length), " espace", results.length > 1 ? "s" : "", " ", f.onlyAvailable ? "avec places libres" : "r\xE9f\xE9renc\xE9" + (results.length > 1 ? "s" : ""), f.city && /* @__PURE__ */ React.createElement("span", null, " \xE0 ", /* @__PURE__ */ React.createElement("b", { className: "text-brand-600" }, f.city)), f.date && /* @__PURE__ */ React.createElement("span", null, " pour le ", /* @__PURE__ */ React.createElement("b", null, fmtDate(f.date))))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold shadow-2xs" }, /* @__PURE__ */ React.createElement(Icon, { n: "calendar", size: 13, className: "text-brand-600" }), /* @__PURE__ */ React.createElement("span", { className: "text-slate-400" }, "Date :"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      min: todayISO(),
      value: f.date,
      onChange: (e) => setF((prev) => ({ ...prev, date: e.target.value })),
      className: "border-none bg-transparent outline-none text-xs font-bold text-ink cursor-pointer"
    }
  )), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setF((prev) => ({ ...prev, onlyAvailable: !prev.onlyAvailable })),
      className: `flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition border ${f.onlyAvailable ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-brand-300"}`
    },
    /* @__PURE__ */ React.createElement(Icon, { n: f.onlyAvailable ? "check-circle-2" : "filter", size: 13 }),
    /* @__PURE__ */ React.createElement("span", null, "Places libres uniquement")
  ), /* @__PURE__ */ React.createElement("button", { onClick: () => setOpen(!open), className: "flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold lg:hidden" }, /* @__PURE__ */ React.createElement(Icon, { n: "sliders-horizontal", size: 13 }), "Filtres"), /* @__PURE__ */ React.createElement("select", { value: sort, onChange: (e) => setSort(e.target.value), className: "rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold outline-none focus:border-brand-500" }, /* @__PURE__ */ React.createElement("option", { value: "reco" }, "Recommand\xE9s"), /* @__PURE__ */ React.createElement("option", { value: "note" }, "Mieux not\xE9s"), /* @__PURE__ */ React.createElement("option", { value: "asc" }, "Prix croissant"), /* @__PURE__ */ React.createElement("option", { value: "desc" }, "Prix d\xE9croissant")))), /* @__PURE__ */ React.createElement("div", { className: "mt-8 grid gap-8 lg:grid-cols-[260px_1fr]" }, /* @__PURE__ */ React.createElement("aside", { className: `${open ? "block" : "hidden"} lg:block` }, /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:sticky lg:top-24" }, /* @__PURE__ */ React.createElement(FilterPanel, { f, setF }))), /* @__PURE__ */ React.createElement("div", null, results.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "grid place-items-center rounded-2xl border-2 border-dashed border-slate-200 py-24 text-center" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "mx-auto grid h-14 w-14 place-items-center rounded-full bg-mist text-slate-400" }, /* @__PURE__ */ React.createElement(Icon, { n: "search-x", size: 24 })), /* @__PURE__ */ React.createElement("p", { className: "mt-4 font-display font-bold" }, "Aucun espace ne correspond"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm text-slate-500" }, f.onlyAvailable ? "Tous les espaces sont complets pour cette date ou vos filtres sont trop stricts." : "Essayez d'\xE9largir vos crit\xE8res."), /* @__PURE__ */ React.createElement("button", { onClick: () => setF({ city: "", types: [], max: 150, am: [], date: "2026-10-01", onlyAvailable: false }), className: "mt-4 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white" }, "Effacer les filtres"))) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-5 sm:grid-cols-2 xl:grid-cols-3" }, results.map((s, i) => /* @__PURE__ */ React.createElement("div", { key: s.id, "data-reveal": true, style: { transitionDelay: `${i % 3 * 60}ms` } }, /* @__PURE__ */ React.createElement(SpaceCard, { s, nav, favs, toggleFav, date: f.date, bookings })))))));
};
const SpaceDetail = ({ id, nav, favs, toggleFav, reserve, spaces = [], bookings = [] }) => {
  const s = spaces.find((x) => x.id === id || String(x.id) === String(id) || x.dbId && String(x.dbId) === String(id));
  const [img, setImg] = useState(0);
  const [date, setDate] = useState(() => {
    return todayISO();
  });
  const [days, setDays] = useState(1);
  const [slots, setSlots] = useState([]);
  const [seatsCount, setSeatsCount] = useState(1);
  const [err, setErr] = useState("");
  const [spaceReviews, setSpaceReviews] = useState([]);
  useEffect(() => {
    if (s) {
      SpotworkAPI.getSpaceById(s.dbId || s.id).then((res) => {
        if (res && res.reviews && Array.isArray(res.reviews) && res.reviews.length > 0) {
          setSpaceReviews(res.reviews.map((r) => ({
            id: r.id,
            n: r.users?.full_name || "Membre Spotwork",
            role: "R\xE9sident",
            d: r.created_at ? new Date(r.created_at).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "R\xE9cemment",
            stars: r.rating || 5,
            t: r.comment
          })));
        } else {
          setSpaceReviews([]);
        }
      });
    }
  }, [s?.id]);
  if (!s) return /* @__PURE__ */ React.createElement("main", { className: "py-24 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto flex max-w-sm flex-col items-center" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-brand-600 text-white" }, /* @__PURE__ */ React.createElement(Icon, { n: "loader-2", size: 22, className: "animate-spin" })), /* @__PURE__ */ React.createElement("p", { className: "mt-4 font-semibold text-slate-700" }, "Chargement de l'espace depuis la base de donn\xE9es...")));
  const liked = favs.has(s.id);
  const isHour = s.unit === "heure";
  const base = isHour ? slots.length * s.price * seatsCount : days * s.price * seatsCount;
  const fees = Math.round(base * 0.08 * 100) / 100;
  const availability = useMemo(() => getSpaceAvailability(s, date, bookings), [s, date, bookings]);
  const upcomingDates = useMemo(() => getNextAvailableDates(s, bookings, 7), [s, bookings]);
  const updateSeatsCount = (newCount) => {
    const clamped = Math.max(1, Math.min(s.cap || 1, newCount));
    setSeatsCount(clamped);
    if (isHour && slots.length > 0) {
      const validSlots = slots.filter((h) => {
        const free = availability.hourlyFreeSeats[h] !== void 0 ? availability.hourlyFreeSeats[h] : s.cap || 1;
        return free >= clamped;
      });
      if (validSlots.length < slots.length) {
        setSlots(validSlots);
        setErr(`Certains cr\xE9neaux ont \xE9t\xE9 d\xE9s\xE9lectionn\xE9s car ils comptent moins de ${clamped} place(s) libre(s).`);
      } else {
        setErr("");
      }
    }
  };
  const flipSlot = (h) => {
    if (availability.isSoldOut || availability.isPast) return;
    if (availability.pastHours.includes(h)) {
      setErr(`Le cr\xE9neau horaire ${h} est d\xE9j\xE0 pass\xE9 et ne peut plus \xEAtre r\xE9serv\xE9.`);
      return;
    }
    const freeSeats = availability.hourlyFreeSeats[h] !== void 0 ? availability.hourlyFreeSeats[h] : s.cap || 1;
    if (!slots.includes(h)) {
      if (freeSeats <= 0) {
        setErr(`Le cr\xE9neau ${h} est complet (0 place disponible).`);
        return;
      }
      if (freeSeats < seatsCount) {
        setErr(`Le cr\xE9neau ${h} ne dispose que de ${freeSeats} place${freeSeats > 1 ? "s" : ""} disponible${freeSeats > 1 ? "s" : ""} (vous avez s\xE9lectionn\xE9 ${seatsCount} place${seatsCount > 1 ? "s" : ""}).`);
        return;
      }
    }
    setErr("");
    setSlots((p) => p.includes(h) ? p.filter((x) => x !== h) : [...p, h].sort());
  };
  const book = () => {
    if (availability.isPast || availability.allHoursPast) {
      setErr(`Cette date est pass\xE9e ou tous ses cr\xE9neaux horaires sont \xE9coul\xE9s. Veuillez choisir une date future.`);
      return;
    }
    if (availability.isSoldOut) {
      setErr(`Cet espace est complet pour le ${fmtDate(date)}. Choisissez une autre date disponible.`);
      return;
    }
    if (isHour) {
      if (slots.length === 0) {
        setErr("S\xE9lectionnez au moins un cr\xE9neau horaire.");
        return;
      }
      for (const h of slots) {
        if (availability.pastHours.includes(h)) {
          setErr(`Le cr\xE9neau ${h} est d\xE9j\xE0 pass\xE9 et ne peut plus \xEAtre r\xE9serv\xE9.`);
          return;
        }
        const freeSeats = availability.hourlyFreeSeats[h] !== void 0 ? availability.hourlyFreeSeats[h] : s.cap || 1;
        if (freeSeats < seatsCount) {
          setErr(`Le cr\xE9neau ${h} ne dispose que de ${freeSeats} place(s) libre(s) pour votre demande de ${seatsCount} place(s).`);
          return;
        }
      }
    } else {
      if (availability.availableSeats < seatsCount) {
        setErr(`Cet espace ne dispose que de ${availability.availableSeats} place(s) libre(s) pour le ${fmtDate(date)}.`);
        return;
      }
    }
    setErr("");
    reserve({
      key: Date.now(),
      id: s.id,
      name: s.name,
      img: s.imgs[0],
      city: s.city,
      date,
      seats: seatsCount,
      slots,
      isHour,
      meta: isHour ? `${fmtDate(date)} \xB7 ${slots.length} h (${slots.join(", ")}) \xB7 ${seatsCount} place${seatsCount > 1 ? "s" : ""}` : `${fmtDate(date)} \xB7 ${days} jour${days > 1 ? "s" : ""} \xB7 ${seatsCount} place${seatsCount > 1 ? "s" : ""}`,
      total: base + fees
    });
  };
  const similar = spaces.filter((x) => x.id !== s.id && (x.city === s.city || x.type === s.type)).slice(0, 3);
  return /* @__PURE__ */ React.createElement("main", { className: "mx-auto max-w-7xl px-4 py-8 md:px-6" }, /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "explore" }), className: "flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-ink" }, /* @__PURE__ */ React.createElement(Icon, { n: "arrow-left", size: 16 }), "Retour aux r\xE9sultats"), /* @__PURE__ */ React.createElement("div", { className: "mt-5 grid gap-8 lg:grid-cols-[1fr_400px]" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement(Badge, { label: s.badge }), /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700" }, TYPES.find((t) => t.id === s.type).label)), /* @__PURE__ */ React.createElement("h1", { className: "mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl" }, s.name), /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 13 }), s.city, " \xB7 ", s.district), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "star", size: 13, fill: "currentColor", className: "text-amber-400" }), /* @__PURE__ */ React.createElement("b", { className: "text-ink" }, s.rating.toLocaleString("fr-FR")), "(", s.rev, " avis)")), availability.isPast || availability.allHoursPast ? /* @__PURE__ */ React.createElement("div", { className: "mt-4 rounded-2xl border border-slate-300 bg-slate-100/90 p-4 shadow-2xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-slate-800 font-bold text-sm" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-6 w-6 place-items-center rounded-full bg-slate-500 text-white" }, /* @__PURE__ */ React.createElement(Icon, { n: "clock", size: 13 })), availability.isPast ? `Date pass\xE9e (${fmtDate(date)}) \u2014 R\xE9servations impossibles` : `Journ\xE9e termin\xE9e pour le ${fmtDate(date)} \u2014 Tous les cr\xE9neaux horaires sont \xE9coul\xE9s`), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-slate-600 leading-relaxed" }, "Il n'est plus possible de r\xE9server pour cette date car les horaires sont d\xE9j\xE0 pass\xE9s. Veuillez s\xE9lectionner une date ult\xE9rieure dans le planning ci-dessous.")) : availability.isSoldOut ? /* @__PURE__ */ React.createElement("div", { className: "mt-4 rounded-2xl border border-rose-300 bg-rose-50/90 p-4 shadow-2xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-rose-800 font-bold text-sm" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-6 w-6 place-items-center rounded-full bg-rose-600 text-white" }, /* @__PURE__ */ React.createElement(Icon, { n: "alert-triangle", size: 13 })), "COMPLET pour le ", fmtDate(date), " \u2014 0 place disponible"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-rose-700 leading-relaxed" }, "Cet espace est enti\xE8rement r\xE9serv\xE9 sur cette date. Consultez les autres dates disponibles ci-contre ou dans le s\xE9lecteur ci-dessous.")) : /* @__PURE__ */ React.createElement("div", { className: "mt-4 rounded-2xl border border-emerald-300 bg-emerald-50/80 p-3.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-white" }, /* @__PURE__ */ React.createElement(Icon, { n: "check", size: 13 })), /* @__PURE__ */ React.createElement("span", null, availability.minFreeSeats === availability.availableSeats ? `${availability.availableSeats} place${availability.availableSeats > 1 ? "s" : ""} disponible${availability.availableSeats > 1 ? "s" : ""} sur ${availability.totalCapacity} pour le ${fmtDate(date)}` : `De ${availability.minFreeSeats} \xE0 ${availability.availableSeats} places libres selon les heures (capacit\xE9 : ${availability.totalCapacity} places) pour le ${fmtDate(date)}`)), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-bold text-emerald-800 bg-emerald-200/70 px-2.5 py-0.5 rounded-full" }, "R\xE9servation ouverte")), /* @__PURE__ */ React.createElement("div", { className: "mt-5 grid grid-cols-4 gap-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "col-span-4 overflow-hidden rounded-2xl md:col-span-3" }, /* @__PURE__ */ React.createElement("img", { src: U(s.imgs[img], 1100), alt: s.name, className: "h-64 w-full object-cover transition-all duration-500 md:h-[380px]" })), /* @__PURE__ */ React.createElement("div", { className: "col-span-4 grid grid-cols-3 gap-2.5 md:col-span-1 md:grid-cols-1" }, s.imgs.map((im, i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: i,
      onClick: () => setImg(i),
      className: `overflow-hidden rounded-xl transition ${img === i ? "ring-2 ring-brand-600 ring-offset-2" : "opacity-80 hover:opacity-100"}`
    },
    /* @__PURE__ */ React.createElement("img", { src: U(im, 300), alt: "", className: "h-20 w-full object-cover md:h-[118px]" })
  )))), /* @__PURE__ */ React.createElement("div", { className: "mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" }, [["users", "Capacit\xE9 totale", `${s.cap} pers.`], ["user-check", "Places libres", `${availability.availableSeats} pers.`], ["ruler", "Surface", s.surface], ["clock", "R\xE9servation", isHour ? "\xC0 l'heure" : "\xC0 la journ\xE9e"]].map(([i, l, v]) => /* @__PURE__ */ React.createElement("div", { key: l, className: "rounded-xl border border-slate-200 p-3.5 bg-white shadow-2xs" }, /* @__PURE__ */ React.createElement(Icon, { n: i, size: 17, className: "text-brand-600" }), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400" }, l), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-ink" }, v)))), /* @__PURE__ */ React.createElement("div", { className: "mt-8" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display text-lg font-bold" }, "\xC0 propos de cet espace"), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-[15px] leading-relaxed text-slate-600" }, s.desc), /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex items-center gap-3 rounded-2xl bg-mist p-4" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-11 w-11 place-items-center rounded-full bg-navy text-sm font-bold text-white" }, s.host.split(" ").map((w) => w[0]).join("")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold" }, "G\xE9r\xE9 par ", s.host), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, "R\xE9pond en ~1 h \xB7 Membre certifi\xE9 PropTech Maroc")))), /* @__PURE__ */ React.createElement("div", { className: "mt-8" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display text-lg font-bold" }, "\xC9quipements inclus"), /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex flex-wrap gap-2.5" }, s.am.map((a) => {
    const am = AMENITIES.find((x) => x.id === a);
    return /* @__PURE__ */ React.createElement("span", { key: a, className: "flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white" }, /* @__PURE__ */ React.createElement(Icon, { n: am.icon, size: 14, className: "text-brand-600" }), am.label);
  }))), /* @__PURE__ */ React.createElement("div", { className: "mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-3 mb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "font-display text-lg font-bold flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 20, className: "text-brand-600" }), "Localisation & Plan d'acc\xE8s"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 mt-0.5" }, s.address || `${s.district}, ${s.city}, Maroc`)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "a",
    {
      href: `https://www.google.com/maps/search/?api=1&query=${s.lat || 33.5855},${s.lng || -7.6322}`,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-1.5 text-xs font-bold transition shadow-2xs"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: "external-link", size: 13 }),
    " Ouvrir dans Google Maps"
  ))), /* @__PURE__ */ React.createElement("div", { className: "relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100" }, /* @__PURE__ */ React.createElement(
    "iframe",
    {
      title: `Carte - ${s.name}`,
      width: "100%",
      height: "100%",
      loading: "lazy",
      style: { border: 0 },
      src: `https://www.openstreetmap.org/export/embed.html?bbox=${(s.lng || -7.6322) - 0.01}%2C${(s.lat || 33.5855) - 7e-3}%2C${(s.lng || -7.6322) + 0.01}%2C${(s.lat || 33.5855) + 7e-3}&layer=mapnik&marker=${s.lat || 33.5855}%2C${s.lng || -7.6322}`
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "mt-4 grid gap-3 sm:grid-cols-2" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-xl bg-slate-50 p-3.5 border border-slate-100 flex items-start gap-2.5" }, /* @__PURE__ */ React.createElement("span", { className: "p-2 rounded-lg bg-white shadow-2xs text-brand-600 mt-0.5 shrink-0" }, /* @__PURE__ */ React.createElement(Icon, { n: "navigation", size: 16 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider text-slate-400" }, "Acc\xE8s & Transports"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-700 font-medium mt-0.5 leading-relaxed" }, s.transport || "Desservi par tramway, bus et stations taxis \xE0 proximit\xE9 imm\xE9diate."))), /* @__PURE__ */ React.createElement("div", { className: "rounded-xl bg-slate-50 p-3.5 border border-slate-100 flex items-start gap-2.5" }, /* @__PURE__ */ React.createElement("span", { className: "p-2 rounded-lg bg-white shadow-2xs text-emerald-600 mt-0.5 shrink-0" }, /* @__PURE__ */ React.createElement(Icon, { n: "compass", size: 16 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider text-slate-400" }, "Coordonn\xE9es GPS"), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-mono text-slate-700 font-medium mt-0.5" }, "Lat: ", (s.lat || 33.5855).toFixed(4), " \xB7 Lng: ", (s.lng || -7.6322).toFixed(4)), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 mt-0.5" }, "Quartier ", s.district, " \xB7 ", s.city))))), /* @__PURE__ */ React.createElement("div", { className: "mt-8" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display text-lg font-bold" }, "Avis des membres"), /* @__PURE__ */ React.createElement("div", { className: "mt-4 grid gap-6 md:grid-cols-[220px_1fr]" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 p-5 text-center h-fit bg-white" }, /* @__PURE__ */ React.createElement("p", { className: "font-display text-4xl font-bold" }, s.rating.toLocaleString("fr-FR")), /* @__PURE__ */ React.createElement("div", { className: "mt-1 flex justify-center" }, /* @__PURE__ */ React.createElement(Stars, { v: s.rating })), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-slate-400" }, s.rev, " avis"), /* @__PURE__ */ React.createElement("div", { className: "mt-4 space-y-1.5" }, [70, 20, 6, 3, 1].map((w, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex items-center gap-2 text-[10px] text-slate-400" }, /* @__PURE__ */ React.createElement("span", { className: "w-3" }, 5 - i), /* @__PURE__ */ React.createElement("div", { className: "h-1.5 flex-1 rounded-full bg-slate-100" }, /* @__PURE__ */ React.createElement("div", { className: "h-full rounded-full bg-amber-400", style: { width: w + "%" } })))))), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, spaceReviews.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400" }, "Aucun avis pour le moment pour cet espace.") : spaceReviews.map((r) => /* @__PURE__ */ React.createElement("article", { key: r.id || r.n, className: "rounded-2xl border border-slate-200 p-5 bg-white shadow-2xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700" }, (r.n || "M")[0]), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold" }, r.n), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400" }, r.role, " \xB7 ", r.d)), /* @__PURE__ */ React.createElement("div", { className: "ml-auto" }, /* @__PURE__ */ React.createElement(Stars, { v: r.stars, size: 11 }))), /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-sm leading-relaxed text-slate-600" }, r.t))))))), /* @__PURE__ */ React.createElement("aside", { className: "lg:sticky lg:top-24 h-fit" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-lift" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-baseline justify-between" }, /* @__PURE__ */ React.createElement("p", { className: "font-display text-2xl font-bold" }, EUR.format(s.price), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium text-slate-400" }, " /", s.unit)), /* @__PURE__ */ React.createElement("button", { onClick: () => toggleFav(s.id), className: `grid h-10 w-10 place-items-center rounded-full border transition ${liked ? "border-rose-200 bg-rose-50 text-rose-500" : "border-slate-200 text-slate-400 hover:text-rose-500"}` }, /* @__PURE__ */ React.createElement(Icon, { n: "heart", size: 17, fill: liked ? "currentColor" : "none", className: liked ? "pop" : "" }))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 space-y-3.5" }, /* @__PURE__ */ React.createElement(Field, { label: "Date souhait\xE9e" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      min: todayISO(),
      value: date,
      onChange: (e) => {
        const val = e.target.value;
        if (val && val < todayISO()) {
          setErr("Impossible de s\xE9lectionner une date d\xE9j\xE0 pass\xE9e.");
          return;
        }
        setDate(val);
        setSlots([]);
        setErr("");
      },
      className: inp
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", null, "Disponibilit\xE9s des 7 prochains jours :")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-1.5 sm:grid-cols-3" }, upcomingDates.map((item) => {
    const isSelected = item.date === date;
    const isPassed = item.isPast || item.allHoursPast;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: item.date,
        type: "button",
        onClick: () => {
          setDate(item.date);
          setSlots([]);
          setErr("");
        },
        className: `p-2 rounded-xl border text-left text-xs transition ${isSelected ? "border-brand-600 bg-brand-50/70 ring-2 ring-brand-600/30" : isPassed ? "border-slate-200 bg-slate-100/70 opacity-80 hover:bg-slate-100" : item.isSoldOut ? "border-rose-200 bg-rose-50/50 hover:bg-rose-50" : "border-slate-200 hover:border-brand-300 bg-white"}`
      },
      /* @__PURE__ */ React.createElement("p", { className: "font-bold text-ink truncate capitalize" }, item.label),
      /* @__PURE__ */ React.createElement("span", { className: `inline-block mt-1 text-[10px] font-extrabold px-1.5 py-0.2 rounded ${isPassed ? "bg-slate-200 text-slate-600" : item.isSoldOut ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-800"}` }, isPassed ? "Termin\xE9" : item.isSoldOut ? "Complet (0)" : `${item.availableSeats} libre${item.availableSeats > 1 ? "s" : ""}`)
    );
  }))), /* @__PURE__ */ React.createElement(Field, { label: `Nombre de places (${seatsCount} personne${seatsCount > 1 ? "s" : ""})` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/70" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => updateSeatsCount(seatsCount - 1),
      disabled: seatsCount <= 1,
      className: `grid h-8 w-8 place-items-center rounded-full transition ${seatsCount <= 1 ? "bg-slate-100 text-slate-300 cursor-not-allowed" : "bg-white text-ink shadow-2xs hover:bg-brand-50"}`
    },
    /* @__PURE__ */ React.createElement(Icon, { n: "minus", size: 14 })
  ), /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-ink" }, seatsCount, " place", seatsCount > 1 ? "s" : ""), /* @__PURE__ */ React.createElement("span", { className: "block text-[10px] text-slate-500 font-medium" }, "sur ", s.cap, " au total")), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => updateSeatsCount(seatsCount + 1),
      disabled: seatsCount >= (s.cap || 1),
      className: `grid h-8 w-8 place-items-center rounded-full transition ${seatsCount >= (s.cap || 1) ? "bg-slate-100 text-slate-300 cursor-not-allowed" : "bg-white text-ink shadow-2xs hover:bg-brand-50"}`
    },
    /* @__PURE__ */ React.createElement(Icon, { n: "plus", size: 14 })
  ))), isHour ? /* @__PURE__ */ React.createElement(Field, { label: `Cr\xE9neaux horaires (${slots.length} s\xE9lectionn\xE9${slots.length > 1 ? "s" : ""})`, err }, availability.isPast || availability.allHoursPast ? /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-slate-200 bg-slate-100 p-3 text-center text-xs text-slate-600 font-semibold" }, "Tous les cr\xE9neaux horaires sont \xE9coul\xE9s pour cette journ\xE9e") : availability.isSoldOut ? /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs text-rose-700 font-semibold" }, "Tous les cr\xE9neaux sont r\xE9serv\xE9s pour cette journ\xE9e") : /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-4 gap-1.5" }, HOURS.map((h) => {
    const isPast = availability.pastHours.includes(h);
    const freeSeats = availability.hourlyFreeSeats[h] !== void 0 ? availability.hourlyFreeSeats[h] : s.cap || 1;
    const isSlotSoldOut = freeSeats <= 0;
    const notEnoughSeats = freeSeats < seatsCount;
    const disabled = isPast || isSlotSoldOut || notEnoughSeats;
    const on = slots.includes(h);
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: h,
        type: "button",
        disabled,
        onClick: () => flipSlot(h),
        title: isPast ? "Ce cr\xE9neau horaire est d\xE9j\xE0 pass\xE9" : isSlotSoldOut ? "Cr\xE9neau complet (0 place disponible)" : notEnoughSeats ? `Seulement ${freeSeats} place(s) disponible(s) (vous en demandez ${seatsCount})` : `${freeSeats} place(s) disponible(s) sur ${s.cap}`,
        className: `flex flex-col items-center justify-center rounded-xl border py-2 px-1 text-center transition ${isPast ? "cursor-not-allowed border-slate-100 bg-slate-100/70 text-slate-400 opacity-50" : disabled ? "cursor-not-allowed border-slate-100 bg-slate-50/80 opacity-60" : on ? "border-brand-600 bg-brand-600 text-white shadow-sm ring-2 ring-brand-600/30" : "border-slate-200 bg-white text-slate-700 hover:border-brand-400 hover:shadow-2xs"}`
      },
      /* @__PURE__ */ React.createElement("span", { className: `text-xs font-bold leading-tight ${on ? "text-white" : isPast ? "text-slate-400 line-through" : disabled ? "text-slate-400" : "text-ink"}` }, h),
      /* @__PURE__ */ React.createElement(
        "span",
        {
          className: `text-[10px] font-extrabold leading-tight mt-0.5 ${on ? "text-brand-100" : isPast ? "text-slate-400 font-normal italic" : isSlotSoldOut ? "text-rose-600" : notEnoughSeats ? "text-amber-600" : "text-emerald-700"}`
        },
        isPast ? "Pass\xE9" : isSlotSoldOut ? "Complet" : `${freeSeats} libre${freeSeats > 1 ? "s" : ""}`
      )
    );
  }))) : /* @__PURE__ */ React.createElement(Field, { label: "Dur\xE9e de location" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setDays(Math.max(1, days - 1)), className: "grid h-8 w-8 place-items-center rounded-full bg-mist transition hover:bg-brand-50" }, /* @__PURE__ */ React.createElement(Icon, { n: "minus", size: 14 })), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold" }, days, " jour", days > 1 ? "s" : ""), /* @__PURE__ */ React.createElement("button", { onClick: () => setDays(Math.min(10, days + 1)), className: "grid h-8 w-8 place-items-center rounded-full bg-mist transition hover:bg-brand-50" }, /* @__PURE__ */ React.createElement(Icon, { n: "plus", size: 14 }))))), /* @__PURE__ */ React.createElement("div", { className: "mt-5 space-y-2 border-t border-dashed border-slate-200 pt-4 text-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, isHour ? `${slots.length} h \xD7 ${seatsCount} place${seatsCount > 1 ? "s" : ""} \xD7 ${EUR.format(s.price)}` : `${days} j \xD7 ${seatsCount} place${seatsCount > 1 ? "s" : ""} \xD7 ${EUR.format(s.price)}`), /* @__PURE__ */ React.createElement("span", null, EUR.format(base))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, "Frais de service (8 %)"), /* @__PURE__ */ React.createElement("span", null, EUR.format(fees))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between pt-1 font-display text-base font-bold" }, /* @__PURE__ */ React.createElement("span", null, "Total TTC"), /* @__PURE__ */ React.createElement("span", null, EUR.format(base + fees)))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: book,
      disabled: availability.isSoldOut || availability.isPast || availability.allHoursPast,
      className: `mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold shadow-lg transition ${availability.isPast || availability.allHoursPast ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none" : availability.isSoldOut ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none" : "bg-brand-600 text-white shadow-brand-600/30 hover:bg-brand-700 active:scale-[.98]"}`
    },
    /* @__PURE__ */ React.createElement(Icon, { n: availability.isPast || availability.allHoursPast ? "clock" : availability.isSoldOut ? "slash" : "zap", size: 16 }),
    availability.isPast || availability.allHoursPast ? "Journ\xE9e pass\xE9e / ferm\xE9e" : availability.isSoldOut ? "Complet pour cette date" : `R\xE9server ${seatsCount > 1 ? `${seatsCount} places` : "cet espace"}`
  ), availability.isPast || availability.allHoursPast ? /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-center text-xs text-slate-500 font-semibold" }, "Cette date ou ses horaires sont \xE9coul\xE9s. Choisissez une autre date ci-dessus.") : availability.isSoldOut ? /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-center text-xs text-rose-600 font-semibold" }, "S\xE9lectionnez une autre date ci-dessus pour r\xE9server.") : /* @__PURE__ */ React.createElement("p", { className: "mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400" }, /* @__PURE__ */ React.createElement(Icon, { n: "shield-check", size: 13, className: "text-emerald-500" }), "Confirmation imm\xE9diate \xB7 Paiement CMI s\xE9curis\xE9")))), /* @__PURE__ */ React.createElement("div", { className: "mt-14" }, /* @__PURE__ */ React.createElement(SecHead, { kicker: "Continuez l'exploration", title: "Espaces similaires" }), /* @__PURE__ */ React.createElement("div", { className: "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" }, similar.map((x) => /* @__PURE__ */ React.createElement(SpaceCard, { key: x.id, s: x, nav, favs, toggleFav, date, bookings })))));
};
const Checkout = ({ cart, setCart, nav, onDone, toast, currentUser }) => {
  const [promo, setPromo] = useState("");
  const [promoOn, setPromoOn] = useState(false);
  const [promoErr, setPromoErr] = useState("");
  const [method, setMethod] = useState("cmi");
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState(() => ({
    name: currentUser?.name || "Youssef Amrani",
    email: currentUser?.email || "youssef@proptech.ma",
    phone: currentUser?.phone || "+212 6 61 23 45 67",
    card: "",
    exp: "",
    cvc: ""
  }));
  const [errs, setErrs] = useState({});
  const [paidOrder, setPaidOrder] = useState(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const discount = promoOn ? subtotal * 0.1 : 0;
  const total = subtotal - discount;
  const handleFillTestCard = () => {
    setForm((prev) => ({
      ...prev,
      card: "4242 4242 4242 4242",
      exp: "12/28",
      cvc: "888"
    }));
    setErrs({});
    toast("Carte de test CMI Maroc (3D Secure) pr\xE9-remplie", "credit-card");
  };
  const applyPromo = () => {
    if (promo.trim().toUpperCase() === "COWORK10") {
      setPromoOn(true);
      setPromoErr("");
      toast("Code promo appliqu\xE9 : \u221210 %", "percent");
    } else setPromoErr("Code invalide. Essayez COWORK10 \u{1F609}");
  };
  const fmtCard = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExp = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
  };
  const validate = () => {
    const er = {};
    if (form.name.trim().length < 3) er.name = "Nom trop court (3 caract\xE8res min.)";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = "Adresse e-mail invalide";
    if (method === "cmi") {
      if (form.card.replace(/\s/g, "").length !== 16) er.card = "Le num\xE9ro doit contenir 16 chiffres";
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.exp)) er.exp = "Format MM/AA attendu";
      else {
        const [m, y] = form.exp.split("/").map(Number);
        if (2e3 + y < 2025 || 2e3 + y === 2025 && m < (/* @__PURE__ */ new Date()).getMonth() + 1) er.exp = "Carte expir\xE9e";
      }
      if (!/^\d{3,4}$/.test(form.cvc)) er.cvc = "3 chiffres au dos";
    }
    setErrs(er);
    return Object.keys(er).length === 0;
  };
  const submit = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (validate()) {
      setProcessing(true);
      setTimeout(() => {
        const orderRef = `SW-2026-${Math.floor(1e3 + Math.random() * 9e3)}`;
        const invoiceRef = `FACT-2026-004${Math.floor(10 + Math.random() * 89)}`;
        const methodLabel = method === "cmi" ? "Carte Bancaire Maroc CMI (3D Secure)" : method === "cash" ? "Paiement en esp\xE8ces \xE0 l'accueil" : "Virement Bancaire (CIH / Attijariwafa)";
        const orderSnapshot = {
          ref: orderRef,
          invoiceRef,
          items: [...cart],
          total,
          subtotal,
          discount,
          name: form.name,
          email: form.email,
          phone: form.phone,
          methodLabel,
          date: (/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR"),
          paidAt: (/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR") + " " + (/* @__PURE__ */ new Date()).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        };
        setPaidOrder(orderSnapshot);
        setProcessing(false);
        onDone({
          date: cart[0].date,
          meta: cart.length > 1 ? `${cart.length} r\xE9servations` : cart[0].meta,
          spaceId: cart[0].id,
          name: form.name,
          email: form.email,
          phone: form.phone,
          total,
          slots: cart[0].slots,
          seats: cart[0].seats || 1,
          isHour: cart[0].isHour,
          paymentMethod: methodLabel,
          invoiceRef
        });
        window.scrollTo({ top: 0 });
      }, 700);
    }
  };
  if (paidOrder) {
    const mainItem = paidOrder.items[0] || {};
    return /* @__PURE__ */ React.createElement("main", { className: "mx-auto max-w-xl px-4 py-16 text-center" }, /* @__PURE__ */ React.createElement("span", { className: "pop mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 shadow-md" }, /* @__PURE__ */ React.createElement(Icon, { n: "check-circle-2", size: 42 })), /* @__PURE__ */ React.createElement("h1", { className: "mt-6 font-display text-3xl font-bold tracking-tight text-ink" }, "R\xE9servation & Paiement valid\xE9s !"), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-sm text-slate-500" }, "R\xE9f. Transaction : ", /* @__PURE__ */ React.createElement("b", { className: "font-mono text-ink font-bold" }, paidOrder.ref)), /* @__PURE__ */ React.createElement("div", { className: "mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold" }, /* @__PURE__ */ React.createElement(Icon, { n: "shield-check", size: 14, className: "text-emerald-600" }), " ", paidOrder.methodLabel, " \xB7 Confirm\xE9"), /* @__PURE__ */ React.createElement("div", { className: "mt-6 rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-card space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-slate-100 pb-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold uppercase tracking-wider text-slate-400" }, "D\xE9tail de la commande"), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-400" }, paidOrder.paidAt)), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, paidOrder.items.map((it, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "flex items-center justify-between gap-3 text-sm" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-ink" }, it.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, it.city, " \xB7 ", it.meta)), /* @__PURE__ */ React.createElement("b", { className: "font-mono text-brand-700" }, EUR.format(it.total))))), /* @__PURE__ */ React.createElement("div", { className: "border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-500" }, paidOrder.discount > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-emerald-600 font-semibold" }, /* @__PURE__ */ React.createElement("span", null, "Remise promotionnelle (\u221210%)"), /* @__PURE__ */ React.createElement("span", null, "\u2212", EUR.format(paidOrder.discount))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between font-display text-base font-bold text-ink pt-1 border-t border-slate-100" }, /* @__PURE__ */ React.createElement("span", null, "Montant total r\xE9gl\xE9"), /* @__PURE__ */ React.createElement("span", { className: "text-brand-600 font-mono" }, EUR.format(paidOrder.total))))), /* @__PURE__ */ React.createElement("div", { className: "mt-8 flex flex-wrap justify-center gap-3" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setInvoiceOpen(true),
        className: "inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white shadow-card hover:bg-ink transition"
      },
      /* @__PURE__ */ React.createElement(Icon, { n: "file-text", size: 16 }),
      "\u{1F4E5} T\xE9l\xE9charger Facture PDF"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => nav({ name: "user" }),
        className: "inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition"
      },
      /* @__PURE__ */ React.createElement(Icon, { n: "calendar-days", size: 16 }),
      "Voir mes r\xE9servations"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => nav({ name: "home" }),
        className: "rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
      },
      "Accueil"
    )), /* @__PURE__ */ React.createElement(
      InvoiceModal,
      {
        isOpen: invoiceOpen,
        onClose: () => setInvoiceOpen(false),
        invoice: {
          invoiceNumber: paidOrder.invoiceRef,
          clientName: paidOrder.name,
          clientEmail: paidOrder.email,
          clientPhone: paidOrder.phone,
          clientCity: mainItem.city || "Casablanca",
          spaceName: mainItem.name || "Espace Coworking",
          date: paidOrder.date,
          timeSlot: mainItem.meta || "09:00 \u2013 18:00 (Journ\xE9e)",
          grossAmount: paidOrder.total,
          paymentMethod: paidOrder.methodLabel,
          paidAt: paidOrder.paidAt
        }
      }
    ));
  }
  if (cart.length === 0) return /* @__PURE__ */ React.createElement("main", { className: "mx-auto max-w-lg px-4 py-24 text-center" }, /* @__PURE__ */ React.createElement("span", { className: "mx-auto grid h-16 w-16 place-items-center rounded-full bg-mist text-slate-400" }, /* @__PURE__ */ React.createElement(Icon, { n: "shopping-cart", size: 28 })), /* @__PURE__ */ React.createElement("h1", { className: "mt-5 font-display text-2xl font-bold" }, "Votre panier est vide"), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-sm text-slate-500" }, "Trouvez l'espace parfait et r\xE9servez-le en quelques clics."), /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "explore" }), className: "mt-6 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white" }, "Explorer les espaces"));
  return /* @__PURE__ */ React.createElement("main", { className: "mx-auto max-w-6xl px-4 py-10 md:px-6" }, /* @__PURE__ */ React.createElement(Kicker, null, "Paiement s\xE9curis\xE9 \xB7 Maroc"), /* @__PURE__ */ React.createElement("h1", { className: "mt-2 font-display text-3xl font-bold tracking-tight" }, "Finaliser votre r\xE9servation"), /* @__PURE__ */ React.createElement("div", { className: "mt-8 grid gap-8 lg:grid-cols-[1fr_420px]" }, /* @__PURE__ */ React.createElement("form", { onSubmit: submit, className: "space-y-6" }, /* @__PURE__ */ React.createElement("section", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card" }, /* @__PURE__ */ React.createElement("h2", { className: "flex items-center gap-2 font-display font-bold" }, /* @__PURE__ */ React.createElement(Icon, { n: "user", size: 17, className: "text-brand-600" }), "Vos coordonn\xE9es"), /* @__PURE__ */ React.createElement("div", { className: "mt-4 grid gap-4 sm:grid-cols-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Nom complet", err: errs.name }, /* @__PURE__ */ React.createElement("input", { value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), placeholder: "Youssef Amrani", className: `${inp} ${errs.name ? inpErr : ""}` })), /* @__PURE__ */ React.createElement(Field, { label: "E-mail", err: errs.email }, /* @__PURE__ */ React.createElement("input", { value: form.email, onChange: (e) => setForm({ ...form, email: e.target.value }), placeholder: "youssef@proptech.ma", className: `${inp} ${errs.email ? inpErr : ""}` })))), /* @__PURE__ */ React.createElement("section", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ React.createElement("h2", { className: "flex items-center gap-2 font-display font-bold" }, /* @__PURE__ */ React.createElement(Icon, { n: "credit-card", size: 17, className: "text-brand-600" }), "Mode de r\xE8glement"), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1 text-[11px] font-semibold text-emerald-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "lock", size: 12 }), "Chiffr\xE9 SSL 256-bit")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5" }, [
    ["cmi", "Carte Bancaire CMI", "credit-card", "Visa, Mastercard, CMI"],
    ["cash", "Paiement sur place", "banknote", "R\xE8glement \xE0 l'arriv\xE9e"],
    ["virement", "Virement / Wafacash", "building-2", "Attijari, CIH, BCP"]
  ].map(([mId, label, icon, sub]) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: mId,
      type: "button",
      onClick: () => setMethod(mId),
      className: `p-3 rounded-xl border text-left transition ${method === mId ? "border-brand-600 bg-brand-50/70 ring-2 ring-brand-600/20" : "border-slate-200 hover:border-slate-300 bg-white"}`
    },
    /* @__PURE__ */ React.createElement(Icon, { n: icon, size: 18, className: method === mId ? "text-brand-600" : "text-slate-400" }),
    /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 font-bold text-xs text-ink" }, label),
    /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400" }, sub)
  ))), method === "cmi" && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-slate-500" }, "Coordonn\xE9es bancaires"), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleFillTestCard,
      className: "inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-full border border-brand-200 transition"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: "zap", size: 12 }),
    "\u26A1 Remplir carte test CMI (Maroc)"
  )), /* @__PURE__ */ React.createElement(Field, { label: "Num\xE9ro de carte CMI / Visa", err: errs.card }, /* @__PURE__ */ React.createElement("input", { value: form.card, onChange: (e) => setForm({ ...form, card: fmtCard(e.target.value) }), placeholder: "4242 4242 4242 4242", className: `${inp} tracking-widest font-mono ${errs.card ? inpErr : ""}` })), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement(Field, { label: "Expiration", err: errs.exp }, /* @__PURE__ */ React.createElement("input", { value: form.exp, onChange: (e) => setForm({ ...form, exp: fmtExp(e.target.value) }), placeholder: "MM/AA", className: `${inp} font-mono ${errs.exp ? inpErr : ""}` })), /* @__PURE__ */ React.createElement(Field, { label: "Code CVC (dos)", err: errs.cvc }, /* @__PURE__ */ React.createElement("input", { value: form.cvc, onChange: (e) => setForm({ ...form, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) }), placeholder: "123", className: `${inp} font-mono ${errs.cvc ? inpErr : ""}` })))), method === "cash" && /* @__PURE__ */ React.createElement("div", { className: "rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 space-y-1" }, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-ink flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(Icon, { n: "info", size: 14, className: "text-brand-600" }), "Paiement direct \xE0 la r\xE9ception :"), /* @__PURE__ */ React.createElement("p", null, "Votre place sera r\xE9serv\xE9e et bloqu\xE9e. Vous pourrez r\xE9gler en esp\xE8ces ou par TPE \xE0 votre arriv\xE9e aupr\xE8s de l'accueil de l'espace.")), method === "virement" && /* @__PURE__ */ React.createElement("div", { className: "rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 space-y-1" }, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-ink flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(Icon, { n: "info", size: 14, className: "text-brand-600" }), "Coordonn\xE9es bancaires Spotwork Maroc :"), /* @__PURE__ */ React.createElement("p", { className: "font-mono text-[11px] text-ink font-semibold" }, "RIB Attijariwafa Bank : 007 780 0001234567890123 45"), /* @__PURE__ */ React.createElement("p", null, "Votre r\xE9servation sera confirm\xE9e imm\xE9diatement avec la r\xE9f\xE9rence transmise par e-mail."))), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "submit",
      disabled: processing,
      className: "flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-4 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[.99] disabled:opacity-60"
    },
    processing ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Icon, { n: "loader", size: 16, className: "animate-spin" }), /* @__PURE__ */ React.createElement("span", null, "S\xE9curisation CMI 3D-Secure en cours...")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Icon, { n: "lock", size: 15 }), /* @__PURE__ */ React.createElement("span", null, "Confirmer et Payer ", EUR.format(total)))
  )), /* @__PURE__ */ React.createElement("aside", { className: "h-fit space-y-4 lg:sticky lg:top-24" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-card" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display font-bold" }, "Votre panier ", /* @__PURE__ */ React.createElement("span", { className: "text-slate-400" }, "(", cart.length, ")")), /* @__PURE__ */ React.createElement("div", { className: "mt-4 space-y-4" }, cart.map((i) => /* @__PURE__ */ React.createElement("div", { key: i.key, className: "flex gap-3" }, /* @__PURE__ */ React.createElement("img", { src: U(i.img, 200), alt: "", className: "h-16 w-20 rounded-xl object-cover" }), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "truncate text-sm font-bold" }, i.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, i.city, " \xB7 ", i.meta), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm font-bold text-brand-700" }, EUR.format(i.total))), /* @__PURE__ */ React.createElement("button", { onClick: () => setCart(cart.filter((x) => x.key !== i.key)), className: "h-fit text-slate-300 transition hover:text-rose-500" }, /* @__PURE__ */ React.createElement(Icon, { n: "trash-2", size: 16 }))))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex gap-2" }, /* @__PURE__ */ React.createElement("input", { value: promo, onChange: (e) => setPromo(e.target.value), placeholder: "Code promo", className: `${inp} ${promoErr ? inpErr : ""}` }), /* @__PURE__ */ React.createElement("button", { onClick: applyPromo, className: "shrink-0 rounded-xl bg-navy px-4 text-sm font-bold text-white transition hover:bg-ink" }, "OK")), promoErr && /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 text-xs text-rose-600" }, promoErr), promoOn && /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 flex items-center gap-1 text-xs font-semibold text-emerald-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "check", size: 12 }), "COWORK10 appliqu\xE9")), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl bg-navy p-5 text-white shadow-card" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-2 text-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-slate-300" }, /* @__PURE__ */ React.createElement("span", null, "Sous-total"), /* @__PURE__ */ React.createElement("span", null, EUR.format(subtotal))), promoOn && /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-emerald-400" }, /* @__PURE__ */ React.createElement("span", null, "Remise \u221210 %"), /* @__PURE__ */ React.createElement("span", null, "\u2212", EUR.format(discount))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-slate-300" }, /* @__PURE__ */ React.createElement("span", null, "Frais de service"), /* @__PURE__ */ React.createElement("span", null, "inclus")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between border-t border-white/15 pt-2.5 font-display text-lg font-bold" }, /* @__PURE__ */ React.createElement("span", null, "Total"), /* @__PURE__ */ React.createElement("span", null, EUR.format(total))))))));
};
const UserDash = ({ initTab, bookings = [], setBookings, favs, toggleFav, nav, toast, currentUser, spaces = [] }) => {
  if (!currentUser) {
    return /* @__PURE__ */ React.createElement("main", { className: "mx-auto max-w-2xl px-4 py-16 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-slate-200 bg-white p-8 md:p-12 shadow-card" }, /* @__PURE__ */ React.createElement("span", { className: "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 mb-4" }, /* @__PURE__ */ React.createElement(Icon, { n: "user", size: 26 })), /* @__PURE__ */ React.createElement("h1", { className: "font-display text-2xl font-bold text-ink" }, "Espace Membre Spotwork"), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-sm text-slate-500 max-w-md mx-auto" }, "Connectez-vous pour retrouver vos r\xE9servations en cours, vos espaces favoris et les recommandations personnalis\xE9es de l'IA."), /* @__PURE__ */ React.createElement("div", { className: "mt-6 flex flex-wrap justify-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "login" }), className: "inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition" }, /* @__PURE__ */ React.createElement(Icon, { n: "log-in", size: 15 }), "Se connecter"), /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "explore" }), className: "inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition" }, /* @__PURE__ */ React.createElement(Icon, { n: "search", size: 15 }), "Explorer les espaces"))));
  }
  const user = currentUser;
  const [tab, setTab] = useState(initTab || "resas");
  const [userInvoice, setUserInvoice] = useState(null);
  const [prefs, setPrefs] = useState(() => {
    const p = user.preferences || {};
    return {
      mail: p.mail !== void 0 ? Boolean(p.mail) : true,
      push: p.push !== void 0 ? Boolean(p.push) : false,
      news: p.news !== void 0 ? Boolean(p.news) : true,
      city: p.city || user.city || "Casablanca",
      type: p.type || "open"
    };
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      const res = await SpotworkAPI.updatePreferences(prefs);
      const updatedUser = {
        ...user,
        city: prefs.city,
        preferences: { ...user.preferences || {}, ...prefs }
      };
      try {
        localStorage.setItem("spotwork_user", JSON.stringify(updatedUser));
      } catch {
      }
      if (res && res.status === "success") {
        toast("Pr\xE9f\xE9rences synchronis\xE9es ! Recommandations IA imm\xE9diatement affin\xE9es.", "check-circle");
      } else {
        toast("Pr\xE9f\xE9rences enregistr\xE9es ! Profil IA mis \xE0 jour.", "check");
      }
    } catch {
      toast("Pr\xE9f\xE9rences enregistr\xE9es", "check");
    } finally {
      setSavingPrefs(false);
    }
  };
  const tabs = [["resas", "Mes r\xE9servations", "calendar-days"], ["ia", "Recommandations", "sparkles"], ["favoris", "Favoris", "heart"], ["prefs", "Pr\xE9f\xE9rences", "settings"]];
  const [aiInteractions, setAiInteractions] = useState(() => {
    try {
      const saved = localStorage.getItem(`spotwork_ai_interactions_${user.id}`);
      if (saved) return JSON.parse(saved);
    } catch {
    }
    return { feedback: {}, viewed: [], count: 0 };
  });
  const saveAiInteractions = (updated) => {
    setAiInteractions(updated);
    try {
      localStorage.setItem(`spotwork_ai_interactions_${user.id}`, JSON.stringify(updated));
    } catch {
    }
  };
  const [aiFilter, setAiFilter] = useState("all");
  const [isRefreshingAi, setIsRefreshingAi] = useState(false);
  const clientHabits = useMemo(() => {
    const bookedSpaces = bookings.map((b) => spaces.find((s) => s.id === b.spaceId)).filter(Boolean);
    const favSpaces = [...favs].map((id) => spaces.find((s) => s.id === id)).filter(Boolean);
    const cityCounts = {};
    bookedSpaces.forEach((s) => {
      cityCounts[s.city] = (cityCounts[s.city] || 0) + 3;
    });
    favSpaces.forEach((s) => {
      cityCounts[s.city] = (cityCounts[s.city] || 0) + 1.5;
    });
    if (prefs.city) cityCounts[prefs.city] = (cityCounts[prefs.city] || 0) + 4;
    let dominantCity = prefs.city || user.city || "Casablanca";
    let maxCityScore = 0;
    for (const [c, cnt] of Object.entries(cityCounts)) {
      if (cnt > maxCityScore) {
        maxCityScore = cnt;
        dominantCity = c;
      }
    }
    const typeCounts = {};
    bookedSpaces.forEach((s) => {
      typeCounts[s.type] = (typeCounts[s.type] || 0) + 3;
    });
    favSpaces.forEach((s) => {
      typeCounts[s.type] = (typeCounts[s.type] || 0) + 1.5;
    });
    if (prefs.type) typeCounts[prefs.type] = (typeCounts[prefs.type] || 0) + 4;
    let dominantType = prefs.type || "open";
    let maxTypeScore = 0;
    for (const [t, cnt] of Object.entries(typeCounts)) {
      if (cnt > maxTypeScore) {
        maxTypeScore = cnt;
        dominantType = t;
      }
    }
    const amenityCounts = {};
    [...bookedSpaces, ...favSpaces].forEach((s) => {
      (s.am || []).forEach((a) => {
        amenityCounts[a] = (amenityCounts[a] || 0) + 1;
      });
    });
    const topAmenities = Object.entries(amenityCounts).sort((a, b) => b[1] - a[1]).map(([a]) => a);
    let avgPrice = 45;
    if (bookedSpaces.length > 0) {
      avgPrice = Math.round(bookedSpaces.reduce((acc, s) => acc + s.price, 0) / bookedSpaces.length);
    } else if (favSpaces.length > 0) {
      avgPrice = Math.round(favSpaces.reduce((acc, s) => acc + s.price, 0) / favSpaces.length);
    }
    const interactionBonus = (aiInteractions.count || 0) * 3;
    const historyBonus = bookedSpaces.length * 5;
    const favBonus = favSpaces.length * 3;
    const prefBonus = (prefs.city ? 6 : 0) + (prefs.type ? 6 : 0);
    const refinementLevel = Math.min(99, Math.max(72, 70 + interactionBonus + historyBonus + favBonus + prefBonus));
    return {
      dominantCity,
      dominantType,
      topAmenities,
      avgPrice,
      refinementLevel,
      bookingsCount: bookedSpaces.length,
      favsCount: favSpaces.length,
      totalInteractions: (aiInteractions.count || 0) + bookedSpaces.length + favSpaces.length
    };
  }, [bookings, favs, prefs, spaces, aiInteractions, user]);
  const recommendations = useMemo(() => {
    const { dominantCity, dominantType, topAmenities, avgPrice } = clientHabits;
    const bookedIds = new Set(bookings.map((b) => b.spaceId));
    const feedback = aiInteractions.feedback || {};
    const scored = spaces.map((s) => {
      if (feedback[s.id] === "dislike") return null;
      let score = 52;
      const reasonsList = [];
      const tags = [];
      score += Math.round((s.rating - 4) * 14);
      if (s.city.toLowerCase() === dominantCity.toLowerCase()) {
        score += 24;
        tags.push(`\u{1F4CD} Habitude ${s.city}`);
        reasonsList.push(`situ\xE9 \xE0 ${s.city} (${s.district}) o\xF9 vous avez vos habitudes`);
      } else if (prefs.city && s.city.toLowerCase() === prefs.city.toLowerCase()) {
        score += 20;
        tags.push(`\u{1F3AF} Pr\xE9f\xE9rence ${s.city}`);
        reasonsList.push(`correspond \xE0 votre ville favorite (${s.city})`);
      }
      if (s.type === dominantType) {
        score += 20;
        const typeLabel = TYPES.find((t) => t.id === s.type)?.label || s.type;
        tags.push(`\u{1F3E2} Format ${typeLabel}`);
        reasonsList.push(`adapt\xE9 \xE0 votre habitude de ${typeLabel.toLowerCase()}`);
      } else if (prefs.type && s.type === prefs.type) {
        score += 16;
        tags.push(`\u{1F4BC} Format souhait\xE9`);
      }
      const matchingAmenities = (s.am || []).filter((a) => topAmenities.includes(a));
      if (matchingAmenities.length > 0) {
        score += Math.min(matchingAmenities.length * 3.5, 14);
        const amLabels = matchingAmenities.slice(0, 2).map((a) => AMENITIES.find((x) => x.id === a)?.label || a);
        reasonsList.push(`int\xE8gre ${amLabels.join(" et ")}`);
        tags.push(`\u2615 ${amLabels[0]}`);
      }
      if (Math.abs(s.price - avgPrice) <= 15) {
        score += 10;
        tags.push(`\u{1F4B0} ~${s.price} DH/h`);
      } else if (s.price <= 50) {
        score += 6;
      }
      if (feedback[s.id] === "like") {
        score += 15;
        tags.push(`\u{1F44D} Valid\xE9 par vous`);
      }
      let nature = "discover";
      if (bookedIds.has(s.id)) {
        nature = "habits";
        score += 8;
        tags.push(`\u{1F504} Espace d\xE9j\xE0 r\xE9serv\xE9`);
      } else if (favs.has(s.id)) {
        nature = "favorites";
        score += 12;
        tags.push(`\u2764\uFE0F Dans vos favoris`);
      } else if (s.city.toLowerCase() === dominantCity.toLowerCase() || s.type === dominantType) {
        nature = "habits";
      }
      const finalScore = Math.min(99, Math.max(72, Math.round(score)));
      let reasonText = "";
      if (reasonsList.length >= 2) {
        reasonText = `S\xE9lectionn\xE9 pour vous car ${reasonsList.slice(0, 2).join(", et ")}.`;
      } else if (reasonsList.length === 1) {
        reasonText = `Recommand\xE9 pour votre profil car ${reasonsList[0]}. Not\xE9 ${s.rating}/5.`;
      } else {
        reasonText = `Espace d'excellence \xE0 ${s.city}, pl\xE9biscit\xE9 par les r\xE9sidents tech (${s.rating}/5).`;
      }
      return {
        s,
        score: finalScore,
        reason: reasonText,
        tags: tags.slice(0, 3),
        nature
      };
    }).filter(Boolean);
    let filtered = scored;
    if (aiFilter === "habits") {
      filtered = scored.filter((x) => x.nature === "habits");
    } else if (aiFilter === "favorites") {
      filtered = scored.filter((x) => favs.has(x.s.id) || x.tags.some((t) => t.includes("\u2764\uFE0F")));
    } else if (aiFilter === "discover") {
      filtered = scored.filter((x) => !bookedIds.has(x.s.id) && !favs.has(x.s.id));
    }
    filtered.sort((a, b) => b.score - a.score);
    return (filtered.length >= 3 ? filtered : scored.sort((a, b) => b.score - a.score)).slice(0, 3);
  }, [spaces, favs, bookings, prefs, clientHabits, aiInteractions, aiFilter]);
  const handleLikeRecommendation = (spaceId) => {
    const updated = {
      ...aiInteractions,
      feedback: { ...aiInteractions.feedback || {}, [spaceId]: "like" },
      count: (aiInteractions.count || 0) + 1
    };
    saveAiInteractions(updated);
    SpotworkAPI.submitAIFeedback(spaceId, "like");
    toast("Recommandation valid\xE9e ! Votre profil IA a \xE9t\xE9 enrichi (+3% pr\xE9cision)", "sparkles");
  };
  const handleDislikeRecommendation = (spaceId) => {
    const updated = {
      ...aiInteractions,
      feedback: { ...aiInteractions.feedback || {}, [spaceId]: "dislike" },
      count: (aiInteractions.count || 0) + 1
    };
    saveAiInteractions(updated);
    SpotworkAPI.submitAIFeedback(spaceId, "dislike");
    toast("Espace retir\xE9 : les suggestions s'ajustent imm\xE9diatement selon vos go\xFBts", "trash");
  };
  const handleRefreshAi = () => {
    setIsRefreshingAi(true);
    setTimeout(() => {
      setIsRefreshingAi(false);
      toast("Recommandations recalcul\xE9es avec vos derni\xE8res habitudes et interactions !", "check-circle");
    }, 400);
  };
  const stColor = (st) => st === "Confirm\xE9e" ? "bg-emerald-50 text-emerald-600" : st === "En attente" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500";
  return /* @__PURE__ */ React.createElement("main", { className: "mx-auto max-w-7xl px-4 py-8 md:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Kicker, null, "Espace membre \xB7 PropTech Maroc"), /* @__PURE__ */ React.createElement("h1", { className: "mt-2 font-display text-3xl font-bold tracking-tight" }, "Bonjour ", user.firstName || user.name, " \u{1F44B}"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-slate-500" }, user.email, " \xB7 ", user.city || "Maroc", " \xB7 ", /* @__PURE__ */ React.createElement("span", { className: `inline-flex px-2 py-0.5 rounded-full font-semibold border ${user.badgeCls || "bg-blue-50 text-brand-700 border-brand-200"}` }, user.roleLabel || user.role))), /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "explore" }), className: "inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25" }, /* @__PURE__ */ React.createElement(Icon, { n: "plus", size: 15 }), "Nouvelle r\xE9servation")), /* @__PURE__ */ React.createElement("div", { className: "mt-8 grid gap-8 lg:grid-cols-[230px_1fr]" }, /* @__PURE__ */ React.createElement("nav", { className: "no-scrollbar flex gap-1 overflow-x-auto lg:flex-col" }, tabs.map(([id, l, i]) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: id,
      onClick: () => setTab(id),
      className: `flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === id ? "bg-navy text-white shadow-card" : "text-slate-500 hover:bg-mist hover:text-ink"}`
    },
    /* @__PURE__ */ React.createElement(Icon, { n: i, size: 16 }),
    l
  ))), /* @__PURE__ */ React.createElement("div", null, tab === "resas" && (() => {
    const upcomingBookings = bookings.filter((b) => b.status !== "Termin\xE9e" && b.status !== "completed");
    const pastBookings = bookings.filter((b) => b.status === "Termin\xE9e" || b.status === "completed");
    return /* @__PURE__ */ React.createElement("div", { className: "space-y-8" }, /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h2", { className: "mb-4 font-display text-lg font-bold" }, "\xC0 venir (", upcomingBookings.length, ")"), upcomingBookings.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400" }, "Aucune r\xE9servation \xE0 venir.") : /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 md:grid-cols-2" }, upcomingBookings.map((b) => {
      const s = spaces.find((x) => x.id === b.spaceId || String(x.id) === String(b.spaceId));
      if (!s) return null;
      return /* @__PURE__ */ React.createElement("article", { key: b.id, className: "group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:shadow-lift" }, /* @__PURE__ */ React.createElement("div", { className: "relative h-32 overflow-hidden" }, /* @__PURE__ */ React.createElement("img", { src: U(s.imgs[0], 600), alt: "", className: "h-full w-full object-cover transition duration-500 group-hover:scale-105" }), /* @__PURE__ */ React.createElement("span", { className: `absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${stColor(b.status)}` }, b.status)), /* @__PURE__ */ React.createElement("div", { className: "p-4" }, /* @__PURE__ */ React.createElement("h3", { className: "font-display font-bold" }, s.name), /* @__PURE__ */ React.createElement("p", { className: "mt-1 flex items-center gap-3 text-xs text-slate-500" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "calendar-days", size: 12 }), fmtDate(b.date)), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "clock", size: 12 }), b.meta)), /* @__PURE__ */ React.createElement("div", { className: "mt-3.5 flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "space", params: { id: s.id } }), className: "flex-1 rounded-full bg-brand-50 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-100" }, "Voir l'espace"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setUserInvoice({
          invoiceNumber: b.invoiceRef || `FACT-2026-004${String(b.id).slice(-2) || "01"}`,
          clientName: user.name,
          clientEmail: user.email,
          clientPhone: user.phone || "+212 6 61 23 45 67",
          clientCity: user.city || "Casablanca",
          spaceName: s.name,
          date: b.date,
          timeSlot: b.meta,
          grossAmount: b.totalPrice || s.price * (b.hours || 3),
          paymentMethod: b.paymentMethod || "Carte Bancaire Maroc CMI (3D Secure)",
          paidAt: "Paiement en ligne CMI",
          status: b.status === "Confirm\xE9e" ? "paid" : "pending"
        });
      }, className: "rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "file-text", size: 13 }), "Re\xE7u / Facture"), /* @__PURE__ */ React.createElement("button", { onClick: async () => {
        try {
          await SpotworkAPI.cancelBooking(b.id);
        } catch {
        }
        setBookings(bookings.filter((x) => x.id !== b.id));
        toast("R\xE9servation annul\xE9e et mise \xE0 jour en base de donn\xE9es", "trash");
      }, className: "rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition hover:border-rose-300 hover:text-rose-500" }, "Annuler"))));
    }))), /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h2", { className: "mb-4 font-display text-lg font-bold" }, "Historique (", pastBookings.length, ")"), pastBookings.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400" }, "Aucune r\xE9servation pass\xE9e pour le moment.") : /* @__PURE__ */ React.createElement("div", { className: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card" }, pastBookings.map((b, i) => {
      const s = spaces.find((x) => x.id === b.spaceId || String(x.id) === String(b.spaceId));
      if (!s) return null;
      return /* @__PURE__ */ React.createElement("div", { key: b.id, className: `flex items-center gap-4 px-5 py-4 text-sm ${i > 0 ? "border-t border-slate-100" : ""}` }, /* @__PURE__ */ React.createElement("img", { src: U(s.imgs[0], 120), alt: "", className: "h-11 w-14 rounded-lg object-cover" }), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "truncate font-bold" }, s.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400" }, fmtDate(b.date), " \xB7 ", b.meta)), /* @__PURE__ */ React.createElement("span", { className: "hidden sm:block text-xs font-semibold text-slate-400" }, EUR.format(s.price)), /* @__PURE__ */ React.createElement("span", { className: `rounded-full px-2.5 py-1 text-[11px] font-bold ${stColor(b.status)}` }, b.status), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            setUserInvoice({
              invoiceNumber: b.invoiceRef || `FACT-2026-003${String(b.id).slice(-2) || "01"}`,
              clientName: user.name,
              clientEmail: user.email,
              clientPhone: user.phone || "+212 6 61 23 45 67",
              clientCity: user.city || "Casablanca",
              spaceName: s.name,
              date: b.date,
              timeSlot: b.meta,
              grossAmount: b.totalPrice || s.price * 4,
              paymentMethod: "Carte Bancaire Maroc CMI (3D Secure)",
              paidAt: "Paiement valid\xE9",
              status: "paid"
            });
          },
          className: "hidden sm:inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-brand-600 hover:bg-slate-50 transition"
        },
        /* @__PURE__ */ React.createElement(Icon, { n: "file-text", size: 11 }),
        "Facture"
      ), /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "space", params: { id: s.id } }), className: "text-slate-300 transition hover:text-brand-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "chevron-right", size: 17 })));
    }))));
  })(), tab === "ia" && /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50/80 via-white to-indigo-50/50 p-6 shadow-card" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-start justify-between gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700" }, /* @__PURE__ */ React.createElement(Icon, { n: "sparkles", size: 13, className: "text-brand-600" }), "Moteur de Recommandations Pr\xE9dictif PropTech Maroc"), /* @__PURE__ */ React.createElement("h2", { className: "mt-3 font-display text-xl md:text-2xl font-bold text-ink" }, "Vos suggestions intelligentes sur-mesure"), /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 max-w-2xl text-xs md:text-sm text-slate-600 leading-relaxed" }, "L'intelligence artificielle analyse en continu vos r\xE9servations pass\xE9es, vos favoris et vos crit\xE8res de recherche. Plus vous interagissez, plus les suggestions deviennent pr\xE9cises pour votre activit\xE9.")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleRefreshAi,
      disabled: isRefreshingAi,
      className: "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-brand-300 hover:bg-slate-50 transition disabled:opacity-60"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: isRefreshingAi ? "loader" : "refresh-cw", size: 13, className: isRefreshingAi ? "animate-spin text-brand-600" : "" }),
    isRefreshingAi ? "Recalcul en cours..." : "Actualiser l'IA"
  )), /* @__PURE__ */ React.createElement("div", { className: "mt-5 border-t border-brand-100/80 pt-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-xs mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-slate-700 flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(Icon, { n: "brain", size: 14, className: "text-brand-600" }), "Niveau d'affinement de vos habitudes :"), /* @__PURE__ */ React.createElement("span", { className: "font-mono font-bold text-brand-700 bg-brand-100/70 px-2 py-0.5 rounded-full" }, clientHabits.refinementLevel, " % (Profil tr\xE8s affin\xE9)")), /* @__PURE__ */ React.createElement("div", { className: "h-2 w-full overflow-hidden rounded-full bg-slate-200/80" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "h-full rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 transition-all duration-700",
      style: { width: `${clientHabits.refinementLevel}%` }
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200/80 bg-white/80 p-3 backdrop-blur" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-400" }, "Ville dominante"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 font-display text-sm font-bold text-ink flex items-center gap-1 truncate" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 12, className: "text-brand-600 shrink-0" }), clientHabits.dominantCity), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 mt-0.5" }, "Habitude principale")), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200/80 bg-white/80 p-3 backdrop-blur" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-400" }, "Format privil\xE9gi\xE9"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 font-display text-sm font-bold text-ink flex items-center gap-1 truncate" }, /* @__PURE__ */ React.createElement(Icon, { n: "layout-grid", size: 12, className: "text-indigo-600 shrink-0" }), TYPES.find((t) => t.id === clientHabits.dominantType)?.label || clientHabits.dominantType), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 mt-0.5" }, "Poste de travail")), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200/80 bg-white/80 p-3 backdrop-blur" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-400" }, "Budget habituel"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 font-display text-sm font-bold text-emerald-700 flex items-center gap-1 truncate" }, /* @__PURE__ */ React.createElement(Icon, { n: "wallet", size: 12, className: "text-emerald-600 shrink-0" }), "~", clientHabits.avgPrice, " DH / heure"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 mt-0.5" }, "Moyenne r\xE9servations")), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200/80 bg-white/80 p-3 backdrop-blur" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-wider text-slate-400" }, "Donn\xE9es analys\xE9es"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 font-display text-sm font-bold text-purple-700 flex items-center gap-1 truncate" }, /* @__PURE__ */ React.createElement(Icon, { n: "activity", size: 12, className: "text-purple-600 shrink-0" }), clientHabits.totalInteractions, " interactions"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 mt-0.5" }, clientHabits.bookingsCount, " r\xE9sas \xB7 ", clientHabits.favsCount, " favoris")))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, [
    { id: "all", label: `Toutes les recommandations (${recommendations.length})`, icon: "sparkles" },
    { id: "habits", label: "Selon mes habitudes", icon: "history" },
    { id: "favorites", label: "Inspir\xE9 de mes favoris", icon: "heart" },
    { id: "discover", label: "Nouvelles d\xE9couvertes", icon: "compass" }
  ].map((tabItem) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: tabItem.id,
      onClick: () => setAiFilter(tabItem.id),
      className: `inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${aiFilter === tabItem.id ? "bg-navy text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`
    },
    /* @__PURE__ */ React.createElement(Icon, { n: tabItem.icon, size: 12 }),
    tabItem.label
  ))), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-400" }, "Affinement automatique \xE0 chaque r\xE9servation & clic")), recommendations.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center" }, /* @__PURE__ */ React.createElement("span", { className: "mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 mb-3" }, /* @__PURE__ */ React.createElement(Icon, { n: "sparkles", size: 22 })), /* @__PURE__ */ React.createElement("p", { className: "font-display font-bold text-ink" }, "Aucun espace dans cette cat\xE9gorie"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 mt-1 max-w-sm mx-auto" }, "R\xE9initialisez les filtres pour visualiser l'ensemble de votre s\xE9lection personnalis\xE9e."), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setAiFilter("all"),
      className: "mt-4 inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-ink transition"
    },
    "Voir toutes les suggestions"
  )) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-6 md:grid-cols-3" }, recommendations.map(({ s, score, reason, tags }, i) => /* @__PURE__ */ React.createElement(
    "article",
    {
      key: s.id,
      className: "group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift",
      "data-reveal": true,
      style: { transitionDelay: `${i * 80}ms` }
    },
    /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "relative h-44 overflow-hidden" }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: U(s.imgs[0], 600),
        alt: s.name,
        className: "h-full w-full object-cover transition duration-500 group-hover:scale-105"
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" }), /* @__PURE__ */ React.createElement("div", { className: "absolute left-3 top-3 flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1 rounded-full bg-ink/85 px-2.5 py-1 text-xs font-bold text-white shadow-md backdrop-blur" }, /* @__PURE__ */ React.createElement(Icon, { n: "sparkles", size: 11, className: "text-amber-400" }), "Match ", score, "%")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => toggleFav(s.id),
        className: "absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-600 backdrop-blur transition hover:scale-110 shadow-sm",
        title: "Ajouter aux favoris"
      },
      /* @__PURE__ */ React.createElement(
        Icon,
        {
          n: "heart",
          size: 15,
          fill: favs.has(s.id) ? "#E11D48" : "none",
          className: favs.has(s.id) ? "text-rose-500" : "text-slate-600"
        }
      )
    ), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-3 left-3 right-3 text-white" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] font-semibold text-slate-200 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 11 }), s.city, " \xB7 ", s.district))), /* @__PURE__ */ React.createElement("div", { className: "p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2 mb-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-display text-base font-bold text-ink leading-tight" }, s.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-brand-700 mt-0.5" }, EUR.format(s.price), "/", s.unit)), /* @__PURE__ */ React.createElement(Ring, { v: score })), /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex flex-wrap gap-1.5" }, tags.map((tag, idx) => /* @__PURE__ */ React.createElement(
      "span",
      {
        key: idx,
        className: "inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"
      },
      tag
    ))), /* @__PURE__ */ React.createElement("div", { className: "mt-3.5 rounded-2xl bg-brand-50/70 p-3 border border-brand-100/80" }, /* @__PURE__ */ React.createElement("p", { className: "flex items-start gap-2 text-xs leading-relaxed text-slate-700" }, /* @__PURE__ */ React.createElement(Icon, { n: "sparkles", size: 13, className: "mt-0.5 shrink-0 text-brand-600" }), /* @__PURE__ */ React.createElement("span", null, reason))))),
    /* @__PURE__ */ React.createElement("div", { className: "border-t border-slate-100 p-4 bg-slate-50/50 space-y-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-[11px] text-slate-400" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-slate-500" }, "Pertinence IA :"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => handleLikeRecommendation(s.id),
        className: "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 transition font-bold",
        title: "Indiquer que cette suggestion vous correspond"
      },
      /* @__PURE__ */ React.createElement(Icon, { n: "thumbs-up", size: 11, className: "text-emerald-600" }),
      "Pertinent"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => handleDislikeRecommendation(s.id),
        className: "inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition",
        title: "Retirer cet espace des suggestions"
      },
      /* @__PURE__ */ React.createElement(Icon, { n: "thumbs-down", size: 11 })
    ))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          SpotworkAPI.clickRecommendation(s.id);
          nav({ name: "space", params: { id: s.id } });
        },
        className: "w-full inline-flex items-center justify-center gap-2 rounded-xl bg-navy py-2.5 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700"
      },
      /* @__PURE__ */ React.createElement(Icon, { n: "calendar-check", size: 13 }),
      "D\xE9couvrir & R\xE9server"
    ))
  )))), tab === "favoris" && (favs.size === 0 ? /* @__PURE__ */ React.createElement("p", { className: "rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-400" }, "Aucun favori pour le moment \u2014 cliquez sur le \u2665 d'un espace.") : /* @__PURE__ */ React.createElement("div", { className: "grid gap-5 sm:grid-cols-2 xl:grid-cols-3" }, spaces.filter((s) => favs.has(s.id)).map((s) => /* @__PURE__ */ React.createElement(SpaceCard, { key: s.id, s, nav, favs, toggleFav })))), tab === "prefs" && /* @__PURE__ */ React.createElement("div", { className: "max-w-xl space-y-6" }, /* @__PURE__ */ React.createElement("section", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display font-bold" }, "Notifications"), [["mail", "R\xE9capitulatifs par e-mail"], ["push", "Alertes de disponibilit\xE9 en temps r\xE9el"], ["news", "Newsletter mensuelle & bons plans"]].map(([k, l]) => /* @__PURE__ */ React.createElement("div", { key: k, className: "mt-4 flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-600" }, l), /* @__PURE__ */ React.createElement(Toggle, { on: prefs[k], onClick: () => setPrefs({ ...prefs, [k]: !prefs[k] }) })))), /* @__PURE__ */ React.createElement("section", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display font-bold" }, "Pr\xE9f\xE9rences de recherche"), /* @__PURE__ */ React.createElement("div", { className: "mt-4 grid gap-4 sm:grid-cols-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Ville par d\xE9faut" }, /* @__PURE__ */ React.createElement("select", { value: prefs.city, onChange: (e) => setPrefs({ ...prefs, city: e.target.value }), className: inp }, CITIES.map((c) => /* @__PURE__ */ React.createElement("option", { key: c }, c)))), /* @__PURE__ */ React.createElement(Field, { label: "Type favori" }, /* @__PURE__ */ React.createElement("select", { value: prefs.type, onChange: (e) => setPrefs({ ...prefs, type: e.target.value }), className: inp }, TYPES.map((t) => /* @__PURE__ */ React.createElement("option", { key: t.id, value: t.id }, t.label))))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSavePreferences,
      disabled: savingPrefs,
      className: "mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 transition disabled:opacity-50"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: savingPrefs ? "loader" : "check", size: 15, className: savingPrefs ? "animate-spin" : "" }),
    savingPrefs ? "Synchronisation..." : "Enregistrer dans mon profil"
  ))))), /* @__PURE__ */ React.createElement(
    InvoiceModal,
    {
      invoice: userInvoice,
      isOpen: Boolean(userInvoice),
      onClose: () => setUserInvoice(null)
    }
  ));
};
const CreateSpaceModal = ({ isOpen, onClose, onCreateSpace }) => {
  const [name, setName] = useState("");
  const [city, setCity] = useState("Casablanca");
  const [district, setDistrict] = useState("Maarif");
  const [type, setType] = useState("open");
  const [price, setPrice] = useState("45");
  const [cap, setCap] = useState("12");
  const [surface, setSurface] = useState("65 m\xB2");
  const [selectedAm, setSelectedAm] = useState(["wifi", "coffee", "screen"]);
  const [imgKey, setImgKey] = useState("a");
  const [customImg, setCustomImg] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState("");
  if (!isOpen) return null;
  const toggleAmenity = (id) => {
    setSelectedAm((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Le nom de l'espace est requis");
      return;
    }
    const numPrice = Number(price);
    if (!numPrice || numPrice <= 0) {
      setErr("Veuillez saisir un tarif horaire valide en DH");
      return;
    }
    const photo = customImg.trim() ? customImg.trim() : IMG[imgKey] || IMG.a;
    onCreateSpace({
      name: name.trim(),
      city,
      district: district.trim() || `${city} Centre`,
      type,
      price: numPrice,
      unit: "heure",
      capacity: Number(cap) || 10,
      surface: surface.trim() || "50 m\xB2",
      imgs: [photo, IMG.b, IMG.c],
      am: selectedAm,
      desc: desc.trim() || `Espace de coworking moderne et tout \xE9quip\xE9 situ\xE9 \xE0 ${city}, ${district}. Connexion fibre optique et commodit\xE9s compl\xE8tes.`
    });
    onClose();
  };
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm" }, /* @__PURE__ */ React.createElement("div", { className: "relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-slate-100 pb-4 mb-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "plus-circle", size: 20 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "font-display text-xl font-bold text-ink" }, "Cr\xE9er un nouvel espace"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, "Ajoutez un espace de coworking au catalogue Spotwork Maroc"))), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition" }, /* @__PURE__ */ React.createElement(Icon, { n: "x", size: 18 }))), err && /* @__PURE__ */ React.createElement("div", { className: "mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200" }, /* @__PURE__ */ React.createElement(Icon, { n: "alert-circle", size: 15 }), err), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 sm:grid-cols-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Nom de l'espace *" }, /* @__PURE__ */ React.createElement("input", { value: name, onChange: (e) => {
    setName(e.target.value);
    setErr("");
  }, placeholder: "Ex: Loft Tech Gu\xE9liz", className: inp, required: true })), /* @__PURE__ */ React.createElement(Field, { label: "Ville au Maroc *" }, /* @__PURE__ */ React.createElement("select", { value: city, onChange: (e) => setCity(e.target.value), className: inp }, CITIES.map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, c))))), /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 sm:grid-cols-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Quartier / Adresse" }, /* @__PURE__ */ React.createElement("input", { value: district, onChange: (e) => setDistrict(e.target.value), placeholder: "Ex: Maarif \xB7 Bd Zerktouni", className: inp })), /* @__PURE__ */ React.createElement(Field, { label: "Type d'espace" }, /* @__PURE__ */ React.createElement("select", { value: type, onChange: (e) => setType(e.target.value), className: inp }, TYPES.map((t) => /* @__PURE__ */ React.createElement("option", { key: t.id, value: t.id }, t.label))))), /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 sm:grid-cols-3" }, /* @__PURE__ */ React.createElement(Field, { label: "Tarif par heure (DH) *" }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("input", { type: "number", min: "10", step: "5", value: price, onChange: (e) => setPrice(e.target.value), className: `${inp} pr-12 font-bold`, required: true }), /* @__PURE__ */ React.createElement("span", { className: "absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400" }, "DH/h"))), /* @__PURE__ */ React.createElement(Field, { label: "Capacit\xE9 (personnes)" }, /* @__PURE__ */ React.createElement("input", { type: "number", min: "1", value: cap, onChange: (e) => setCap(e.target.value), className: inp })), /* @__PURE__ */ React.createElement(Field, { label: "Surface estim\xE9e" }, /* @__PURE__ */ React.createElement("input", { value: surface, onChange: (e) => setSurface(e.target.value), placeholder: "Ex: 85 m\xB2", className: inp }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-semibold text-slate-600 mb-1.5" }, "Photo de l'espace"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-4 gap-2 mb-2" }, ["a", "b", "c", "d"].map((k) => /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      key: k,
      onClick: () => {
        setImgKey(k);
        setCustomImg("");
      },
      className: `relative h-16 rounded-xl overflow-hidden border-2 transition ${imgKey === k && !customImg ? "border-brand-600 ring-2 ring-brand-600/30" : "border-slate-200 opacity-70 hover:opacity-100"}`
    },
    /* @__PURE__ */ React.createElement("img", { src: U(IMG[k], 200), alt: "", className: "h-full w-full object-cover" }),
    imgKey === k && !customImg && /* @__PURE__ */ React.createElement("span", { className: "absolute top-1 right-1 grid h-4 w-4 place-items-center rounded-full bg-brand-600 text-white text-[9px] font-bold" }, "\u2713")
  ))), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: customImg,
      onChange: (e) => setCustomImg(e.target.value),
      placeholder: "Ou collez une URL d'image personnalis\xE9e (https://...)",
      className: "w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-brand-500"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-semibold text-slate-600 mb-2" }, "\xC9quipements & Services"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2" }, AMENITIES.map((am) => {
    const checked = selectedAm.includes(am.id);
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        key: am.id,
        onClick: () => toggleAmenity(am.id),
        className: `flex items-center gap-2 rounded-xl border p-2 text-xs font-medium transition text-left ${checked ? "border-brand-500 bg-brand-50/50 text-brand-700 font-semibold" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`
      },
      /* @__PURE__ */ React.createElement("span", { className: `grid h-5 w-5 shrink-0 place-items-center rounded-md ${checked ? "bg-brand-600 text-white" : "border border-slate-300"}` }, checked && /* @__PURE__ */ React.createElement(Icon, { n: "check", size: 11 })),
      /* @__PURE__ */ React.createElement("span", { className: "truncate" }, am.label)
    );
  }))), /* @__PURE__ */ React.createElement(Field, { label: "Description d\xE9taill\xE9e" }, /* @__PURE__ */ React.createElement(
    "textarea",
    {
      rows: 3,
      value: desc,
      onChange: (e) => setDesc(e.target.value),
      placeholder: "D\xE9crivez l'espace, l'ambiance, la connexion fibre, les horaires et les services offerts...",
      className: inp
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: onClose,
      className: "rounded-full border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
    },
    "Annuler"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "submit",
      className: "inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: "check", size: 14 }),
    "Publier l'espace"
  )))));
};
const EditSpacePriceModal = ({ space, isOpen, onClose, onUpdateSpace }) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cap, setCap] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    if (space) {
      setName(space.name || "");
      setPrice(String(space.price || 45));
      setCap(String(space.cap || 10));
      setDesc(space.desc || "");
      setErr("");
    }
  }, [space]);
  if (!isOpen || !space) return null;
  const handleSubmit = (e) => {
    e.preventDefault();
    const numPrice = Number(price);
    if (!numPrice || numPrice <= 0) {
      setErr("Veuillez saisir un tarif valide en DH");
      return;
    }
    onUpdateSpace(space.id, {
      name: name.trim() || space.name,
      price: numPrice,
      capacity: Number(cap) || space.cap,
      desc: desc.trim() || space.desc
    });
    onClose();
  };
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm" }, /* @__PURE__ */ React.createElement("div", { className: "relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-slate-100 pb-4 mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "pencil", size: 18 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "font-display text-lg font-bold text-ink" }, "Modifier le tarif & l'espace"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, space.city, " \xB7 ", space.district))), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition" }, /* @__PURE__ */ React.createElement(Icon, { n: "x", size: 18 }))), err && /* @__PURE__ */ React.createElement("div", { className: "mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 border border-rose-200" }, /* @__PURE__ */ React.createElement(Icon, { n: "alert-circle", size: 14 }), err), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 rounded-2xl bg-mist p-3" }, /* @__PURE__ */ React.createElement("img", { src: U(space.imgs[0], 120), alt: "", className: "h-12 w-16 rounded-lg object-cover" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-sm text-ink" }, space.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400" }, "Tarif actuel : ", /* @__PURE__ */ React.createElement("b", { className: "text-brand-600" }, EUR.format(space.price)), "/", space.unit))), /* @__PURE__ */ React.createElement(Field, { label: "Nom de l'espace" }, /* @__PURE__ */ React.createElement("input", { value: name, onChange: (e) => setName(e.target.value), className: inp })), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement(Field, { label: "Nouveau tarif horaire (DH) *" }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      min: "10",
      step: "5",
      value: price,
      onChange: (e) => setPrice(e.target.value),
      className: `${inp} pr-12 font-bold text-brand-700 text-base`,
      required: true
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400" }, "DH/h"))), /* @__PURE__ */ React.createElement(Field, { label: "Capacit\xE9 d'accueil" }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      min: "1",
      value: cap,
      onChange: (e) => setCap(e.target.value),
      className: inp
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400" }, "pers.")))), /* @__PURE__ */ React.createElement(Field, { label: "Description" }, /* @__PURE__ */ React.createElement(
    "textarea",
    {
      rows: 3,
      value: desc,
      onChange: (e) => setDesc(e.target.value),
      className: inp
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: onClose,
      className: "rounded-full border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
    },
    "Annuler"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "submit",
      className: "inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: "check", size: 14 }),
    "Enregistrer le nouveau tarif"
  )))));
};
const AdminDash = ({
  nav,
  toast,
  currentUser,
  onSelectUser,
  spaces = [],
  onUpdateSpace,
  onCreateSpace,
  onDeleteSpace,
  bookings = [],
  onUpdateBookingStatus
}) => {
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState("30j");
  const [cityFilter, setCityFilter] = useState("");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [paymentsStatus, setPaymentsStatus] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [txns, setTxns] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  useEffect(() => {
    SpotworkAPI.getPayments().then((res) => {
      if (res) {
        const list = res.payments || res.transactions || [];
        if (list.length > 0) {
          setTxns(list.map((p) => ({
            id: p.id,
            bookingId: p.bookingId,
            clientName: p.clientName || "Client PropTech",
            clientEmail: p.clientEmail,
            clientPhone: p.clientPhone || "+212 6 61 23 45 67",
            clientCity: p.city || "Casablanca",
            spaceId: p.spaceId || 1,
            spaceName: p.spaceName,
            city: p.city,
            date: p.date ? p.date.slice(0, 10) : todayISO(),
            timeSlot: p.timeSlot || "Journ\xE9e",
            paidAt: p.date ? new Date(p.date).toLocaleDateString("fr-FR") : "Aujourd'hui",
            grossAmount: p.grossAmount,
            feeAmount: p.platformFee || Math.round(p.grossAmount * 0.08 * 100) / 100,
            netAmount: p.netAmount || Math.round(p.grossAmount * 0.92 * 100) / 100,
            paymentMethod: p.paymentMethod || "Carte Bancaire Maroc CMI",
            cardLast4: "4242",
            status: p.status || "paid",
            invoiceNumber: p.invoiceRef || `FACT-2026-${String(p.id).slice(-4)}`
          })));
        }
      }
    });
  }, []);
  if (!currentUser || currentUser.role !== "manager" && currentUser.role !== "admin") {
    return /* @__PURE__ */ React.createElement(AccessDenied, { nav, currentUser, onSelectUser });
  }
  const user = currentUser;
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === "pending") return b.status === "pending";
    if (bookingFilter === "confirmed") return b.status === "confirmed";
    if (bookingFilter === "cancelled") return b.status === "cancelled";
    return true;
  });
  const filteredSpaces = spaces.filter((s) => !cityFilter || s.city === cityFilter);
  const totalRevenue = txns.reduce((sum, t) => sum + (Number(t.grossAmount) || 0), 0);
  const avgOccupancy = useMemo(() => {
    if (spaces.length === 0) return 75;
    const totalCap = spaces.reduce((s, sp) => s + (sp.cap || 10), 0);
    const bookedSeats = bookings.filter((b) => b.status === "confirmed").reduce((s, b) => s + (b.seats || 1), 0);
    return Math.min(100, Math.max(25, Math.round(bookedSeats / Math.max(1, totalCap) * 100)));
  }, [spaces, bookings]);
  const monthlyRevenue = useMemo(() => {
    const arr = Array(12).fill(0);
    txns.forEach((t) => {
      if (t.date) {
        const m = new Date(t.date).getMonth();
        if (!isNaN(m) && m >= 0 && m < 12) {
          arr[m] += t.grossAmount || 0;
        }
      }
    });
    const hasData = arr.some((v) => v > 0);
    return hasData ? arr.map((v) => Math.round(v)) : [12, 14, 18, 22, 28, 32, 35, 41, 48, 52, 60, 65];
  }, [txns]);
  const getSpaceOccupancy = (space) => {
    const spaceBookings = bookings.filter((b) => b.spaceId === space.id || String(b.spaceId) === String(space.id));
    if (spaceBookings.length === 0) return 0;
    const bookedSeats = spaceBookings.reduce((sum, b) => sum + (b.seats || 1), 0);
    return Math.min(100, Math.round(bookedSeats / (space.cap || 10) * 100));
  };
  const kpis = [
    { l: "Revenus cumul\xE9s", v: `${totalRevenue.toLocaleString("fr-FR")} DH`, d: "+12,4 %", up: true, i: "trending-up", spark: [8, 10, 9, 13, 12, 15, 17, 16, 19] },
    { l: "Taux d'occupation", v: `${avgOccupancy} %`, d: "+3,1 pts", up: true, i: "activity", spark: [60, 64, 61, 70, 72, 74, avgOccupancy] },
    { l: "Demandes en attente", v: String(pendingBookings.length), d: pendingBookings.length > 0 ? "\xC0 traiter" : "\xC0 jour", up: pendingBookings.length === 0, i: "clock", spark: [2, 4, 3, 5, 6, 4, pendingBookings.length] },
    { l: "Total espaces actifs", v: String(spaces.length), d: "6 villes au Maroc", up: true, i: "layout-grid", spark: [6, 7, 8, 9, 9, 10, spaces.length] }
  ];
  const donutItems = [
    { label: "Open space", v: 38, c: "#1F56D6" },
    { label: "Bureaux priv\xE9s", v: 27, c: "#0D2C5A" },
    { label: "Salles de r\xE9union", v: 21, c: "#5B90F7" },
    { label: "Studios & cabines", v: 14, c: "#BCD2FF" }
  ];
  return /* @__PURE__ */ React.createElement("main", { className: "bg-mist min-h-screen pb-16" }, /* @__PURE__ */ React.createElement("div", { className: "bg-navy" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-7xl px-4 py-8 md:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Kicker, null, /* @__PURE__ */ React.createElement("span", { className: "text-brand-300" }, "Tableau de bord ", user.role === "admin" ? "Administrateur" : "Gestionnaire")), /* @__PURE__ */ React.createElement("h1", { className: "mt-2 font-display text-3xl font-bold tracking-tight text-white" }, "Bonjour ", user.firstName || user.name, " \u{1F44B}"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm text-slate-400" }, "G\xE9rez vos ", spaces.length, " espaces au Maroc, ajustez les prix en Dirhams et traitez les demandes de r\xE9servation.")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2.5" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setIsCreateOpen(true),
      className: "inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: "plus", size: 15 }),
    "Cr\xE9er un espace"
  ), /* @__PURE__ */ React.createElement("button", { onClick: () => toast("Rapport financier export\xE9 en format CSV", "download"), className: "flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20" }, /* @__PURE__ */ React.createElement(Icon, { n: "download", size: 14 }), "Exporter"))), /* @__PURE__ */ React.createElement("div", { className: "mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4" }, [
    { id: "overview", label: "Vue d'ensemble", icon: "bar-chart-3" },
    { id: "spaces", label: `Espaces & Tarifs (${spaces.length})`, icon: "building" },
    { id: "bookings", label: `Demandes de r\xE9servation`, icon: "calendar-days", badge: pendingBookings.length },
    { id: "payments", label: `Paiements & Revenus`, icon: "credit-card" },
    { id: "users", label: `Membres & R\xF4les (${PRESET_ACCOUNTS.length})`, icon: "users" }
  ].map((t) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: t.id,
      onClick: () => setTab(t.id),
      className: `flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${tab === t.id ? "bg-white text-navy shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"}`
    },
    /* @__PURE__ */ React.createElement(Icon, { n: t.icon, size: 15 }),
    /* @__PURE__ */ React.createElement("span", null, t.label),
    t.badge > 0 && /* @__PURE__ */ React.createElement("span", { className: `px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${tab === t.id ? "bg-amber-500 text-white" : "bg-amber-400 text-navy"}` }, t.badge)
  ))))), /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-7xl px-4 py-8 md:px-6" }, tab === "overview" && /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-4" }, kpis.map((k, i) => /* @__PURE__ */ React.createElement("div", { key: k.l, className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400" }, k.l), /* @__PURE__ */ React.createElement("span", { className: "grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600" }, /* @__PURE__ */ React.createElement(Icon, { n: k.i, size: 15 }))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex items-end justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-display text-2xl font-bold" }, k.v), /* @__PURE__ */ React.createElement("p", { className: `mt-1 flex items-center gap-1 text-xs font-bold ${k.up ? "text-emerald-600" : "text-rose-500"}` }, /* @__PURE__ */ React.createElement(Icon, { n: k.up ? "trending-up" : "trending-down", size: 13 }), k.d)), /* @__PURE__ */ React.createElement(Spark, { data: k.spark, color: k.up ? "#1F56D6" : "#F43F5E" }))))), /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 lg:grid-cols-3" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card lg:col-span-2" }, /* @__PURE__ */ React.createElement("div", { className: "mb-2 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display font-bold" }, "Revenus 2026 ", /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium text-slate-400" }, "(k DH)")), /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600" }, "+24 % YoY")), /* @__PURE__ */ React.createElement(AreaChart, { data: monthlyRevenue, labels: MONTHS })), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card" }, /* @__PURE__ */ React.createElement("h2", { className: "mb-4 font-display font-bold" }, "R\xE9partition par type"), /* @__PURE__ */ React.createElement(Donut, { items: donutItems, center: ["342", "r\xE9servations"] }), /* @__PURE__ */ React.createElement("div", { className: "mt-5 rounded-xl bg-mist p-3.5 text-xs text-slate-500" }, /* @__PURE__ */ React.createElement("b", { className: "text-ink" }, "Recommandation IA :"), " La demande \xE0 Casablanca (Maarif) et Rabat (Agdal) est en hausse de 18% le jeudi. Envisagez une majoration dynamique."))), /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 lg:grid-cols-3" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card lg:col-span-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display font-bold" }, "Demandes en attente (", pendingBookings.length, ")"), /* @__PURE__ */ React.createElement("button", { onClick: () => setTab("bookings"), className: "text-xs font-bold text-brand-600 hover:text-brand-700" }, "Voir tout (", bookings.length, ") \u2192")), pendingBookings.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400" }, "Toutes les demandes ont \xE9t\xE9 trait\xE9es ! Aucune r\xE9servation en attente.") : /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, pendingBookings.slice(0, 3).map((b) => /* @__PURE__ */ React.createElement("div", { key: b.id, className: "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 font-bold text-amber-800 text-xs" }, b.clientInitials || "CL"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-sm text-ink" }, b.clientName, " \xB7 ", /* @__PURE__ */ React.createElement("span", { className: "font-normal text-slate-500" }, b.spaceName, " (", b.city, ")")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400" }, b.date, " \xB7 ", b.timeSlot, " \xB7 ", /* @__PURE__ */ React.createElement("b", { className: "text-ink" }, b.totalPrice, " DH")))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => onUpdateBookingStatus(b.id, "confirmed"),
      className: "inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: "check", size: 13 }),
    "Accepter"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => onUpdateBookingStatus(b.id, "cancelled"),
      className: "inline-flex items-center gap-1 rounded-full border border-rose-300 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: "x", size: 13 }),
    "Refuser"
  )))))), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card" }, /* @__PURE__ */ React.createElement("h2", { className: "mb-4 font-display font-bold" }, "Raccourcis Gestionnaire"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2.5" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setIsCreateOpen(true),
      className: "flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700 hover:border-brand-500 hover:bg-brand-50/30 transition"
    },
    /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Icon, { n: "plus-circle", size: 16, className: "text-emerald-600" }), "Cr\xE9er un nouvel espace"),
    /* @__PURE__ */ React.createElement(Icon, { n: "chevron-right", size: 14, className: "text-slate-400" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setTab("spaces"),
      className: "flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700 hover:border-brand-500 hover:bg-brand-50/30 transition"
    },
    /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Icon, { n: "dollar-sign", size: 16, className: "text-brand-600" }), "Modifier les prix & capacit\xE9s"),
    /* @__PURE__ */ React.createElement(Icon, { n: "chevron-right", size: 14, className: "text-slate-400" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setTab("bookings"),
      className: "flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700 hover:border-brand-500 hover:bg-brand-50/30 transition"
    },
    /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Icon, { n: "inbox", size: 16, className: "text-amber-600" }), "Consulter toutes les demandes (", bookings.length, ")"),
    /* @__PURE__ */ React.createElement(Icon, { n: "chevron-right", size: 14, className: "text-slate-400" })
  ))))), tab === "spaces" && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1" }, "Filtrer par ville :"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setCityFilter(""),
      className: `rounded-full px-3 py-1.5 text-xs font-bold transition ${!cityFilter ? "bg-navy text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`
    },
    "Toutes (",
    spaces.length,
    ")"
  ), CITIES.map((c) => {
    const count = spaces.filter((s) => s.city === c).length;
    if (count === 0) return null;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: c,
        onClick: () => setCityFilter(c),
        className: `rounded-full px-3 py-1.5 text-xs font-bold transition ${cityFilter === c ? "bg-navy text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`
      },
      c,
      " (",
      count,
      ")"
    );
  })), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setIsCreateOpen(true),
      className: "inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 transition"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: "plus", size: 15 }),
    "Cr\xE9er un espace"
  )), /* @__PURE__ */ React.createElement("div", { className: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full min-w-[700px] text-sm" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "border-b border-slate-100 bg-mist/60 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400" }, /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3.5" }, "Espace & Localisation"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-3.5" }, "Type & Capacit\xE9"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-3.5" }, "Tarif horaire"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-3.5" }, "Taux d'occupation"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-3.5" }, "Statut"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3.5 text-right" }, "Actions"))), /* @__PURE__ */ React.createElement("tbody", null, filteredSpaces.map((s) => {
    const occVal = getSpaceOccupancy(s);
    const st = occVal > 90 ? ["Complet", "bg-rose-50 text-rose-500 border-rose-200"] : occVal < 50 ? ["\xC0 promouvoir", "bg-amber-50 text-amber-600 border-amber-200"] : ["Actif", "bg-emerald-50 text-emerald-600 border-emerald-200"];
    return /* @__PURE__ */ React.createElement("tr", { key: s.id, className: "border-t border-slate-100 transition hover:bg-mist/40" }, /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("img", { src: U(s.imgs[0], 100), alt: "", className: "h-10 w-14 rounded-xl object-cover shadow-sm" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-ink" }, s.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 11 }), s.city, " \xB7 ", s.district)))), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-4" }, /* @__PURE__ */ React.createElement("span", { className: "block text-xs font-semibold text-slate-700 capitalize" }, TYPES.find((t) => t.id === s.type)?.label || s.type), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-400" }, s.cap, " pers. \xB7 ", s.surface)), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-4" }, /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 border border-brand-200" }, EUR.format(s.price), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-slate-400" }, "/", s.unit || "h"))), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: `h-full rounded-full ${occVal > 85 ? "bg-brand-600" : "bg-brand-400"}`, style: { width: `${occVal}%` } })), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold" }, occVal, "%"))), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-4" }, /* @__PURE__ */ React.createElement("span", { className: `rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${st[1]}` }, st[0])), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-4 text-right" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-end gap-1.5" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setEditingSpace(s),
        title: "Modifier le prix et les caract\xE9ristiques",
        className: "inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 transition"
      },
      /* @__PURE__ */ React.createElement(Icon, { n: "pencil", size: 13 }),
      /* @__PURE__ */ React.createElement("span", null, "Modifier prix")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => nav({ name: "space", params: { id: s.id } }),
        title: "Voir la fiche publique",
        className: "grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-brand-600 transition"
      },
      /* @__PURE__ */ React.createElement(Icon, { n: "eye", size: 14 })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          if (confirm(`Confirmez-vous la suppression de l'espace \xAB ${s.name} \xBB ?`)) {
            onDeleteSpace(s.id);
          }
        },
        title: "Supprimer cet espace",
        className: "grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition"
      },
      /* @__PURE__ */ React.createElement(Icon, { n: "trash-2", size: 14 })
    ))));
  })))))), tab === "bookings" && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, [
    { id: "all", label: "Toutes les demandes", count: bookings.length },
    { id: "pending", label: "En attente", count: pendingBookings.length, cls: "text-amber-700" },
    { id: "confirmed", label: "Confirm\xE9es", count: confirmedBookings.length, cls: "text-emerald-700" },
    { id: "cancelled", label: "Annul\xE9es / Refus\xE9es", count: bookings.filter((b) => b.status === "cancelled").length, cls: "text-rose-700" }
  ].map((f) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: f.id,
      onClick: () => setBookingFilter(f.id),
      className: `flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${bookingFilter === f.id ? "bg-navy text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`
    },
    /* @__PURE__ */ React.createElement("span", null, f.label),
    /* @__PURE__ */ React.createElement("span", { className: `rounded-full px-1.5 py-0.2 text-[10px] ${bookingFilter === f.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}` }, f.count)
  ))), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-400" }, filteredBookings.length, " demande", filteredBookings.length > 1 ? "s" : "", " affich\xE9e", filteredBookings.length > 1 ? "s" : "")), filteredBookings.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center" }, /* @__PURE__ */ React.createElement("span", { className: "mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400 mb-3" }, /* @__PURE__ */ React.createElement(Icon, { n: "inbox", size: 24 })), /* @__PURE__ */ React.createElement("p", { className: "font-display font-bold text-ink" }, "Aucune demande trouv\xE9e"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400 mt-1" }, "Aucune r\xE9servation ne correspond au filtre s\xE9lectionn\xE9.")) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-3" }, filteredBookings.map((b) => {
    const isPending = b.status === "pending";
    const isConfirmed = b.status === "confirmed";
    const isCancelled = b.status === "cancelled";
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: b.id,
        className: `relative flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-card transition-all hover:shadow-lift ${isPending ? "border-amber-300 ring-1 ring-amber-300/40 bg-gradient-to-r from-amber-50/30 to-white" : "border-slate-200"}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3.5 min-w-[240px]" }, /* @__PURE__ */ React.createElement("span", { className: `grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-bold text-white text-xs shadow-sm ${isPending ? "bg-amber-500" : isConfirmed ? "bg-emerald-600" : "bg-slate-400"}` }, b.clientInitials || "CL"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-ink text-sm" }, b.clientName), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-400" }, b.createdAt)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 font-mono mt-0.5" }, b.clientEmail), b.clientPhone && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400 flex items-center gap-1 mt-0.5" }, /* @__PURE__ */ React.createElement(Icon, { n: "phone", size: 11 }), b.clientPhone))),
      /* @__PURE__ */ React.createElement("div", { className: "border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4 min-w-[220px]" }, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-sm text-ink" }, b.spaceName), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 flex items-center gap-1 mt-0.5" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 11 }), b.city), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600 mt-1 flex items-center gap-1.5 font-medium" }, /* @__PURE__ */ React.createElement(Icon, { n: "calendar", size: 12, className: "text-brand-600" }), b.date, " \xB7 ", b.timeSlot)),
      /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0" }, /* @__PURE__ */ React.createElement("div", { className: "text-left md:text-right" }, /* @__PURE__ */ React.createElement("p", { className: "font-display text-base font-bold text-ink" }, EUR.format(b.totalPrice)), /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isPending ? "bg-amber-100 text-amber-800" : isConfirmed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}` }, /* @__PURE__ */ React.createElement(Icon, { n: isPending ? "clock" : isConfirmed ? "check" : "x", size: 11 }), isPending ? "En attente" : isConfirmed ? "Confirm\xE9e" : "Annul\xE9e")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, isPending && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => onUpdateBookingStatus(b.id, "confirmed"),
          className: "inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700 transition"
        },
        /* @__PURE__ */ React.createElement(Icon, { n: "check", size: 14 }),
        "Accepter"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => onUpdateBookingStatus(b.id, "cancelled"),
          className: "inline-flex items-center gap-1 rounded-full border border-rose-300 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
        },
        /* @__PURE__ */ React.createElement(Icon, { n: "x", size: 14 }),
        "Refuser"
      )), isConfirmed && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            if (confirm("Voulez-vous vraiment annuler cette r\xE9servation confirm\xE9e ?")) {
              onUpdateBookingStatus(b.id, "cancelled");
            }
          },
          className: "inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-rose-300 hover:text-rose-600 transition"
        },
        /* @__PURE__ */ React.createElement(Icon, { n: "x-circle", size: 13 }),
        "Annuler"
      ), isCancelled && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => onUpdateBookingStatus(b.id, "confirmed"),
          className: "inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-emerald-300 hover:text-emerald-700 transition"
        },
        /* @__PURE__ */ React.createElement(Icon, { n: "refresh-cw", size: 13 }),
        "R\xE9tablir"
      )))
    );
  }))), tab === "payments" && /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-4" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-card" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400" }, "Chiffre d'Affaires Brut"), /* @__PURE__ */ React.createElement("span", { className: "grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "trending-up", size: 15 }))), /* @__PURE__ */ React.createElement("p", { className: "mt-2 font-display text-2xl font-bold text-ink" }, txns.filter((t) => t.status === "paid").reduce((acc, t) => acc + (t.grossAmount || 0), 0).toLocaleString("fr-FR"), " DH"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "check-circle-2", size: 12 }), "Encaissements valid\xE9s CMI Maroc")), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-card" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400" }, "Commissions Spotwork (8%)"), /* @__PURE__ */ React.createElement("span", { className: "grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "percent", size: 15 }))), /* @__PURE__ */ React.createElement("p", { className: "mt-2 font-display text-2xl font-bold text-brand-600" }, txns.filter((t) => t.status === "paid").reduce((acc, t) => acc + (t.feeAmount || 0), 0).toFixed(2), " DH"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-slate-400" }, "Frais de service & passerelle bancaire")), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-card" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400" }, "Revenu Net Revers\xE9"), /* @__PURE__ */ React.createElement("span", { className: "grid h-8 w-8 place-items-center rounded-lg bg-purple-50 text-purple-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "wallet", size: 15 }))), /* @__PURE__ */ React.createElement("p", { className: "mt-2 font-display text-2xl font-bold text-purple-700" }, txns.filter((t) => t.status === "paid").reduce((acc, t) => acc + (t.netAmount || 0), 0).toFixed(2), " DH"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-purple-600 font-semibold flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "arrow-up-right", size: 12 }), "Virements bancaires aux gestionnaires")), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-card" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400" }, "Succ\xE8s R\xE8glements CMI"), /* @__PURE__ */ React.createElement("span", { className: "grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "shield-check", size: 15 }))), /* @__PURE__ */ React.createElement("p", { className: "mt-2 font-display text-2xl font-bold text-ink" }, "100 %"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-slate-500" }, "Protocole 3D-Secure certifi\xE9 Maroc"))), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-card flex flex-wrap items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1" }, "Statut :"), [
    { id: "all", label: `Tous (${txns.length})` },
    { id: "paid", label: `Pay\xE9s (${txns.filter((t) => t.status === "paid").length})` },
    { id: "pending", label: `En attente (${txns.filter((t) => t.status === "pending").length})` }
  ].map((s) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: s.id,
      onClick: () => setPaymentsStatus(s.id),
      className: `rounded-full px-3 py-1.5 text-xs font-bold transition ${paymentsStatus === s.id ? "bg-navy text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`
    },
    s.label
  ))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => toast("Export comptable des transactions au format Excel / CSV", "download"),
      className: "flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: "file-spreadsheet", size: 13 }),
    "Exporter Journal Comptable"
  )), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-left text-xs" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]" }, /* @__PURE__ */ React.createElement("th", { className: "py-3 px-4 font-bold" }, "Transaction / Facture"), /* @__PURE__ */ React.createElement("th", { className: "py-3 px-4 font-bold" }, "Date & Heure"), /* @__PURE__ */ React.createElement("th", { className: "py-3 px-4 font-bold" }, "Espace & Ville"), /* @__PURE__ */ React.createElement("th", { className: "py-3 px-4 font-bold" }, "Client"), /* @__PURE__ */ React.createElement("th", { className: "py-3 px-4 font-bold" }, "R\xE8glement"), /* @__PURE__ */ React.createElement("th", { className: "py-3 px-4 font-bold text-right" }, "Brut (DH)"), /* @__PURE__ */ React.createElement("th", { className: "py-3 px-4 font-bold text-right" }, "Frais (8%)"), /* @__PURE__ */ React.createElement("th", { className: "py-3 px-4 font-bold text-right" }, "Net Revers\xE9 (DH)"), /* @__PURE__ */ React.createElement("th", { className: "py-3 px-4 font-bold text-center" }, "Statut"), /* @__PURE__ */ React.createElement("th", { className: "py-3 px-4 font-bold text-center" }, "Action"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-slate-100" }, txns.filter((t) => paymentsStatus === "all" || t.status === paymentsStatus).map((txn) => /* @__PURE__ */ React.createElement("tr", { key: txn.id, className: "hover:bg-slate-50/60 transition" }, /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-4" }, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-ink" }, txn.id), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-brand-600 font-mono font-semibold" }, txn.invoiceNumber)), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-4 text-slate-500" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-slate-700" }, txn.date), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400" }, txn.paidAt)), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-4" }, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-ink" }, txn.spaceName), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-500" }, txn.city, " \xB7 ", txn.timeSlot)), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-4" }, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-ink" }, txn.clientName), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400 truncate max-w-[140px]" }, txn.clientEmail)), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-4 text-slate-600" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-xs flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "credit-card", size: 12, className: "text-brand-600" }), "CMI \xB7\xB7\xB7\xB7 ", txn.cardLast4 || "4242"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-slate-400" }, txn.paymentMethod)), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-4 text-right font-mono font-bold text-ink" }, txn.grossAmount.toFixed(2), " DH"), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-4 text-right font-mono text-slate-500" }, txn.feeAmount.toFixed(2), " DH"), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-4 text-right font-mono font-bold text-emerald-700" }, txn.netAmount.toFixed(2), " DH"), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-4 text-center" }, /* @__PURE__ */ React.createElement("span", { className: `inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${txn.status === "paid" ? "bg-emerald-100 text-emerald-800" : txn.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}` }, txn.status === "paid" ? "\u2713 Pay\xE9" : txn.status === "pending" ? "En attente" : "Annul\xE9")), /* @__PURE__ */ React.createElement("td", { className: "py-3.5 px-4 text-center" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setSelectedInvoice(txn),
      className: "inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-100 transition shadow-2xs"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: "file-text", size: 12 }),
    "Facture"
  ))))))))), tab === "users" && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display text-lg font-bold text-ink" }, "Comptes utilisateurs & Acc\xE8s PropTech Maroc"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 mt-1" }, "Profils configur\xE9s pour la gestion, la r\xE9servation et le contr\xF4le de la plateforme."), /* @__PURE__ */ React.createElement("div", { className: "mt-6 grid gap-4 md:grid-cols-3" }, PRESET_ACCOUNTS.map((acc) => {
    const isCurrent = currentUser?.id === acc.id;
    return /* @__PURE__ */ React.createElement("div", { key: acc.id, className: `rounded-2xl border p-5 transition ${isCurrent ? "border-brand-500 bg-brand-50/20 ring-2 ring-brand-500/20" : "border-slate-200 bg-white"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-3" }, /* @__PURE__ */ React.createElement("span", { className: `grid h-10 w-10 place-items-center rounded-xl font-bold text-white text-xs ${acc.avatarBg}` }, acc.initials), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-sm text-ink" }, acc.name), /* @__PURE__ */ React.createElement("span", { className: `inline-block mt-0.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${acc.badgeCls}` }, acc.roleLabel))), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-mono text-slate-500 mb-2" }, acc.email), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed min-h-[44px]" }, acc.desc), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          onSelectUser(acc);
          if (toast) toast(`Bascul\xE9 sur le compte : ${acc.name}`, "user-check");
        },
        className: `mt-4 w-full rounded-xl py-2 text-xs font-bold transition ${isCurrent ? "bg-slate-100 text-slate-400 cursor-default" : "bg-navy text-white hover:bg-slate-800"}`
      },
      isCurrent ? "Compte actuel" : "Basculer sur ce compte"
    ));
  }))))), /* @__PURE__ */ React.createElement(
    CreateSpaceModal,
    {
      isOpen: isCreateOpen,
      onClose: () => setIsCreateOpen(false),
      onCreateSpace
    }
  ), /* @__PURE__ */ React.createElement(
    EditSpacePriceModal,
    {
      space: editingSpace,
      isOpen: Boolean(editingSpace),
      onClose: () => setEditingSpace(null),
      onUpdateSpace
    }
  ), /* @__PURE__ */ React.createElement(
    InvoiceModal,
    {
      invoice: selectedInvoice,
      isOpen: Boolean(selectedInvoice),
      onClose: () => setSelectedInvoice(null)
    }
  ));
};
const LoginPage = ({ currentUser, onLogin, nav, toast }) => {
  const [selectedRole, setSelectedRole] = useState("client");
  const [email, setEmail] = useState("youssef@proptech.ma");
  const [password, setPassword] = useState("\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022");
  const [err, setErr] = useState("");
  const handlePresetLogin = (acc) => {
    onLogin(acc);
    if (toast) toast(`Connect\xE9 avec succ\xE8s : ${acc.name} (${acc.roleLabel})`, "check");
    if (acc.role === "client") {
      nav({ name: "user" });
    } else {
      nav({ name: "admin" });
    }
  };
  const handleCustomLogin = (e) => {
    e.preventDefault();
    if (!email) {
      setErr("Veuillez saisir une adresse email");
      return;
    }
    const found = PRESET_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (found) {
      handlePresetLogin(found);
    } else {
      const cleanName = email.split("@")[0].replace(/[._-]/g, " ");
      const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      const customUser = {
        id: "custom-" + Date.now(),
        email,
        name: formattedName,
        firstName: formattedName.split(" ")[0],
        initials: formattedName.substring(0, 2).toUpperCase(),
        role: selectedRole,
        roleLabel: selectedRole === "admin" ? "Administrateur" : selectedRole === "manager" ? "Gestionnaire" : "Client",
        city: "Casablanca",
        avatarBg: selectedRole === "admin" ? "bg-navy" : selectedRole === "manager" ? "bg-indigo-600" : "bg-brand-600",
        badgeCls: selectedRole === "admin" ? "bg-purple-50 text-purple-700 border-purple-200" : selectedRole === "manager" ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-blue-50 text-brand-700 border-brand-200",
        desc: `Session ${selectedRole} personnalis\xE9e sur Spotwork Maroc`
      };
      onLogin(customUser);
      if (toast) toast(`Bienvenue ${customUser.name} !`, "check");
      nav(selectedRole === "client" ? { name: "user" } : { name: "admin" });
    }
  };
  return /* @__PURE__ */ React.createElement("main", { className: "min-h-[85vh] bg-mist py-10 md:py-16" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-4xl px-4 md:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "text-center max-w-xl mx-auto mb-10" }, /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 shadow-sm" }, /* @__PURE__ */ React.createElement(Icon, { n: "shield-check", size: 13, className: "text-brand-600" }), "Portail d'authentification PropTech Maroc"), /* @__PURE__ */ React.createElement("h1", { className: "mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight text-ink" }, "Connexion \xE0 Spotwork"), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-sm text-slate-500" }, "Acc\xE9dez \xE0 votre espace Client, Gestionnaire ou Administrateur. Testez en 1 clic gr\xE2ce aux comptes pr\xE9configur\xE9s.")), /* @__PURE__ */ React.createElement("div", { className: "mb-10" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display text-lg font-bold flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Icon, { n: "zap", size: 17, className: "text-amber-500" }), "Connexion rapide en 1 clic (Profils de Test)"), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-400" }, "Pr\xEAt \xE0 l'emploi")), /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 md:grid-cols-3" }, PRESET_ACCOUNTS.map((acc) => {
    const isActive = currentUser?.id === acc.id;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: acc.id,
        className: `relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lift ${isActive ? "border-brand-500 ring-2 ring-brand-500/20" : "border-slate-200"}`
      },
      isActive && /* @__PURE__ */ React.createElement("span", { className: "absolute top-3 right-3 flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-200" }, /* @__PURE__ */ React.createElement("span", { className: "h-1.5 w-1.5 rounded-full bg-emerald-500" }), "Actif"),
      /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-3" }, /* @__PURE__ */ React.createElement("span", { className: `grid h-11 w-11 place-items-center rounded-xl font-bold text-white text-sm shadow-md ${acc.avatarBg}` }, acc.initials), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-display font-bold text-ink leading-tight" }, acc.name), /* @__PURE__ */ React.createElement("span", { className: `inline-block mt-0.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${acc.badgeCls}` }, acc.roleLabel))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 font-mono mb-2" }, acc.email), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed min-h-[44px]" }, acc.desc), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400 mt-2 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 11 }), acc.city, ", Maroc")),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => handlePresetLogin(acc),
          className: `mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold transition shadow-sm ${isActive ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : acc.role === "admin" ? "bg-navy text-white hover:bg-slate-800" : acc.role === "manager" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-brand-600 text-white hover:bg-brand-700"}`
        },
        /* @__PURE__ */ React.createElement(Icon, { n: acc.role === "client" ? "user-check" : acc.role === "manager" ? "bar-chart-2" : "shield", size: 14 }),
        isActive ? "Session active" : `Se connecter (${acc.roleLabel})`
      )
    );
  }))), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-card max-w-xl mx-auto" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display text-lg font-bold mb-1" }, "Formulaire de connexion classique"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500 mb-6" }, "Connexion avec vos identifiants email et mot de passe."), /* @__PURE__ */ React.createElement("form", { onSubmit: handleCustomLogin, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5" }, "R\xF4le du compte"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-2" }, [
    { id: "client", label: "Client" },
    { id: "manager", label: "Gestionnaire" },
    { id: "admin", label: "Admin" }
  ].map((r) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: r.id,
      type: "button",
      onClick: () => {
        setSelectedRole(r.id);
        if (r.id === "client") setEmail("youssef@proptech.ma");
        else if (r.id === "manager") setEmail("mehdi@spotwork.ma");
        else setEmail("admin@spotwork.ma");
      },
      className: `rounded-xl py-2 text-xs font-bold border transition ${selectedRole === r.id ? "bg-navy text-white border-navy shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`
    },
    r.label
  )))), /* @__PURE__ */ React.createElement(Field, { label: "Adresse email", err }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "email",
      value: email,
      onChange: (e) => {
        setEmail(e.target.value);
        setErr("");
      },
      className: inp,
      placeholder: "votre@email.ma"
    }
  )), /* @__PURE__ */ React.createElement(Field, { label: "Mot de passe" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "password",
      value: password,
      onChange: (e) => setPassword(e.target.value),
      className: inp,
      placeholder: "Mot de passe"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "pt-2 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-slate-400" }, "Supabase Auth & JWT"), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "submit",
      className: "inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700"
    },
    /* @__PURE__ */ React.createElement(Icon, { n: "log-in", size: 15 }),
    "Se connecter"
  ))))));
};
const Footer = ({ nav, toast }) => {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const subscribe = (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("Adresse e-mail invalide");
      return;
    }
    setErr("");
    setEmail("");
    toast("Inscription confirm\xE9e. Bienvenue sur Spotwork Maroc !", "mail");
  };
  const cols = [
    ["Plateforme", [["Explorer les espaces", () => nav({ name: "explore" })], ["Villes marocaines", () => nav({ name: "explore" })], ["Comptes de test & Login", () => nav({ name: "login" })], ["Tarifs & abonnements (DH)", () => toast("Tarifs en Dirhams (DH)", "info")]]],
    ["Gestionnaires", [["Dashboard gestionnaire", () => nav({ name: "admin" })], ["Espaces \xE0 Casablanca", () => nav({ name: "explore", params: { city: "Casablanca" } })], ["Espaces \xE0 Rabat", () => nav({ name: "explore", params: { city: "Rabat" } })], ["Espaces \xE0 Marrakech", () => nav({ name: "explore", params: { city: "Marrakech" } })]]],
    ["Support", [["Centre d'aide", () => toast("Centre d'aide Spotwork Maroc", "info")], ["API & Documentation", () => toast("API Express / Supabase active", "info")], ["Contact PropTech Maroc", () => toast("support@spotwork.ma", "mail")]]]
  ];
  return /* @__PURE__ */ React.createElement("footer", { className: "bg-ink text-slate-300" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-7xl px-4 py-14 md:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-10 lg:grid-cols-[1.3fr_2fr]" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 18 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "font-display text-lg font-bold text-white block leading-tight" }, "Spotwork"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-brand-400 font-semibold tracking-wider uppercase" }, "PropTech Maroc"))), /* @__PURE__ */ React.createElement("p", { className: "mt-4 max-w-xs text-sm leading-relaxed text-slate-400" }, "La plateforme de r\xE9servation d'espaces de coworking nouvelle g\xE9n\xE9ration au Maroc. Casablanca, Rabat, Marrakech, Tanger, Agadir, F\xE8s."), /* @__PURE__ */ React.createElement("form", { onSubmit: subscribe, className: "mt-6" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold uppercase tracking-wide text-slate-400" }, "Newsletter mensuelle"), /* @__PURE__ */ React.createElement("div", { className: "mt-2.5 flex gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      value: email,
      onChange: (e) => setEmail(e.target.value),
      placeholder: "votre@email.ma",
      className: `flex-1 rounded-xl border bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-brand-400 ${err ? "border-rose-400" : "border-white/15"}`
    }
  ), /* @__PURE__ */ React.createElement("button", { className: "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-500" }, /* @__PURE__ */ React.createElement(Icon, { n: "send", size: 15 }))), err && /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 text-xs text-rose-400" }, err))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-8 sm:grid-cols-3" }, cols.map(([title, links]) => /* @__PURE__ */ React.createElement("div", { key: title }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold uppercase tracking-[0.15em] text-slate-500" }, title), /* @__PURE__ */ React.createElement("ul", { className: "mt-4 space-y-2.5" }, links.map(([l, f]) => /* @__PURE__ */ React.createElement("li", { key: l }, /* @__PURE__ */ React.createElement("button", { onClick: f, className: "text-sm text-slate-300 transition hover:text-white" }, l)))))))), /* @__PURE__ */ React.createElement("div", { className: "mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500" }, /* @__PURE__ */ React.createElement("p", null, "\xA9 2026 Spotwork PropTech Maroc \u2014 D\xE9velopp\xE9 avec Node.js, Express, Supabase & Claude AI."), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "home" }), className: "transition hover:text-white", title: "Accueil" }, /* @__PURE__ */ React.createElement(Icon, { n: "globe", size: 15 })), /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "login" }), className: "transition hover:text-white", title: "Connexion" }, /* @__PURE__ */ React.createElement(Icon, { n: "user", size: 15 })), /* @__PURE__ */ React.createElement("button", { onClick: () => toast("support@spotwork.ma", "mail"), className: "transition hover:text-white", title: "Support" }, /* @__PURE__ */ React.createElement(Icon, { n: "mail", size: 15 }))))));
};
const App = () => {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState({ name: "home" });
  const [cart, setCart] = useState([]);
  const [favs, setFavs] = useState(/* @__PURE__ */ new Set([2, 7]));
  const [spacesList, setSpacesList] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [userBookings, setUserBookings] = useState([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      if (localStorage.getItem("spotwork_logged_out") === "true") return null;
      const saved = localStorage.getItem("spotwork_user");
      if (saved) return JSON.parse(saved);
    } catch {
    }
    return PRESET_ACCOUNTS[0];
  });
  const onLogin = (user) => {
    setCurrentUser(user);
    try {
      localStorage.removeItem("spotwork_logged_out");
      localStorage.setItem("spotwork_user", JSON.stringify(user));
    } catch {
    }
    if (user.role === "admin") {
      SpotworkAPI.token = "mock-token-admin";
    } else if (user.role === "manager") {
      SpotworkAPI.token = "mock-token-manager";
    } else {
      SpotworkAPI.token = "mock-token-client";
    }
  };
  const onLogout = () => {
    try {
      localStorage.removeItem("spotwork_user");
      localStorage.setItem("spotwork_logged_out", "true");
    } catch {
    }
    SpotworkAPI.token = null;
    setCurrentUser(null);
    toast("Vous avez \xE9t\xE9 d\xE9connect\xE9 avec succ\xE8s", "log-out");
    nav({ name: "home" });
  };
  const handleCreateSpace = (newSpace) => {
    const newId = Math.max(...spacesList.map((s) => typeof s.id === "number" ? s.id : 0), 10) + 1;
    const created = {
      id: newId,
      name: newSpace.name,
      city: newSpace.city,
      district: newSpace.district,
      type: newSpace.type,
      price: Number(newSpace.price),
      unit: newSpace.unit || "heure",
      rating: 5,
      rev: 1,
      cap: Number(newSpace.capacity) || 10,
      surface: newSpace.surface || "50 m\xB2",
      imgs: newSpace.imgs && newSpace.imgs.length ? newSpace.imgs : [IMG.a, IMG.b, IMG.c],
      am: newSpace.am || ["wifi", "coffee", "screen"],
      badge: "Nouveau",
      featured: false,
      host: currentUser?.name || "Mehdi El Fassi",
      desc: newSpace.desc,
      busy: []
    };
    setSpacesList((prev) => [created, ...prev]);
    SpotworkAPI.createSpace({
      name: created.name,
      city: created.city,
      district: created.district,
      type: created.type,
      price: created.price,
      capacity: created.cap,
      surface: created.surface,
      amenities: created.am,
      description: created.desc,
      photos: created.imgs
    });
    toast(`Espace \xAB ${created.name} \xBB cr\xE9\xE9 avec succ\xE8s \xE0 ${created.city} (${created.price} DH/h) !`, "check-circle");
  };
  const handleUpdateSpace = (spaceId, updatedFields) => {
    setSpacesList((prev) => prev.map((s) => {
      if (s.id === spaceId) {
        return {
          ...s,
          ...updatedFields,
          price: updatedFields.price !== void 0 ? Number(updatedFields.price) : s.price,
          cap: updatedFields.capacity !== void 0 ? Number(updatedFields.capacity) : s.cap
        };
      }
      return s;
    }));
    SpotworkAPI.updateSpace(spaceId, updatedFields);
    toast(`Tarif et espace mis \xE0 jour (${updatedFields.price || ""} DH/h) !`, "check");
  };
  const handleDeleteSpace = (spaceId) => {
    const deleted = spacesList.find((s) => s.id === spaceId);
    setSpacesList((prev) => prev.filter((s) => s.id !== spaceId));
    SpotworkAPI.deleteSpace(spaceId);
    toast(`Espace \xAB ${deleted?.name || ""} \xBB supprim\xE9 du catalogue.`, "trash");
  };
  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    setAllBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: newStatus } : b));
    const statusFr = newStatus === "confirmed" ? "Confirm\xE9e" : newStatus === "cancelled" ? "Annul\xE9e" : "En attente";
    setUserBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: statusFr } : b));
    try {
      const res = await SpotworkAPI.updateBookingStatus(bookingId, newStatus);
      if (res && res.status === "success") {
        if (newStatus === "confirmed") {
          toast("Demande accept\xE9e et synchronis\xE9e avec la base de donn\xE9es !", "check-circle");
        } else if (newStatus === "cancelled") {
          toast("Demande refus\xE9e et synchronis\xE9e avec la base de donn\xE9es.", "x-circle");
        } else {
          toast("Statut synchronis\xE9 avec la base de donn\xE9es.", "check-circle");
        }
      } else {
        toast(`Statut mis \xE0 jour (${newStatus === "confirmed" ? "Confirm\xE9e" : "Refus\xE9e"}).`, "check-circle");
      }
    } catch {
      toast("Statut mis \xE0 jour localement.", "check-circle");
    }
  };
  const onDone = (b) => {
    const spaceId = b.spaceId || b.id;
    const bookedSpace = spacesList.find((s) => s.id === spaceId);
    const spaceName = bookedSpace ? bookedSpace.name : b.name || "Espace Coworking";
    const city = bookedSpace ? bookedSpace.city : b.city || "Casablanca";
    const num = typeof spaceId === "number" ? spaceId : parseInt(spaceId, 10) || 1;
    const spaceUuid = typeof spaceId === "string" && spaceId.includes("-") ? spaceId : `10000000-0000-0000-0000-${String(num).padStart(12, "0")}`;
    let startTime = "09:00:00";
    let endTime = "18:00:00";
    if (Array.isArray(b.slots) && b.slots.length > 0) {
      if (b.isHour) {
        const sorted = [...b.slots].sort();
        const startH = sorted[0];
        const endH = sorted[sorted.length - 1];
        if (startH) startTime = startH.includes(":") ? startH.length === 5 ? `${startH}:00` : startH : `${startH.padStart(2, "0")}:00:00`;
        if (endH) {
          const h = parseInt(endH.split(":")[0], 10) + 1;
          endTime = `${String(h).padStart(2, "0")}:00:00`;
        }
      }
    } else if (b.meta && b.meta.includes(" \u2013 ")) {
      const parts = b.meta.split(" \u2013 ");
      if (parts[0]) {
        const cleanStart = parts[0].trim().slice(0, 5);
        if (/^\d{2}:\d{2}$/.test(cleanStart)) startTime = cleanStart + ":00";
      }
      if (parts[1]) {
        const cleanEnd = parts[1].trim().split(" ")[0].slice(0, 5);
        if (/^\d{2}:\d{2}$/.test(cleanEnd)) endTime = cleanEnd + ":00";
      }
    }
    const tempBookingId = "bk-" + Date.now();
    const totalPrice = b.total || (bookedSpace ? bookedSpace.price * 4 : 180);
    SpotworkAPI.createBooking({
      space_id: spaceUuid,
      booking_date: b.date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      start_time: startTime,
      end_time: endTime,
      total_price: totalPrice,
      seats: b.seats || 1
    }).then((res) => {
      if (res && res.status === "success") {
        toast("R\xE9servation enregistr\xE9e et synchronis\xE9e avec la base de donn\xE9es !", "check-circle");
        const realId = res.data?.booking?.id;
        if (realId) {
          setUserBookings((prev) => prev.map((item) => item.id === tempBookingId ? { ...item, id: realId } : item));
          setAllBookings((prev) => prev.map((item) => item.id === tempBookingId ? { ...item, id: realId } : item));
        }
      }
    }).catch(() => {
    });
    setUserBookings((p) => [{
      id: tempBookingId,
      spaceId,
      date: b.date,
      meta: b.meta,
      status: "Confirm\xE9e",
      totalPrice,
      seats: b.seats || 1,
      slots: b.slots || [],
      invoiceRef: `FACT-2026-${String(tempBookingId).slice(-6)}`
    }, ...p]);
    setAllBookings((p) => [{
      id: tempBookingId,
      clientName: currentUser?.name || b.name || "Client PropTech",
      clientEmail: currentUser?.email || b.email || "client@proptech.ma",
      clientPhone: currentUser?.phone || "+212 6 61 23 45 67",
      clientInitials: currentUser?.initials || "CP",
      spaceId,
      spaceName,
      city,
      date: b.date,
      timeSlot: b.meta,
      hours: Array.isArray(b.slots) ? b.slots.length : 4,
      seats: b.seats || 1,
      slots: b.slots || [],
      totalPrice,
      status: "confirmed",
      createdAt: "\xC0 l'instant",
      paymentMethod: b.method === "cash" ? "Paiement sur place \xE0 l'accueil" : b.method === "transfer" ? "Virement / Wafacash" : "Carte Bancaire CMI (3D Secure)",
      invoiceRef: `FACT-2026-${String(tempBookingId).slice(-6)}`
    }, ...p]);
    setCart([]);
  };
  useEffect(() => {
    SpotworkAPI.getSpaces().then((spaces) => {
      if (spaces && Array.isArray(spaces) && spaces.length > 0) {
        setSpacesList(spaces.map(normalizeSpaceFromDB));
      }
      setLoadingSpaces(false);
    }).catch(() => {
      setLoadingSpaces(false);
    });
  }, []);
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "admin") SpotworkAPI.token = "mock-token-admin";
      else if (currentUser.role === "manager") SpotworkAPI.token = "mock-token-manager";
      else SpotworkAPI.token = "mock-token-client";
      SpotworkAPI.getUserBookings().then((bkgs) => {
        if (bkgs && Array.isArray(bkgs) && bkgs.length > 0) {
          const mapped = bkgs.map((b) => {
            const numId = parseInt(String(b.space_id).split("-").pop(), 10) || 1;
            return {
              id: b.id,
              spaceId: numId,
              date: b.booking_date,
              meta: `${b.start_time ? b.start_time.slice(0, 5) : "09:00"} \u2013 ${b.end_time ? b.end_time.slice(0, 5) : "18:00"}`,
              status: b.status === "confirmed" ? "Confirm\xE9e" : b.status === "cancelled" ? "Annul\xE9e" : b.status === "completed" ? "Termin\xE9e" : "En attente",
              totalPrice: b.total_price,
              invoiceRef: `FACT-2026-${String(b.id).slice(-6)}`
            };
          });
          setUserBookings((prev) => {
            const existingMap = new Map(prev.map((p) => [p.id, p]));
            mapped.forEach((m) => {
              existingMap.set(m.id, { ...existingMap.get(m.id), ...m });
            });
            return Array.from(existingMap.values());
          });
        }
      }).catch(() => {
      });
      if (currentUser.role === "manager" || currentUser.role === "admin") {
        SpotworkAPI.getManagerBookings().then((bkgs) => {
          if (bkgs && Array.isArray(bkgs) && bkgs.length > 0) {
            const mappedManager = bkgs.map((b) => {
              const numId = parseInt(String(b.space_id).split("-").pop(), 10) || 1;
              const cName = b.user?.full_name || b.users?.full_name || "Client PropTech";
              const initials = cName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "CP";
              const sName = b.space?.name || b.spaces?.name || "Espace Coworking";
              const sCity = b.space?.location ? b.space.location.split("\xB7")[0].trim() : b.spaces?.city || "Casablanca";
              return {
                id: b.id,
                clientName: cName,
                clientEmail: b.user?.email || b.users?.email || "client@proptech.ma",
                clientPhone: b.user?.phone || b.users?.phone || "+212 6 61 23 45 67",
                clientInitials: initials,
                spaceId: numId,
                spaceName: sName,
                city: sCity,
                date: b.booking_date,
                timeSlot: `${b.start_time ? b.start_time.slice(0, 5) : "09:00"} \u2013 ${b.end_time ? b.end_time.slice(0, 5) : "18:00"}`,
                hours: 4,
                seats: b.seats || 1,
                totalPrice: b.total_price,
                status: b.status || "confirmed",
                createdAt: "R\xE9cemment",
                paymentMethod: "Carte Bancaire CMI (3D Secure)",
                invoiceRef: `FACT-2026-${String(b.id).slice(-4)}`
              };
            });
            setAllBookings((prev) => {
              const existingMap = new Map(prev.map((p) => [p.id, p]));
              mappedManager.forEach((m) => {
                existingMap.set(m.id, { ...existingMap.get(m.id), ...m });
              });
              return Array.from(existingMap.values());
            });
          }
        }).catch(() => {
        });
      }
    }
  }, [currentUser, view.name]);
  useEffect(() => {
    let tries = 0;
    const t = setInterval(() => {
      if (window.lucide || tries > 25) {
        setReady(true);
        clearInterval(t);
      }
      tries++;
    }, 60);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => {
        const io = new IntersectionObserver((es) => es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }), { threshold: 0.1 });
        io.observe(el);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [view, ready]);
  const nav = (v) => {
    setView(v);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  };
  const toast = (msg, icon = "check") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };
  const toggleFav = (id) => {
    setFavs((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
        toast("Retir\xE9 des favoris", "heart");
      } else {
        n.add(id);
        toast("Ajout\xE9 \xE0 vos favoris", "heart");
      }
      return n;
    });
  };
  const reserve = (item) => {
    setCart((c) => [...c, item]);
    nav({ name: "checkout" });
  };
  if (!ready || loadingSpaces && spacesList.length === 0) return /* @__PURE__ */ React.createElement("div", { className: "grid min-h-screen place-items-center bg-mist" }, /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("span", { className: "mx-auto grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-brand-600 text-white" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 22 })), /* @__PURE__ */ React.createElement("p", { className: "mt-3 font-display font-bold" }, "Spotwork PropTech Maroc"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-slate-500" }, "Chargement des espaces en direct depuis la base de donn\xE9es...")));
  const isManagerOrAdmin = currentUser && (currentUser.role === "manager" || currentUser.role === "admin");
  return /* @__PURE__ */ React.createElement("div", { className: "font-body" }, /* @__PURE__ */ React.createElement(Navbar, { view, nav, cartCount: cart.length, menuOpen, setMenuOpen, currentUser, onSelectUser: onLogin, onLogout, toast }), view.name === "home" && /* @__PURE__ */ React.createElement(Home, { nav, favs, toggleFav, spaces: spacesList, bookings: allBookings, currentUser, userBookings }), view.name === "explore" && /* @__PURE__ */ React.createElement(Explore, { params: view.params, nav, favs, toggleFav, spaces: spacesList, bookings: allBookings }), view.name === "space" && /* @__PURE__ */ React.createElement(SpaceDetail, { id: view.params.id, nav, favs, toggleFav, reserve, spaces: spacesList, bookings: allBookings }), view.name === "checkout" && /* @__PURE__ */ React.createElement(Checkout, { cart, setCart, nav, onDone, toast, currentUser }), view.name === "user" && /* @__PURE__ */ React.createElement(UserDash, { initTab: view.params?.tab, bookings: userBookings, setBookings: setUserBookings, favs, toggleFav, nav, toast, currentUser, spaces: spacesList }), view.name === "admin" && (isManagerOrAdmin ? /* @__PURE__ */ React.createElement(
    AdminDash,
    {
      nav,
      toast,
      currentUser,
      onSelectUser: onLogin,
      spaces: spacesList,
      onUpdateSpace: handleUpdateSpace,
      onCreateSpace: handleCreateSpace,
      onDeleteSpace: handleDeleteSpace,
      bookings: allBookings,
      onUpdateBookingStatus: handleUpdateBookingStatus
    }
  ) : /* @__PURE__ */ React.createElement(AccessDenied, { nav, currentUser, onSelectUser: onLogin })), view.name === "login" && /* @__PURE__ */ React.createElement(LoginPage, { currentUser, onLogin, nav, toast }), /* @__PURE__ */ React.createElement(Footer, { nav, toast }), /* @__PURE__ */ React.createElement("div", { className: "pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-2" }, toasts.map((t) => /* @__PURE__ */ React.createElement("div", { key: t.id, className: "toast pointer-events-auto flex items-center gap-2.5 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lift" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-6 w-6 place-items-center rounded-full bg-brand-600" }, /* @__PURE__ */ React.createElement(Icon, { n: t.icon, size: 13 })), t.msg))));
};
ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
