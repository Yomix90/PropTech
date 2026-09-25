const { useState, useEffect, useMemo, useRef } = React;

/* ================= HELPERS ================= */
const MAD = { format: (v) => `${Math.round(Number(v) || 0).toLocaleString('fr-FR')} DH` };
const EUR = MAD;
const fmtDate = v => v ? new Date(v + "T12:00").toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : "—";
const todayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSlotInPast = (dateStr, slotHourStr) => {
  if (!dateStr) return false;
  const today = todayISO();
  if (dateStr < today) return true;
  if (dateStr > today) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const [slotH] = (slotHourStr || "00:00").split(':').map(Number);

  // Le créneau a déjà commencé ou est entièrement passé
  if (slotH < currentHour) return true;
  if (slotH === currentHour && currentMin >= 0) return true;
  return false;
};
const U = (id, w = 900) => !id ? "" : id.startsWith("http") ? id : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

const serializeNodes = (nodes) => {
  if (!Array.isArray(nodes)) return "";
  return nodes.map(n => {
    if (!Array.isArray(n)) return "";
    const [t, a = {}, ch = []] = n;
    const attrs = Object.entries(a || {}).map(([k, v]) => `${k}="${v}"`).join(" ");
    return `<${t} ${attrs}>${Array.isArray(ch) && ch.length ? serializeNodes(ch) : ""}</${t}>`;
  }).join("");
};

const Icon = ({ n, size = 18, sw = 2, className = "", fill = "none" }) => {
  const html = useMemo(() => {
    if (!window.lucide || !window.lucide.icons) return "";
    const p = n.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("");
    const icon = window.lucide.icons[p] || window.lucide.icons[n];
    if (!icon) return "";
    if (Array.isArray(icon)) {
      // Si format ancien [tag, attrs, children]
      if (typeof icon[0] === "string" && icon[0] === "svg" && Array.isArray(icon[2])) {
        return serializeNodes(icon[2]);
      }
      // Format moderne Lucide : tableau de tuples SVG [ ["path", ...], ["circle", ...] ]
      return serializeNodes(icon);
    }
    return "";
  }, [n]);
  return <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: html }} />;
};

const smoothPath = pts => {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
};

/* ================= SPOTWORK BACKEND CLIENT (API EXPRESS + SUPABASE + CLAUDE) ================= */
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
    } catch { }
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

/* ================= COMPTES & UTILISATEURS DU PROTOTYPE ================= */
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
    desc: "Compte Client : recherche, réservation d'espaces au Maroc, recommandations IA personnalisées."
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
    desc: "Compte Gestionnaire : pilotage des espaces, occupation, revenus et gestion des réservations."
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

/* ================= DONNÉES MOCK MAROC ================= */
const CITIES = ["Casablanca", "Rabat", "Marrakech", "Tanger", "Agadir", "Fès"];
const TYPES = [
  { id: "open", label: "Open space", icon: "layout-grid" },
  { id: "office", label: "Bureau privé", icon: "door-closed" },
  { id: "meeting", label: "Salle de réunion", icon: "users" },
  { id: "studio", label: "Studio créatif", icon: "palette" },
  { id: "booth", label: "Cabine focus", icon: "headphones" }
];
const AMENITIES = [
  { id: "wifi", label: "Wifi fibre", icon: "wifi" }, { id: "coffee", label: "Thé & Café illimités", icon: "coffee" },
  { id: "screen", label: "Écran & visio 4K", icon: "monitor" }, { id: "board", label: "Tableau blanc", icon: "pen-tool" },
  { id: "print", label: "Impression", icon: "printer" }, { id: "access", label: "Accès 24/7", icon: "key-round" },
  { id: "terrace", label: "Rooftop / Terrasse", icon: "sun" }, { id: "bike", label: "Parking sécurisé", icon: "bike" }
];
const IMG = {
  a: "photo-1497366216548-37526070297c", b: "photo-1497366811353-6870744d04b2", c: "photo-1524758631624-e2822e304c36",
  d: "photo-1556761175-b413da4baf72", e: "photo-1497215728101-856f4ea42174", f: "photo-1600508774634-4e11d34730e2",
  g: "photo-1522202176988-66273c2fd55f", h: "photo-1519389950473-47ba0277781c", i: "photo-1504384308090-c894fdcc538d",
  j: "photo-1462826303086-329426d1aef5", k: "photo-1568992687947-868a62a9f598", l: "photo-1553877522-43269d4ea984",
  m: "photo-1593115057322-e94b77572f20", n: "photo-1541746972996-4e0b0f43e02a", q: "photo-1431540015161-0bf868a2d407",
  s: "photo-1521737604893-d14cc237f11d"
};
const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const normalizeSpaceFromDB = (s) => {
  if (!s) return null;
  const numId = typeof s.id === 'number' ? s.id : parseInt(String(s.id).split('-').pop(), 10) || s.id;
  const city = s.city || (s.location ? s.location.split('·')[0].trim() : "Casablanca");
  const district = s.district || (s.location && s.location.includes('·') ? s.location.split('·')[1].trim() : (s.location || "Centre-ville"));
  const imgs = Array.isArray(s.imgs) && s.imgs.length > 0 
    ? s.imgs 
    : (Array.isArray(s.photos) && s.photos.length > 0 
        ? s.photos 
        : [s.photos || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=70"]);
  const am = Array.isArray(s.am) && s.am.length > 0 
    ? s.am 
    : (Array.isArray(s.amenities) && s.amenities.length > 0 
        ? s.amenities 
        : (typeof s.amenities === 'string' ? s.amenities.split(' ') : ["wifi", "coffee", "screen"]));
  const price = Number(s.price !== undefined ? s.price : s.price_per_hour) || 45;
  const cap = Number(s.cap !== undefined ? s.cap : s.capacity) || 10;
  
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
    transport: s.transport || "Accès transports & taxis à proximité",
    type: s.type || (cap > 20 ? "open" : cap > 10 ? "studio" : cap > 5 ? "meeting" : cap === 1 ? "booth" : "office"),
    price,
    unit: s.unit || "heure",
    rating: Number(s.rating) || 4.8,
    rev: s.rev || 48,
    cap,
    surface: s.surface || `${cap * 6} m²`,
    imgs,
    am,
    badge: s.badge || (s.rating >= 4.9 ? "Coup de cœur" : s.rating >= 4.8 ? "Populaire" : "Recommandé"),
    featured: s.featured !== undefined ? s.featured : (typeof numId === 'number' ? numId <= 4 : true),
    host: s.host || (s.users?.full_name || "Mehdi El Fassi"),
    desc: s.desc || s.description || "",
    busy: s.busy || []
  };
};

/* ================= MOTEUR DE GESTION DU PLANNING & DES DISPONIBILITÉS ================= */
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
  HOURS.forEach(h => {
    hourlyBookedSeats[h] = 0;
    if (isPastDate || (isToday && isSlotInPast(dateStr, h))) {
      pastHours.push(h);
    }
  });

  if (!dateStr) {
    HOURS.forEach(h => { hourlyFreeSeats[h] = cap; });
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
    HOURS.forEach(h => { hourlyFreeSeats[h] = 0; });
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

  // Active bookings on this space and date
  const dayBookings = (bookings || []).filter(b =>
    (b.spaceId === space.id || b.id === space.id) &&
    b.date === dateStr &&
    b.status !== "cancelled"
  );

  // Pour les espaces fermés/privatifs (ex: bureau fermé ou cabine solo), 1 réservation prend toute la pièce
  const isExclusiveRoom = ["office", "booth"].includes(space.type);

  for (const b of dayBookings) {
    const isJournee = (b.timeSlot && b.timeSlot.includes("Journée")) ||
      (b.meta && b.meta.includes("Journée")) ||
      (b.hours && b.hours >= 8);

    // Nombre de places réservées par cette demande (1 par défaut)
    const seatsTaken = isExclusiveRoom ? cap : (b.seats !== undefined ? Math.max(1, Number(b.seats)) : 1);

    if (isJournee) {
      HOURS.forEach(h => {
        hourlyBookedSeats[h] = Math.min(cap, (hourlyBookedSeats[h] || 0) + seatsTaken);
      });
    } else if (Array.isArray(b.slots) && b.slots.length > 0) {
      b.slots.forEach(h => {
        if (hourlyBookedSeats[h] !== undefined) {
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
  HOURS.forEach(h => {
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

  const futureHours = HOURS.filter(h => !pastHours.includes(h));
  const futureFreeValues = futureHours.map(h => hourlyFreeSeats[h]);

  const maxFreeSeats = futureFreeValues.length > 0 ? Math.max(...futureFreeValues) : 0;
  const minFreeSeats = futureFreeValues.length > 0 ? Math.min(...futureFreeValues) : 0;
  const allFutureSoldOut = futureFreeValues.length === 0 || futureFreeValues.every(f => f === 0);
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
  const base = new Date();
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
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
      label: i === 0 ? "Aujourd'hui" : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    });
  }
  return dates;
};

/* ================= UI ATOMS ================= */
const Stars = ({ v, size = 13 }) => (
  <span className="inline-flex gap-0.5 text-amber-400">
    {[1, 2, 3, 4, 5].map(i => <Icon key={i} n="star" size={size} fill={i <= Math.round(v) ? "currentColor" : "none"} className={i <= Math.round(v) ? "" : "text-slate-300"} />)}
  </span>
);
const Badge = ({ label }) => {
  if (!label) return null;
  const eco = label.includes("Éco");
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${eco ? "bg-emerald-100 text-emerald-700" : "bg-white/95 text-ink shadow-sm"}`}>
    {eco && <Icon n="leaf" size={11} />}{label}
  </span>;
};
const Kicker = ({ children }) => (
  <p className="flex items-center gap-2 text-[11px] md:text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
    <span className="h-px w-6 bg-brand-500" />{children}
  </p>
);
const SecHead = ({ kicker, title, action }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-7" data-reveal>
    <div><Kicker>{kicker}</Kicker>
      <h2 className="font-display text-2xl md:text-[2rem] font-bold tracking-tight mt-2">{title}</h2>
    </div>
    {action}
  </div>
);
const Toggle = ({ on, onClick }) => (
  <button onClick={onClick} className={`relative w-11 h-6 rounded-full transition-colors ${on ? "bg-brand-600" : "bg-slate-200"}`}>
    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
  </button>
);
const Field = ({ label, err, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
    {children}
    {err && <p className="flex items-center gap-1 text-xs text-rose-600 mt-1.5"><Icon n="alert-circle" size={12} />{err}</p>}
  </div>
);
const inp = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const inpErr = "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10";

/* ================= ACCÈS RESTREINT (403 RBAC GESTIONNAIRE) ================= */
const AccessDenied = ({ nav, currentUser, onSelectUser }) => {
  return (
    <main className="min-h-[75vh] flex items-center justify-center py-12 px-4 bg-mist">
      <div className="max-w-lg w-full text-center bg-white rounded-3xl border border-slate-200/90 p-8 md:p-10 shadow-card">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-5 shadow-sm">
          <Icon n="shield-alert" size={32} />
        </div>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-700 mb-3">
          Erreur 403 · Accès Restreint
        </span>
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">
          Espace Réservé aux Gestionnaires
        </h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          {currentUser ? (
            <>
              Vous êtes actuellement connecté en tant que <b>{currentUser.name}</b> (<span className="text-brand-600 font-semibold">{currentUser.roleLabel || currentUser.role}</span>). Ce tableau de bord est strictement réservé aux gestionnaires d'espaces et administrateurs autorisés.
            </>
          ) : (
            <>
              Vous devez être connecté avec un compte gestionnaire ou administrateur pour accéder à la gestion des espaces, aux plannings et aux revenus.
            </>
          )}
        </p>

        <div className="space-y-3 text-left">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-1">
            Basculer sur un compte autorisé :
          </p>
          {PRESET_ACCOUNTS.filter(a => a.role === 'manager' || a.role === 'admin').map(acc => (
            <button
              key={acc.id}
              onClick={() => {
                if (onSelectUser) onSelectUser(acc);
                nav({ name: "admin" });
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-brand-200 bg-brand-50/50 hover:bg-brand-50 hover:border-brand-300 transition text-left text-xs font-semibold text-brand-900"
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-xl text-white font-bold grid place-items-center text-xs shadow-sm ${acc.avatarBg}`}>
                  {acc.initials}
                </span>
                <div>
                  <p className="font-bold text-ink">{acc.name}</p>
                  <p className="text-[11px] text-slate-500">{acc.roleLabel} · {acc.city}</p>
                </div>
              </div>
              <span className="text-brand-600 font-bold flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-brand-200 shadow-2xs">
                Se connecter <Icon n="arrow-right" size={13} />
              </span>
            </button>
          ))}

          <div className="pt-3 flex gap-2.5">
            <button
              onClick={() => nav({ name: "explore" })}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition text-center"
            >
              Explorer les espaces
            </button>
            <button
              onClick={() => nav({ name: "home" })}
              className="flex-1 py-2.5 px-4 rounded-xl bg-navy text-xs font-bold text-white hover:bg-slate-800 transition text-center"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

/* ================= MODALE FACTURE & REÇU FISCAL MAROC ================= */
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
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      window.html2pdf().from(element).set(opt).save().then(() => {
        setDownloading(false);
      }).catch((err) => {
        console.warn("Erreur génération PDF:", err);
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
  const timeSlot = invoice.timeSlot || invoice.meta || "09:00 – 18:00 (Journée)";
  const gross = Number(invoice.grossAmount || invoice.totalPrice || invoice.total || 300);
  const fee = Number(invoice.feeAmount || (gross * 0.08).toFixed(2));
  const net = Number(invoice.netAmount || (gross - fee).toFixed(2));
  const ht = (gross / 1.2).toFixed(2);
  const vat = (gross - Number(ht)).toFixed(2);
  const paymentMethod = invoice.paymentMethod || "Carte Bancaire Maroc CMI (3D Secure)";
  const paidAt = invoice.paidAt || "01/10/2026 10:15";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 my-8 text-ink">
        {/* En-tête modal avec boutons Télécharger PDF & Imprimer */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-brand-50 text-brand-700">
              <Icon n="file-text" size={22} />
            </span>
            <div>
              <p className="font-display font-bold text-base">Facture Légale & Reçu CMI</p>
              <p className="text-[11px] text-slate-400 font-mono">{invoiceNum}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 transition shadow-sm disabled:opacity-50"
            >
              <Icon n={downloading ? "loader" : "download"} size={14} className={downloading ? "animate-spin" : ""} />
              {downloading ? "Génération..." : "Télécharger PDF"}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <Icon n="printer" size={14} /> Imprimer
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <Icon n="x" size={18} />
            </button>
          </div>
        </div>

        {/* Corps de la facture marocaine (zone capturée en PDF natif) */}
        <div id="invoice-print-area" className="border border-slate-200 rounded-2xl p-6 bg-white space-y-6 text-sm">
          {/* En-tête officiel entreprise */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white font-bold text-sm">
                  <Icon n="map-pin" size={16} />
                </span>
                <span className="font-display text-lg font-bold">SPOTWORK MAROC SARL AU</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">142 Boulevard d'Anfa, 5ème étage</p>
              <p className="text-xs text-slate-500">20050 Casablanca, Maroc</p>
              <p className="text-[11px] text-slate-400 mt-1 font-mono leading-tight">
                IF : 45892014 · ICE : 002938475000089<br />
                RC Casablanca : 512948 · Patente : 34109284
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-2">
                ✓ Facture Acquittée
              </span>
              <p className="text-xs font-semibold text-slate-500">Réf : <b className="font-mono text-ink">{invoiceNum}</b></p>
              <p className="text-xs text-slate-500">Date d'émission : <b>{dateStr}</b></p>
              <p className="text-xs text-slate-500">Règlement : <b>{paymentMethod}</b></p>
            </div>
          </div>

          {/* Coordonnées Client */}
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Client facturé :</p>
            <p className="font-bold text-sm text-ink">{clientName}</p>
            <p className="text-xs text-slate-500">{clientEmail} · {clientPhone}</p>
            <p className="text-xs text-slate-500">{clientCity}, Maroc</p>
          </div>

          {/* Tableau des prestations */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5">Description de la prestation</th>
                  <th className="py-2.5 text-center">Date & Créneau</th>
                  <th className="py-2.5 text-right">Prix HT</th>
                  <th className="py-2.5 text-right">TVA (20%)</th>
                  <th className="py-2.5 text-right">Total TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3.5 font-semibold text-ink">
                    Location Espace : {spaceName}
                    <p className="text-[10px] text-slate-400 font-normal">Accès garanti coworking & équipements inclus</p>
                  </td>
                  <td className="py-3.5 text-center text-slate-500">{dateStr}<br />{timeSlot}</td>
                  <td className="py-3.5 text-right font-mono">{ht} DH</td>
                  <td className="py-3.5 text-right font-mono">{vat} DH</td>
                  <td className="py-3.5 text-right font-bold font-mono text-ink">{gross.toFixed(2)} DH</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Synthèse financière marocaine */}
          <div className="border-t border-slate-200 pt-4 flex justify-end">
            <div className="w-72 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Sous-total HT :</span>
                <span className="font-mono">{ht} DH</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>TVA marocaine (20%) :</span>
                <span className="font-mono">{vat} DH</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Frais de service plateforme (8%) :</span>
                <span className="font-mono">{fee.toFixed(2)} DH</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-ink">
                <span>Total TTC Réglé :</span>
                <span className="font-display font-bold text-brand-600">{gross.toFixed(2)} DH</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                <span>Net reversé au gestionnaire :</span>
                <span className="font-mono font-semibold text-emerald-700">{net.toFixed(2)} DH</span>
              </div>
            </div>
          </div>

          {/* Footer note & cachet numérique */}
          <div className="rounded-xl border border-dashed border-slate-200 p-3.5 bg-slate-50/70 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon n="shield-check" size={17} className="text-emerald-600" />
              <span>Certifié CMI Maroc · 3D-Secure v2.2 · Transaction confirmée ({paidAt})</span>
            </div>
            <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">Cachet Électronique Spotwork</span>
          </div>
        </div>

        {/* Fermeture */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 hover:bg-slate-200 px-5 py-2 text-xs font-bold text-slate-700 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= CARTE ESPACE AVEC SYNCHRONISATION DES PLACES EN DIRECT ================= */
const SpaceCard = ({ s, nav, favs, toggleFav, date, bookings = [] }) => {
  const liked = favs.has(s.id);
  const avail = getSpaceAvailability(s, date, bookings);
  return (
    <article onClick={() => nav({ name: "space", params: { id: s.id, date } })}
      className={`group cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift ${avail.isSoldOut ? "border-rose-200" : "border-slate-200/80"}`}>
      <div className="relative h-44 md:h-48 overflow-hidden">
        <img src={U(s.imgs[0], 700)} alt={s.name} loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]" />
        <div className="absolute left-3 top-3 flex flex-col gap-1 items-start">
          <Badge label={s.badge} />
          {date && (
            avail.isPast || avail.allHoursPast ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold bg-slate-600 text-white shadow-md">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />Journée passée
              </span>
            ) : avail.isSoldOut ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold bg-rose-600 text-white shadow-md">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />COMPLET (0 place)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold bg-emerald-600 text-white shadow-md">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />{avail.availableSeats} place{avail.availableSeats > 1 ? "s" : ""} libre{avail.availableSeats > 1 ? "s" : ""}
              </span>
            )
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); toggleFav(s.id); }}
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full backdrop-blur transition ${liked ? "bg-white text-rose-500" : "bg-white/85 text-slate-500 hover:text-rose-500"}`}>
          <Icon n="heart" size={16} fill={liked ? "currentColor" : "none"} className={liked ? "pop" : ""} />
        </button>
        <span className="absolute bottom-3 right-3 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {s.unit === "heure" ? "À l'heure" : "À la journée"}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-[15px] leading-snug">{s.name}</h3>
          <span className="flex shrink-0 items-center gap-1 text-sm font-semibold"><Icon n="star" size={13} fill="currentColor" className="text-amber-400" />{s.rating.toLocaleString('fr-FR')}</span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-[13px] text-slate-500">
          <Icon n="map-pin" size={12} />{s.city} · {s.district}
        </p>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-slate-400">{TYPES.find(t => t.id === s.type).label} · {s.surface}</span>
          {avail.isSoldOut ? (
            <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              0 / {avail.totalCapacity} place
            </span>
          ) : (
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {avail.availableSeats} / {avail.totalCapacity} places libres
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-[15px]"><b className="font-display">{EUR.format(s.price)}</b><span className="text-slate-400 text-xs"> /{s.unit}</span></p>
          <span className={`flex items-center gap-1 text-xs font-semibold transition-transform group-hover:translate-x-1 ${avail.isSoldOut ? "text-slate-400" : "text-brand-600"}`}>
            {avail.isSoldOut ? "Voir planning" : "Voir l'espace"}<Icon n="arrow-right" size={13} />
          </span>
        </div>
      </div>
    </article>
  );
};

/* ================= NAVBAR ================= */
const Navbar = ({ view, nav, cartCount, menuOpen, setMenuOpen, currentUser, onSelectUser, onLogout, toast }) => {
  const [scrolled, setScrolled] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const isManagerOrAdmin = currentUser && (currentUser.role === 'manager' || currentUser.role === 'admin');

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8); f();
    window.addEventListener("scroll", f);
    return () => window.removeEventListener("scroll", f);
  }, []);
  const link = (label, target, icon) => (
    <button key={label} onClick={() => { nav(target); setUserMenu(false); setMenuOpen(false); }}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${view.name === target.name ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:text-ink hover:bg-slate-50"}`}>
      {icon && <Icon n={icon} size={15} />}{label}
    </button>);
  return (
    <header className={`sticky top-0 z-50 transition-all ${scrolled ? "bg-white/92 backdrop-blur-md shadow-[0_1px_0_rgba(13,44,90,.08)]" : "bg-white"}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <button onClick={() => nav({ name: "home" })} className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/30"><Icon n="map-pin" size={18} /></span>
          <div className="text-left">
            <span className="font-display text-lg font-bold tracking-tight block leading-tight">Spotwork</span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-brand-600 hidden sm:block">PropTech Maroc</span>
          </div>
        </button>
        <nav className="hidden lg:flex items-center gap-1">
          {link("Accueil", { name: "home" })}
          {link("Explorer", { name: "explore" }, "search")}
          {link("Mes réservations", { name: "user" }, "calendar-days")}
          {isManagerOrAdmin && link("Gestionnaire", { name: "admin" }, "bar-chart-3")}
          {!currentUser && link("Connexion", { name: "login" }, "user")}
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={() => nav({ name: "checkout" })} className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:border-brand-300 hover:text-brand-600">
            <Icon n="shopping-cart" size={17} />
            {cartCount > 0 && <span key={cartCount} className="pop absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{cartCount}</span>}
          </button>

          {currentUser ? (
            <div className="relative">
              <button onClick={() => setUserMenu(!userMenu)} className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 transition hover:border-brand-300 bg-white">
                <span className={`grid h-8 w-8 place-items-center rounded-full font-bold text-white text-[11px] shadow-sm ${currentUser.avatarBg || "bg-brand-600"}`}>
                  {currentUser.initials || "U"}
                </span>
                <div className="hidden sm:flex items-center gap-1.5 text-left">
                  <span className="text-sm font-semibold text-slate-800">{currentUser.firstName || currentUser.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${currentUser.badgeCls || "bg-blue-50 text-brand-700 border-brand-200"}`}>
                    {currentUser.roleLabel || currentUser.role}
                  </span>
                </div>
                <Icon n="chevron-down" size={14} className="text-slate-400" />
              </button>
              {userMenu && (
                <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-lift z-50">
                  {/* User Header */}
                  <div className="p-3 bg-mist rounded-xl mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`grid h-9 w-9 place-items-center rounded-xl font-bold text-white text-xs ${currentUser.avatarBg || "bg-brand-600"}`}>
                        {currentUser.initials || "U"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-ink truncate">{currentUser.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1"><Icon n="map-pin" size={11} />{currentUser.city || "Maroc"}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold border ${currentUser.badgeCls || "bg-blue-50 text-brand-700 border-brand-200"}`}>{currentUser.roleLabel || currentUser.role}</span>
                    </div>
                  </div>

                  {/* Primary Nav Links */}
                  {[
                    ["Mon espace client", "layout-grid", () => nav({ name: "user" })],
                    ["Mes favoris", "heart", () => nav({ name: "user", params: { tab: "favoris" } })],
                    ...(isManagerOrAdmin ? [["Espace gestionnaire / Admin", "bar-chart-3", () => nav({ name: "admin" })]] : [])
                  ].map(([l, i, f]) => (
                    <button key={l} onClick={() => { f(); setUserMenu(false); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-mist hover:text-ink">
                      <Icon n={i} size={15} className="text-slate-400" />{l}
                    </button>
                  ))}

                  {/* Quick Account Switcher */}
                  <div className="border-t border-slate-100 my-1.5 pt-1.5">
                    <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Changer de compte (1 clic)</p>
                    {PRESET_ACCOUNTS.map(acc => (
                      <button
                        key={acc.id}
                        onClick={() => {
                          onSelectUser(acc);
                          setUserMenu(false);
                          if (toast) toast(`Connecté : ${acc.name} (${acc.roleLabel})`, "user-check");
                        }}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-xs rounded-lg transition ${currentUser.id === acc.id ? "bg-brand-50 text-brand-700 font-bold" : "text-slate-600 hover:bg-slate-50"}`}>
                        <span className="truncate">{acc.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${acc.badgeCls}`}>{acc.roleLabel}</span>
                      </button>
                    ))}
                  </div>

                  {/* Login Page / Logout */}
                  <div className="border-t border-slate-100 mt-1.5 pt-1.5 flex gap-1.5">
                    <button onClick={() => { nav({ name: "login" }); setUserMenu(false); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition">
                      <Icon n="user" size={13} />Gérer
                    </button>
                    <button onClick={() => { onLogout(); setUserMenu(false); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition">
                      <Icon n="log-out" size={13} />Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => nav({ name: "login" })} className="flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-brand-700 transition">
              <Icon n="log-in" size={15} /><span>Se connecter</span>
            </button>
          )}

          <button onClick={() => setMenuOpen(!menuOpen)} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 lg:hidden">
            <Icon n={menuOpen ? "x" : "menu"} size={18} />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {link("Accueil", { name: "home" }, "home")}
            {link("Explorer les espaces", { name: "explore" }, "search")}
            {link("Mes réservations", { name: "user" }, "calendar-days")}
            {isManagerOrAdmin && link("Tableau de bord gestionnaire", { name: "admin" }, "bar-chart-3")}
            {currentUser ? (
              <button onClick={() => { onLogout(); setMenuOpen(false); }} className="flex w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
                <Icon n="log-out" size={16} />Déconnexion ({currentUser.firstName || currentUser.name})
              </button>
            ) : (
              link("Se connecter", { name: "login" }, "log-in")
            )}
            {link("Panier", { name: "checkout" }, "shopping-cart")}
          </div>
        </div>
      )}
    </header>
  );
};

/* ================= RECHERCHE (validation) ================= */
const SearchPanel = ({ nav }) => {
  const [city, setCity] = useState(""); const [type, setType] = useState("");
  const [date, setDate] = useState(""); const [budget, setBudget] = useState("150");
  const [errs, setErrs] = useState({});
  const submit = e => {
    e.preventDefault();
    const er = {};
    if (!city) er.city = "Choisissez une ville";
    if (!date) er.date = "Sélectionnez une date";
    setErrs(er);
    if (Object.keys(er).length) return;
    nav({ name: "explore", params: { city, type, budget, date } });
  };
  const sel = has => `${inp} appearance-none ${has ? "" : "text-slate-400"}`;
  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-lift md:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Ville" err={errs.city}>
          <div className="relative">
            <Icon n="map-pin" size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select value={city} onChange={e => setCity(e.target.value)} className={`${sel(city)} pl-9`}>
              <option value="">Toutes les villes</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </Field>
        <Field label="Type d'espace">
          <select value={type} onChange={e => setType(e.target.value)} className={sel(type)}>
            <option value="">Tous les types</option>
            {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Date" err={errs.date}>
          <input type="date" min={todayISO()} value={date} onChange={e => setDate(e.target.value)} className={`${inp} ${errs.date ? inpErr : ""}`} />
        </Field>
        <Field label="Budget max">
          <select value={budget} onChange={e => setBudget(e.target.value)} className={sel(true)}>
            <option value="35">≤ 35 DH</option><option value="60">≤ 60 DH</option>
            <option value="100">≤ 100 DH</option><option value="200">Tous budgets</option>
          </select>
        </Field>
      </div>
      <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Icon n="shield-check" size={14} className="text-emerald-500" />Annulation gratuite jusqu'à 24 h avant
        </p>
        <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[.98] sm:w-auto">
          <Icon n="search" size={16} />Rechercher un espace
        </button>
      </div>
    </form>
  );
};

/* ================= HERO ================= */
const Hero = ({ nav }) => (
  <section className="relative overflow-hidden bg-mist">
    <div className="absolute inset-0 bg-dots opacity-60" />
    <div className="absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-brand-100 blur-3xl opacity-70" />
    <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 md:px-6 md:pt-16 lg:pb-20">
      <div className="grid items-center gap-10 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
            <span className="dot-live h-2 w-2 rounded-full bg-emerald-500" />320+ espaces vérifiés · 6 villes marocaines
          </span>
          <h1 className="mt-5 font-display text-[2.4rem] font-bold leading-[1.04] tracking-tight md:text-6xl">
            <span className="mask-line"><span style={{ animationDelay: ".05s" }}>Des espaces qui</span></span>
            <span className="mask-line"><span style={{ animationDelay: ".16s" }}>donnent envie de</span></span>
            <span className="mask-line"><span style={{ animationDelay: ".27s" }} className="text-brand-600">travailler.</span></span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-slate-600">
            Bureaux privés, open spaces, salles de réunion : comparez, visitez en photos et réservez en moins de deux minutes à Casablanca, Rabat, Marrakech et dans tout le Maroc.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {["YA", "ME", "FA", "ST"].map((x, i) => (
                <span key={x} className="grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white"
                  style={{ background: ["#1F56D6", "#0D2C5A", "#5B90F7", "#142F7A"][i] }}>{x}</span>
              ))}
            </div>
            <p className="text-xs text-slate-500"><b className="text-ink">12 400+</b> professionnels au Maroc nous font confiance</p>
          </div>
          <div className="mt-8"><SearchPanel nav={nav} /></div>
        </div>
        <div className="relative hidden lg:col-span-6 lg:block">
          <div className="relative ml-auto w-[92%]">
            <div className="overflow-hidden rounded-3xl shadow-lift">
              <img src={U(IMG.f, 900)} alt="Espace de coworking lumineux au Maroc" className="h-[430px] w-full object-cover" />
            </div>
            <div className="absolute -bottom-8 -left-10 w-52 overflow-hidden rounded-2xl border-4 border-mist shadow-lift">
              <img src={U(IMG.g, 500)} alt="Professionnels au travail" className="h-32 w-full object-cover" />
            </div>
            <div className="floaty absolute -right-4 top-8 rounded-2xl bg-white p-3.5 shadow-lift">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <span className="dot-live h-1.5 w-1.5 rounded-full bg-emerald-500" />Occupation en direct
              </p>
              <p className="mt-1 font-display text-sm font-bold">L'Atelier Maarif · Casablanca</p>
              <div className="mt-2 h-1.5 w-36 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[86%] rounded-full bg-brand-600" />
              </div>
              <p className="mt-1 text-[11px] font-semibold text-brand-700">86 % occupé</p>
            </div>
            <div className="floaty absolute -left-16 top-40 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-lift" style={{ animationDelay: "1.4s" }}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-amber-500"><Icon n="star" size={16} fill="currentColor" /></span>
              <div><p className="font-display text-sm font-bold">4,9 / 5</p><p className="text-[11px] text-slate-400">2 140 avis vérifiés</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ================= CHARTS ================= */
const AreaChart = ({ data, labels }) => {
  const [hov, setHov] = useState(-1);
  const W = 560, H = 210, P = 16, color = "#1F56D6";
  const min = Math.min(...data) * 0.88, max = Math.max(...data) * 1.05;
  const X = i => P + i * (W - 2 * P) / (data.length - 1);
  const Y = v => H - 30 - ((v - min) / (max - min)) * (H - 58);
  const pts = data.map((v, i) => [X(i), Y(v)]);
  const line = smoothPath(pts);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".22" /><stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient></defs>
        {[.22, .5, .78].map(t => <line key={t} x1={P} x2={W - P} y1={14 + (H - 50) * t} y2={14 + (H - 50) * t} stroke="#E6ECF5" strokeDasharray="3 6" />)}
        <path d={line + ` L${X(data.length - 1)},${H - 26} L${X(0)},${H - 26} Z`} fill="url(#ag)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" className="chart-line" />
        {pts.map(([x, y], i) => (
          <g key={i}>
            {hov === i && <g><line x1={x} x2={x} y1={16} y2={H - 28} stroke={color} strokeDasharray="3 4" strokeWidth="1" /><circle cx={x} cy={y} r="4.5" fill="#fff" stroke={color} strokeWidth="2.5" /></g>}
            <rect x={x - 22} y="0" width="44" height={H} fill="transparent" onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(-1)} />
          </g>
        ))}
        {labels.map((l, i) => <text key={i} x={X(i)} y={H - 8} fontSize="9.5" fill="#8CA0B8" textAnchor="middle" fontWeight="600">{l}</text>)}
      </svg>
      {hov >= 0 && (
        <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: `${X(hov) / W * 100}%`, top: `${Y(data[hov]) / H * 100}%` }}>
          <span className="opacity-60">{labels[hov]} · </span><b>{EUR.format(data[hov] * 1000)}</b>
        </div>
      )}
    </div>
  );
};
const WeekBars = ({ data, labels }) => {
  const best = data.indexOf(Math.max(...data));
  return (
    <div className="flex h-40 items-end gap-2.5">
      {data.map((v, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center gap-2">
          <div className="relative flex h-full w-full items-end">
            <div className="grow w-full rounded-md" style={{ height: `${v}%`, background: i === best ? "#1F56D6" : "#D9E4F7", animationDelay: `${i * 70}ms` }} />
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">{v}%</span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
};
const Donut = ({ items, center }) => {
  const total = items.reduce((s, x) => s + x.v, 0);
  const r = 52, C = 2 * Math.PI * r; let acc = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF2F8" strokeWidth="16" />
        {items.map((it, i) => {
          const frac = it.v / total, len = Math.max(frac * C - 3, 1);
          const el = <circle key={i} cx="70" cy="70" r={r} fill="none" stroke={it.c} strokeWidth="16"
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc * C} transform="rotate(-90 70 70)" />;
          acc += frac; return el;
        })}
        <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0A1B33" fontFamily="Space Grotesk">{center[0]}</text>
        <text x="70" y="82" textAnchor="middle" fontSize="9" fill="#8CA0B8">{center[1]}</text>
      </svg>
      <ul className="space-y-2">
        {items.map(it => (
          <li key={it.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: it.c }} />
            <span className="text-slate-600">{it.label}</span>
            <b className="text-ink">{Math.round(it.v / total * 100)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
};
const Spark = ({ data, color }) => {
  const W = 88, H = 30, max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - 3 - ((v - min) / ((max - min) || 1)) * (H - 8)}`).join(" ");
  return <svg width={W} height={H} className="overflow-visible"><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
};
const Ring = ({ v }) => (
  <svg width="46" height="46" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="16" fill="none" stroke="#E4EBF5" strokeWidth="4" />
    <circle cx="20" cy="20" r="16" fill="none" stroke="#1F56D6" strokeWidth="4" strokeLinecap="round"
      pathLength="100" strokeDasharray={`${v} ${100 - v}`} transform="rotate(-90 20 20)" />
    <text x="20" y="24" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0A1B33">{v}%</text>
  </svg>
);

/* ================= HOME ================= */
const Home = ({ nav, favs, toggleFav, spaces = [], bookings = [], currentUser = null, userBookings = [] }) => {
  const featured = spaces.filter(s => s.featured);

  // Recommandations IA personnalisées pour la page d'accueil
  const homeAiRecs = useMemo(() => {
    if (!currentUser) return [];
    const p = currentUser.preferences || {};
    const prefCity = (p.city || currentUser.city || "Casablanca").toLowerCase();
    const prefType = (p.type || "open").toLowerCase();

    return spaces.map(s => {
      let score = 55 + Math.round((s.rating - 4.0) * 14);
      const tags = [];
      let reason = "";

      if (s.city.toLowerCase() === prefCity) {
        score += 24;
        tags.push(`📍 ${s.city}`);
      }
      if (s.type.toLowerCase() === prefType) {
        score += 20;
        tags.push(`🏢 ${TYPES.find(t => t.id === s.type)?.label || s.type}`);
      }
      if (favs.has(s.id)) {
        score += 15;
        tags.push("❤️ Coup de cœur");
      }
      if (userBookings.some(b => b.spaceId === s.id)) {
        score += 12;
        tags.push("🔄 Habitude");
      }

      const matchScore = Math.min(99, Math.max(75, score));
      if (s.city.toLowerCase() === prefCity && s.type.toLowerCase() === prefType) {
        reason = `Aligné sur votre préférence active : ${TYPES.find(t => t.id === s.type)?.label} à ${s.city}.`;
      } else if (s.city.toLowerCase() === prefCity) {
        reason = `Recommandé selon vos habitudes à ${s.city} · Noté ${s.rating}/5.`;
      } else {
        reason = `Espace prisé des coworkers marocains avec équipement complet.`;
      }

      return { s, score: matchScore, reason, tags };
    }).sort((a, b) => b.score - a.score).slice(0, 3);
  }, [currentUser, userBookings, favs, spaces]);

  return (
    <main>
      <Hero nav={nav} />
      {/* Marquee */}
      <div className="border-y border-slate-100 bg-white py-4">
        <div className="overflow-hidden">
          <div className="marquee flex w-max items-center gap-10 text-sm font-semibold text-slate-400">
            {[0, 1].map(k => (
              <div key={k} className="flex items-center gap-10">
                {[...CITIES, ...CITIES].map((c, i) => (
                  <span key={c + i} className="flex items-center gap-10 whitespace-nowrap">
                    <span className="font-display">{c}</span>
                    <Icon n="asterisk" size={12} className="text-brand-300" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Types */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <SecHead kicker="Parcourir" title="Explorer par type d'espace" />
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0" data-reveal>
          {TYPES.map((t, i) => {
            const count = spaces.filter(s => s.type === t.id).length;
            return (
              <button key={t.id} onClick={() => nav({ name: "explore", params: { type: t.id } })}
                className="group flex shrink-0 items-center gap-3 rounded-full border border-slate-200 bg-white py-2.5 pl-3.5 pr-5 transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-card"
                style={{ transitionDelay: `${i * 40}ms` }}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                  <Icon n={t.icon} size={16} />
                </span>
                <span className="text-left"><span className="block text-sm font-bold">{t.label}</span>
                  <span className="block text-[11px] text-slate-400">{count} espace{count > 1 ? "s" : ""}</span></span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recommandations IA Personnalisées si connecté */}
      {currentUser && homeAiRecs.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14 md:px-6">
          <div className="rounded-3xl border border-brand-200/90 bg-gradient-to-r from-brand-50/70 via-white to-indigo-50/40 p-6 md:p-8 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-bold text-brand-700 shadow-2xs">
                  <Icon n="sparkles" size={13} className="text-brand-600" />Recommandations IA pour vous
                </span>
                <h2 className="mt-2 font-display text-2xl font-bold text-ink">
                  Sélectionné pour {currentUser.firstName || currentUser.name}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  D'après vos préférences ({currentUser.city || "Casablanca"}) et vos habitudes de travail.
                </p>
              </div>
              <button
                onClick={() => nav({ name: "user", params: { tab: "ia" } })}
                className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 transition shadow-sm"
              >
                <Icon n="brain" size={13} />Voir mon profil IA complet
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {homeAiRecs.map(({ s, score, reason, tags }) => (
                <div key={s.id} className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-lift transition flex flex-col justify-between">
                  <div>
                    <div className="relative h-36 overflow-hidden rounded-xl mb-3">
                      <img src={U(s.imgs[0], 500)} alt={s.name} className="h-full w-full object-cover" />
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-ink/80 backdrop-blur px-2.5 py-0.5 text-[10px] font-bold text-white flex items-center gap-1">
                        <Icon n="sparkles" size={10} className="text-amber-400" />Match {score}%
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display font-bold text-sm text-ink">{s.name}</h3>
                        <p className="text-xs text-slate-500">{s.city} · {s.district}</p>
                      </div>
                      <span className="font-display font-bold text-xs text-brand-700">{s.price} DH/h</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {tags.map((t, idx) => (
                        <span key={idx} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">{t}</span>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-600 leading-snug flex items-start gap-1">
                      <Icon n="sparkles" size={11} className="mt-0.5 shrink-0 text-brand-600" />
                      {reason}
                    </p>
                  </div>
                  <button
                    onClick={() => nav({ name: "space", params: { id: s.id } })}
                    className="mt-3.5 w-full rounded-xl bg-slate-50 border border-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition"
                  >
                    Découvrir l'espace
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* En vedette */}
      <section className="bg-mist py-14">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SecHead kicker="Sélection" title="Espaces en vedette cette semaine"
            action={<button onClick={() => nav({ name: "explore" })} className="flex items-center gap-1.5 text-sm font-bold text-brand-600 transition hover:gap-2.5">Tout voir<Icon n="arrow-right" size={15} /></button>} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((s, i) => (
              <div key={s.id} data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
                <SpaceCard s={s} nav={nav} favs={favs} toggleFav={toggleFav} bookings={bookings} />
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Comment ça marche */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <SecHead kicker="Simple et rapide" title="Réservez en trois temps" />
        <div className="relative grid gap-10 md:grid-cols-3 md:gap-6">
          <div className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-slate-200 md:block" />
          {[
            { n: "01", i: "search", t: "Cherchez & comparez", d: "Filtrez par ville, type, budget et équipements. Photos réelles, avis vérifiés, tarifs transparents." },
            { n: "02", i: "badge-check", t: "Réservez en 2 min", d: "Choisissez votre créneau, payez en ligne de façon sécurisée. Confirmation instantanée par e-mail." },
            { n: "03", i: "calendar-check", t: "Installez-vous", d: "Accès direct le jour J. Annulation gratuite jusqu'à 24 h avant, report en un clic." }
          ].map((s, i) => (
            <div key={s.n} className="relative flex gap-4 md:flex-col md:gap-0" data-reveal style={{ transitionDelay: `${i * 100}ms` }}>
              <div className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-navy text-white shadow-lg">
                <Icon n={s.i} size={22} />
              </div>
              <div className="md:mt-5">
                <p className="font-display text-xs font-bold tracking-[0.25em] text-brand-500">{s.n}</p>
                <h3 className="mt-1 font-display text-lg font-bold">{s.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* Teaser gestionnaire */}
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-navy p-8 md:p-12" data-reveal>
          <div className="absolute inset-0 bg-grid" />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl" />
          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div>
              <Kicker><span className="text-brand-300">Vous gérez un espace ?</span></Kicker>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-white md:text-4xl">
                Remplissez vos salles pendant qu'elles dorment.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
                Tableau de bord temps réel : occupation, revenus, réservations. Synchronisez vos disponibilités et laissez la demande venir à vous.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-6 text-white">
                {[["+32 %", "d'occupation moyenne"], ["0 €", "avant la première réservation"]].map(([v, l]) => (
                  <div key={l}><p className="font-display text-2xl font-bold text-brand-300">{v}</p><p className="text-xs text-slate-400">{l}</p></div>
                ))}
              </div>
              <button onClick={() => nav({ name: "admin" })} className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-navy transition hover:bg-brand-50 active:scale-[.98]">
                Découvrir le dashboard gestionnaire<Icon n="arrow-right" size={15} />
              </button>
            </div>
            <div className="relative">
              <div className="rotate-2 rounded-2xl bg-white p-4 shadow-lift transition-transform duration-500 hover:rotate-0">
                <div className="flex items-center justify-between"><p className="text-xs font-bold">Revenus · Ce mois</p><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">+12,4 %</span></div>
                <p className="font-display text-2xl font-bold">231 000 DH</p>
                <Spark data={[8, 10, 9, 13, 12, 15, 17, 16, 19]} color="#1F56D6" />
                <div className="mt-3 space-y-2">
                  {[["L'Atelier Maarif", 86], ["Le Hub Agdal", 91], ["Studio Guéliz", 82]].map(([n, v]) => (
                    <div key={n} className="flex items-center gap-2 text-[11px]">
                      <span className="w-24 truncate font-semibold text-slate-500">{n}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: v + "%" }} /></div>
                      <b>{v}%</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Témoignages */}
      <section className="bg-mist py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SecHead kicker="Ils en parlent mieux que nous" title="La communauté Spotwork Maroc" />
          <div className="grid gap-5 lg:grid-cols-3">
            <figure className="relative rounded-3xl bg-navy p-8 text-white lg:col-span-2" data-reveal>
              <Icon n="quote" size={34} className="text-brand-400" />
              <blockquote className="mt-4 font-display text-xl font-semibold leading-relaxed md:text-2xl">
                "J'ai testé quatre espaces entre Casablanca et Rabat en deux semaines sans aucune friction. Le dashboard me suit partout, mes factures en Dirhams sont centralisées."
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-500 font-bold">ST</span>
                <div><p className="text-sm font-bold">Salma Tazi</p><p className="text-xs text-slate-400">Consultante Stratégie · Rabat</p></div>
                <div className="ml-auto"><Stars v={5} /></div>
              </figcaption>
            </figure>
            <div className="grid gap-5">
              {[
                { t: "La gestion de nos 3 espaces à Casablanca est devenue limpide. L'occupation a augmenté de 28 points en un trimestre.", n: "Karim B.", r: "Gérant Coworking · Casablanca", d: "KB" },
                { t: "Réservation un dimanche soir à 23 h pour le lundi matin à Marrakech. Expérience digitale remarquable.", n: "Youssef A.", r: "Développeur Cloud · Marrakech", d: "YA" }
              ].map((x, i) => (
                <figure key={x.n} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card" data-reveal style={{ transitionDelay: `${i * 120}ms` }}>
                  <blockquote className="text-sm leading-relaxed text-slate-600">"{x.t}"</blockquote>
                  <figcaption className="mt-4 flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">{x.d}</span>
                    <div><p className="text-xs font-bold">{x.n}</p><p className="text-[11px] text-slate-400">{x.r}</p></div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

/* ================= EXPLORER ================= */
const FilterPanel = ({ f, setF }) => {
  const flipType = id => setF(p => ({ ...p, types: p.types.includes(id) ? p.types.filter(t => t !== id) : [...p.types, id] }));
  const flipAm = id => setF(p => ({ ...p, am: p.am.includes(id) ? p.am.filter(t => t !== id) : [...p.am, id] }));
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Ville</label>
        <select value={f.city} onChange={e => setF({ ...f, city: e.target.value })} className={inp}>
          <option value="">Toutes les villes</option>
          {CITIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Type</label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(t => (
            <button key={t.id} onClick={() => flipType(t.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${f.types.includes(t.id) ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"}`}>
              <Icon n={t.icon} size={12} />{t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 flex justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
          <span>Prix max</span><span className="text-brand-600">{f.max >= 150 ? "Illimité" : EUR.format(f.max)}</span>
        </label>
        <input type="range" min="10" max="150" step="5" value={f.max}
          onChange={e => setF({ ...f, max: +e.target.value })} className="w-full accent-[#1F56D6]" />
        <div className="flex justify-between text-[10px] text-slate-400"><span>10 DH</span><span>150 DH+</span></div>
      </div>
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Équipements</label>
        <div className="space-y-2.5">
          {AMENITIES.slice(0, 6).map(a => (
            <label key={a.id} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
              <input type="checkbox" checked={f.am.includes(a.id)} onChange={() => flipAm(a.id)} className="h-4 w-4 rounded accent-[#1F56D6]" />
              <Icon n={a.icon} size={14} className="text-slate-400" />{a.label}
            </label>
          ))}
        </div>
      </div>
      <button onClick={() => setF({ city: "", types: [], max: 150, am: [] })} className="flex items-center gap-1.5 text-xs font-bold text-rose-500 transition hover:text-rose-600">
        <Icon n="x" size={13} />Réinitialiser les filtres
      </button>
    </div>
  );
};

const Explore = ({ params, nav, favs, toggleFav, spaces = [], bookings = [] }) => {
  const [f, setF] = useState(() => ({
    city: params?.city || "", types: params?.type ? [params.type] : [],
    max: params?.budget ? +params.budget : 150, am: [],
    date: params?.date || "2026-10-01",
    onlyAvailable: false
  }));
  const [sort, setSort] = useState("reco");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    let r = spaces.filter(s => {
      const matchCity = !f.city || s.city === f.city;
      const matchType = !f.types.length || f.types.includes(s.type);
      const matchBudget = f.max >= 150 || s.price <= f.max;
      const matchAm = f.am.every(a => s.am.includes(a));
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
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>Catalogue & Disponibilités en temps réel</Kicker>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Explorer les espaces</h1>
          <p className="mt-1 text-sm text-slate-500"><b className="text-ink">{results.length}</b> espace{results.length > 1 ? "s" : ""} {f.onlyAvailable ? "avec places libres" : "référencé" + (results.length > 1 ? "s" : "")}
            {f.city && <span> à <b className="text-brand-600">{f.city}</b></span>}
            {f.date && <span> pour le <b>{fmtDate(f.date)}</b></span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Date Selector */}
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold shadow-2xs">
            <Icon n="calendar" size={13} className="text-brand-600" />
            <span className="text-slate-400">Date :</span>
            <input
              type="date"
              min={todayISO()}
              value={f.date}
              onChange={e => setF(prev => ({ ...prev, date: e.target.value }))}
              className="border-none bg-transparent outline-none text-xs font-bold text-ink cursor-pointer"
            />
          </div>
          {/* Toggle Only Available */}
          <button
            onClick={() => setF(prev => ({ ...prev, onlyAvailable: !prev.onlyAvailable }))}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition border ${f.onlyAvailable
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:border-brand-300"
              }`}
          >
            <Icon n={f.onlyAvailable ? "check-circle-2" : "filter"} size={13} />
            <span>Places libres uniquement</span>
          </button>
          <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold lg:hidden">
            <Icon n="sliders-horizontal" size={13} />Filtres
          </button>
          <select value={sort} onChange={e => setSort(e.target.value)} className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold outline-none focus:border-brand-500">
            <option value="reco">Recommandés</option><option value="note">Mieux notés</option>
            <option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option>
          </select>
        </div>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className={`${open ? "block" : "hidden"} lg:block`}>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:sticky lg:top-24">
            <FilterPanel f={f} setF={setF} />
          </div>
        </aside>
        <div>
          {results.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-200 py-24 text-center">
              <div>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mist text-slate-400"><Icon n="search-x" size={24} /></span>
                <p className="mt-4 font-display font-bold">Aucun espace ne correspond</p>
                <p className="mt-1 text-sm text-slate-500">{f.onlyAvailable ? "Tous les espaces sont complets pour cette date ou vos filtres sont trop stricts." : "Essayez d'élargir vos critères."}</p>
                <button onClick={() => setF({ city: "", types: [], max: 150, am: [], date: "2026-10-01", onlyAvailable: false })} className="mt-4 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white">Effacer les filtres</button>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((s, i) => (
                <div key={s.id} data-reveal style={{ transitionDelay: `${(i % 3) * 60}ms` }}>
                  <SpaceCard s={s} nav={nav} favs={favs} toggleFav={toggleFav} date={f.date} bookings={bookings} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

/* ================= DÉTAIL ESPACE AVEC SYNCHRONISATION DES PLACES ET DU PLANNING ================= */
const SpaceDetail = ({ id, nav, favs, toggleFav, reserve, spaces = [], bookings = [], currentUser = null, onUpdateSpace = null }) => {
  const s = spaces.find(x => x.id === id || String(x.id) === String(id) || (x.dbId && String(x.dbId) === String(id)));
  const [editingSpace, setEditingSpace] = useState(null);
  const isManagerOrAdmin = currentUser && (currentUser.role === 'manager' || currentUser.role === 'admin');
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
      SpotworkAPI.getSpaceById(s.dbId || s.id).then(res => {
        if (res && res.reviews && Array.isArray(res.reviews) && res.reviews.length > 0) {
          setSpaceReviews(res.reviews.map(r => ({
            id: r.id,
            n: r.users?.full_name || "Membre Spotwork",
            role: "Résident",
            d: r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : "Récemment",
            stars: r.rating || 5,
            t: r.comment
          })));
        } else {
          setSpaceReviews([]);
        }
      });
    }
  }, [s?.id]);

  if (!s) return (
    <main className="py-24 text-center">
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <span className="grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-brand-600 text-white">
          <Icon n="loader-2" size={22} className="animate-spin" />
        </span>
        <p className="mt-4 font-semibold text-slate-700">Chargement de l'espace depuis la base de données...</p>
      </div>
    </main>
  );
  const liked = favs.has(s.id);
  const isHour = s.unit === "heure";
  const base = isHour ? slots.length * s.price * seatsCount : days * s.price * seatsCount;
  const fees = Math.round(base * 0.08 * 100) / 100;

  // Calcul dynamique des places et disponibilités selon les réservations enregistrées
  const availability = useMemo(() => getSpaceAvailability(s, date, bookings), [s, date, bookings]);
  const upcomingDates = useMemo(() => getNextAvailableDates(s, bookings, 7), [s, bookings]);

  // Réajuster les créneaux si l'utilisateur augmente le nombre de places demandées
  const updateSeatsCount = newCount => {
    const clamped = Math.max(1, Math.min(s.cap || 1, newCount));
    setSeatsCount(clamped);
    if (isHour && slots.length > 0) {
      const validSlots = slots.filter(h => {
        const free = availability.hourlyFreeSeats[h] !== undefined ? availability.hourlyFreeSeats[h] : (s.cap || 1);
        return free >= clamped;
      });
      if (validSlots.length < slots.length) {
        setSlots(validSlots);
        setErr(`Certains créneaux ont été désélectionnés car ils comptent moins de ${clamped} place(s) libre(s).`);
      } else {
        setErr("");
      }
    }
  };

  const flipSlot = h => {
    if (availability.isSoldOut || availability.isPast) return;
    if (availability.pastHours.includes(h)) {
      setErr(`Le créneau horaire ${h} est déjà passé et ne peut plus être réservé.`);
      return;
    }
    const freeSeats = availability.hourlyFreeSeats[h] !== undefined ? availability.hourlyFreeSeats[h] : (s.cap || 1);
    if (!slots.includes(h)) {
      if (freeSeats <= 0) {
        setErr(`Le créneau ${h} est complet (0 place disponible).`);
        return;
      }
      if (freeSeats < seatsCount) {
        setErr(`Le créneau ${h} ne dispose que de ${freeSeats} place${freeSeats > 1 ? "s" : ""} disponible${freeSeats > 1 ? "s" : ""} (vous avez sélectionné ${seatsCount} place${seatsCount > 1 ? "s" : ""}).`);
        return;
      }
    }
    setErr("");
    setSlots(p => p.includes(h) ? p.filter(x => x !== h) : [...p, h].sort());
  };

  const book = () => {
    if (availability.isPast || availability.allHoursPast) {
      setErr(`Cette date est passée ou tous ses créneaux horaires sont écoulés. Veuillez choisir une date future.`);
      return;
    }
    if (availability.isSoldOut) {
      setErr(`Cet espace est complet pour le ${fmtDate(date)}. Choisissez une autre date disponible.`);
      return;
    }
    if (isHour) {
      if (slots.length === 0) {
        setErr("Sélectionnez au moins un créneau horaire.");
        return;
      }
      for (const h of slots) {
        if (availability.pastHours.includes(h)) {
          setErr(`Le créneau ${h} est déjà passé et ne peut plus être réservé.`);
          return;
        }
        const freeSeats = availability.hourlyFreeSeats[h] !== undefined ? availability.hourlyFreeSeats[h] : (s.cap || 1);
        if (freeSeats < seatsCount) {
          setErr(`Le créneau ${h} ne dispose que de ${freeSeats} place(s) libre(s) pour votre demande de ${seatsCount} place(s).`);
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
      slots: slots,
      isHour: isHour,
      meta: isHour
        ? `${fmtDate(date)} · ${slots.length} h (${slots.join(', ')}) · ${seatsCount} place${seatsCount > 1 ? "s" : ""}`
        : `${fmtDate(date)} · ${days} jour${days > 1 ? "s" : ""} · ${seatsCount} place${seatsCount > 1 ? "s" : ""}`,
      total: base + fees
    });
  };
  const similar = spaces.filter(x => x.id !== s.id && (x.city === s.city || x.type === s.type)).slice(0, 3);
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <button onClick={() => nav({ name: "explore" })} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-ink">
        <Icon n="arrow-left" size={16} />Retour aux résultats
      </button>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge label={s.badge} />
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">{TYPES.find(t => t.id === s.type)?.label || s.type}</span>
            </div>
            {isManagerOrAdmin && onUpdateSpace && (
              <button
                onClick={() => setEditingSpace(s)}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-bold text-amber-900 shadow-sm hover:bg-amber-100 transition">
                <Icon n="pencil" size={13} />
                <span>Modifier cet espace (Admin)</span>
              </button>
            )}
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">{s.name}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1"><Icon n="map-pin" size={13} />{s.city} · {s.district}</span>
            <span className="flex items-center gap-1"><Icon n="star" size={13} fill="currentColor" className="text-amber-400" /><b className="text-ink">{s.rating.toLocaleString('fr-FR')}</b>({s.rev} avis)</span>
          </p>

          {/* Statut disponibilité dynamique */}
          {availability.isPast || availability.allHoursPast ? (
            <div className="mt-4 rounded-2xl border border-slate-300 bg-slate-100/90 p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-500 text-white">
                  <Icon n="clock" size={13} />
                </span>
                {availability.isPast
                  ? `Date passée (${fmtDate(date)}) — Réservations impossibles`
                  : `Journée terminée pour le ${fmtDate(date)} — Tous les créneaux horaires sont écoulés`}
              </div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Il n'est plus possible de réserver pour cette date car les horaires sont déjà passés. Veuillez sélectionner une date ultérieure dans le planning ci-dessous.
              </p>
            </div>
          ) : availability.isSoldOut ? (
            <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50/90 p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-600 text-white">
                  <Icon n="alert-triangle" size={13} />
                </span>
                COMPLET pour le {fmtDate(date)} — 0 place disponible
              </div>
              <p className="mt-1 text-xs text-rose-700 leading-relaxed">
                Cet espace est entièrement réservé sur cette date. Consultez les autres dates disponibles ci-contre ou dans le sélecteur ci-dessous.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50/80 p-3.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-white">
                  <Icon n="check" size={13} />
                </span>
                <span>
                  {availability.minFreeSeats === availability.availableSeats
                    ? `${availability.availableSeats} place${availability.availableSeats > 1 ? "s" : ""} disponible${availability.availableSeats > 1 ? "s" : ""} sur ${availability.totalCapacity} pour le ${fmtDate(date)}`
                    : `De ${availability.minFreeSeats} à ${availability.availableSeats} places libres selon les heures (capacité : ${availability.totalCapacity} places) pour le ${fmtDate(date)}`}
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-200/70 px-2.5 py-0.5 rounded-full">
                Réservation ouverte
              </span>
            </div>
          )}

          {/* Galerie */}
          <div className="mt-5 grid grid-cols-4 gap-2.5">
            <div className="col-span-4 overflow-hidden rounded-2xl md:col-span-3">
              <img src={U(s.imgs[img], 1100)} alt={s.name} className="h-64 w-full object-cover transition-all duration-500 md:h-[380px]" />
            </div>
            <div className="col-span-4 grid grid-cols-3 gap-2.5 md:col-span-1 md:grid-cols-1">
              {s.imgs.map((im, i) => (
                <button key={i} onClick={() => setImg(i)}
                  className={`overflow-hidden rounded-xl transition ${img === i ? "ring-2 ring-brand-600 ring-offset-2" : "opacity-80 hover:opacity-100"}`}>
                  <img src={U(im, 300)} alt="" className="h-20 w-full object-cover md:h-[118px]" />
                </button>
              ))}
            </div>
          </div>
          {/* Infos clés */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["users", "Capacité totale", `${s.cap} pers.`], ["user-check", "Places libres", `${availability.availableSeats} pers.`], ["ruler", "Surface", s.surface], ["clock", "Réservation", isHour ? "À l'heure" : "À la journée"]].map(([i, l, v]) => (
              <div key={l} className="rounded-xl border border-slate-200 p-3.5 bg-white shadow-2xs">
                <Icon n={i} size={17} className="text-brand-600" />
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{l}</p>
                <p className="text-sm font-bold text-ink">{v}</p>
              </div>
            ))}
          </div>
          {/* Description */}
          <div className="mt-8">
            <h2 className="font-display text-lg font-bold">À propos de cet espace</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.desc}</p>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-mist p-4">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-navy text-sm font-bold text-white">{s.host.split(" ").map(w => w[0]).join("")}</span>
              <div><p className="text-sm font-bold">Géré par {s.host}</p><p className="text-xs text-slate-500">Répond en ~1 h · Membre certifié PropTech Maroc</p></div>
            </div>
          </div>
          {/* Équipements */}
          <div className="mt-8">
            <h2 className="font-display text-lg font-bold">Équipements inclus</h2>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {s.am.map(a => {
                const am = AMENITIES.find(x => x.id === a);
                return <span key={a} className="flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white"><Icon n={am.icon} size={14} className="text-brand-600" />{am.label}</span>;
              })}
            </div>
          </div>

          {/* Localisation & Plan d'accès */}
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-lg font-bold flex items-center gap-2">
                  <Icon n="map-pin" size={20} className="text-brand-600" />
                  Localisation & Plan d'accès
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {s.address || `${s.district}, ${s.city}, Maroc`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${s.lat || 33.5855},${s.lng || -7.6322}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-1.5 text-xs font-bold transition shadow-2xs"
                >
                  <Icon n="external-link" size={13} /> Ouvrir dans Google Maps
                </a>
              </div>
            </div>

            {/* Carte interactive OpenStreetMap */}
            <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
              <iframe
                title={`Carte - ${s.name}`}
                width="100%"
                height="100%"
                loading="lazy"
                style={{ border: 0 }}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${(s.lng || -7.6322) - 0.01}%2C${(s.lat || 33.5855) - 0.007}%2C${(s.lng || -7.6322) + 0.01}%2C${(s.lat || 33.5855) + 0.007}&layer=mapnik&marker=${s.lat || 33.5855}%2C${s.lng || -7.6322}`}
              />
            </div>

            {/* Repères transports & Coordonnées GPS */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 flex items-start gap-2.5">
                <span className="p-2 rounded-lg bg-white shadow-2xs text-brand-600 mt-0.5 shrink-0">
                  <Icon n="navigation" size={16} />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Accès & Transports</p>
                  <p className="text-xs text-slate-700 font-medium mt-0.5 leading-relaxed">
                    {s.transport || "Desservi par tramway, bus et stations taxis à proximité immédiate."}
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 flex items-start gap-2.5">
                <span className="p-2 rounded-lg bg-white shadow-2xs text-emerald-600 mt-0.5 shrink-0">
                  <Icon n="compass" size={16} />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Coordonnées GPS</p>
                  <p className="text-xs font-mono text-slate-700 font-medium mt-0.5">
                    Lat: {(s.lat || 33.5855).toFixed(4)} · Lng: {(s.lng || -7.6322).toFixed(4)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Quartier {s.district} · {s.city}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Avis */}
          <div className="mt-8">
            <h2 className="font-display text-lg font-bold">Avis des membres</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-[220px_1fr]">
              <div className="rounded-2xl border border-slate-200 p-5 text-center h-fit bg-white">
                <p className="font-display text-4xl font-bold">{s.rating.toLocaleString('fr-FR')}</p>
                <div className="mt-1 flex justify-center"><Stars v={s.rating} /></div>
                <p className="mt-1 text-xs text-slate-400">{s.rev} avis</p>
                <div className="mt-4 space-y-1.5">
                  {[70, 20, 6, 3, 1].map((w, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="w-3">{5 - i}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: w + "%" }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {spaceReviews.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                    Aucun avis pour le moment pour cet espace.
                  </div>
                ) : (
                  spaceReviews.map(r => (
                    <article key={r.id || r.n} className="rounded-2xl border border-slate-200 p-5 bg-white shadow-2xs">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{(r.n || "M")[0]}</span>
                        <div><p className="text-sm font-bold">{r.n}</p><p className="text-[11px] text-slate-400">{r.role} · {r.d}</p></div>
                        <div className="ml-auto"><Stars v={r.stars} size={11} /></div>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">{r.t}</p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Carte réservation synchronisée au planning */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lift">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-2xl font-bold">{EUR.format(s.price)}<span className="text-sm font-medium text-slate-400"> /{s.unit}</span></p>
              <button onClick={() => toggleFav(s.id)} className={`grid h-10 w-10 place-items-center rounded-full border transition ${liked ? "border-rose-200 bg-rose-50 text-rose-500" : "border-slate-200 text-slate-400 hover:text-rose-500"}`}>
                <Icon n="heart" size={17} fill={liked ? "currentColor" : "none"} className={liked ? "pop" : ""} />
              </button>
            </div>

            {/* Planning & Sélecteur de date */}
            <div className="mt-4 space-y-3.5">
              <Field label="Date souhaitée">
                <input
                  type="date"
                  min={todayISO()}
                  value={date}
                  onChange={e => {
                    const val = e.target.value;
                    if (val && val < todayISO()) {
                      setErr("Impossible de sélectionner une date déjà passée.");
                      return;
                    }
                    setDate(val);
                    setSlots([]);
                    setErr("");
                  }}
                  className={inp}
                />
              </Field>

              {/* Calendrier rapide des 7 prochains jours */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                  <span>Disponibilités des 7 prochains jours :</span>
                </p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {upcomingDates.map(item => {
                    const isSelected = item.date === date;
                    const isPassed = item.isPast || item.allHoursPast;
                    return (
                      <button
                        key={item.date}
                        type="button"
                        onClick={() => {
                          setDate(item.date);
                          setSlots([]);
                          setErr("");
                        }}
                        className={`p-2 rounded-xl border text-left text-xs transition ${
                          isSelected
                            ? "border-brand-600 bg-brand-50/70 ring-2 ring-brand-600/30"
                            : isPassed
                              ? "border-slate-200 bg-slate-100/70 opacity-80 hover:bg-slate-100"
                              : item.isSoldOut
                                ? "border-rose-200 bg-rose-50/50 hover:bg-rose-50"
                                : "border-slate-200 hover:border-brand-300 bg-white"
                        }`}
                      >
                        <p className="font-bold text-ink truncate capitalize">{item.label}</p>
                        <span className={`inline-block mt-1 text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                          isPassed
                            ? "bg-slate-200 text-slate-600"
                            : item.isSoldOut
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {isPassed ? "Terminé" : item.isSoldOut ? "Complet (0)" : `${item.availableSeats} libre${item.availableSeats > 1 ? "s" : ""}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sélecteur du nombre de places souhaité */}
              <Field label={`Nombre de places (${seatsCount} personne${seatsCount > 1 ? "s" : ""})`}>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/70">
                  <button
                    type="button"
                    onClick={() => updateSeatsCount(seatsCount - 1)}
                    disabled={seatsCount <= 1}
                    className={`grid h-8 w-8 place-items-center rounded-full transition ${
                      seatsCount <= 1
                        ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                        : "bg-white text-ink shadow-2xs hover:bg-brand-50"
                    }`}
                  >
                    <Icon n="minus" size={14} />
                  </button>
                  <div className="text-center">
                    <span className="text-sm font-bold text-ink">{seatsCount} place{seatsCount > 1 ? "s" : ""}</span>
                    <span className="block text-[10px] text-slate-500 font-medium">sur {s.cap} au total</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSeatsCount(seatsCount + 1)}
                    disabled={seatsCount >= (s.cap || 1)}
                    className={`grid h-8 w-8 place-items-center rounded-full transition ${
                      seatsCount >= (s.cap || 1)
                        ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                        : "bg-white text-ink shadow-2xs hover:bg-brand-50"
                    }`}
                  >
                    <Icon n="plus" size={14} />
                  </button>
                </div>
              </Field>

              {isHour ? (
                <Field label={`Créneaux horaires (${slots.length} sélectionné${slots.length > 1 ? "s" : ""})`} err={err}>
                  {availability.isPast || availability.allHoursPast ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 text-center text-xs text-slate-600 font-semibold">
                      Tous les créneaux horaires sont écoulés pour cette journée
                    </div>
                  ) : availability.isSoldOut ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs text-rose-700 font-semibold">
                      Tous les créneaux sont réservés pour cette journée
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5">
                      {HOURS.map((h) => {
                        const isPast = availability.pastHours.includes(h);
                        const freeSeats = availability.hourlyFreeSeats[h] !== undefined ? availability.hourlyFreeSeats[h] : (s.cap || 1);
                        const isSlotSoldOut = freeSeats <= 0;
                        const notEnoughSeats = freeSeats < seatsCount;
                        const disabled = isPast || isSlotSoldOut || notEnoughSeats;
                        const on = slots.includes(h);
                        return (
                          <button
                            key={h}
                            type="button"
                            disabled={disabled}
                            onClick={() => flipSlot(h)}
                            title={
                              isPast
                                ? "Ce créneau horaire est déjà passé"
                                : isSlotSoldOut
                                  ? "Créneau complet (0 place disponible)"
                                  : notEnoughSeats
                                    ? `Seulement ${freeSeats} place(s) disponible(s) (vous en demandez ${seatsCount})`
                                    : `${freeSeats} place(s) disponible(s) sur ${s.cap}`
                            }
                            className={`flex flex-col items-center justify-center rounded-xl border py-2 px-1 text-center transition ${
                              isPast
                                ? "cursor-not-allowed border-slate-100 bg-slate-100/70 text-slate-400 opacity-50"
                                : disabled
                                  ? "cursor-not-allowed border-slate-100 bg-slate-50/80 opacity-60"
                                  : on
                                    ? "border-brand-600 bg-brand-600 text-white shadow-sm ring-2 ring-brand-600/30"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-brand-400 hover:shadow-2xs"
                            }`}
                          >
                            <span className={`text-xs font-bold leading-tight ${on ? "text-white" : isPast ? "text-slate-400 line-through" : disabled ? "text-slate-400" : "text-ink"}`}>
                              {h}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold leading-tight mt-0.5 ${
                                on
                                  ? "text-brand-100"
                                  : isPast
                                    ? "text-slate-400 font-normal italic"
                                    : isSlotSoldOut
                                      ? "text-rose-600"
                                      : notEnoughSeats
                                        ? "text-amber-600"
                                        : "text-emerald-700"
                              }`}
                            >
                              {isPast ? "Passé" : isSlotSoldOut ? "Complet" : `${freeSeats} libre${freeSeats > 1 ? "s" : ""}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Field>
              ) : (
                <Field label="Durée de location">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                    <button onClick={() => setDays(Math.max(1, days - 1))} className="grid h-8 w-8 place-items-center rounded-full bg-mist transition hover:bg-brand-50"><Icon n="minus" size={14} /></button>
                    <span className="text-sm font-bold">{days} jour{days > 1 ? "s" : ""}</span>
                    <button onClick={() => setDays(Math.min(10, days + 1))} className="grid h-8 w-8 place-items-center rounded-full bg-mist transition hover:bg-brand-50"><Icon n="plus" size={14} /></button>
                  </div>
                </Field>
              )}
            </div>

            <div className="mt-5 space-y-2 border-t border-dashed border-slate-200 pt-4 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>
                  {isHour
                    ? `${slots.length} h × ${seatsCount} place${seatsCount > 1 ? "s" : ""} × ${EUR.format(s.price)}`
                    : `${days} j × ${seatsCount} place${seatsCount > 1 ? "s" : ""} × ${EUR.format(s.price)}`}
                </span>
                <span>{EUR.format(base)}</span>
              </div>
              <div className="flex justify-between text-slate-500"><span>Frais de service (8 %)</span><span>{EUR.format(fees)}</span></div>
              <div className="flex justify-between pt-1 font-display text-base font-bold"><span>Total TTC</span><span>{EUR.format(base + fees)}</span></div>
            </div>

            {/* Bouton de réservation avec blocage en cas de passé ou complet */}
            <button
              onClick={book}
              disabled={availability.isSoldOut || availability.isPast || availability.allHoursPast}
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold shadow-lg transition ${
                availability.isPast || availability.allHoursPast
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                  : availability.isSoldOut
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                    : "bg-brand-600 text-white shadow-brand-600/30 hover:bg-brand-700 active:scale-[.98]"
              }`}
            >
              <Icon n={availability.isPast || availability.allHoursPast ? "clock" : availability.isSoldOut ? "slash" : "zap"} size={16} />
              {availability.isPast || availability.allHoursPast
                ? "Journée passée / fermée"
                : availability.isSoldOut
                  ? "Complet pour cette date"
                  : `Réserver ${seatsCount > 1 ? `${seatsCount} places` : "cet espace"}`}
            </button>

            {availability.isPast || availability.allHoursPast ? (
              <p className="mt-3 text-center text-xs text-slate-500 font-semibold">
                Cette date ou ses horaires sont écoulés. Choisissez une autre date ci-dessus.
              </p>
            ) : availability.isSoldOut ? (
              <p className="mt-3 text-center text-xs text-rose-600 font-semibold">
                Sélectionnez une autre date ci-dessus pour réserver.
              </p>
            ) : (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <Icon n="shield-check" size={13} className="text-emerald-500" />Confirmation immédiate · Paiement CMI sécurisé
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Similaires */}
      <div className="mt-14">
        <SecHead kicker="Continuez l'exploration" title="Espaces similaires" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {similar.map(x => <SpaceCard key={x.id} s={x} nav={nav} favs={favs} toggleFav={toggleFav} date={date} bookings={bookings} />)}
        </div>
      </div>

      {isManagerOrAdmin && onUpdateSpace && (
        <EditSpaceModal
          space={editingSpace}
          isOpen={Boolean(editingSpace)}
          onClose={() => setEditingSpace(null)}
          onUpdateSpace={onUpdateSpace}
        />
      )}
    </main>
  );
};

/* ================= CHECKOUT ================= */
const Checkout = ({ cart, setCart, nav, onDone, toast, currentUser }) => {
  const [promo, setPromo] = useState(""); const [promoOn, setPromoOn] = useState(false); const [promoErr, setPromoErr] = useState("");
  const [method, setMethod] = useState("cmi"); // 'cmi' | 'cash' | 'virement'
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState(() => ({
    name: currentUser?.name || "Youssef Amrani",
    email: currentUser?.email || "youssef@proptech.ma",
    phone: currentUser?.phone || "+212 6 61 23 45 67",
    card: "", exp: "", cvc: ""
  }));
  const [errs, setErrs] = useState({});
  const [paidOrder, setPaidOrder] = useState(null); // Keep order snapshot
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const discount = promoOn ? subtotal * 0.10 : 0;
  const total = subtotal - discount;

  const handleFillTestCard = () => {
    setForm(prev => ({
      ...prev,
      card: "4242 4242 4242 4242",
      exp: "12/28",
      cvc: "888"
    }));
    setErrs({});
    toast("Carte de test CMI Maroc (3D Secure) pré-remplie", "credit-card");
  };

  const applyPromo = () => {
    if (promo.trim().toUpperCase() === "COWORK10") { setPromoOn(true); setPromoErr(""); toast("Code promo appliqué : −10 %", "percent"); }
    else setPromoErr("Code invalide. Essayez COWORK10 😉");
  };
  const fmtCard = v => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExp = v => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d; };

  const validate = () => {
    const er = {};
    if (form.name.trim().length < 3) er.name = "Nom trop court (3 caractères min.)";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = "Adresse e-mail invalide";
    if (method === "cmi") {
      if (form.card.replace(/\s/g, "").length !== 16) er.card = "Le numéro doit contenir 16 chiffres";
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.exp)) er.exp = "Format MM/AA attendu";
      else { const [m, y] = form.exp.split("/").map(Number); if (2000 + y < 2025 || (2000 + y === 2025 && m < new Date().getMonth() + 1)) er.exp = "Carte expirée"; }
      if (!/^\d{3,4}$/.test(form.cvc)) er.cvc = "3 chiffres au dos";
    }
    setErrs(er); return Object.keys(er).length === 0;
  };

  const submit = e => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (validate()) {
      setProcessing(true);
      setTimeout(() => {
        const orderRef = `SW-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        const invoiceRef = `FACT-2026-004${Math.floor(10 + Math.random() * 89)}`;
        const methodLabel = method === "cmi"
          ? "Carte Bancaire Maroc CMI (3D Secure)"
          : method === "cash"
            ? "Paiement en espèces à l'accueil"
            : "Virement Bancaire (CIH / Attijariwafa)";

        const orderSnapshot = {
          ref: orderRef,
          invoiceRef: invoiceRef,
          items: [...cart],
          total: total,
          subtotal: subtotal,
          discount: discount,
          name: form.name,
          email: form.email,
          phone: form.phone,
          methodLabel: methodLabel,
          date: new Date().toLocaleDateString("fr-FR"),
          paidAt: new Date().toLocaleDateString("fr-FR") + " " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        };

        setPaidOrder(orderSnapshot);
        setProcessing(false);

        // Appel onDone qui envoie la réservation vers l'API backend et la base PostgreSQL
        onDone({
          date: cart[0].date,
          meta: cart.length > 1 ? `${cart.length} réservations` : cart[0].meta,
          spaceId: cart[0].id,
          name: form.name,
          email: form.email,
          phone: form.phone,
          total: total,
          slots: cart[0].slots,
          seats: cart[0].seats || 1,
          isHour: cart[0].isHour,
          paymentMethod: methodLabel,
          invoiceRef: invoiceRef
        });

        window.scrollTo({ top: 0 });
      }, 700);
    }
  };

  if (paidOrder) {
    const mainItem = paidOrder.items[0] || {};
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <span className="pop mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 shadow-md">
          <Icon n="check-circle-2" size={42} />
        </span>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-ink">Réservation & Paiement validés !</h1>
        <p className="mt-2 text-sm text-slate-500">
          Réf. Transaction : <b className="font-mono text-ink font-bold">{paidOrder.ref}</b>
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
          <Icon n="shield-check" size={14} className="text-emerald-600" /> {paidOrder.methodLabel} · Confirmé
        </div>

        {/* Récapitulatif clair des prestations réservées */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Détail de la commande</span>
            <span className="text-xs text-slate-400">{paidOrder.paidAt}</span>
          </div>

          <div className="space-y-3">
            {paidOrder.items.map((it, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-bold text-ink">{it.name}</p>
                  <p className="text-xs text-slate-500">{it.city} · {it.meta}</p>
                </div>
                <b className="font-mono text-brand-700">{EUR.format(it.total)}</b>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-500">
            {paidOrder.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Remise promotionnelle (−10%)</span>
                <span>−{EUR.format(paidOrder.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-display text-base font-bold text-ink pt-1 border-t border-slate-100">
              <span>Montant total réglé</span>
              <span className="text-brand-600 font-mono">{EUR.format(paidOrder.total)}</span>
            </div>
          </div>
        </div>

        {/* Boutons d'actions */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => setInvoiceOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white shadow-card hover:bg-ink transition"
          >
            <Icon n="file-text" size={16} />📥 Télécharger Facture PDF
          </button>
          <button
            onClick={() => nav({ name: "user" })}
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition"
          >
            <Icon n="calendar-days" size={16} />Voir mes réservations
          </button>
          <button
            onClick={() => nav({ name: "home" })}
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            Accueil
          </button>
        </div>

        <InvoiceModal
          isOpen={invoiceOpen}
          onClose={() => setInvoiceOpen(false)}
          invoice={{
            invoiceNumber: paidOrder.invoiceRef,
            clientName: paidOrder.name,
            clientEmail: paidOrder.email,
            clientPhone: paidOrder.phone,
            clientCity: mainItem.city || "Casablanca",
            spaceName: mainItem.name || "Espace Coworking",
            date: paidOrder.date,
            timeSlot: mainItem.meta || "09:00 – 18:00 (Journée)",
            grossAmount: paidOrder.total,
            paymentMethod: paidOrder.methodLabel,
            paidAt: paidOrder.paidAt
          }}
        />
      </main>
    );
  }

  if (cart.length === 0) return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-mist text-slate-400"><Icon n="shopping-cart" size={28} /></span>
      <h1 className="mt-5 font-display text-2xl font-bold">Votre panier est vide</h1>
      <p className="mt-2 text-sm text-slate-500">Trouvez l'espace parfait et réservez-le en quelques clics.</p>
      <button onClick={() => nav({ name: "explore" })} className="mt-6 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white">Explorer les espaces</button>
    </main>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <Kicker>Paiement sécurisé · Maroc</Kicker>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Finaliser votre réservation</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
        <form onSubmit={submit} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="flex items-center gap-2 font-display font-bold"><Icon n="user" size={17} className="text-brand-600" />Vos coordonnées</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nom complet" err={errs.name}>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Youssef Amrani" className={`${inp} ${errs.name ? inpErr : ""}`} />
              </Field>
              <Field label="E-mail" err={errs.email}>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="youssef@proptech.ma" className={`${inp} ${errs.email ? inpErr : ""}`} />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 font-display font-bold"><Icon n="credit-card" size={17} className="text-brand-600" />Mode de règlement</h2>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><Icon n="lock" size={12} />Chiffré SSL 256-bit</span>
            </div>

            {/* Sélecteur de méthode de paiement */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
              {[
                ["cmi", "Carte Bancaire CMI", "credit-card", "Visa, Mastercard, CMI"],
                ["cash", "Paiement sur place", "banknote", "Règlement à l'arrivée"],
                ["virement", "Virement / Wafacash", "building-2", "Attijari, CIH, BCP"]
              ].map(([mId, label, icon, sub]) => (
                <button
                  key={mId}
                  type="button"
                  onClick={() => setMethod(mId)}
                  className={`p-3 rounded-xl border text-left transition ${method === mId
                    ? "border-brand-600 bg-brand-50/70 ring-2 ring-brand-600/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                >
                  <Icon n={icon} size={18} className={method === mId ? "text-brand-600" : "text-slate-400"} />
                  <p className="mt-1.5 font-bold text-xs text-ink">{label}</p>
                  <p className="text-[10px] text-slate-400">{sub}</p>
                </button>
              ))}
            </div>

            {method === "cmi" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Coordonnées bancaires</span>
                  <button
                    type="button"
                    onClick={handleFillTestCard}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-full border border-brand-200 transition"
                  >
                    <Icon n="zap" size={12} />⚡ Remplir carte test CMI (Maroc)
                  </button>
                </div>
                <Field label="Numéro de carte CMI / Visa" err={errs.card}>
                  <input value={form.card} onChange={e => setForm({ ...form, card: fmtCard(e.target.value) })} placeholder="4242 4242 4242 4242" className={`${inp} tracking-widest font-mono ${errs.card ? inpErr : ""}`} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Expiration" err={errs.exp}>
                    <input value={form.exp} onChange={e => setForm({ ...form, exp: fmtExp(e.target.value) })} placeholder="MM/AA" className={`${inp} font-mono ${errs.exp ? inpErr : ""}`} />
                  </Field>
                  <Field label="Code CVC (dos)" err={errs.cvc}>
                    <input value={form.cvc} onChange={e => setForm({ ...form, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="123" className={`${inp} font-mono ${errs.cvc ? inpErr : ""}`} />
                  </Field>
                </div>
              </div>
            )}

            {method === "cash" && (
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-ink flex items-center gap-1.5"><Icon n="info" size={14} className="text-brand-600" />Paiement direct à la réception :</p>
                <p>Votre place sera réservée et bloquée. Vous pourrez régler en espèces ou par TPE à votre arrivée auprès de l'accueil de l'espace.</p>
              </div>
            )}

            {method === "virement" && (
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-ink flex items-center gap-1.5"><Icon n="info" size={14} className="text-brand-600" />Coordonnées bancaires Spotwork Maroc :</p>
                <p className="font-mono text-[11px] text-ink font-semibold">RIB Attijariwafa Bank : 007 780 0001234567890123 45</p>
                <p>Votre réservation sera confirmée immédiatement avec la référence transmise par e-mail.</p>
              </div>
            )}
          </section>

          <button
            type="submit"
            disabled={processing}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-4 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[.99] disabled:opacity-60"
          >
            {processing ? (
              <>
                <Icon n="loader" size={16} className="animate-spin" />
                <span>Sécurisation CMI 3D-Secure en cours...</span>
              </>
            ) : (
              <>
                <Icon n="lock" size={15} />
                <span>Confirmer et Payer {EUR.format(total)}</span>
              </>
            )}
          </button>
        </form>
        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="font-display font-bold">Votre panier <span className="text-slate-400">({cart.length})</span></h2>
            <div className="mt-4 space-y-4">
              {cart.map(i => (
                <div key={i.key} className="flex gap-3">
                  <img src={U(i.img, 200)} alt="" className="h-16 w-20 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{i.name}</p>
                    <p className="text-xs text-slate-500">{i.city} · {i.meta}</p>
                    <p className="mt-1 text-sm font-bold text-brand-700">{EUR.format(i.total)}</p>
                  </div>
                  <button onClick={() => setCart(cart.filter(x => x.key !== i.key))} className="h-fit text-slate-300 transition hover:text-rose-500"><Icon n="trash-2" size={16} /></button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input value={promo} onChange={e => setPromo(e.target.value)} placeholder="Code promo" className={`${inp} ${promoErr ? inpErr : ""}`} />
              <button onClick={applyPromo} className="shrink-0 rounded-xl bg-navy px-4 text-sm font-bold text-white transition hover:bg-ink">OK</button>
            </div>
            {promoErr && <p className="mt-1.5 text-xs text-rose-600">{promoErr}</p>}
            {promoOn && <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-emerald-600"><Icon n="check" size={12} />COWORK10 appliqué</p>}
          </div>
          <div className="rounded-2xl bg-navy p-5 text-white shadow-card">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-300"><span>Sous-total</span><span>{EUR.format(subtotal)}</span></div>
              {promoOn && <div className="flex justify-between text-emerald-400"><span>Remise −10 %</span><span>−{EUR.format(discount)}</span></div>}
              <div className="flex justify-between text-slate-300"><span>Frais de service</span><span>inclus</span></div>
              <div className="flex justify-between border-t border-white/15 pt-2.5 font-display text-lg font-bold"><span>Total</span><span>{EUR.format(total)}</span></div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};

/* ================= DASHBOARD CLIENT ================= */
const UserDash = ({ initTab, bookings = [], setBookings, favs, toggleFav, nav, toast, currentUser, spaces = [] }) => {
  if (!currentUser) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 md:p-12 shadow-card">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 mb-4">
            <Icon n="user" size={26} />
          </span>
          <h1 className="font-display text-2xl font-bold text-ink">Espace Membre Spotwork</h1>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Connectez-vous pour retrouver vos réservations en cours, vos espaces favoris et les recommandations personnalisées de l'IA.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={() => nav({ name: "login" })} className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition">
              <Icon n="log-in" size={15} />Se connecter
            </button>
            <button onClick={() => nav({ name: "explore" })} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">
              <Icon n="search" size={15} />Explorer les espaces
            </button>
          </div>
        </div>
      </main>
    );
  }
  const user = currentUser;
  const [tab, setTab] = useState(initTab || "resas");
  const [userInvoice, setUserInvoice] = useState(null);
  const [prefs, setPrefs] = useState(() => {
    const p = user.preferences || {};
    return {
      mail: p.mail !== undefined ? Boolean(p.mail) : true,
      push: p.push !== undefined ? Boolean(p.push) : false,
      news: p.news !== undefined ? Boolean(p.news) : true,
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
        preferences: { ...(user.preferences || {}), ...prefs }
      };
      try {
        localStorage.setItem("spotwork_user", JSON.stringify(updatedUser));
      } catch { }
      if (res && res.status === "success") {
        toast("Préférences synchronisées ! Recommandations IA immédiatement affinées.", "check-circle");
      } else {
        toast("Préférences enregistrées ! Profil IA mis à jour.", "check");
      }
    } catch {
      toast("Préférences enregistrées", "check");
    } finally {
      setSavingPrefs(false);
    }
  };
  const tabs = [["resas", "Mes réservations", "calendar-days"], ["ia", "Recommandations", "sparkles"], ["favoris", "Favoris", "heart"], ["prefs", "Préférences", "settings"]];
  // Profil d'interactions IA mémorisé (feedback, clics, affinement)
  const [aiInteractions, setAiInteractions] = useState(() => {
    try {
      const saved = localStorage.getItem(`spotwork_ai_interactions_${user.id}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { feedback: {}, viewed: [], count: 0 };
  });

  const saveAiInteractions = (updated) => {
    setAiInteractions(updated);
    try {
      localStorage.setItem(`spotwork_ai_interactions_${user.id}`, JSON.stringify(updated));
    } catch {}
  };

  const [aiFilter, setAiFilter] = useState("all");
  const [isRefreshingAi, setIsRefreshingAi] = useState(false);

  // Déduction analytique des habitudes et affinités du client
  const clientHabits = useMemo(() => {
    const bookedSpaces = bookings.map(b => spaces.find(s => s.id === b.spaceId)).filter(Boolean);
    const favSpaces = [...favs].map(id => spaces.find(s => s.id === id)).filter(Boolean);

    // Villes favorites et habituelles
    const cityCounts = {};
    bookedSpaces.forEach(s => { cityCounts[s.city] = (cityCounts[s.city] || 0) + 3; });
    favSpaces.forEach(s => { cityCounts[s.city] = (cityCounts[s.city] || 0) + 1.5; });
    if (prefs.city) cityCounts[prefs.city] = (cityCounts[prefs.city] || 0) + 4;

    let dominantCity = prefs.city || user.city || "Casablanca";
    let maxCityScore = 0;
    for (const [c, cnt] of Object.entries(cityCounts)) {
      if (cnt > maxCityScore) { maxCityScore = cnt; dominantCity = c; }
    }

    // Types d'espaces privilégiés
    const typeCounts = {};
    bookedSpaces.forEach(s => { typeCounts[s.type] = (typeCounts[s.type] || 0) + 3; });
    favSpaces.forEach(s => { typeCounts[s.type] = (typeCounts[s.type] || 0) + 1.5; });
    if (prefs.type) typeCounts[prefs.type] = (typeCounts[prefs.type] || 0) + 4;

    let dominantType = prefs.type || "open";
    let maxTypeScore = 0;
    for (const [t, cnt] of Object.entries(typeCounts)) {
      if (cnt > maxTypeScore) { maxTypeScore = cnt; dominantType = t; }
    }

    // Équipements récurrents
    const amenityCounts = {};
    [...bookedSpaces, ...favSpaces].forEach(s => {
      (s.am || []).forEach(a => { amenityCounts[a] = (amenityCounts[a] || 0) + 1; });
    });
    const topAmenities = Object.entries(amenityCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([a]) => a);

    // Habitude de budget moyen
    let avgPrice = 45;
    if (bookedSpaces.length > 0) {
      avgPrice = Math.round(bookedSpaces.reduce((acc, s) => acc + s.price, 0) / bookedSpaces.length);
    } else if (favSpaces.length > 0) {
      avgPrice = Math.round(favSpaces.reduce((acc, s) => acc + s.price, 0) / favSpaces.length);
    }

    // Indice d'apprentissage et d'affinement (72% à 99%)
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
    const bookedIds = new Set(bookings.map(b => b.spaceId));
    const feedback = aiInteractions.feedback || {};

    const scored = spaces.map(s => {
      // Si écarté explicitement par l'utilisateur via le feedback négatif
      if (feedback[s.id] === 'dislike') return null;

      let score = 52;
      const reasonsList = [];
      const tags = [];

      // 1. Note d'excellence des coworkers
      score += Math.round((s.rating - 4.0) * 14);

      // 2. Ville & Quartier (Habitude confirmée + Préférence active)
      if (s.city.toLowerCase() === dominantCity.toLowerCase()) {
        score += 24;
        tags.push(`📍 Habitude ${s.city}`);
        reasonsList.push(`situé à ${s.city} (${s.district}) où vous avez vos habitudes`);
      } else if (prefs.city && s.city.toLowerCase() === prefs.city.toLowerCase()) {
        score += 20;
        tags.push(`🎯 Préférence ${s.city}`);
        reasonsList.push(`correspond à votre ville favorite (${s.city})`);
      }

      // 3. Format de travail (Open space, Bureau privé, Studio, etc.)
      if (s.type === dominantType) {
        score += 20;
        const typeLabel = TYPES.find(t => t.id === s.type)?.label || s.type;
        tags.push(`🏢 Format ${typeLabel}`);
        reasonsList.push(`adapté à votre habitude de ${typeLabel.toLowerCase()}`);
      } else if (prefs.type && s.type === prefs.type) {
        score += 16;
        tags.push(`💼 Format souhaité`);
      }

      // 4. Équipements récurrents
      const matchingAmenities = (s.am || []).filter(a => topAmenities.includes(a));
      if (matchingAmenities.length > 0) {
        score += Math.min(matchingAmenities.length * 3.5, 14);
        const amLabels = matchingAmenities.slice(0, 2).map(a => AMENITIES.find(x => x.id === a)?.label || a);
        reasonsList.push(`intègre ${amLabels.join(' et ')}`);
        tags.push(`☕ ${amLabels[0]}`);
      }

      // 5. Alignement Budgétaire
      if (Math.abs(s.price - avgPrice) <= 15) {
        score += 10;
        tags.push(`💰 ~${s.price} DH/h`);
      } else if (s.price <= 50) {
        score += 6;
      }

      // 6. Feedback positif antérieur
      if (feedback[s.id] === 'like') {
        score += 15;
        tags.push(`👍 Validé par vous`);
      }

      // 7. Détection de la nature de la recommandation
      let nature = 'discover';
      if (bookedIds.has(s.id)) {
        nature = 'habits';
        score += 8;
        tags.push(`🔄 Espace déjà réservé`);
      } else if (favs.has(s.id)) {
        nature = 'favorites';
        score += 12;
        tags.push(`❤️ Dans vos favoris`);
      } else if (s.city.toLowerCase() === dominantCity.toLowerCase() || s.type === dominantType) {
        nature = 'habits';
      }

      const finalScore = Math.min(99, Math.max(72, Math.round(score)));

      let reasonText = "";
      if (reasonsList.length >= 2) {
        reasonText = `Sélectionné pour vous car ${reasonsList.slice(0, 2).join(', et ')}.`;
      } else if (reasonsList.length === 1) {
        reasonText = `Recommandé pour votre profil car ${reasonsList[0]}. Noté ${s.rating}/5.`;
      } else {
        reasonText = `Espace d'excellence à ${s.city}, plébiscité par les résidents tech (${s.rating}/5).`;
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
      filtered = scored.filter(x => x.nature === 'habits');
    } else if (aiFilter === "favorites") {
      filtered = scored.filter(x => favs.has(x.s.id) || x.tags.some(t => t.includes('❤️')));
    } else if (aiFilter === "discover") {
      filtered = scored.filter(x => !bookedIds.has(x.s.id) && !favs.has(x.s.id));
    }

    filtered.sort((a, b) => b.score - a.score);
    return (filtered.length >= 3 ? filtered : scored.sort((a, b) => b.score - a.score)).slice(0, 3);
  }, [spaces, favs, bookings, prefs, clientHabits, aiInteractions, aiFilter]);

  const handleLikeRecommendation = (spaceId) => {
    const updated = {
      ...aiInteractions,
      feedback: { ...(aiInteractions.feedback || {}), [spaceId]: 'like' },
      count: (aiInteractions.count || 0) + 1
    };
    saveAiInteractions(updated);
    SpotworkAPI.submitAIFeedback(spaceId, 'like');
    toast("Recommandation validée ! Votre profil IA a été enrichi (+3% précision)", "sparkles");
  };

  const handleDislikeRecommendation = (spaceId) => {
    const updated = {
      ...aiInteractions,
      feedback: { ...(aiInteractions.feedback || {}), [spaceId]: 'dislike' },
      count: (aiInteractions.count || 0) + 1
    };
    saveAiInteractions(updated);
    SpotworkAPI.submitAIFeedback(spaceId, 'dislike');
    toast("Espace retiré : les suggestions s'ajustent immédiatement selon vos goûts", "trash");
  };

  const handleRefreshAi = () => {
    setIsRefreshingAi(true);
    setTimeout(() => {
      setIsRefreshingAi(false);
      toast("Recommandations recalculées avec vos dernières habitudes et interactions !", "check-circle");
    }, 400);
  };
  const stColor = st => st === "Confirmée" ? "bg-emerald-50 text-emerald-600" : st === "En attente" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500";
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Kicker>Espace membre · PropTech Maroc</Kicker>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Bonjour {user.firstName || user.name} 👋</h1>
          <p className="mt-1 text-xs text-slate-500">
            {user.email} · {user.city || "Maroc"} · <span className={`inline-flex px-2 py-0.5 rounded-full font-semibold border ${user.badgeCls || "bg-blue-50 text-brand-700 border-brand-200"}`}>{user.roleLabel || user.role}</span>
          </p>
        </div>
        <button onClick={() => nav({ name: "explore" })} className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25">
          <Icon n="plus" size={15} />Nouvelle réservation
        </button>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[230px_1fr]">
        <nav className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
          {tabs.map(([id, l, i]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === id ? "bg-navy text-white shadow-card" : "text-slate-500 hover:bg-mist hover:text-ink"}`}>
              <Icon n={i} size={16} />{l}
            </button>
          ))}
        </nav>
        <div>
          {tab === "resas" && (() => {
            const upcomingBookings = bookings.filter(b => b.status !== "Terminée" && b.status !== "completed");
            const pastBookings = bookings.filter(b => b.status === "Terminée" || b.status === "completed");
            return (
              <div className="space-y-8">
                <section>
                  <h2 className="mb-4 font-display text-lg font-bold">À venir ({upcomingBookings.length})</h2>
                  {upcomingBookings.length === 0 ? (
                    <p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">Aucune réservation à venir.</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {upcomingBookings.map(b => {
                        const s = spaces.find(x => x.id === b.spaceId || String(x.id) === String(b.spaceId)); if (!s) return null;
                        return (
                          <article key={b.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:shadow-lift">
                            <div className="relative h-32 overflow-hidden">
                              <img src={U(s.imgs[0], 600)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                              <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${stColor(b.status)}`}>{b.status}</span>
                            </div>
                            <div className="p-4">
                              <h3 className="font-display font-bold">{s.name}</h3>
                              <p className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><Icon n="calendar-days" size={12} />{fmtDate(b.date)}</span>
                                <span className="flex items-center gap-1"><Icon n="clock" size={12} />{b.meta}</span>
                              </p>
                              <div className="mt-3.5 flex flex-wrap gap-2">
                                <button onClick={() => nav({ name: "space", params: { id: s.id } })} className="flex-1 rounded-full bg-brand-50 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-100">Voir l'espace</button>
                                <button onClick={() => {
                                  setUserInvoice({
                                    invoiceNumber: b.invoiceRef || `FACT-2026-004${String(b.id).slice(-2) || '01'}`,
                                    clientName: user.name,
                                    clientEmail: user.email,
                                    clientPhone: user.phone || "+212 6 61 23 45 67",
                                    clientCity: user.city || "Casablanca",
                                    spaceName: s.name,
                                    date: b.date,
                                    timeSlot: b.meta,
                                    grossAmount: b.totalPrice || (s.price * (b.hours || 3)),
                                    paymentMethod: b.paymentMethod || "Carte Bancaire Maroc CMI (3D Secure)",
                                    paidAt: "Paiement en ligne CMI",
                                    status: b.status === "Confirmée" ? "paid" : "pending"
                                  });
                                }} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 flex items-center gap-1">
                                  <Icon n="file-text" size={13} />Reçu / Facture
                                </button>
                                <button onClick={async () => {
                                  try {
                                    await SpotworkAPI.cancelBooking(b.id);
                                  } catch { }
                                  setBookings(bookings.filter(x => x.id !== b.id));
                                  toast("Réservation annulée et mise à jour en base de données", "trash");
                                }} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition hover:border-rose-300 hover:text-rose-500">Annuler</button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
                <section>
                  <h2 className="mb-4 font-display text-lg font-bold">Historique ({pastBookings.length})</h2>
                  {pastBookings.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                      Aucune réservation passée pour le moment.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
                      {pastBookings.map((b, i) => {
                        const s = spaces.find(x => x.id === b.spaceId || String(x.id) === String(b.spaceId)); if (!s) return null;
                        return (
                          <div key={b.id} className={`flex items-center gap-4 px-5 py-4 text-sm ${i > 0 ? "border-t border-slate-100" : ""}`}>
                            <img src={U(s.imgs[0], 120)} alt="" className="h-11 w-14 rounded-lg object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-bold">{s.name}</p>
                              <p className="text-xs text-slate-400">{fmtDate(b.date)} · {b.meta}</p>
                            </div>
                            <span className="hidden sm:block text-xs font-semibold text-slate-400">{EUR.format(s.price)}</span>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${stColor(b.status)}`}>{b.status}</span>
                            <button
                              onClick={() => {
                                setUserInvoice({
                                  invoiceNumber: b.invoiceRef || `FACT-2026-003${String(b.id).slice(-2) || '01'}`,
                                  clientName: user.name,
                                  clientEmail: user.email,
                                  clientPhone: user.phone || "+212 6 61 23 45 67",
                                  clientCity: user.city || "Casablanca",
                                  spaceName: s.name,
                                  date: b.date,
                                  timeSlot: b.meta,
                                  grossAmount: b.totalPrice || (s.price * 4),
                                  paymentMethod: "Carte Bancaire Maroc CMI (3D Secure)",
                                  paidAt: "Paiement validé",
                                  status: "paid"
                                });
                              }}
                              className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-brand-600 hover:bg-slate-50 transition"
                            >
                              <Icon n="file-text" size={11} />Facture
                            </button>
                            <button onClick={() => nav({ name: "space", params: { id: s.id } })} className="text-slate-300 transition hover:text-brand-600"><Icon n="chevron-right" size={17} /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            );
          })()}
          {tab === "ia" && (
            <div className="space-y-6">
              {/* Carte Synthèse & Niveau d'apprentissage du Profil IA */}
              <div className="rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50/80 via-white to-indigo-50/50 p-6 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                      <Icon n="sparkles" size={13} className="text-brand-600" />
                      Moteur de Recommandations Prédictif PropTech Maroc
                    </span>
                    <h2 className="mt-3 font-display text-xl md:text-2xl font-bold text-ink">
                      Vos suggestions intelligentes sur-mesure
                    </h2>
                    <p className="mt-1.5 max-w-2xl text-xs md:text-sm text-slate-600 leading-relaxed">
                      L'intelligence artificielle analyse en continu vos réservations passées, vos favoris et vos critères de recherche.
                      Plus vous interagissez, plus les suggestions deviennent précises pour votre activité.
                    </p>
                  </div>
                  <button
                    onClick={handleRefreshAi}
                    disabled={isRefreshingAi}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-brand-300 hover:bg-slate-50 transition disabled:opacity-60"
                  >
                    <Icon n={isRefreshingAi ? "loader" : "refresh-cw"} size={13} className={isRefreshingAi ? "animate-spin text-brand-600" : ""} />
                    {isRefreshingAi ? "Recalcul en cours..." : "Actualiser l'IA"}
                  </button>
                </div>

                {/* Barre de Progression de l'apprentissage de l'IA */}
                <div className="mt-5 border-t border-brand-100/80 pt-5">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Icon n="brain" size={14} className="text-brand-600" />
                      Niveau d'affinement de vos habitudes :
                    </span>
                    <span className="font-mono font-bold text-brand-700 bg-brand-100/70 px-2 py-0.5 rounded-full">
                      {clientHabits.refinementLevel} % (Profil très affiné)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 transition-all duration-700"
                      style={{ width: `${clientHabits.refinementLevel}%` }}
                    />
                  </div>
                </div>

                {/* Synthèse des habitudes déduites par l'IA */}
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 backdrop-blur">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ville dominante</p>
                    <p className="mt-1 font-display text-sm font-bold text-ink flex items-center gap-1 truncate">
                      <Icon n="map-pin" size={12} className="text-brand-600 shrink-0" />
                      {clientHabits.dominantCity}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Habitude principale</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 backdrop-blur">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Format privilégié</p>
                    <p className="mt-1 font-display text-sm font-bold text-ink flex items-center gap-1 truncate">
                      <Icon n="layout-grid" size={12} className="text-indigo-600 shrink-0" />
                      {TYPES.find(t => t.id === clientHabits.dominantType)?.label || clientHabits.dominantType}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Poste de travail</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 backdrop-blur">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Budget habituel</p>
                    <p className="mt-1 font-display text-sm font-bold text-emerald-700 flex items-center gap-1 truncate">
                      <Icon n="wallet" size={12} className="text-emerald-600 shrink-0" />
                      ~{clientHabits.avgPrice} DH / heure
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Moyenne réservations</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 backdrop-blur">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Données analysées</p>
                    <p className="mt-1 font-display text-sm font-bold text-purple-700 flex items-center gap-1 truncate">
                      <Icon n="activity" size={12} className="text-purple-600 shrink-0" />
                      {clientHabits.totalInteractions} interactions
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{clientHabits.bookingsCount} résas · {clientHabits.favsCount} favoris</p>
                  </div>
                </div>
              </div>

              {/* Filtres contextuels IA */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: "all", label: `Toutes les recommandations (${recommendations.length})`, icon: "sparkles" },
                    { id: "habits", label: "Selon mes habitudes", icon: "history" },
                    { id: "favorites", label: "Inspiré de mes favoris", icon: "heart" },
                    { id: "discover", label: "Nouvelles découvertes", icon: "compass" }
                  ].map(tabItem => (
                    <button
                      key={tabItem.id}
                      onClick={() => setAiFilter(tabItem.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                        aiFilter === tabItem.id
                          ? "bg-navy text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon n={tabItem.icon} size={12} />
                      {tabItem.label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-400">
                  Affinement automatique à chaque réservation & clic
                </span>
              </div>

              {/* Grille des recommandations IA */}
              {recommendations.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 mb-3">
                    <Icon n="sparkles" size={22} />
                  </span>
                  <p className="font-display font-bold text-ink">Aucun espace dans cette catégorie</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Réinitialisez les filtres pour visualiser l'ensemble de votre sélection personnalisée.
                  </p>
                  <button
                    onClick={() => setAiFilter("all")}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-ink transition"
                  >
                    Voir toutes les suggestions
                  </button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-3">
                  {recommendations.map(({ s, score, reason, tags }, i) => (
                    <article
                      key={s.id}
                      className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
                      data-reveal
                      style={{ transitionDelay: `${i * 80}ms` }}
                    >
                      <div>
                        {/* Image avec badges Match % et Favori */}
                        <div className="relative h-44 overflow-hidden">
                          <img
                            src={U(s.imgs[0], 600)}
                            alt={s.name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                          <div className="absolute left-3 top-3 flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-ink/85 px-2.5 py-1 text-xs font-bold text-white shadow-md backdrop-blur">
                              <Icon n="sparkles" size={11} className="text-amber-400" />
                              Match {score}%
                            </span>
                          </div>

                          <button
                            onClick={() => toggleFav(s.id)}
                            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-600 backdrop-blur transition hover:scale-110 shadow-sm"
                            title="Ajouter aux favoris"
                          >
                            <Icon
                              n="heart"
                              size={15}
                              fill={favs.has(s.id) ? "#E11D48" : "none"}
                              className={favs.has(s.id) ? "text-rose-500" : "text-slate-600"}
                            />
                          </button>

                          <div className="absolute bottom-3 left-3 right-3 text-white">
                            <p className="text-[11px] font-semibold text-slate-200 flex items-center gap-1">
                              <Icon n="map-pin" size={11} />
                              {s.city} · {s.district}
                            </p>
                          </div>
                        </div>

                        {/* Corps de la carte */}
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="font-display text-base font-bold text-ink leading-tight">{s.name}</h3>
                              <p className="text-xs font-semibold text-brand-700 mt-0.5">{EUR.format(s.price)}/{s.unit}</p>
                            </div>
                            <Ring v={score} />
                          </div>

                          {/* Tags d'affinité */}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Justification IA contextualisée */}
                          <div className="mt-3.5 rounded-2xl bg-brand-50/70 p-3 border border-brand-100/80">
                            <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-700">
                              <Icon n="sparkles" size={13} className="mt-0.5 shrink-0 text-brand-600" />
                              <span>{reason}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Barre d'action et feedback d'apprentissage */}
                      <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-500">Pertinence IA :</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleLikeRecommendation(s.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 transition font-bold"
                              title="Indiquer que cette suggestion vous correspond"
                            >
                              <Icon n="thumbs-up" size={11} className="text-emerald-600" />
                              Pertinent
                            </button>
                            <button
                              onClick={() => handleDislikeRecommendation(s.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition"
                              title="Retirer cet espace des suggestions"
                            >
                              <Icon n="thumbs-down" size={11} />
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            SpotworkAPI.clickRecommendation(s.id);
                            nav({ name: "space", params: { id: s.id } });
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-navy py-2.5 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700"
                        >
                          <Icon n="calendar-check" size={13} />
                          Découvrir & Réserver
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === "favoris" && (
            favs.size === 0 ? <p className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">Aucun favori pour le moment — cliquez sur le ♥ d'un espace.</p> :
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {spaces.filter(s => favs.has(s.id)).map(s => <SpaceCard key={s.id} s={s} nav={nav} favs={favs} toggleFav={toggleFav} />)}
              </div>
          )}
          {tab === "prefs" && (
            <div className="max-w-xl space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <h2 className="font-display font-bold">Notifications</h2>
                {[["mail", "Récapitulatifs par e-mail"], ["push", "Alertes de disponibilité en temps réel"], ["news", "Newsletter mensuelle & bons plans"]].map(([k, l]) => (
                  <div key={k} className="mt-4 flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <p className="text-sm text-slate-600">{l}</p>
                    <Toggle on={prefs[k]} onClick={() => setPrefs({ ...prefs, [k]: !prefs[k] })} />
                  </div>
                ))}
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <h2 className="font-display font-bold">Préférences de recherche</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Ville par défaut">
                    <select value={prefs.city} onChange={e => setPrefs({ ...prefs, city: e.target.value })} className={inp}>{CITIES.map(c => <option key={c}>{c}</option>)}</select>
                  </Field>
                  <Field label="Type favori">
                    <select value={prefs.type} onChange={e => setPrefs({ ...prefs, type: e.target.value })} className={inp}>{TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
                  </Field>
                </div>
                <button
                  onClick={handleSavePreferences}
                  disabled={savingPrefs}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 transition disabled:opacity-50"
                >
                  <Icon n={savingPrefs ? "loader" : "check"} size={15} className={savingPrefs ? "animate-spin" : ""} />
                  {savingPrefs ? "Synchronisation..." : "Enregistrer dans mon profil"}
                </button>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Modale Facture / Reçu pour le client */}
      <InvoiceModal
        invoice={userInvoice}
        isOpen={Boolean(userInvoice)}
        onClose={() => setUserInvoice(null)}
      />
    </main>
  );
};

/* ================= MODAL CRÉATION D'ESPACE ================= */
const CreateSpaceModal = ({ isOpen, onClose, onCreateSpace }) => {
  const [name, setName] = useState("");
  const [city, setCity] = useState("Casablanca");
  const [district, setDistrict] = useState("Maarif");
  const [type, setType] = useState("open");
  const [price, setPrice] = useState("45");
  const [cap, setCap] = useState("12");
  const [surface, setSurface] = useState("65 m²");
  const [selectedAm, setSelectedAm] = useState(["wifi", "coffee", "screen"]);
  const [imgKey, setImgKey] = useState("a");
  const [customImg, setCustomImg] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState("");

  if (!isOpen) return null;

  const toggleAmenity = (id) => {
    setSelectedAm(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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
    const photo = customImg.trim() ? customImg.trim() : (IMG[imgKey] || IMG.a);

    onCreateSpace({
      name: name.trim(),
      city,
      district: district.trim() || `${city} Centre`,
      type,
      price: numPrice,
      unit: "heure",
      capacity: Number(cap) || 10,
      surface: surface.trim() || "50 m²",
      imgs: [photo, IMG.b, IMG.c],
      am: selectedAm,
      desc: desc.trim() || `Espace de coworking moderne et tout équipé situé à ${city}, ${district}. Connexion fibre optique et commodités complètes.`
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Icon n="plus-circle" size={20} />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Créer un nouvel espace</h2>
              <p className="text-xs text-slate-500">Ajoutez un espace de coworking au catalogue Spotwork Maroc</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <Icon n="x" size={18} />
          </button>
        </div>

        {err && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
            <Icon n="alert-circle" size={15} />{err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom de l'espace *">
              <input value={name} onChange={e => { setName(e.target.value); setErr(""); }} placeholder="Ex: Loft Tech Guéliz" className={inp} required />
            </Field>
            <Field label="Ville au Maroc *">
              <select value={city} onChange={e => setCity(e.target.value)} className={inp}>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quartier / Adresse">
              <input value={district} onChange={e => setDistrict(e.target.value)} placeholder="Ex: Maarif · Bd Zerktouni" className={inp} />
            </Field>
            <Field label="Type d'espace">
              <select value={type} onChange={e => setType(e.target.value)} className={inp}>
                {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tarif par heure (DH) *">
              <div className="relative">
                <input type="number" min="10" step="5" value={price} onChange={e => setPrice(e.target.value)} className={`${inp} pr-12 font-bold`} required />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">DH/h</span>
              </div>
            </Field>
            <Field label="Capacité (personnes)">
              <input type="number" min="1" value={cap} onChange={e => setCap(e.target.value)} className={inp} />
            </Field>
            <Field label="Surface estimée">
              <input value={surface} onChange={e => setSurface(e.target.value)} placeholder="Ex: 85 m²" className={inp} />
            </Field>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Photo de l'espace</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {["a", "b", "c", "d"].map(k => (
                <button
                  type="button"
                  key={k}
                  onClick={() => { setImgKey(k); setCustomImg(""); }}
                  className={`relative h-16 rounded-xl overflow-hidden border-2 transition ${imgKey === k && !customImg ? "border-brand-600 ring-2 ring-brand-600/30" : "border-slate-200 opacity-70 hover:opacity-100"}`}>
                  <img src={U(IMG[k], 200)} alt="" className="h-full w-full object-cover" />
                  {imgKey === k && !customImg && (
                    <span className="absolute top-1 right-1 grid h-4 w-4 place-items-center rounded-full bg-brand-600 text-white text-[9px] font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
            <input
              value={customImg}
              onChange={e => setCustomImg(e.target.value)}
              placeholder="Ou collez une URL d'image personnalisée (https://...)"
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-brand-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Équipements & Services</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AMENITIES.map(am => {
                const checked = selectedAm.includes(am.id);
                return (
                  <button
                    type="button"
                    key={am.id}
                    onClick={() => toggleAmenity(am.id)}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-xs font-medium transition text-left ${checked ? "border-brand-500 bg-brand-50/50 text-brand-700 font-semibold" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md ${checked ? "bg-brand-600 text-white" : "border border-slate-300"}`}>
                      {checked && <Icon n="check" size={11} />}
                    </span>
                    <span className="truncate">{am.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Description détaillée">
            <textarea
              rows={3}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Décrivez l'espace, l'ambiance, la connexion fibre, les horaires et les services offerts..."
              className={inp} />
          </Field>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
              Annuler
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition">
              <Icon n="check" size={14} />Publier l'espace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ================= MODAL ÉDITION COMPLÈTE DE L'ESPACE (ADMIN & GESTIONNAIRE) ================= */
const EditSpaceModal = ({ space, isOpen, onClose, onUpdateSpace }) => {
  const [name, setName] = useState("");
  const [city, setCity] = useState("Casablanca");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("open");
  const [price, setPrice] = useState("");
  const [cap, setCap] = useState("");
  const [surface, setSurface] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedAm, setSelectedAm] = useState([]);
  const [imgs, setImgs] = useState([]);
  const [newImgInput, setNewImgInput] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (space) {
      setName(space.name || "");
      setCity(space.city || (space.location ? space.location.split('·')[0].trim() : "Casablanca"));
      setDistrict(space.district || (space.location && space.location.includes('·') ? space.location.split('·')[1].trim() : ""));
      setAddress(space.address || "");
      setType(space.type || "open");
      setPrice(String(space.price !== undefined ? space.price : (space.price_per_hour || 45)));
      setCap(String(space.cap !== undefined ? space.cap : (space.capacity || 10)));
      setSurface(space.surface || `${(space.cap || 10) * 6} m²`);
      setDesc(space.desc || space.description || "");
      setSelectedAm(Array.isArray(space.am) ? [...space.am] : (Array.isArray(space.amenities) ? [...space.amenities] : ["wifi", "coffee", "screen"]));

      const currentImgs = Array.isArray(space.imgs) && space.imgs.length > 0
        ? [...space.imgs]
        : (Array.isArray(space.photos) && space.photos.length > 0 ? [...space.photos] : [IMG.a, IMG.b]);
      setImgs(currentImgs);
      setNewImgInput("");
      setErr("");
    }
  }, [space]);

  if (!isOpen || !space) return null;

  const toggleAmenity = (id) => {
    setSelectedAm(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAddPhoto = () => {
    const trimmed = newImgInput.trim();
    if (!trimmed) return;
    setImgs(prev => [...prev, trimmed]);
    setNewImgInput("");
    setErr("");
  };

  const handleRemovePhoto = (idx) => {
    if (imgs.length <= 1) {
      setErr("L'espace doit comporter au moins une photo.");
      return;
    }
    setImgs(prev => prev.filter((_, i) => i !== idx));
    setErr("");
  };

  const handleSetMainPhoto = (idx) => {
    if (idx === 0) return;
    setImgs(prev => {
      const copy = [...prev];
      const [chosen] = copy.splice(idx, 1);
      return [chosen, ...copy];
    });
    setErr("");
  };

  const handleAddPresetPhoto = (url) => {
    if (!imgs.includes(url)) {
      setImgs(prev => [...prev, url]);
      setErr("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Le nom de l'espace est obligatoire");
      return;
    }
    const numPrice = Number(price);
    if (!numPrice || numPrice <= 0) {
      setErr("Veuillez saisir un tarif horaire valide en DH");
      return;
    }
    const numCap = Number(cap);
    if (!numCap || numCap <= 0) {
      setErr("Veuillez saisir une capacité valide (minimum 1 personne)");
      return;
    }
    const cleanImgs = imgs.filter(Boolean);
    if (cleanImgs.length === 0) {
      setErr("Au moins une photo est requise pour l'espace");
      return;
    }

    const finalDistrict = district.trim() || `${city} Centre`;
    const finalLocation = `${city} · ${finalDistrict}`;

    onUpdateSpace(space.id, {
      name: name.trim(),
      city,
      district: finalDistrict,
      location: finalLocation,
      address: address.trim() || `${finalDistrict}, ${city}, Maroc`,
      type,
      price: numPrice,
      price_per_hour: numPrice,
      capacity: numCap,
      cap: numCap,
      surface: surface.trim() || `${numCap * 6} m²`,
      desc: desc.trim() || `Espace de travail tout équipé situé à ${city}, ${finalDistrict}.`,
      description: desc.trim() || `Espace de travail tout équipé situé à ${city}, ${finalDistrict}.`,
      am: selectedAm,
      amenities: selectedAm,
      imgs: cleanImgs,
      photos: cleanImgs
    });
    onClose();
  };

  const PRESETS = [
    { label: "Open Space Loft", url: IMG.a },
    { label: "Salle Réunion Verre", url: IMG.b },
    { label: "Bureau Privé Bois", url: IMG.c },
    { label: "Espace Tech Moderne", url: IMG.d },
    { label: "Bureau Lumineux", url: IMG.e },
    { label: "Lounge & Café", url: IMG.f },
    { label: "Cabine Focus", url: IMG.i },
    { label: "Terrasse & Rooftop", url: IMG.g }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-600 shadow-xs">
              <Icon n="pencil" size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-ink">Modifier l'espace de travail</h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Mode Admin</span>
              </div>
              <p className="text-xs text-slate-500">Mettez à jour le nom, la localisation, les images, tarifs et caractéristiques</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <Icon n="x" size={18} />
          </button>
        </div>

        {err && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
            <Icon n="alert-circle" size={15} />{err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. SECTION PHOTOS & GALERIE */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Icon n="image" size={14} className="text-brand-600" />
                  Galerie Photos & Image de couverture
                </h3>
                <p className="text-[11px] text-slate-500">La 1ère image est la photo principale affichée sur la carte et la recherche</p>
              </div>
              <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
                {imgs.length} photo{imgs.length > 1 ? "s" : ""}
              </span>
            </div>

            {/* Grille des photos actuelles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {imgs.map((photoUrl, idx) => (
                <div key={idx} className={`group relative rounded-xl overflow-hidden border-2 transition ${idx === 0 ? "border-brand-600 ring-2 ring-brand-500/30" : "border-slate-200 hover:border-slate-400"}`}>
                  <img src={U(photoUrl, 300)} alt="" className="h-24 w-full object-cover" />
                  {idx === 0 ? (
                    <span className="absolute top-1.5 left-1.5 rounded-md bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                      ★ Couverture
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetMainPhoto(idx)}
                      title="Définir comme photo principale"
                      className="absolute top-1.5 left-1.5 rounded-md bg-ink/70 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 hover:bg-brand-600 transition shadow-xs">
                      ★ Mettre en 1er
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    title="Supprimer cette photo"
                    className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-md bg-rose-600 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-700 transition shadow-xs">
                    <Icon n="trash-2" size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Ajouter une nouvelle photo par URL */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newImgInput}
                onChange={e => setNewImgInput(e.target.value)}
                placeholder="Ajouter une photo (collez une URL Unsplash, Cloudinary, Web...)"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={handleAddPhoto}
                className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition">
                <Icon n="plus" size={13} />Ajouter
              </button>
            </div>

            {/* Bibliothèque de suggestions de photos */}
            <div>
              <p className="text-[11px] font-semibold text-slate-500 mb-1.5">Ou cliquez pour ajouter une photo modèle haute définition :</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => handleAddPresetPhoto(p.url)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 transition">
                    <img src={U(p.url, 40)} alt="" className="h-4 w-4 rounded-sm object-cover" />
                    <span>+ {p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. NOM ET TYPE */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom de l'espace *">
              <input
                value={name}
                onChange={e => { setName(e.target.value); setErr(""); }}
                placeholder="Ex: L'Atelier Coworking Maarif"
                className={inp}
                required
              />
            </Field>
            <Field label="Type d'espace *">
              <select value={type} onChange={e => setType(e.target.value)} className={inp}>
                {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
          </div>

          {/* 3. LOCALISATION */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Ville au Maroc *">
              <select value={city} onChange={e => setCity(e.target.value)} className={inp}>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Quartier / District *">
              <input
                value={district}
                onChange={e => setDistrict(e.target.value)}
                placeholder="Ex: Maarif, Guéliz, Agdal..."
                className={inp}
                required
              />
            </Field>
            <Field label="Adresse physique précise">
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Ex: 28 Boulevard Zerktouni"
                className={inp}
              />
            </Field>
          </div>

          {/* 4. TARIF, CAPACITÉ & SURFACE */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tarif par heure (DH) *">
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className={`${inp} pr-12 font-bold text-brand-700 text-base`}
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">DH/h</span>
              </div>
            </Field>
            <Field label="Capacité d'accueil (places) *">
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={cap}
                  onChange={e => setCap(e.target.value)}
                  className={inp}
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">pers.</span>
              </div>
            </Field>
            <Field label="Surface">
              <input
                value={surface}
                onChange={e => setSurface(e.target.value)}
                placeholder="Ex: 85 m²"
                className={inp}
              />
            </Field>
          </div>

          {/* 5. ÉQUIPEMENTS & SERVICES */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Équipements & Commodités inclus</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AMENITIES.map(am => {
                const checked = selectedAm.includes(am.id);
                return (
                  <button
                    type="button"
                    key={am.id}
                    onClick={() => toggleAmenity(am.id)}
                    className={`flex items-center gap-2 rounded-xl border p-2 text-xs font-medium transition text-left ${checked ? "border-brand-500 bg-brand-50/60 text-brand-700 font-semibold" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md ${checked ? "bg-brand-600 text-white" : "border border-slate-300"}`}>
                      {checked && <Icon n="check" size={11} />}
                    </span>
                    <span className="truncate">{am.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. DESCRIPTION */}
          <Field label="Description détaillée de l'espace">
            <textarea
              rows={3}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Présentez l'espace, son ambiance, sa luminosité, les services exclusifs et facilités d'accès..."
              className={inp}
            />
          </Field>

          {/* 7. FOOTER ACTIONS */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <div className="text-xs text-slate-400">
              Modifications immédiatement synchronisées avec PostgreSQL & Supabase
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
                Annuler
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition">
                <Icon n="check" size={14} />Enregistrer toutes les modifications
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
const EditSpacePriceModal = EditSpaceModal;

/* ================= DASHBOARD GESTIONNAIRE & ADMIN ================= */
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
    SpotworkAPI.getPayments().then(res => {
      if (res) {
        const list = res.payments || res.transactions || [];
        if (list.length > 0) {
          setTxns(list.map(p => ({
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
            timeSlot: p.timeSlot || "Journée",
            paidAt: p.date ? new Date(p.date).toLocaleDateString('fr-FR') : "Aujourd'hui",
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

  if (!currentUser || (currentUser.role !== "manager" && currentUser.role !== "admin")) {
    return <AccessDenied nav={nav} currentUser={currentUser} onSelectUser={onSelectUser} />;
  }

  const user = currentUser;
  const pendingBookings = bookings.filter(b => b.status === "pending");
  const confirmedBookings = bookings.filter(b => b.status === "confirmed");
  const filteredBookings = bookings.filter(b => {
    if (bookingFilter === "pending") return b.status === "pending";
    if (bookingFilter === "confirmed") return b.status === "confirmed";
    if (bookingFilter === "cancelled") return b.status === "cancelled";
    return true;
  });

  const filteredSpaces = spaces.filter(s => !cityFilter || s.city === cityFilter);

  const totalRevenue = txns.reduce((sum, t) => sum + (Number(t.grossAmount) || 0), 0);
  const avgOccupancy = useMemo(() => {
    if (spaces.length === 0) return 75;
    const totalCap = spaces.reduce((s, sp) => s + (sp.cap || 10), 0);
    const bookedSeats = bookings.filter(b => b.status === "confirmed").reduce((s, b) => s + (b.seats || 1), 0);
    return Math.min(100, Math.max(25, Math.round((bookedSeats / Math.max(1, totalCap)) * 100)));
  }, [spaces, bookings]);

  const monthlyRevenue = useMemo(() => {
    const arr = Array(12).fill(0);
    txns.forEach(t => {
      if (t.date) {
        const m = new Date(t.date).getMonth();
        if (!isNaN(m) && m >= 0 && m < 12) {
          arr[m] += (t.grossAmount || 0);
        }
      }
    });
    const hasData = arr.some(v => v > 0);
    return hasData ? arr.map(v => Math.round(v)) : [12, 14, 18, 22, 28, 32, 35, 41, 48, 52, 60, 65];
  }, [txns]);

  const getSpaceOccupancy = (space) => {
    const spaceBookings = bookings.filter(b => b.spaceId === space.id || String(b.spaceId) === String(space.id));
    if (spaceBookings.length === 0) return 0;
    const bookedSeats = spaceBookings.reduce((sum, b) => sum + (b.seats || 1), 0);
    return Math.min(100, Math.round((bookedSeats / (space.cap || 10)) * 100));
  };

  const kpis = [
    { l: "Revenus cumulés", v: `${totalRevenue.toLocaleString('fr-FR')} DH`, d: "+12,4 %", up: true, i: "trending-up", spark: [8, 10, 9, 13, 12, 15, 17, 16, 19] },
    { l: "Taux d'occupation", v: `${avgOccupancy} %`, d: "+3,1 pts", up: true, i: "activity", spark: [60, 64, 61, 70, 72, 74, avgOccupancy] },
    { l: "Demandes en attente", v: String(pendingBookings.length), d: pendingBookings.length > 0 ? "À traiter" : "À jour", up: pendingBookings.length === 0, i: "clock", spark: [2, 4, 3, 5, 6, 4, pendingBookings.length] },
    { l: "Total espaces actifs", v: String(spaces.length), d: "6 villes au Maroc", up: true, i: "layout-grid", spark: [6, 7, 8, 9, 9, 10, spaces.length] }
  ];

  const donutItems = [
    { label: "Open space", v: 38, c: "#1F56D6" }, { label: "Bureaux privés", v: 27, c: "#0D2C5A" },
    { label: "Salles de réunion", v: 21, c: "#5B90F7" }, { label: "Studios & cabines", v: 14, c: "#BCD2FF" }
  ];

  return (
    <main className="bg-mist min-h-screen pb-16">

      <div className="bg-navy">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Kicker><span className="text-brand-300">Tableau de bord {user.role === "admin" ? "Administrateur" : "Gestionnaire"}</span></Kicker>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">Bonjour {user.firstName || user.name} 👋</h1>
              <p className="mt-1 text-sm text-slate-400">
                Gérez vos {spaces.length} espaces au Maroc, ajustez les prix en Dirhams et traitez les demandes de réservation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500">
                <Icon n="plus" size={15} />Créer un espace
              </button>
              <button onClick={() => toast("Rapport financier exporté en format CSV", "download")} className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20">
                <Icon n="download" size={14} />Exporter
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            {[
              { id: "overview", label: "Vue d'ensemble", icon: "bar-chart-3" },
              { id: "spaces", label: `Espaces & Tarifs (${spaces.length})`, icon: "building" },
              { id: "bookings", label: `Demandes de réservation`, icon: "calendar-days", badge: pendingBookings.length },
              { id: "payments", label: `Paiements & Revenus`, icon: "credit-card" },
              { id: "users", label: `Membres & Rôles (${PRESET_ACCOUNTS.length})`, icon: "users" }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${tab === t.id
                  ? "bg-white text-navy shadow-sm"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}>
                <Icon n={t.icon} size={15} />
                <span>{t.label}</span>
                {t.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${tab === t.id ? "bg-amber-500 text-white" : "bg-amber-400 text-navy"}`}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map((k, i) => (
                <div key={k.l} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k.l}</p>
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon n={k.i} size={15} /></span>
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <div>
                      <p className="font-display text-2xl font-bold">{k.v}</p>
                      <p className={`mt-1 flex items-center gap-1 text-xs font-bold ${k.up ? "text-emerald-600" : "text-rose-500"}`}>
                        <Icon n={k.up ? "trending-up" : "trending-down"} size={13} />{k.d}
                      </p>
                    </div>
                    <Spark data={k.spark} color={k.up ? "#1F56D6" : "#F43F5E"} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card lg:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-display font-bold">Revenus 2026 <span className="text-sm font-medium text-slate-400">(k DH)</span></h2>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">+24 % YoY</span>
                </div>
                <AreaChart data={monthlyRevenue} labels={MONTHS} />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <h2 className="mb-4 font-display font-bold">Répartition par type</h2>
                <Donut items={donutItems} center={["342", "réservations"]} />
                <div className="mt-5 rounded-xl bg-mist p-3.5 text-xs text-slate-500">
                  <b className="text-ink">Recommandation IA :</b> La demande à Casablanca (Maarif) et Rabat (Agdal) est en hausse de 18% le jeudi. Envisagez une majoration dynamique.
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold">Demandes en attente ({pendingBookings.length})</h2>
                  <button onClick={() => setTab("bookings")} className="text-xs font-bold text-brand-600 hover:text-brand-700">
                    Voir tout ({bookings.length}) →
                  </button>
                </div>
                {pendingBookings.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                    Toutes les demandes ont été traitées ! Aucune réservation en attente.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pendingBookings.slice(0, 3).map(b => (
                      <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 font-bold text-amber-800 text-xs">
                            {b.clientInitials || "CL"}
                          </span>
                          <div>
                            <p className="font-bold text-sm text-ink">{b.clientName} · <span className="font-normal text-slate-500">{b.spaceName} ({b.city})</span></p>
                            <p className="text-xs text-slate-400">{b.date} · {b.timeSlot} · <b className="text-ink">{b.totalPrice} DH</b></p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onUpdateBookingStatus(b.id, "confirmed")}
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition">
                            <Icon n="check" size={13} />Accepter
                          </button>
                          <button
                            onClick={() => onUpdateBookingStatus(b.id, "cancelled")}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-300 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition">
                            <Icon n="x" size={13} />Refuser
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <h2 className="mb-4 font-display font-bold">Raccourcis Gestionnaire</h2>
                <div className="space-y-2.5">
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700 hover:border-brand-500 hover:bg-brand-50/30 transition">
                    <span className="flex items-center gap-2"><Icon n="plus-circle" size={16} className="text-emerald-600" />Créer un nouvel espace</span>
                    <Icon n="chevron-right" size={14} className="text-slate-400" />
                  </button>
                  <button
                    onClick={() => setTab("spaces")}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700 hover:border-brand-500 hover:bg-brand-50/30 transition">
                    <span className="flex items-center gap-2"><Icon n="dollar-sign" size={16} className="text-brand-600" />Modifier les prix & capacités</span>
                    <Icon n="chevron-right" size={14} className="text-slate-400" />
                  </button>
                  <button
                    onClick={() => setTab("bookings")}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700 hover:border-brand-500 hover:bg-brand-50/30 transition">
                    <span className="flex items-center gap-2"><Icon n="inbox" size={16} className="text-amber-600" />Consulter toutes les demandes ({bookings.length})</span>
                    <Icon n="chevron-right" size={14} className="text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "spaces" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Filtrer par ville :</span>
                <button
                  onClick={() => setCityFilter("")}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${!cityFilter ? "bg-navy text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  Toutes ({spaces.length})
                </button>
                {CITIES.map(c => {
                  const count = spaces.filter(s => s.city === c).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={c}
                      onClick={() => setCityFilter(c)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${cityFilter === c ? "bg-navy text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      {c} ({count})
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 transition">
                <Icon n="plus" size={15} />Créer un espace
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-mist/60 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      <th className="px-6 py-3.5">Espace & Localisation</th>
                      <th className="px-3 py-3.5">Type & Capacité</th>
                      <th className="px-3 py-3.5">Tarif horaire</th>
                      <th className="px-3 py-3.5">Taux d'occupation</th>
                      <th className="px-3 py-3.5">Statut</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSpaces.map(s => {
                      const occVal = getSpaceOccupancy(s);
                      const st = occVal > 90 ? ["Complet", "bg-rose-50 text-rose-500 border-rose-200"] : occVal < 50 ? ["À promouvoir", "bg-amber-50 text-amber-600 border-amber-200"] : ["Actif", "bg-emerald-50 text-emerald-600 border-emerald-200"];
                      return (
                        <tr key={s.id} className="border-t border-slate-100 transition hover:bg-mist/40">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={U(s.imgs[0], 100)} alt="" className="h-10 w-14 rounded-xl object-cover shadow-sm" />
                              <div>
                                <p className="font-bold text-ink">{s.name}</p>
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                  <Icon n="map-pin" size={11} />{s.city} · {s.district}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <span className="block text-xs font-semibold text-slate-700 capitalize">
                              {TYPES.find(t => t.id === s.type)?.label || s.type}
                            </span>
                            <span className="text-[11px] text-slate-400">{s.cap} pers. · {s.surface}</span>
                          </td>
                          <td className="px-3 py-4">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 border border-brand-200">
                              {EUR.format(s.price)}<span className="text-[10px] text-slate-400">/{s.unit || "h"}</span>
                            </span>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                                <div className={`h-full rounded-full ${occVal > 85 ? "bg-brand-600" : "bg-brand-400"}`} style={{ width: `${occVal}%` }} />
                              </div>
                              <span className="text-xs font-bold">{occVal}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${st[1]}`}>
                              {st[0]}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setEditingSpace(s)}
                                title="Modifier toutes les informations de cet espace (nom, photos, emplacement, tarifs, capacité)"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 transition shadow-2xs">
                                <Icon n="pencil" size={13} /><span>Modifier</span>
                              </button>
                              <button
                                onClick={() => nav({ name: "space", params: { id: s.id } })}
                                title="Voir la fiche publique"
                                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-brand-600 transition">
                                <Icon n="eye" size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Confirmez-vous la suppression de l'espace « ${s.name} » ?`)) {
                                    onDeleteSpace(s.id);
                                  }
                                }}
                                title="Supprimer cet espace"
                                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition">
                                <Icon n="trash-2" size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "bookings" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: "all", label: "Toutes les demandes", count: bookings.length },
                  { id: "pending", label: "En attente", count: pendingBookings.length, cls: "text-amber-700" },
                  { id: "confirmed", label: "Confirmées", count: confirmedBookings.length, cls: "text-emerald-700" },
                  { id: "cancelled", label: "Annulées / Refusées", count: bookings.filter(b => b.status === 'cancelled').length, cls: "text-rose-700" }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setBookingFilter(f.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${bookingFilter === f.id
                      ? "bg-navy text-white shadow-sm"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}>
                    <span>{f.label}</span>
                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${bookingFilter === f.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-400">
                {filteredBookings.length} demande{filteredBookings.length > 1 ? "s" : ""} affichée{filteredBookings.length > 1 ? "s" : ""}
              </span>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400 mb-3">
                  <Icon n="inbox" size={24} />
                </span>
                <p className="font-display font-bold text-ink">Aucune demande trouvée</p>
                <p className="text-xs text-slate-400 mt-1">Aucune réservation ne correspond au filtre sélectionné.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredBookings.map(b => {
                  const isPending = b.status === "pending";
                  const isConfirmed = b.status === "confirmed";
                  const isCancelled = b.status === "cancelled";

                  return (
                    <div
                      key={b.id}
                      className={`relative flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-card transition-all hover:shadow-lift ${isPending ? "border-amber-300 ring-1 ring-amber-300/40 bg-gradient-to-r from-amber-50/30 to-white" : "border-slate-200"
                        }`}>
                      <div className="flex items-start gap-3.5 min-w-[240px]">
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-bold text-white text-xs shadow-sm ${isPending ? "bg-amber-500" : isConfirmed ? "bg-emerald-600" : "bg-slate-400"
                          }`}>
                          {b.clientInitials || "CL"}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-ink text-sm">{b.clientName}</h3>
                            <span className="text-[11px] text-slate-400">{b.createdAt}</span>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{b.clientEmail}</p>
                          {b.clientPhone && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Icon n="phone" size={11} />{b.clientPhone}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4 min-w-[220px]">
                        <p className="font-bold text-sm text-ink">{b.spaceName}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Icon n="map-pin" size={11} />{b.city}
                        </p>
                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 font-medium">
                          <Icon n="calendar" size={12} className="text-brand-600" />
                          {b.date} · {b.timeSlot}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                        <div className="text-left md:text-right">
                          <p className="font-display text-base font-bold text-ink">{EUR.format(b.totalPrice)}</p>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isPending ? "bg-amber-100 text-amber-800" : isConfirmed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            }`}>
                            <Icon n={isPending ? "clock" : isConfirmed ? "check" : "x"} size={11} />
                            {isPending ? "En attente" : isConfirmed ? "Confirmée" : "Annulée"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => onUpdateBookingStatus(b.id, "confirmed")}
                                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700 transition">
                                <Icon n="check" size={14} />Accepter
                              </button>
                              <button
                                onClick={() => onUpdateBookingStatus(b.id, "cancelled")}
                                className="inline-flex items-center gap-1 rounded-full border border-rose-300 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition">
                                <Icon n="x" size={14} />Refuser
                              </button>
                            </>
                          )}
                          {isConfirmed && (
                            <button
                              onClick={() => {
                                if (confirm("Voulez-vous vraiment annuler cette réservation confirmée ?")) {
                                  onUpdateBookingStatus(b.id, "cancelled");
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-rose-300 hover:text-rose-600 transition">
                              <Icon n="x-circle" size={13} />Annuler
                            </button>
                          )}
                          {isCancelled && (
                            <button
                              onClick={() => onUpdateBookingStatus(b.id, "confirmed")}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-emerald-300 hover:text-emerald-700 transition">
                              <Icon n="refresh-cw" size={13} />Rétablir
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "payments" && (
          <div className="space-y-6">
            {/* KPI financiers */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Chiffre d'Affaires Brut</p>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><Icon n="trending-up" size={15} /></span>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-ink">
                  {txns.filter(t => t.status === "paid").reduce((acc, t) => acc + (t.grossAmount || 0), 0).toLocaleString('fr-FR')} DH
                </p>
                <p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <Icon n="check-circle-2" size={12} />Encaissements validés CMI Maroc
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Commissions Spotwork (8%)</p>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon n="percent" size={15} /></span>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-brand-600">
                  {txns.filter(t => t.status === "paid").reduce((acc, t) => acc + (t.feeAmount || 0), 0).toFixed(2)} DH
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Frais de service & passerelle bancaire
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Revenu Net Reversé</p>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50 text-purple-600"><Icon n="wallet" size={15} /></span>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-purple-700">
                  {txns.filter(t => t.status === "paid").reduce((acc, t) => acc + (t.netAmount || 0), 0).toFixed(2)} DH
                </p>
                <p className="mt-1 text-xs text-purple-600 font-semibold flex items-center gap-1">
                  <Icon n="arrow-up-right" size={12} />Virements bancaires aux gestionnaires
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Succès Règlements CMI</p>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600"><Icon n="shield-check" size={15} /></span>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-ink">100 %</p>
                <p className="mt-1 text-xs text-slate-500">
                  Protocole 3D-Secure certifié Maroc
                </p>
              </div>
            </div>

            {/* Filtres & Recherche de transactions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Statut :</span>
                {[
                  { id: "all", label: `Tous (${txns.length})` },
                  { id: "paid", label: `Payés (${txns.filter(t => t.status === "paid").length})` },
                  { id: "pending", label: `En attente (${txns.filter(t => t.status === "pending").length})` }
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setPaymentsStatus(s.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${paymentsStatus === s.id ? "bg-navy text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => toast("Export comptable des transactions au format Excel / CSV", "download")}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                <Icon n="file-spreadsheet" size={13} />Exporter Journal Comptable
              </button>
            </div>

            {/* Table des transactions financières */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 font-bold">Transaction / Facture</th>
                      <th className="py-3 px-4 font-bold">Date & Heure</th>
                      <th className="py-3 px-4 font-bold">Espace & Ville</th>
                      <th className="py-3 px-4 font-bold">Client</th>
                      <th className="py-3 px-4 font-bold">Règlement</th>
                      <th className="py-3 px-4 font-bold text-right">Brut (DH)</th>
                      <th className="py-3 px-4 font-bold text-right">Frais (8%)</th>
                      <th className="py-3 px-4 font-bold text-right">Net Reversé (DH)</th>
                      <th className="py-3 px-4 font-bold text-center">Statut</th>
                      <th className="py-3 px-4 font-bold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {txns.filter(t => paymentsStatus === "all" || t.status === paymentsStatus).map(txn => (
                      <tr key={txn.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-ink">{txn.id}</p>
                          <p className="text-[10px] text-brand-600 font-mono font-semibold">{txn.invoiceNumber}</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          <p className="font-semibold text-slate-700">{txn.date}</p>
                          <p className="text-[10px] text-slate-400">{txn.paidAt}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-ink">{txn.spaceName}</p>
                          <p className="text-[10px] text-slate-500">{txn.city} · {txn.timeSlot}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-ink">{txn.clientName}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{txn.clientEmail}</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <p className="font-semibold text-xs flex items-center gap-1">
                            <Icon n="credit-card" size={12} className="text-brand-600" />
                            CMI ···· {txn.cardLast4 || "4242"}
                          </p>
                          <p className="text-[10px] text-slate-400">{txn.paymentMethod}</p>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-ink">
                          {txn.grossAmount.toFixed(2)} DH
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                          {txn.feeAmount.toFixed(2)} DH
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                          {txn.netAmount.toFixed(2)} DH
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${txn.status === "paid" ? "bg-emerald-100 text-emerald-800" : txn.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                            }`}>
                            {txn.status === "paid" ? "✓ Payé" : txn.status === "pending" ? "En attente" : "Annulé"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedInvoice(txn)}
                            className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-100 transition shadow-2xs"
                          >
                            <Icon n="file-text" size={12} />Facture
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <h2 className="font-display text-lg font-bold text-ink">Comptes utilisateurs & Accès PropTech Maroc</h2>
              <p className="text-xs text-slate-500 mt-1">Profils configurés pour la gestion, la réservation et le contrôle de la plateforme.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {PRESET_ACCOUNTS.map(acc => {
                  const isCurrent = currentUser?.id === acc.id;
                  return (
                    <div key={acc.id} className={`rounded-2xl border p-5 transition ${isCurrent ? "border-brand-500 bg-brand-50/20 ring-2 ring-brand-500/20" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`grid h-10 w-10 place-items-center rounded-xl font-bold text-white text-xs ${acc.avatarBg}`}>
                          {acc.initials}
                        </span>
                        <div>
                          <p className="font-bold text-sm text-ink">{acc.name}</p>
                          <span className={`inline-block mt-0.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${acc.badgeCls}`}>
                            {acc.roleLabel}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs font-mono text-slate-500 mb-2">{acc.email}</p>
                      <p className="text-xs text-slate-600 leading-relaxed min-h-[44px]">{acc.desc}</p>
                      <button
                        onClick={() => {
                          onSelectUser(acc);
                          if (toast) toast(`Basculé sur le compte : ${acc.name}`, "user-check");
                        }}
                        className={`mt-4 w-full rounded-xl py-2 text-xs font-bold transition ${isCurrent
                          ? "bg-slate-100 text-slate-400 cursor-default"
                          : "bg-navy text-white hover:bg-slate-800"
                          }`}>
                        {isCurrent ? "Compte actuel" : "Basculer sur ce compte"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <CreateSpaceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreateSpace={onCreateSpace}
      />
      <EditSpacePriceModal
        space={editingSpace}
        isOpen={Boolean(editingSpace)}
        onClose={() => setEditingSpace(null)}
        onUpdateSpace={onUpdateSpace}
      />
      <InvoiceModal
        invoice={selectedInvoice}
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
      />
    </main>
  );
};

/* ================= PAGE DE CONNEXION ================= */
const LoginPage = ({ currentUser, onLogin, nav, toast }) => {
  const [selectedRole, setSelectedRole] = useState("client");
  const [email, setEmail] = useState("youssef@proptech.ma");
  const [password, setPassword] = useState("••••••••");
  const [err, setErr] = useState("");

  const handlePresetLogin = (acc) => {
    onLogin(acc);
    if (toast) toast(`Connecté avec succès : ${acc.name} (${acc.roleLabel})`, "check");
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
    const found = PRESET_ACCOUNTS.find(a => a.email.toLowerCase() === email.toLowerCase());
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
        desc: `Session ${selectedRole} personnalisée sur Spotwork Maroc`
      };
      onLogin(customUser);
      if (toast) toast(`Bienvenue ${customUser.name} !`, "check");
      nav(selectedRole === "client" ? { name: "user" } : { name: "admin" });
    }
  };

  return (
    <main className="min-h-[85vh] bg-mist py-10 md:py-16">
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-semibold text-brand-700 shadow-sm">
            <Icon n="shield-check" size={13} className="text-brand-600" />Portail d'authentification PropTech Maroc
          </span>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight text-ink">
            Connexion à Spotwork
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Accédez à votre espace Client, Gestionnaire ou Administrateur. Testez en 1 clic grâce aux comptes préconfigurés.
          </p>
        </div>

        {/* COMPTES PRESETS 1-CLIC */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Icon n="zap" size={17} className="text-amber-500" />
              Connexion rapide en 1 clic (Profils de Test)
            </h2>
            <span className="text-xs text-slate-400">Prêt à l'emploi</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {PRESET_ACCOUNTS.map((acc) => {
              const isActive = currentUser?.id === acc.id;
              return (
                <div key={acc.id}
                  className={`relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lift ${isActive ? "border-brand-500 ring-2 ring-brand-500/20" : "border-slate-200"}`}>
                  {isActive && (
                    <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Actif
                    </span>
                  )}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`grid h-11 w-11 place-items-center rounded-xl font-bold text-white text-sm shadow-md ${acc.avatarBg}`}>
                        {acc.initials}
                      </span>
                      <div>
                        <h3 className="font-display font-bold text-ink leading-tight">{acc.name}</h3>
                        <span className={`inline-block mt-0.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${acc.badgeCls}`}>
                          {acc.roleLabel}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mb-2">{acc.email}</p>
                    <p className="text-xs text-slate-600 leading-relaxed min-h-[44px]">{acc.desc}</p>
                    <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                      <Icon n="map-pin" size={11} />{acc.city}, Maroc
                    </p>
                  </div>

                  <button
                    onClick={() => handlePresetLogin(acc)}
                    className={`mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold transition shadow-sm ${isActive
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      : acc.role === "admin"
                        ? "bg-navy text-white hover:bg-slate-800"
                        : acc.role === "manager"
                          ? "bg-indigo-600 text-white hover:bg-indigo-700"
                          : "bg-brand-600 text-white hover:bg-brand-700"
                      }`}>
                    <Icon n={acc.role === "client" ? "user-check" : acc.role === "manager" ? "bar-chart-2" : "shield"} size={14} />
                    {isActive ? "Session active" : `Se connecter (${acc.roleLabel})`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* FORMULAIRE CLASSIQUE */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-card max-w-xl mx-auto">
          <h2 className="font-display text-lg font-bold mb-1">Formulaire de connexion classique</h2>
          <p className="text-xs text-slate-500 mb-6">Connexion avec vos identifiants email et mot de passe.</p>

          <form onSubmit={handleCustomLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Rôle du compte</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "client", label: "Client" },
                  { id: "manager", label: "Gestionnaire" },
                  { id: "admin", label: "Admin" }
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(r.id);
                      if (r.id === "client") setEmail("youssef@proptech.ma");
                      else if (r.id === "manager") setEmail("mehdi@spotwork.ma");
                      else setEmail("admin@spotwork.ma");
                    }}
                    className={`rounded-xl py-2 text-xs font-bold border transition ${selectedRole === r.id
                      ? "bg-navy text-white border-navy shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Adresse email" err={err}>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErr(""); }}
                className={inp}
                placeholder="votre@email.ma"
              />
            </Field>

            <Field label="Mot de passe">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inp}
                placeholder="Mot de passe"
              />
            </Field>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">Supabase Auth & JWT</span>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700">
                <Icon n="log-in" size={15} />
                Se connecter
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

/* ================= FOOTER ================= */
const Footer = ({ nav, toast }) => {
  const [email, setEmail] = useState(""); const [err, setErr] = useState("");
  const subscribe = e => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr("Adresse e-mail invalide"); return; }
    setErr(""); setEmail(""); toast("Inscription confirmée. Bienvenue sur Spotwork Maroc !", "mail");
  };
  const cols = [
    ["Plateforme", [["Explorer les espaces", () => nav({ name: "explore" })], ["Villes marocaines", () => nav({ name: "explore" })], ["Comptes de test & Login", () => nav({ name: "login" })], ["Tarifs & abonnements (DH)", () => toast("Tarifs en Dirhams (DH)", "info")]]],
    ["Gestionnaires", [["Dashboard gestionnaire", () => nav({ name: "admin" })], ["Espaces à Casablanca", () => nav({ name: "explore", params: { city: "Casablanca" } })], ["Espaces à Rabat", () => nav({ name: "explore", params: { city: "Rabat" } })], ["Espaces à Marrakech", () => nav({ name: "explore", params: { city: "Marrakech" } })]]],
    ["Support", [["Centre d'aide", () => toast("Centre d'aide Spotwork Maroc", "info")], ["API & Documentation", () => toast("API Express / Supabase active", "info")], ["Contact PropTech Maroc", () => toast("support@spotwork.ma", "mail")]]]
  ];
  return (
    <footer className="bg-ink text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white"><Icon n="map-pin" size={18} /></span>
              <div>
                <span className="font-display text-lg font-bold text-white block leading-tight">Spotwork</span>
                <span className="text-[10px] text-brand-400 font-semibold tracking-wider uppercase">PropTech Maroc</span>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">La plateforme de réservation d'espaces de coworking nouvelle génération au Maroc. Casablanca, Rabat, Marrakech, Tanger, Agadir, Fès.</p>
            <form onSubmit={subscribe} className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Newsletter mensuelle</p>
              <div className="mt-2.5 flex gap-2">
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.ma"
                  className={`flex-1 rounded-xl border bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-brand-400 ${err ? "border-rose-400" : "border-white/15"}`} />
                <button className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-500"><Icon n="send" size={15} /></button>
              </div>
              {err && <p className="mt-1.5 text-xs text-rose-400">{err}</p>}
            </form>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {cols.map(([title, links]) => (
              <div key={title}>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{title}</p>
                <ul className="mt-4 space-y-2.5">
                  {links.map(([l, f]) => (<li key={l}><button onClick={f} className="text-sm text-slate-300 transition hover:text-white">{l}</button></li>))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500">
          <p>© 2026 Spotwork PropTech Maroc — Développé avec Node.js, Express, Supabase & Claude AI.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => nav({ name: "home" })} className="transition hover:text-white" title="Accueil"><Icon n="globe" size={15} /></button>
            <button onClick={() => nav({ name: "login" })} className="transition hover:text-white" title="Connexion"><Icon n="user" size={15} /></button>
            <button onClick={() => toast("support@spotwork.ma", "mail")} className="transition hover:text-white" title="Support"><Icon n="mail" size={15} /></button>
          </div>
        </div>
      </div>
    </footer>
  );
};

/* ================= APP ================= */
const App = () => {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState({ name: "home" });
  const [cart, setCart] = useState([]);
  const [favs, setFavs] = useState(new Set([2, 7]));
  const [spacesList, setSpacesList] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [userBookings, setUserBookings] = useState([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  // Authenticated user state: defaults to Youssef Amrani on first visit, or null if logged out
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      if (localStorage.getItem("spotwork_logged_out") === "true") return null;
      const saved = localStorage.getItem("spotwork_user");
      if (saved) return JSON.parse(saved);
    } catch { }
    return PRESET_ACCOUNTS[0];
  });

  const onLogin = (user) => {
    setCurrentUser(user);
    try {
      localStorage.removeItem("spotwork_logged_out");
      localStorage.setItem("spotwork_user", JSON.stringify(user));
    } catch { }
    if (user.role === 'admin') {
      SpotworkAPI.token = 'mock-token-admin';
    } else if (user.role === 'manager') {
      SpotworkAPI.token = 'mock-token-manager';
    } else {
      SpotworkAPI.token = 'mock-token-client';
    }
  };

  const onLogout = () => {
    try {
      localStorage.removeItem("spotwork_user");
      localStorage.setItem("spotwork_logged_out", "true");
    } catch { }
    SpotworkAPI.token = null;
    setCurrentUser(null);
    toast("Vous avez été déconnecté avec succès", "log-out");
    nav({ name: "home" });
  };

  const handleCreateSpace = (newSpace) => {
    const newId = Math.max(...spacesList.map(s => typeof s.id === 'number' ? s.id : 0), 10) + 1;
    const created = {
      id: newId,
      name: newSpace.name,
      city: newSpace.city,
      district: newSpace.district,
      type: newSpace.type,
      price: Number(newSpace.price),
      unit: newSpace.unit || "heure",
      rating: 5.0,
      rev: 1,
      cap: Number(newSpace.capacity) || 10,
      surface: newSpace.surface || "50 m²",
      imgs: newSpace.imgs && newSpace.imgs.length ? newSpace.imgs : [IMG.a, IMG.b, IMG.c],
      am: newSpace.am || ["wifi", "coffee", "screen"],
      badge: "Nouveau",
      featured: false,
      host: currentUser?.name || "Mehdi El Fassi",
      desc: newSpace.desc,
      busy: []
    };
    setSpacesList(prev => [created, ...prev]);
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
    toast(`Espace « ${created.name} » créé avec succès à ${created.city} (${created.price} DH/h) !`, "check-circle");
  };

  const handleUpdateSpace = (spaceId, updatedFields) => {
    let spaceName = "";
    setSpacesList(prev => prev.map(s => {
      if (s.id === spaceId || String(s.id) === String(spaceId) || (s.dbId && String(s.dbId) === String(spaceId))) {
        spaceName = updatedFields.name || s.name;
        const newCity = updatedFields.city || s.city;
        const newDistrict = updatedFields.district || s.district;
        const newLocation = updatedFields.location || `${newCity} · ${newDistrict}`;
        const newPrice = updatedFields.price !== undefined ? Number(updatedFields.price) : (updatedFields.price_per_hour !== undefined ? Number(updatedFields.price_per_hour) : s.price);
        const newCap = updatedFields.capacity !== undefined ? Number(updatedFields.capacity) : (updatedFields.cap !== undefined ? Number(updatedFields.cap) : s.cap);
        const newImgs = updatedFields.imgs || updatedFields.photos || s.imgs;
        const newAm = updatedFields.am || updatedFields.amenities || s.am;
        const newDesc = updatedFields.desc !== undefined ? updatedFields.desc : (updatedFields.description !== undefined ? updatedFields.description : s.desc);
        const newName = updatedFields.name || s.name;
        const newType = updatedFields.type || s.type;
        const newSurface = updatedFields.surface || s.surface;
        const newAddress = updatedFields.address || s.address;

        return {
          ...s,
          ...updatedFields,
          name: newName,
          city: newCity,
          district: newDistrict,
          location: newLocation,
          address: newAddress,
          price: newPrice,
          price_per_hour: newPrice,
          cap: newCap,
          capacity: newCap,
          imgs: newImgs,
          photos: newImgs,
          am: newAm,
          amenities: newAm,
          desc: newDesc,
          description: newDesc,
          type: newType,
          surface: newSurface
        };
      }
      return s;
    }));

    const currentSpace = spacesList.find(s => s.id === spaceId || String(s.id) === String(spaceId) || (s.dbId && String(s.dbId) === String(spaceId)));
    const targetId = currentSpace?.dbId || currentSpace?.id || spaceId;

    const payloadForApi = {
      name: updatedFields.name,
      location: updatedFields.location || (updatedFields.city && updatedFields.district ? `${updatedFields.city} · ${updatedFields.district}` : undefined),
      price_per_hour: updatedFields.price !== undefined ? Number(updatedFields.price) : (updatedFields.price_per_hour !== undefined ? Number(updatedFields.price_per_hour) : undefined),
      price: updatedFields.price !== undefined ? Number(updatedFields.price) : undefined,
      capacity: updatedFields.capacity !== undefined ? Number(updatedFields.capacity) : (updatedFields.cap !== undefined ? Number(updatedFields.cap) : undefined),
      description: updatedFields.description !== undefined ? updatedFields.description : updatedFields.desc,
      desc: updatedFields.desc !== undefined ? updatedFields.desc : updatedFields.description,
      amenities: updatedFields.amenities || updatedFields.am,
      photos: updatedFields.photos || updatedFields.imgs,
      imgs: updatedFields.imgs || updatedFields.photos,
      type: updatedFields.type,
      surface: updatedFields.surface,
      city: updatedFields.city,
      district: updatedFields.district,
      address: updatedFields.address
    };

    Object.keys(payloadForApi).forEach(k => payloadForApi[k] === undefined && delete payloadForApi[k]);

    SpotworkAPI.updateSpace(targetId, payloadForApi);
    toast(`Espace « ${updatedFields.name || spaceName || currentSpace?.name || ""} » mis à jour avec succès !`, "check-circle");
  };

  const handleDeleteSpace = (spaceId) => {
    const deleted = spacesList.find(s => s.id === spaceId);
    setSpacesList(prev => prev.filter(s => s.id !== spaceId));
    SpotworkAPI.deleteSpace(spaceId);
    toast(`Espace « ${deleted?.name || ""} » supprimé du catalogue.`, "trash");
  };

  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    setAllBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    const statusFr = newStatus === 'confirmed' ? "Confirmée" : newStatus === 'cancelled' ? "Annulée" : "En attente";
    setUserBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: statusFr } : b));

    try {
      const res = await SpotworkAPI.updateBookingStatus(bookingId, newStatus);
      if (res && res.status === "success") {
        if (newStatus === 'confirmed') {
          toast("Demande acceptée et synchronisée avec la base de données !", "check-circle");
        } else if (newStatus === 'cancelled') {
          toast("Demande refusée et synchronisée avec la base de données.", "x-circle");
        } else {
          toast("Statut synchronisé avec la base de données.", "check-circle");
        }
      } else {
        toast(`Statut mis à jour (${newStatus === 'confirmed' ? 'Confirmée' : 'Refusée'}).`, "check-circle");
      }
    } catch {
      toast("Statut mis à jour localement.", "check-circle");
    }
  };

  const onDone = (b) => {
    const spaceId = b.spaceId || b.id;
    const bookedSpace = spacesList.find(s => s.id === spaceId);
    const spaceName = bookedSpace ? bookedSpace.name : (b.name || "Espace Coworking");
    const city = bookedSpace ? bookedSpace.city : (b.city || "Casablanca");
    const num = typeof spaceId === 'number' ? spaceId : parseInt(spaceId, 10) || 1;
    const spaceUuid = typeof spaceId === 'string' && spaceId.includes('-')
      ? spaceId
      : `10000000-0000-0000-0000-${String(num).padStart(12, '0')}`;

    let startTime = "09:00:00";
    let endTime = "18:00:00";
    if (Array.isArray(b.slots) && b.slots.length > 0) {
      if (b.isHour) {
        const sorted = [...b.slots].sort();
        const startH = sorted[0];
        const endH = sorted[sorted.length - 1];
        if (startH) startTime = startH.includes(':') ? (startH.length === 5 ? `${startH}:00` : startH) : `${startH.padStart(2, '0')}:00:00`;
        if (endH) {
          const h = parseInt(endH.split(':')[0], 10) + 1;
          endTime = `${String(h).padStart(2, '0')}:00:00`;
        }
      }
    } else if (b.meta && b.meta.includes(' – ')) {
      const parts = b.meta.split(' – ');
      if (parts[0]) {
        const cleanStart = parts[0].trim().slice(0, 5);
        if (/^\d{2}:\d{2}$/.test(cleanStart)) startTime = cleanStart + ":00";
      }
      if (parts[1]) {
        const cleanEnd = parts[1].trim().split(' ')[0].slice(0, 5);
        if (/^\d{2}:\d{2}$/.test(cleanEnd)) endTime = cleanEnd + ":00";
      }
    }

    const tempBookingId = "bk-" + Date.now();
    const totalPrice = b.total || (bookedSpace ? bookedSpace.price * 4 : 180);

    // Synchronisation en temps réel avec l'API backend et PostgreSQL Supabase
    SpotworkAPI.createBooking({
      space_id: spaceUuid,
      booking_date: b.date || new Date().toISOString().slice(0, 10),
      start_time: startTime,
      end_time: endTime,
      total_price: totalPrice,
      seats: b.seats || 1
    }).then(res => {
      if (res && res.status === "success") {
        toast("Réservation enregistrée et synchronisée avec la base de données !", "check-circle");
        const realId = res.data?.booking?.id;
        if (realId) {
          setUserBookings(prev => prev.map(item => item.id === tempBookingId ? { ...item, id: realId } : item));
          setAllBookings(prev => prev.map(item => item.id === tempBookingId ? { ...item, id: realId } : item));
        }
      }
    }).catch(() => { });

    setUserBookings(p => [{
      id: tempBookingId,
      spaceId: spaceId,
      date: b.date,
      meta: b.meta,
      status: "Confirmée",
      totalPrice: totalPrice,
      seats: b.seats || 1,
      slots: b.slots || [],
      invoiceRef: `FACT-2026-${String(tempBookingId).slice(-6)}`
    }, ...p]);

    setAllBookings(p => [{
      id: tempBookingId,
      clientName: currentUser?.name || b.name || "Client PropTech",
      clientEmail: currentUser?.email || b.email || "client@proptech.ma",
      clientPhone: currentUser?.phone || "+212 6 61 23 45 67",
      clientInitials: currentUser?.initials || "CP",
      spaceId: spaceId,
      spaceName: spaceName,
      city: city,
      date: b.date,
      timeSlot: b.meta,
      hours: Array.isArray(b.slots) ? b.slots.length : 4,
      seats: b.seats || 1,
      slots: b.slots || [],
      totalPrice: totalPrice,
      status: "confirmed",
      createdAt: "À l'instant",
      paymentMethod: b.method === 'cash' ? "Paiement sur place à l'accueil" : b.method === 'transfer' ? "Virement / Wafacash" : "Carte Bancaire CMI (3D Secure)",
      invoiceRef: `FACT-2026-${String(tempBookingId).slice(-6)}`
    }, ...p]);

    setCart([]);
  };

  // Chargement dynamique des espaces depuis la base de données PostgreSQL Supabase
  useEffect(() => {
    SpotworkAPI.getSpaces().then(spaces => {
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
      if (currentUser.role === 'admin') SpotworkAPI.token = 'mock-token-admin';
      else if (currentUser.role === 'manager') SpotworkAPI.token = 'mock-token-manager';
      else SpotworkAPI.token = 'mock-token-client';

      SpotworkAPI.getUserBookings().then(bkgs => {
        if (bkgs && Array.isArray(bkgs) && bkgs.length > 0) {
          const mapped = bkgs.map(b => {
            const numId = parseInt(String(b.space_id).split('-').pop(), 10) || 1;
            return {
              id: b.id,
              spaceId: numId,
              date: b.booking_date,
              meta: `${b.start_time ? b.start_time.slice(0, 5) : "09:00"} – ${b.end_time ? b.end_time.slice(0, 5) : "18:00"}`,
              status: b.status === 'confirmed' ? "Confirmée" : b.status === 'cancelled' ? "Annulée" : b.status === 'completed' ? "Terminée" : "En attente",
              totalPrice: b.total_price,
              invoiceRef: `FACT-2026-${String(b.id).slice(-6)}`
            };
          });
          setUserBookings(prev => {
            const existingMap = new Map(prev.map(p => [p.id, p]));
            mapped.forEach(m => {
              existingMap.set(m.id, { ...existingMap.get(m.id), ...m });
            });
            return Array.from(existingMap.values());
          });
        }
      }).catch(() => { });

      if (currentUser.role === 'manager' || currentUser.role === 'admin') {
        SpotworkAPI.getManagerBookings().then(bkgs => {
          if (bkgs && Array.isArray(bkgs) && bkgs.length > 0) {
            const mappedManager = bkgs.map(b => {
              const numId = parseInt(String(b.space_id).split('-').pop(), 10) || 1;
              const cName = b.user?.full_name || b.users?.full_name || "Client PropTech";
              const initials = cName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || "CP";
              const sName = b.space?.name || b.spaces?.name || "Espace Coworking";
              const sCity = b.space?.location ? b.space.location.split('·')[0].trim() : (b.spaces?.city || "Casablanca");
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
                timeSlot: `${b.start_time ? b.start_time.slice(0, 5) : "09:00"} – ${b.end_time ? b.end_time.slice(0, 5) : "18:00"}`,
                hours: 4,
                seats: b.seats || 1,
                totalPrice: b.total_price,
                status: b.status || "confirmed",
                createdAt: "Récemment",
                paymentMethod: "Carte Bancaire CMI (3D Secure)",
                invoiceRef: `FACT-2026-${String(b.id).slice(-4)}`
              };
            });
            setAllBookings(prev => {
              const existingMap = new Map(prev.map(p => [p.id, p]));
              mappedManager.forEach(m => {
                existingMap.set(m.id, { ...existingMap.get(m.id), ...m });
              });
              return Array.from(existingMap.values());
            });
          }
        }).catch(() => { });
      }
    }
  }, [currentUser, view.name]);

  useEffect(() => {
    let tries = 0;
    const t = setInterval(() => {
      if (window.lucide || tries > 25) { setReady(true); clearInterval(t); }
      tries++;
    }, 60);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      document.querySelectorAll("[data-reveal]:not(.is-in)").forEach(el => {
        const io = new IntersectionObserver(es => es.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
        }), { threshold: .1 });
        io.observe(el);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [view, ready]);

  const nav = v => { setView(v); setMenuOpen(false); window.scrollTo({ top: 0 }); };
  const toast = (msg, icon = "check") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, icon }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  };
  const toggleFav = id => {
    setFavs(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); toast("Retiré des favoris", "heart"); }
      else { n.add(id); toast("Ajouté à vos favoris", "heart"); }
      return n;
    });
  };
  const reserve = item => { setCart(c => [...c, item]); nav({ name: "checkout" }); };

  if (!ready || (loadingSpaces && spacesList.length === 0)) return (
    <div className="grid min-h-screen place-items-center bg-mist">
      <div className="text-center">
        <span className="mx-auto grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-brand-600 text-white"><Icon n="map-pin" size={22} /></span>
        <p className="mt-3 font-display font-bold">Spotwork PropTech Maroc</p>
        <p className="mt-1 text-xs text-slate-500">Chargement des espaces en direct depuis la base de données...</p>
      </div>
    </div>
  );

  const isManagerOrAdmin = currentUser && (currentUser.role === 'manager' || currentUser.role === 'admin');

  return (
    <div className="font-body">
      <Navbar view={view} nav={nav} cartCount={cart.length} menuOpen={menuOpen} setMenuOpen={setMenuOpen} currentUser={currentUser} onSelectUser={onLogin} onLogout={onLogout} toast={toast} />
      {view.name === "home" && <Home nav={nav} favs={favs} toggleFav={toggleFav} spaces={spacesList} bookings={allBookings} currentUser={currentUser} userBookings={userBookings} />}
      {view.name === "explore" && <Explore params={view.params} nav={nav} favs={favs} toggleFav={toggleFav} spaces={spacesList} bookings={allBookings} />}
      {view.name === "space" && <SpaceDetail id={view.params.id} nav={nav} favs={favs} toggleFav={toggleFav} reserve={reserve} spaces={spacesList} bookings={allBookings} currentUser={currentUser} onUpdateSpace={handleUpdateSpace} />}
      {view.name === "checkout" && <Checkout cart={cart} setCart={setCart} nav={nav} onDone={onDone} toast={toast} currentUser={currentUser} />}
      {view.name === "user" && <UserDash initTab={view.params?.tab} bookings={userBookings} setBookings={setUserBookings} favs={favs} toggleFav={toggleFav} nav={nav} toast={toast} currentUser={currentUser} spaces={spacesList} />}
      {view.name === "admin" && (
        isManagerOrAdmin ? (
          <AdminDash
            nav={nav}
            toast={toast}
            currentUser={currentUser}
            onSelectUser={onLogin}
            spaces={spacesList}
            onUpdateSpace={handleUpdateSpace}
            onCreateSpace={handleCreateSpace}
            onDeleteSpace={handleDeleteSpace}
            bookings={allBookings}
            onUpdateBookingStatus={handleUpdateBookingStatus}
          />
        ) : (
          <AccessDenied nav={nav} currentUser={currentUser} onSelectUser={onLogin} />
        )
      )}
      {view.name === "login" && <LoginPage currentUser={currentUser} onLogin={onLogin} nav={nav} toast={toast} />}
      <Footer nav={nav} toast={toast} />
      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className="toast pointer-events-auto flex items-center gap-2.5 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lift">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600"><Icon n={t.icon} size={13} /></span>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
