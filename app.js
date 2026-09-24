const { useState, useEffect, useMemo, useRef } = React;
const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtDate = (v) => v ? (/* @__PURE__ */ new Date(v + "T12:00")).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "\u2014";
const todayISO = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
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
  async getManagerMetrics() {
    try {
      const res = await fetch(`${API_BASE}/manager/dashboard`, {
        headers: { "Authorization": `Bearer ${SpotworkAPI.managerToken}` }
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  }
};
const CITIES = ["Paris", "Lyon", "Bordeaux", "Lille", "Nantes", "Marseille"];
const TYPES = [
  { id: "open", label: "Open space", icon: "layout-grid" },
  { id: "office", label: "Bureau priv\xE9", icon: "door-closed" },
  { id: "meeting", label: "Salle de r\xE9union", icon: "users" },
  { id: "studio", label: "Studio cr\xE9atif", icon: "palette" },
  { id: "booth", label: "Cabine focus", icon: "headphones" }
];
const AMENITIES = [
  { id: "wifi", label: "Wifi fibre", icon: "wifi" },
  { id: "coffee", label: "Caf\xE9 illimit\xE9", icon: "coffee" },
  { id: "screen", label: "\xC9cran & visio", icon: "monitor" },
  { id: "board", label: "Tableau blanc", icon: "pen-tool" },
  { id: "print", label: "Impression", icon: "printer" },
  { id: "access", label: "Acc\xE8s 24/7", icon: "key-round" },
  { id: "terrace", label: "Terrasse", icon: "sun" },
  { id: "bike", label: "Parking v\xE9lo", icon: "bike" }
];
const IMG = {
  a: "photo-1497366216548-37526070297c",
  b: "photo-1497366811353-6870744d04b2",
  c: "photo-1524758631624-e2822e304c36",
  d: "photo-1556761175-b413da4baf72",
  e: "photo-1497215728101-856f4ea42174",
  f: "photo-1527192491265-7e15c50b385d",
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
const SPACES = [
  { id: 1, name: "La Verri\xE8re", city: "Paris", district: "11e \xB7 Oberkampf", type: "open", price: 29, unit: "jour", rating: 4.9, rev: 187, cap: 45, surface: "320 m\xB2", imgs: [IMG.a, IMG.b, IMG.c], am: ["wifi", "coffee", "screen", "print", "access", "terrace"], badge: "Coup de c\u0153ur", featured: true, host: "Claire Moreau", desc: "Ancien atelier baign\xE9 de lumi\xE8re sous verri\xE8re d'\xE9poque. Postes ergonomiques, phone boxes, rooftop et une communaut\xE9 de 40 r\xE9sidents (studios, freelances, startups).", busy: [] },
  { id: 2, name: "Studio Canop\xE9e", city: "Lyon", district: "2e \xB7 Confluence", type: "studio", price: 38, unit: "heure", rating: 4.8, rev: 96, cap: 12, surface: "85 m\xB2", imgs: [IMG.n, IMG.h, IMG.i], am: ["wifi", "screen", "board", "coffee"], badge: "Nouveau", featured: true, host: "Karim Benali", desc: "Studio cr\xE9atif insonoris\xE9 avec lumi\xE8re ajustable, fond vert, mat\xE9riel de captation et mur inscriptible. Id\xE9al pour tournages, workshops et brainstorms.", busy: [2, 5] },
  { id: 3, name: "Le Hub Bastille", city: "Paris", district: "11e \xB7 Bastille", type: "office", price: 89, unit: "jour", rating: 4.7, rev: 143, cap: 6, surface: "28 m\xB2", imgs: [IMG.e, IMG.k, IMG.c], am: ["wifi", "screen", "print", "access", "bike"], badge: "", featured: true, host: "Claire Moreau", desc: "Bureau priv\xE9 ferm\xE9, climatis\xE9, mobilier Herman Miller. Salle de visio d\xE9di\xE9e et service de r\xE9ception de colis inclus.", busy: [] },
  { id: 4, name: "Salle Horizon", city: "Bordeaux", district: "Chartrons", type: "meeting", price: 24, unit: "heure", rating: 4.9, rev: 212, cap: 10, surface: "35 m\xB2", imgs: [IMG.d, IMG.j, IMG.l], am: ["wifi", "screen", "board", "coffee"], badge: "Populaire", featured: true, host: "L\xE9a Fontaine", desc: "Salle de r\xE9union premium : \xE9cran 4K interactif, visio native Teams/Zoom, paperboard digital. Caf\xE9 et eaux infus\xE9es offerts.", busy: [1, 4, 6] },
  { id: 5, name: "Cabine Mute", city: "Lille", district: "Euralille", type: "booth", price: 9, unit: "heure", rating: 4.6, rev: 58, cap: 1, surface: "2 m\xB2", imgs: [IMG.m, IMG.i, IMG.g], am: ["wifi", "access"], badge: "", featured: false, host: "Hugo Deschamps", desc: "Cabine acoustique ultra-silencieuse pour calls et focus. Ventilation douce, lumi\xE8re naturelle, prise USB-C 100W.", busy: [0, 3, 7] },
  { id: 6, name: "Atelier des Chartrons", city: "Bordeaux", district: "Chartrons", type: "studio", price: 42, unit: "heure", rating: 4.8, rev: 77, cap: 16, surface: "120 m\xB2", imgs: [IMG.h, IMG.n, IMG.s], am: ["wifi", "board", "coffee", "terrace"], badge: "\xC9co-responsable", featured: false, host: "L\xE9a Fontaine", desc: "Atelier modulable en c\u0153ur d'\xEElot : grande table commune, mobilier de r\xE9emploi, terrasse plein sud pour les pauses.", busy: [3] },
  { id: 7, name: "Open Loft Confluence", city: "Lyon", district: "2e \xB7 Confluence", type: "open", price: 25, unit: "jour", rating: 4.7, rev: 164, cap: 60, surface: "480 m\xB2", imgs: [IMG.k, IMG.a, IMG.g], am: ["wifi", "coffee", "print", "access", "bike", "terrace"], badge: "Populaire", featured: true, host: "Karim Benali", desc: "Le vaisseau-amiral de Confluence : open space XXL, 3 cuisines, douches, parking v\xE9lo s\xE9curis\xE9 et \xE9v\xE9nements hebdo.", busy: [] },
  { id: 8, name: "Bureau Verdier", city: "Nantes", district: "\xCEle de Nantes", type: "office", price: 65, unit: "jour", rating: 4.6, rev: 49, cap: 4, surface: "18 m\xB2", imgs: [IMG.c, IMG.e, IMG.m], am: ["wifi", "screen", "access"], badge: "", featured: false, host: "Nadia Rousseau", desc: "Bureau cosy vue sur Loire, parfait pour une petite \xE9quipe en sprint. Kitchenette partag\xE9e \xE0 l'\xE9tage.", busy: [] },
  { id: 9, name: "Salle Z\xE9nith", city: "Marseille", district: "Joliette", type: "meeting", price: 19, unit: "heure", rating: 4.8, rev: 134, cap: 14, surface: "42 m\xB2", imgs: [IMG.q, IMG.d, IMG.j], am: ["wifi", "screen", "board", "coffee", "terrace"], badge: "", featured: true, host: "Marc Antonetti", desc: "Salle panoramique au 8e \xE9tage, vue mer. Configuration U, th\xE9\xE2tre ou workshop en 5 minutes gr\xE2ce au mobilier roulant.", busy: [2, 6] },
  { id: 10, name: "Loft Turbigo", city: "Paris", district: "2e \xB7 Sentier", type: "open", price: 32, unit: "jour", rating: 4.8, rev: 201, cap: 38, surface: "260 m\xB2", imgs: [IMG.b, IMG.f, IMG.k], am: ["wifi", "coffee", "screen", "access", "bike"], badge: "", featured: false, host: "Claire Moreau", desc: "Loft haussmannien revisit\xE9 : hauteur sous plafond, silence studieux le matin, ap\xE9ros communautaires le jeudi.", busy: [] }
];
const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const REVIEWS = [
  { n: "Camille R.", role: "Product designer", d: "Mai 2025", stars: 5, t: "R\xE9serv\xE9 en 2 minutes, accueil impeccable et wifi ultra stable. Je reviendrai les yeux ferm\xE9s." },
  { n: "Thomas B.", role: "Consultant", d: "Avr. 2025", stars: 5, t: "Espace lumineux, caf\xE9 de qualit\xE9 et voisins bienveillants. Le checkout en ligne est vraiment fluide." },
  { n: "In\xE8s M.", role: "D\xE9veloppeuse freelance", d: "Mars 2025", stars: 4, t: "Tr\xE8s bon rapport qualit\xE9/prix. J'aurais aim\xE9 un peu plus de phone boxes aux heures de pointe." }
];
const INIT_BOOKINGS = [
  { id: 1, spaceId: 1, date: "2025-07-14", meta: "Journ\xE9e compl\xE8te", status: "Confirm\xE9e" },
  { id: 2, spaceId: 4, date: "2025-07-18", meta: "14:00 \u2013 16:00", status: "En attente" }
];
const PAST_BOOKINGS = [
  { id: 9, spaceId: 7, date: "2025-05-02", meta: "Journ\xE9e compl\xE8te", status: "Termin\xE9e" },
  { id: 8, spaceId: 3, date: "2025-04-11", meta: "2 jours", status: "Termin\xE9e" },
  { id: 7, spaceId: 9, date: "2025-03-28", meta: "09:00 \u2013 11:00", status: "Termin\xE9e" }
];
const REVENUE = [12.4, 14.1, 13.2, 16.8, 18.5, 17.2, 21.4, 23.1, 22, 25.6, 27.3, 29.8];
const MONTHS = ["Jan", "F\xE9v", "Mar", "Avr", "Mai", "Juin", "Juil", "Ao\xFB", "Sep", "Oct", "Nov", "D\xE9c"];
const WEEK_OCC = [62, 71, 78, 84, 80, 58, 34];
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const OCC = { 1: 86, 2: 74, 3: 68, 4: 91, 5: 57, 6: 63, 7: 82, 8: 44, 9: 77, 10: 71 };
const RECENT = [
  { c: "Julien P.", s: "La Verri\xE8re", d: "Aujourd'hui 09:12", a: 29, st: "Confirm\xE9e" },
  { c: "Sarah L.", s: "Salle Horizon", d: "Aujourd'hui 08:47", a: 48, st: "Confirm\xE9e" },
  { c: "Mehdi K.", s: "Open Loft Confluence", d: "Hier 18:20", a: 50, st: "En attente" },
  { c: "Anne V.", s: "Studio Canop\xE9e", d: "Hier 15:03", a: 114, st: "Confirm\xE9e" },
  { c: "Paul G.", s: "Cabine Mute", d: "Hier 11:36", a: 18, st: "Confirm\xE9e" }
];
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
const SpaceCard = ({ s, nav, favs, toggleFav }) => {
  const liked = favs.has(s.id);
  return /* @__PURE__ */ React.createElement(
    "article",
    {
      onClick: () => nav({ name: "space", params: { id: s.id } }),
      className: "group cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift"
    },
    /* @__PURE__ */ React.createElement("div", { className: "relative h-44 md:h-48 overflow-hidden" }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: U(s.imgs[0], 700),
        alt: s.name,
        loading: "lazy",
        className: "h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]"
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "absolute left-3 top-3" }, /* @__PURE__ */ React.createElement(Badge, { label: s.badge })), /* @__PURE__ */ React.createElement(
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
    /* @__PURE__ */ React.createElement("div", { className: "p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("h3", { className: "font-display font-semibold text-[15px] leading-snug" }, s.name), /* @__PURE__ */ React.createElement("span", { className: "flex shrink-0 items-center gap-1 text-sm font-semibold" }, /* @__PURE__ */ React.createElement(Icon, { n: "star", size: 13, fill: "currentColor", className: "text-amber-400" }), s.rating.toLocaleString("fr-FR"))), /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 flex items-center gap-1 text-[13px] text-slate-500" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 12 }), s.city, " \xB7 ", s.district), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-slate-400" }, TYPES.find((t) => t.id === s.type).label, " \xB7 ", s.cap, " pers. \xB7 ", s.surface), /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex items-center justify-between border-t border-slate-100 pt-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-[15px]" }, /* @__PURE__ */ React.createElement("b", { className: "font-display" }, EUR.format(s.price)), /* @__PURE__ */ React.createElement("span", { className: "text-slate-400 text-xs" }, " /", s.unit)), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1 text-xs font-semibold text-brand-600 transition-transform group-hover:translate-x-1" }, "Voir l'espace", /* @__PURE__ */ React.createElement(Icon, { n: "arrow-right", size: 13 }))))
  );
};
const Navbar = ({ view, nav, cartCount, menuOpen, setMenuOpen }) => {
  const [scrolled, setScrolled] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [apiOnline, setApiOnline] = useState(null);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    f();
    window.addEventListener("scroll", f);
    SpotworkAPI.checkHealth().then((h) => setApiOnline(Boolean(h)));
    return () => window.removeEventListener("scroll", f);
  }, []);
  const link = (label, target, icon) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: label,
      onClick: () => {
        nav(target);
        setUserMenu(false);
      },
      className: `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${view.name === target.name ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:text-ink hover:bg-slate-50"}`
    },
    icon && /* @__PURE__ */ React.createElement(Icon, { n: icon, size: 15 }),
    label
  );
  return /* @__PURE__ */ React.createElement("header", { className: `sticky top-0 z-50 transition-all ${scrolled ? "bg-white/92 backdrop-blur-md shadow-[0_1px_0_rgba(13,44,90,.08)]" : "bg-white"}` }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6" }, /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "home" }), className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/30" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 18 })), /* @__PURE__ */ React.createElement("span", { className: "font-display text-lg font-bold tracking-tight" }, "Spotwork")), /* @__PURE__ */ React.createElement("nav", { className: "hidden lg:flex items-center gap-1" }, link("Accueil", { name: "home" }), link("Explorer", { name: "explore" }, "search"), link("Mes r\xE9servations", { name: "user" }, "calendar-days"), link("Gestionnaire", { name: "admin" }, "bar-chart-3")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
    SpotworkAPI.checkHealth().then((h) => {
      setApiOnline(Boolean(h));
    });
  }, title: "\xC9tat de l'API Backend Express & Supabase", className: `hidden md:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition ${apiOnline ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}` }, /* @__PURE__ */ React.createElement("span", { className: `h-2 w-2 rounded-full ${apiOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}` }), apiOnline ? "API Active (Supabase & IA)" : "Mode D\xE9mo (API locale)"), /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "checkout" }), className: "relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:border-brand-300 hover:text-brand-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "shopping-cart", size: 17 }), cartCount > 0 && /* @__PURE__ */ React.createElement("span", { key: cartCount, className: "pop absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white" }, cartCount)), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setUserMenu(!userMenu), className: "flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 transition hover:border-brand-300" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-8 w-8 place-items-center rounded-full bg-navy text-[11px] font-bold text-white" }, "CL"), /* @__PURE__ */ React.createElement("span", { className: "hidden sm:block text-sm font-semibold" }, "L\xE9a"), /* @__PURE__ */ React.createElement(Icon, { n: "chevron-down", size: 14, className: "text-slate-400" })), userMenu && /* @__PURE__ */ React.createElement("div", { className: "absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift" }, [
    ["Mon tableau de bord", "layout-grid", () => nav({ name: "user" })],
    ["Mes favoris", "heart", () => nav({ name: "user", params: { tab: "favoris" } })],
    ["Espace gestionnaire", "bar-chart-3", () => nav({ name: "admin" })]
  ].map(([l, i, f]) => /* @__PURE__ */ React.createElement("button", { key: l, onClick: f, className: "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-mist hover:text-ink" }, /* @__PURE__ */ React.createElement(Icon, { n: i, size: 15, className: "text-slate-400" }), l)))), /* @__PURE__ */ React.createElement("button", { onClick: () => setMenuOpen(!menuOpen), className: "grid h-10 w-10 place-items-center rounded-full border border-slate-200 lg:hidden" }, /* @__PURE__ */ React.createElement(Icon, { n: menuOpen ? "x" : "menu", size: 18 })))), menuOpen && /* @__PURE__ */ React.createElement("div", { className: "border-t border-slate-100 bg-white px-4 py-3 lg:hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1" }, link("Accueil", { name: "home" }, "home"), link("Explorer les espaces", { name: "explore" }, "search"), link("Mes r\xE9servations", { name: "user" }, "calendar-days"), link("Tableau de bord gestionnaire", { name: "admin" }, "bar-chart-3"), link("Panier", { name: "checkout" }, "shopping-cart"))));
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
  return /* @__PURE__ */ React.createElement("form", { onSubmit: submit, className: "rounded-2xl border border-slate-200/80 bg-white p-4 shadow-lift md:p-5" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" }, /* @__PURE__ */ React.createElement(Field, { label: "Ville", err: errs.city }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 15, className: "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" }), /* @__PURE__ */ React.createElement("select", { value: city, onChange: (e) => setCity(e.target.value), className: `${sel(city)} pl-9` }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Toutes les villes"), CITIES.map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, c))))), /* @__PURE__ */ React.createElement(Field, { label: "Type d'espace" }, /* @__PURE__ */ React.createElement("select", { value: type, onChange: (e) => setType(e.target.value), className: sel(type) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Tous les types"), TYPES.map((t) => /* @__PURE__ */ React.createElement("option", { key: t.id, value: t.id }, t.label)))), /* @__PURE__ */ React.createElement(Field, { label: "Date", err: errs.date }, /* @__PURE__ */ React.createElement("input", { type: "date", min: todayISO(), value: date, onChange: (e) => setDate(e.target.value), className: `${inp} ${errs.date ? inpErr : ""}` })), /* @__PURE__ */ React.createElement(Field, { label: "Budget max" }, /* @__PURE__ */ React.createElement("select", { value: budget, onChange: (e) => setBudget(e.target.value), className: sel(true) }, /* @__PURE__ */ React.createElement("option", { value: "25" }, "\u2264 25 \u20AC"), /* @__PURE__ */ React.createElement("option", { value: "50" }, "\u2264 50 \u20AC"), /* @__PURE__ */ React.createElement("option", { value: "100" }, "\u2264 100 \u20AC"), /* @__PURE__ */ React.createElement("option", { value: "150" }, "Tous budgets")))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center" }, /* @__PURE__ */ React.createElement("p", { className: "flex items-center gap-2 text-xs text-slate-500" }, /* @__PURE__ */ React.createElement(Icon, { n: "shield-check", size: 14, className: "text-emerald-500" }), "Annulation gratuite jusqu'\xE0 24 h avant"), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[.98] sm:w-auto" }, /* @__PURE__ */ React.createElement(Icon, { n: "search", size: 16 }), "Rechercher un espace")));
};
const Hero = ({ nav }) => /* @__PURE__ */ React.createElement("section", { className: "relative overflow-hidden bg-mist" }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-dots opacity-60" }), /* @__PURE__ */ React.createElement("div", { className: "absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-brand-100 blur-3xl opacity-70" }), /* @__PURE__ */ React.createElement("div", { className: "relative mx-auto max-w-7xl px-4 pb-16 pt-10 md:px-6 md:pt-16 lg:pb-20" }, /* @__PURE__ */ React.createElement("div", { className: "grid items-center gap-10 lg:grid-cols-12" }, /* @__PURE__ */ React.createElement("div", { className: "lg:col-span-6" }, /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm" }, /* @__PURE__ */ React.createElement("span", { className: "dot-live h-2 w-2 rounded-full bg-emerald-500" }), "320+ espaces v\xE9rifi\xE9s \xB7 6 villes"), /* @__PURE__ */ React.createElement("h1", { className: "mt-5 font-display text-[2.4rem] font-bold leading-[1.04] tracking-tight md:text-6xl" }, /* @__PURE__ */ React.createElement("span", { className: "mask-line" }, /* @__PURE__ */ React.createElement("span", { style: { animationDelay: ".05s" } }, "Des espaces qui")), /* @__PURE__ */ React.createElement("span", { className: "mask-line" }, /* @__PURE__ */ React.createElement("span", { style: { animationDelay: ".16s" } }, "donnent envie de")), /* @__PURE__ */ React.createElement("span", { className: "mask-line" }, /* @__PURE__ */ React.createElement("span", { style: { animationDelay: ".27s" }, className: "text-brand-600" }, "travailler."))), /* @__PURE__ */ React.createElement("p", { className: "mt-5 max-w-md text-[15px] leading-relaxed text-slate-600" }, "Bureaux priv\xE9s, open spaces, salles de r\xE9union : comparez, visitez en photos et r\xE9servez en moins de deux minutes, \xE0 l'heure ou \xE0 la journ\xE9e."), /* @__PURE__ */ React.createElement("div", { className: "mt-6 flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex -space-x-2.5" }, ["JD", "SM", "KB", "AV"].map((x, i) => /* @__PURE__ */ React.createElement(
  "span",
  {
    key: x,
    className: "grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white",
    style: { background: ["#1F56D6", "#0D2C5A", "#5B90F7", "#142F7A"][i] }
  },
  x
))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, /* @__PURE__ */ React.createElement("b", { className: "text-ink" }, "12 400+"), " ind\xE9pendants nous font confiance")), /* @__PURE__ */ React.createElement("div", { className: "mt-8" }, /* @__PURE__ */ React.createElement(SearchPanel, { nav }))), /* @__PURE__ */ React.createElement("div", { className: "relative hidden lg:col-span-6 lg:block" }, /* @__PURE__ */ React.createElement("div", { className: "relative ml-auto w-[92%]" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-hidden rounded-3xl shadow-lift" }, /* @__PURE__ */ React.createElement("img", { src: U(IMG.f, 900), alt: "Espace de coworking lumineux", className: "h-[430px] w-full object-cover" })), /* @__PURE__ */ React.createElement("div", { className: "absolute -bottom-8 -left-10 w-52 overflow-hidden rounded-2xl border-4 border-mist shadow-lift" }, /* @__PURE__ */ React.createElement("img", { src: U(IMG.g, 500), alt: "Freelances au travail", className: "h-32 w-full object-cover" })), /* @__PURE__ */ React.createElement("div", { className: "floaty absolute -right-4 top-8 rounded-2xl bg-white p-3.5 shadow-lift" }, /* @__PURE__ */ React.createElement("p", { className: "flex items-center gap-1.5 text-[11px] font-semibold text-slate-500" }, /* @__PURE__ */ React.createElement("span", { className: "dot-live h-1.5 w-1.5 rounded-full bg-emerald-500" }), "Occupation en direct"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 font-display text-sm font-bold" }, "Open Loft \xB7 Lyon"), /* @__PURE__ */ React.createElement("div", { className: "mt-2 h-1.5 w-36 overflow-hidden rounded-full bg-slate-100" }, /* @__PURE__ */ React.createElement("div", { className: "h-full w-[82%] rounded-full bg-brand-600" })), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-[11px] font-semibold text-brand-700" }, "82 % occup\xE9")), /* @__PURE__ */ React.createElement("div", { className: "floaty absolute -left-16 top-40 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-lift", style: { animationDelay: "1.4s" } }, /* @__PURE__ */ React.createElement("span", { className: "grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-amber-500" }, /* @__PURE__ */ React.createElement(Icon, { n: "star", size: 16, fill: "currentColor" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-display text-sm font-bold" }, "4,9 / 5"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400" }, "2 140 avis v\xE9rifi\xE9s"))))))));
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
const Home = ({ nav, favs, toggleFav }) => {
  const featured = SPACES.filter((s) => s.featured);
  return /* @__PURE__ */ React.createElement("main", null, /* @__PURE__ */ React.createElement(Hero, { nav }), /* @__PURE__ */ React.createElement("div", { className: "border-y border-slate-100 bg-white py-4" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "marquee flex w-max items-center gap-10 text-sm font-semibold text-slate-400" }, [0, 1].map((k) => /* @__PURE__ */ React.createElement("div", { key: k, className: "flex items-center gap-10" }, [...CITIES, ...CITIES].map((c, i) => /* @__PURE__ */ React.createElement("span", { key: c + i, className: "flex items-center gap-10 whitespace-nowrap" }, /* @__PURE__ */ React.createElement("span", { className: "font-display" }, c), /* @__PURE__ */ React.createElement(Icon, { n: "asterisk", size: 12, className: "text-brand-300" })))))))), /* @__PURE__ */ React.createElement("section", { className: "mx-auto max-w-7xl px-4 py-14 md:px-6" }, /* @__PURE__ */ React.createElement(SecHead, { kicker: "Parcourir", title: "Explorer par type d'espace" }), /* @__PURE__ */ React.createElement("div", { className: "no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0", "data-reveal": true }, TYPES.map((t, i) => {
    const count = SPACES.filter((s) => s.type === t.id).length;
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
  }))), /* @__PURE__ */ React.createElement("section", { className: "bg-mist py-14" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-7xl px-4 md:px-6" }, /* @__PURE__ */ React.createElement(
    SecHead,
    {
      kicker: "S\xE9lection",
      title: "Espaces en vedette cette semaine",
      action: /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "explore" }), className: "flex items-center gap-1.5 text-sm font-bold text-brand-600 transition hover:gap-2.5" }, "Tout voir", /* @__PURE__ */ React.createElement(Icon, { n: "arrow-right", size: 15 }))
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" }, featured.map((s, i) => /* @__PURE__ */ React.createElement("div", { key: s.id, "data-reveal": true, style: { transitionDelay: `${i * 70}ms` } }, /* @__PURE__ */ React.createElement(SpaceCard, { s, nav, favs, toggleFav })))))), /* @__PURE__ */ React.createElement("section", { className: "mx-auto max-w-7xl px-4 py-16 md:px-6" }, /* @__PURE__ */ React.createElement(SecHead, { kicker: "Simple et rapide", title: "R\xE9servez en trois temps" }), /* @__PURE__ */ React.createElement("div", { className: "relative grid gap-10 md:grid-cols-3 md:gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-slate-200 md:block" }), [
    { n: "01", i: "search", t: "Cherchez & comparez", d: "Filtrez par ville, type, budget et \xE9quipements. Photos r\xE9elles, avis v\xE9rifi\xE9s, tarifs transparents." },
    { n: "02", i: "badge-check", t: "R\xE9servez en 2 min", d: "Choisissez votre cr\xE9neau, payez en ligne de fa\xE7on s\xE9curis\xE9e. Confirmation instantan\xE9e par e-mail." },
    { n: "03", i: "calendar-check", t: "Installez-vous", d: "Acc\xE8s direct le jour J. Annulation gratuite jusqu'\xE0 24 h avant, report en un clic." }
  ].map((s, i) => /* @__PURE__ */ React.createElement("div", { key: s.n, className: "relative flex gap-4 md:flex-col md:gap-0", "data-reveal": true, style: { transitionDelay: `${i * 100}ms` } }, /* @__PURE__ */ React.createElement("div", { className: "relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-navy text-white shadow-lg" }, /* @__PURE__ */ React.createElement(Icon, { n: s.i, size: 22 })), /* @__PURE__ */ React.createElement("div", { className: "md:mt-5" }, /* @__PURE__ */ React.createElement("p", { className: "font-display text-xs font-bold tracking-[0.25em] text-brand-500" }, s.n), /* @__PURE__ */ React.createElement("h3", { className: "mt-1 font-display text-lg font-bold" }, s.t), /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 text-sm leading-relaxed text-slate-500" }, s.d)))))), /* @__PURE__ */ React.createElement("section", { className: "mx-auto max-w-7xl px-4 pb-16 md:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "relative overflow-hidden rounded-3xl bg-navy p-8 md:p-12", "data-reveal": true }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-grid" }), /* @__PURE__ */ React.createElement("div", { className: "absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl" }), /* @__PURE__ */ React.createElement("div", { className: "relative grid items-center gap-10 lg:grid-cols-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Kicker, null, /* @__PURE__ */ React.createElement("span", { className: "text-brand-300" }, "Vous g\xE9rez un espace ?")), /* @__PURE__ */ React.createElement("h2", { className: "mt-3 font-display text-2xl font-bold tracking-tight text-white md:text-4xl" }, "Remplissez vos salles pendant qu'elles dorment."), /* @__PURE__ */ React.createElement("p", { className: "mt-4 max-w-md text-sm leading-relaxed text-slate-300" }, "Tableau de bord temps r\xE9el : occupation, revenus, r\xE9servations. Synchronisez vos disponibilit\xE9s et laissez la demande venir \xE0 vous."), /* @__PURE__ */ React.createElement("div", { className: "mt-6 flex flex-wrap items-center gap-6 text-white" }, [["+32 %", "d'occupation moyenne"], ["0 \u20AC", "avant la premi\xE8re r\xE9servation"]].map(([v, l]) => /* @__PURE__ */ React.createElement("div", { key: l }, /* @__PURE__ */ React.createElement("p", { className: "font-display text-2xl font-bold text-brand-300" }, v), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400" }, l)))), /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "admin" }), className: "mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-navy transition hover:bg-brand-50 active:scale-[.98]" }, "D\xE9couvrir le dashboard gestionnaire", /* @__PURE__ */ React.createElement(Icon, { n: "arrow-right", size: 15 }))), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "rotate-2 rounded-2xl bg-white p-4 shadow-lift transition-transform duration-500 hover:rotate-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold" }, "Revenus \xB7 Juin"), /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600" }, "+12,4 %")), /* @__PURE__ */ React.createElement("p", { className: "font-display text-2xl font-bold" }, "23 100 \u20AC"), /* @__PURE__ */ React.createElement(Spark, { data: [8, 10, 9, 13, 12, 15, 17, 16, 19], color: "#1F56D6" }), /* @__PURE__ */ React.createElement("div", { className: "mt-3 space-y-2" }, [["La Verri\xE8re", 86], ["Salle Horizon", 91], ["Open Loft", 82]].map(([n, v]) => /* @__PURE__ */ React.createElement("div", { key: n, className: "flex items-center gap-2 text-[11px]" }, /* @__PURE__ */ React.createElement("span", { className: "w-24 truncate font-semibold text-slate-500" }, n), /* @__PURE__ */ React.createElement("div", { className: "h-1.5 flex-1 rounded-full bg-slate-100" }, /* @__PURE__ */ React.createElement("div", { className: "h-full rounded-full bg-brand-500", style: { width: v + "%" } })), /* @__PURE__ */ React.createElement("b", null, v, "%"))))))))), /* @__PURE__ */ React.createElement("section", { className: "bg-mist py-16" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-7xl px-4 md:px-6" }, /* @__PURE__ */ React.createElement(SecHead, { kicker: "Ils en parlent mieux que nous", title: "La communaut\xE9 Spotwork" }), /* @__PURE__ */ React.createElement("div", { className: "grid gap-5 lg:grid-cols-3" }, /* @__PURE__ */ React.createElement("figure", { className: "relative rounded-3xl bg-navy p-8 text-white lg:col-span-2", "data-reveal": true }, /* @__PURE__ */ React.createElement(Icon, { n: "quote", size: 34, className: "text-brand-400" }), /* @__PURE__ */ React.createElement("blockquote", { className: "mt-4 font-display text-xl font-semibold leading-relaxed md:text-2xl" }, `"J'ai test\xE9 quatre espaces en deux semaines sans aucune friction. Le dashboard me suit partout, mes factures sont centralis\xE9es. C'est devenu un r\xE9flexe."`), /* @__PURE__ */ React.createElement("figcaption", { className: "mt-6 flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-11 w-11 place-items-center rounded-full bg-brand-500 font-bold" }, "SD"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold" }, "Sophie Durand"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400" }, "Consultante ind\xE9pendante \xB7 Paris")), /* @__PURE__ */ React.createElement("div", { className: "ml-auto" }, /* @__PURE__ */ React.createElement(Stars, { v: 5 })))), /* @__PURE__ */ React.createElement("div", { className: "grid gap-5" }, [
    { t: "La gestion de nos 3 salles est devenue limpide. L'occupation a pris 28 points en un trimestre.", n: "Marc A.", r: "G\xE9rant \xB7 Marseille", d: "MA" },
    { t: "R\xE9servation un dimanche soir \xE0 23 h pour le lundi matin. Personne d'autre ne fait \xE7a.", n: "Julien P.", r: "D\xE9veloppeur \xB7 Lyon", d: "JP" }
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
  ), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-[10px] text-slate-400" }, /* @__PURE__ */ React.createElement("span", null, "10 \u20AC"), /* @__PURE__ */ React.createElement("span", null, "150 \u20AC+"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500" }, "\xC9quipements"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2.5" }, AMENITIES.slice(0, 6).map((a) => /* @__PURE__ */ React.createElement("label", { key: a.id, className: "flex cursor-pointer items-center gap-2.5 text-sm text-slate-600" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: f.am.includes(a.id), onChange: () => flipAm(a.id), className: "h-4 w-4 rounded accent-[#1F56D6]" }), /* @__PURE__ */ React.createElement(Icon, { n: a.icon, size: 14, className: "text-slate-400" }), a.label)))), /* @__PURE__ */ React.createElement("button", { onClick: () => setF({ city: "", types: [], max: 150, am: [] }), className: "flex items-center gap-1.5 text-xs font-bold text-rose-500 transition hover:text-rose-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "x", size: 13 }), "R\xE9initialiser les filtres"));
};
const Explore = ({ params, nav, favs, toggleFav }) => {
  const [f, setF] = useState(() => ({
    city: params?.city || "",
    types: params?.type ? [params.type] : [],
    max: params?.budget ? +params.budget : 150,
    am: []
  }));
  const [sort, setSort] = useState("reco");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    let r = SPACES.filter(
      (s) => (!f.city || s.city === f.city) && (!f.types.length || f.types.includes(s.type)) && (f.max >= 150 || s.price <= f.max) && f.am.every((a) => s.am.includes(a))
    );
    if (sort === "asc") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "desc") r = [...r].sort((a, b) => b.price - a.price);
    if (sort === "note") r = [...r].sort((a, b) => b.rating - a.rating);
    return r;
  }, [f, sort]);
  return /* @__PURE__ */ React.createElement("main", { className: "mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-end justify-between gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Kicker, null, "Catalogue"), /* @__PURE__ */ React.createElement("h1", { className: "mt-2 font-display text-3xl font-bold tracking-tight" }, "Explorer les espaces"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm text-slate-500" }, /* @__PURE__ */ React.createElement("b", { className: "text-ink" }, results.length), " espace", results.length > 1 ? "s" : "", " disponible", results.length > 1 ? "s" : "", f.city && /* @__PURE__ */ React.createElement("span", null, " \xE0 ", /* @__PURE__ */ React.createElement("b", { className: "text-brand-600" }, f.city)))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setOpen(!open), className: "flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold lg:hidden" }, /* @__PURE__ */ React.createElement(Icon, { n: "sliders-horizontal", size: 15 }), "Filtres"), /* @__PURE__ */ React.createElement("select", { value: sort, onChange: (e) => setSort(e.target.value), className: "rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-500" }, /* @__PURE__ */ React.createElement("option", { value: "reco" }, "Recommand\xE9s"), /* @__PURE__ */ React.createElement("option", { value: "note" }, "Mieux not\xE9s"), /* @__PURE__ */ React.createElement("option", { value: "asc" }, "Prix croissant"), /* @__PURE__ */ React.createElement("option", { value: "desc" }, "Prix d\xE9croissant")))), /* @__PURE__ */ React.createElement("div", { className: "mt-8 grid gap-8 lg:grid-cols-[260px_1fr]" }, /* @__PURE__ */ React.createElement("aside", { className: `${open ? "block" : "hidden"} lg:block` }, /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:sticky lg:top-24" }, /* @__PURE__ */ React.createElement(FilterPanel, { f, setF }))), /* @__PURE__ */ React.createElement("div", null, results.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "grid place-items-center rounded-2xl border-2 border-dashed border-slate-200 py-24 text-center" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "mx-auto grid h-14 w-14 place-items-center rounded-full bg-mist text-slate-400" }, /* @__PURE__ */ React.createElement(Icon, { n: "search-x", size: 24 })), /* @__PURE__ */ React.createElement("p", { className: "mt-4 font-display font-bold" }, "Aucun espace ne correspond"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm text-slate-500" }, "Essayez d'\xE9largir vos crit\xE8res."), /* @__PURE__ */ React.createElement("button", { onClick: () => setF({ city: "", types: [], max: 150, am: [] }), className: "mt-4 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white" }, "Effacer les filtres"))) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-5 sm:grid-cols-2 xl:grid-cols-3" }, results.map((s, i) => /* @__PURE__ */ React.createElement("div", { key: s.id, "data-reveal": true, style: { transitionDelay: `${i % 3 * 60}ms` } }, /* @__PURE__ */ React.createElement(SpaceCard, { s, nav, favs, toggleFav })))))));
};
const SpaceDetail = ({ id, nav, favs, toggleFav, reserve }) => {
  const s = SPACES.find((x) => x.id === id);
  const [img, setImg] = useState(0);
  const [date, setDate] = useState(() => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [days, setDays] = useState(1);
  const [slots, setSlots] = useState([]);
  const [err, setErr] = useState("");
  if (!s) return /* @__PURE__ */ React.createElement("main", { className: "py-24 text-center" }, "Espace introuvable.");
  const liked = favs.has(s.id);
  const isHour = s.unit === "heure";
  const base = isHour ? slots.length * s.price : days * s.price;
  const fees = Math.round(base * 0.08 * 100) / 100;
  const flipSlot = (h) => setSlots((p) => p.includes(h) ? p.filter((x) => x !== h) : [...p, h].sort());
  const book = () => {
    if (isHour && slots.length === 0) {
      setErr("S\xE9lectionnez au moins un cr\xE9neau horaire.");
      return;
    }
    setErr("");
    reserve({
      key: Date.now(),
      id: s.id,
      name: s.name,
      img: s.imgs[0],
      city: s.city,
      date,
      meta: isHour ? `${fmtDate(date)} \xB7 ${slots.length} h` : `${fmtDate(date)} \xB7 ${days} jour${days > 1 ? "s" : ""}`,
      total: base + fees
    });
  };
  const similar = SPACES.filter((x) => x.id !== s.id && (x.city === s.city || x.type === s.type)).slice(0, 3);
  return /* @__PURE__ */ React.createElement("main", { className: "mx-auto max-w-7xl px-4 py-8 md:px-6" }, /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "explore" }), className: "flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-ink" }, /* @__PURE__ */ React.createElement(Icon, { n: "arrow-left", size: 16 }), "Retour aux r\xE9sultats"), /* @__PURE__ */ React.createElement("div", { className: "mt-5 grid gap-8 lg:grid-cols-[1fr_380px]" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement(Badge, { label: s.badge }), /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700" }, TYPES.find((t) => t.id === s.type).label)), /* @__PURE__ */ React.createElement("h1", { className: "mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl" }, s.name), /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 13 }), s.city, " \xB7 ", s.district), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "star", size: 13, fill: "currentColor", className: "text-amber-400" }), /* @__PURE__ */ React.createElement("b", { className: "text-ink" }, s.rating.toLocaleString("fr-FR")), "(", s.rev, " avis)")), /* @__PURE__ */ React.createElement("div", { className: "mt-5 grid grid-cols-4 gap-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "col-span-4 overflow-hidden rounded-2xl md:col-span-3" }, /* @__PURE__ */ React.createElement("img", { src: U(s.imgs[img], 1100), alt: s.name, className: "h-64 w-full object-cover transition-all duration-500 md:h-[380px]" })), /* @__PURE__ */ React.createElement("div", { className: "col-span-4 grid grid-cols-3 gap-2.5 md:col-span-1 md:grid-cols-1" }, s.imgs.map((im, i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: i,
      onClick: () => setImg(i),
      className: `overflow-hidden rounded-xl transition ${img === i ? "ring-2 ring-brand-600 ring-offset-2" : "opacity-80 hover:opacity-100"}`
    },
    /* @__PURE__ */ React.createElement("img", { src: U(im, 300), alt: "", className: "h-20 w-full object-cover md:h-[118px]" })
  )))), /* @__PURE__ */ React.createElement("div", { className: "mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" }, [["users", "Capacit\xE9", `${s.cap} pers.`], ["ruler", "Surface", s.surface], ["clock", "R\xE9servation", isHour ? "\xC0 l'heure" : "\xC0 la journ\xE9e"], ["badge-check", "Accueil", "H\xF4te v\xE9rifi\xE9"]].map(([i, l, v]) => /* @__PURE__ */ React.createElement("div", { key: l, className: "rounded-xl border border-slate-200 p-3.5" }, /* @__PURE__ */ React.createElement(Icon, { n: i, size: 17, className: "text-brand-600" }), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400" }, l), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold" }, v)))), /* @__PURE__ */ React.createElement("div", { className: "mt-8" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display text-lg font-bold" }, "\xC0 propos de cet espace"), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-[15px] leading-relaxed text-slate-600" }, s.desc), /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex items-center gap-3 rounded-2xl bg-mist p-4" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-11 w-11 place-items-center rounded-full bg-navy text-sm font-bold text-white" }, s.host.split(" ").map((w) => w[0]).join("")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold" }, "G\xE9r\xE9 par ", s.host), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, "R\xE9pond en ~1 h \xB7 Membre depuis 2022")))), /* @__PURE__ */ React.createElement("div", { className: "mt-8" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display text-lg font-bold" }, "\xC9quipements inclus"), /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex flex-wrap gap-2.5" }, s.am.map((a) => {
    const am = AMENITIES.find((x) => x.id === a);
    return /* @__PURE__ */ React.createElement("span", { key: a, className: "flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700" }, /* @__PURE__ */ React.createElement(Icon, { n: am.icon, size: 14, className: "text-brand-600" }), am.label);
  }))), /* @__PURE__ */ React.createElement("div", { className: "mt-8" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display text-lg font-bold" }, "Avis des membres"), /* @__PURE__ */ React.createElement("div", { className: "mt-4 grid gap-6 md:grid-cols-[220px_1fr]" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 p-5 text-center h-fit" }, /* @__PURE__ */ React.createElement("p", { className: "font-display text-4xl font-bold" }, s.rating.toLocaleString("fr-FR")), /* @__PURE__ */ React.createElement("div", { className: "mt-1 flex justify-center" }, /* @__PURE__ */ React.createElement(Stars, { v: s.rating })), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-slate-400" }, s.rev, " avis"), /* @__PURE__ */ React.createElement("div", { className: "mt-4 space-y-1.5" }, [70, 20, 6, 3, 1].map((w, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex items-center gap-2 text-[10px] text-slate-400" }, /* @__PURE__ */ React.createElement("span", { className: "w-3" }, 5 - i), /* @__PURE__ */ React.createElement("div", { className: "h-1.5 flex-1 rounded-full bg-slate-100" }, /* @__PURE__ */ React.createElement("div", { className: "h-full rounded-full bg-amber-400", style: { width: w + "%" } })))))), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, REVIEWS.map((r) => /* @__PURE__ */ React.createElement("article", { key: r.n, className: "rounded-2xl border border-slate-200 p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700" }, r.n[0]), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold" }, r.n), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400" }, r.role, " \xB7 ", r.d)), /* @__PURE__ */ React.createElement("div", { className: "ml-auto" }, /* @__PURE__ */ React.createElement(Stars, { v: r.stars, size: 11 }))), /* @__PURE__ */ React.createElement("p", { className: "mt-3 text-sm leading-relaxed text-slate-600" }, r.t))))))), /* @__PURE__ */ React.createElement("aside", { className: "lg:sticky lg:top-24 h-fit" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-lift" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-baseline justify-between" }, /* @__PURE__ */ React.createElement("p", { className: "font-display text-2xl font-bold" }, EUR.format(s.price), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium text-slate-400" }, " /", s.unit)), /* @__PURE__ */ React.createElement("button", { onClick: () => toggleFav(s.id), className: `grid h-10 w-10 place-items-center rounded-full border transition ${liked ? "border-rose-200 bg-rose-50 text-rose-500" : "border-slate-200 text-slate-400 hover:text-rose-500"}` }, /* @__PURE__ */ React.createElement(Icon, { n: "heart", size: 17, fill: liked ? "currentColor" : "none", className: liked ? "pop" : "" }))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 space-y-3.5" }, /* @__PURE__ */ React.createElement(Field, { label: "Date" }, /* @__PURE__ */ React.createElement("input", { type: "date", min: todayISO(), value: date, onChange: (e) => setDate(e.target.value), className: inp })), isHour ? /* @__PURE__ */ React.createElement(Field, { label: `Cr\xE9neaux (${slots.length} s\xE9lectionn\xE9${slots.length > 1 ? "s" : ""})`, err }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-4 gap-1.5" }, HOURS.map((h, i) => {
    const busy = s.busy.includes(i);
    const on = slots.includes(h);
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: h,
        disabled: busy,
        onClick: () => flipSlot(h),
        className: `rounded-lg border px-1 py-2 text-[11px] font-bold transition ${busy ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through" : on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 text-slate-600 hover:border-brand-400"}`
      },
      h
    );
  }))) : /* @__PURE__ */ React.createElement(Field, { label: "Dur\xE9e" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setDays(Math.max(1, days - 1)), className: "grid h-8 w-8 place-items-center rounded-full bg-mist transition hover:bg-brand-50" }, /* @__PURE__ */ React.createElement(Icon, { n: "minus", size: 14 })), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold" }, days, " jour", days > 1 ? "s" : ""), /* @__PURE__ */ React.createElement("button", { onClick: () => setDays(Math.min(10, days + 1)), className: "grid h-8 w-8 place-items-center rounded-full bg-mist transition hover:bg-brand-50" }, /* @__PURE__ */ React.createElement(Icon, { n: "plus", size: 14 }))))), /* @__PURE__ */ React.createElement("div", { className: "mt-5 space-y-2 border-t border-dashed border-slate-200 pt-4 text-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, isHour ? `${slots.length} \xD7 ${EUR.format(s.price)}` : `${days} \xD7 ${EUR.format(s.price)}`), /* @__PURE__ */ React.createElement("span", null, EUR.format(base))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, "Frais de service (8 %)"), /* @__PURE__ */ React.createElement("span", null, EUR.format(fees))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between pt-1 font-display text-base font-bold" }, /* @__PURE__ */ React.createElement("span", null, "Total"), /* @__PURE__ */ React.createElement("span", null, EUR.format(base + fees)))), /* @__PURE__ */ React.createElement("button", { onClick: book, className: "mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[.98]" }, /* @__PURE__ */ React.createElement(Icon, { n: "zap", size: 16 }), "R\xE9server cet espace"), /* @__PURE__ */ React.createElement("p", { className: "mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400" }, /* @__PURE__ */ React.createElement(Icon, { n: "shield-check", size: 13, className: "text-emerald-500" }), "Confirmation imm\xE9diate \xB7 Annulation gratuite 24 h")))), /* @__PURE__ */ React.createElement("div", { className: "mt-14" }, /* @__PURE__ */ React.createElement(SecHead, { kicker: "Continuez l'exploration", title: "Espaces similaires" }), /* @__PURE__ */ React.createElement("div", { className: "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" }, similar.map((x) => /* @__PURE__ */ React.createElement(SpaceCard, { key: x.id, s: x, nav, favs, toggleFav })))));
};
const Checkout = ({ cart, setCart, nav, onDone, toast }) => {
  const [promo, setPromo] = useState("");
  const [promoOn, setPromoOn] = useState(false);
  const [promoErr, setPromoErr] = useState("");
  const [form, setForm] = useState({ name: "", email: "", card: "", exp: "", cvc: "" });
  const [errs, setErrs] = useState({});
  const [paid, setPaid] = useState(false);
  const ref = useMemo(() => `SW-2025-${Math.floor(1e3 + Math.random() * 9e3)}`);
  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const discount = promoOn ? subtotal * 0.1 : 0;
  const total = subtotal - discount;
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
    if (form.card.replace(/\s/g, "").length !== 16) er.card = "Le num\xE9ro doit contenir 16 chiffres";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.exp)) er.exp = "Format MM/AA attendu";
    else {
      const [m, y] = form.exp.split("/").map(Number);
      if (2e3 + y < 2025 || 2e3 + y === 2025 && m < (/* @__PURE__ */ new Date()).getMonth() + 1) er.exp = "Carte expir\xE9e";
    }
    if (!/^\d{3,4}$/.test(form.cvc)) er.cvc = "3 chiffres au dos";
    setErrs(er);
    return Object.keys(er).length === 0;
  };
  const submit = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (validate()) {
      onDone({ date: cart[0].date, meta: cart.length > 1 ? `${cart.length} r\xE9servations` : cart[0].meta, spaceId: cart[0].id });
      setPaid(true);
      window.scrollTo({ top: 0 });
    }
  };
  if (paid) return /* @__PURE__ */ React.createElement("main", { className: "mx-auto max-w-lg px-4 py-20 text-center" }, /* @__PURE__ */ React.createElement("span", { className: "pop mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "check-circle-2", size: 40 })), /* @__PURE__ */ React.createElement("h1", { className: "mt-6 font-display text-3xl font-bold" }, "R\xE9servation confirm\xE9e !"), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-sm text-slate-500" }, "R\xE9f\xE9rence ", /* @__PURE__ */ React.createElement("b", { className: "text-ink" }, ref), " \xB7 un e-mail de confirmation vient de partir."), /* @__PURE__ */ React.createElement("div", { className: "mt-8 rounded-2xl border border-slate-200 bg-mist p-5 text-left text-sm" }, cart.map((i) => /* @__PURE__ */ React.createElement("div", { key: i.key, className: "flex justify-between py-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "text-slate-600" }, i.name), /* @__PURE__ */ React.createElement("b", null, EUR.format(i.total)))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex justify-between border-t border-slate-200 pt-2.5 font-display font-bold" }, /* @__PURE__ */ React.createElement("span", null, "Total pay\xE9"), /* @__PURE__ */ React.createElement("span", null, EUR.format(total)))), /* @__PURE__ */ React.createElement("div", { className: "mt-8 flex flex-wrap justify-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "user" }), className: "rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/30" }, "Voir mes r\xE9servations"), /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "home" }), className: "rounded-full border border-slate-200 px-6 py-3 text-sm font-bold" }, "Retour \xE0 l'accueil")));
  if (cart.length === 0) return /* @__PURE__ */ React.createElement("main", { className: "mx-auto max-w-lg px-4 py-24 text-center" }, /* @__PURE__ */ React.createElement("span", { className: "mx-auto grid h-16 w-16 place-items-center rounded-full bg-mist text-slate-400" }, /* @__PURE__ */ React.createElement(Icon, { n: "shopping-cart", size: 28 })), /* @__PURE__ */ React.createElement("h1", { className: "mt-5 font-display text-2xl font-bold" }, "Votre panier est vide"), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-sm text-slate-500" }, "Trouvez l'espace parfait et r\xE9servez-le en quelques clics."), /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "explore" }), className: "mt-6 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white" }, "Explorer les espaces"));
  return /* @__PURE__ */ React.createElement("main", { className: "mx-auto max-w-6xl px-4 py-10 md:px-6" }, /* @__PURE__ */ React.createElement(Kicker, null, "Paiement"), /* @__PURE__ */ React.createElement("h1", { className: "mt-2 font-display text-3xl font-bold tracking-tight" }, "Finaliser la r\xE9servation"), /* @__PURE__ */ React.createElement("div", { className: "mt-8 grid gap-8 lg:grid-cols-[1fr_420px]" }, /* @__PURE__ */ React.createElement("form", { onSubmit: submit, className: "space-y-6" }, /* @__PURE__ */ React.createElement("section", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card" }, /* @__PURE__ */ React.createElement("h2", { className: "flex items-center gap-2 font-display font-bold" }, /* @__PURE__ */ React.createElement(Icon, { n: "user", size: 17, className: "text-brand-600" }), "Vos coordonn\xE9es"), /* @__PURE__ */ React.createElement("div", { className: "mt-4 grid gap-4 sm:grid-cols-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Nom complet", err: errs.name }, /* @__PURE__ */ React.createElement("input", { value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), placeholder: "L\xE9a Martin", className: `${inp} ${errs.name ? inpErr : ""}` })), /* @__PURE__ */ React.createElement(Field, { label: "E-mail", err: errs.email }, /* @__PURE__ */ React.createElement("input", { value: form.email, onChange: (e) => setForm({ ...form, email: e.target.value }), placeholder: "lea@studio.fr", className: `${inp} ${errs.email ? inpErr : ""}` })))), /* @__PURE__ */ React.createElement("section", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("h2", { className: "flex items-center gap-2 font-display font-bold" }, /* @__PURE__ */ React.createElement(Icon, { n: "credit-card", size: 17, className: "text-brand-600" }), "Paiement s\xE9curis\xE9"), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1 text-[11px] font-semibold text-emerald-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "lock", size: 12 }), "Chiffr\xE9 SSL")), /* @__PURE__ */ React.createElement("div", { className: "mt-4 space-y-4" }, /* @__PURE__ */ React.createElement(Field, { label: "Num\xE9ro de carte", err: errs.card }, /* @__PURE__ */ React.createElement("input", { value: form.card, onChange: (e) => setForm({ ...form, card: fmtCard(e.target.value) }), placeholder: "4242 4242 4242 4242", className: `${inp} tracking-widest ${errs.card ? inpErr : ""}` })), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement(Field, { label: "Expiration", err: errs.exp }, /* @__PURE__ */ React.createElement("input", { value: form.exp, onChange: (e) => setForm({ ...form, exp: fmtExp(e.target.value) }), placeholder: "MM/AA", className: `${inp} ${errs.exp ? inpErr : ""}` })), /* @__PURE__ */ React.createElement(Field, { label: "CVC", err: errs.cvc }, /* @__PURE__ */ React.createElement("input", { value: form.cvc, onChange: (e) => setForm({ ...form, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) }), placeholder: "123", className: `${inp} ${errs.cvc ? inpErr : ""}` }))))), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-4 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[.99]" }, /* @__PURE__ */ React.createElement(Icon, { n: "lock", size: 15 }), "Payer ", EUR.format(total))), /* @__PURE__ */ React.createElement("aside", { className: "h-fit space-y-4 lg:sticky lg:top-24" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-card" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display font-bold" }, "Votre panier ", /* @__PURE__ */ React.createElement("span", { className: "text-slate-400" }, "(", cart.length, ")")), /* @__PURE__ */ React.createElement("div", { className: "mt-4 space-y-4" }, cart.map((i) => /* @__PURE__ */ React.createElement("div", { key: i.key, className: "flex gap-3" }, /* @__PURE__ */ React.createElement("img", { src: U(i.img, 200), alt: "", className: "h-16 w-20 rounded-xl object-cover" }), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "truncate text-sm font-bold" }, i.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-500" }, i.city, " \xB7 ", i.meta), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm font-bold text-brand-700" }, EUR.format(i.total))), /* @__PURE__ */ React.createElement("button", { onClick: () => setCart(cart.filter((x) => x.key !== i.key)), className: "h-fit text-slate-300 transition hover:text-rose-500" }, /* @__PURE__ */ React.createElement(Icon, { n: "trash-2", size: 16 }))))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex gap-2" }, /* @__PURE__ */ React.createElement("input", { value: promo, onChange: (e) => setPromo(e.target.value), placeholder: "Code promo", className: `${inp} ${promoErr ? inpErr : ""}` }), /* @__PURE__ */ React.createElement("button", { onClick: applyPromo, className: "shrink-0 rounded-xl bg-navy px-4 text-sm font-bold text-white transition hover:bg-ink" }, "OK")), promoErr && /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 text-xs text-rose-600" }, promoErr), promoOn && /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 flex items-center gap-1 text-xs font-semibold text-emerald-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "check", size: 12 }), "COWORK10 appliqu\xE9")), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl bg-navy p-5 text-white shadow-card" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-2 text-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-slate-300" }, /* @__PURE__ */ React.createElement("span", null, "Sous-total"), /* @__PURE__ */ React.createElement("span", null, EUR.format(subtotal))), promoOn && /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-emerald-400" }, /* @__PURE__ */ React.createElement("span", null, "Remise \u221210 %"), /* @__PURE__ */ React.createElement("span", null, "\u2212", EUR.format(discount))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-slate-300" }, /* @__PURE__ */ React.createElement("span", null, "Frais de service"), /* @__PURE__ */ React.createElement("span", null, "inclus")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between border-t border-white/15 pt-2.5 font-display text-lg font-bold" }, /* @__PURE__ */ React.createElement("span", null, "Total"), /* @__PURE__ */ React.createElement("span", null, EUR.format(total))))))));
};
const UserDash = ({ initTab, bookings, setBookings, favs, toggleFav, nav, toast }) => {
  const [tab, setTab] = useState(initTab || "resas");
  const [prefs, setPrefs] = useState({ mail: true, push: false, news: true, city: "Lyon", type: "open" });
  const tabs = [["resas", "Mes r\xE9servations", "calendar-days"], ["ia", "Recommandations", "sparkles"], ["favoris", "Favoris", "heart"], ["prefs", "Pr\xE9f\xE9rences", "settings"]];
  const recommendations = useMemo(() => {
    const favTypes = new Set([...favs].map((id) => SPACES.find((s) => s.id === id)?.type));
    return SPACES.filter((s) => !favs.has(s.id)).map((s) => ({
      s,
      score: favTypes.has(s.type) ? 88 + Math.round(s.rating * 2) : 55 + Math.round(s.rating * 6),
      reason: favTypes.has(s.type) ? `Correspond \xE0 votre pr\xE9f\xE9rence \xAB ${TYPES.find((t) => t.id === s.type).label.toLowerCase()} \xBB` : `Tr\xE8s bien not\xE9 \xE0 ${s.city}`
    })).sort((a, b) => b.score - a.score).slice(0, 3);
  }, [favs]);
  const stColor = (st) => st === "Confirm\xE9e" ? "bg-emerald-50 text-emerald-600" : st === "En attente" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500";
  return /* @__PURE__ */ React.createElement("main", { className: "mx-auto max-w-7xl px-4 py-8 md:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Kicker, null, "Espace membre"), /* @__PURE__ */ React.createElement("h1", { className: "mt-2 font-display text-3xl font-bold tracking-tight" }, "Bonjour L\xE9a \u{1F44B}")), /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "explore" }), className: "inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25" }, /* @__PURE__ */ React.createElement(Icon, { n: "plus", size: 15 }), "Nouvelle r\xE9servation")), /* @__PURE__ */ React.createElement("div", { className: "mt-8 grid gap-8 lg:grid-cols-[230px_1fr]" }, /* @__PURE__ */ React.createElement("nav", { className: "no-scrollbar flex gap-1 overflow-x-auto lg:flex-col" }, tabs.map(([id, l, i]) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: id,
      onClick: () => setTab(id),
      className: `flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === id ? "bg-navy text-white shadow-card" : "text-slate-500 hover:bg-mist hover:text-ink"}`
    },
    /* @__PURE__ */ React.createElement(Icon, { n: i, size: 16 }),
    l
  ))), /* @__PURE__ */ React.createElement("div", null, tab === "resas" && /* @__PURE__ */ React.createElement("div", { className: "space-y-8" }, /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h2", { className: "mb-4 font-display text-lg font-bold" }, "\xC0 venir"), bookings.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400" }, "Aucune r\xE9servation \xE0 venir."), /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 md:grid-cols-2" }, bookings.map((b) => {
    const s = SPACES.find((x) => x.id === b.spaceId);
    if (!s) return null;
    return /* @__PURE__ */ React.createElement("article", { key: b.id, className: "group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:shadow-lift" }, /* @__PURE__ */ React.createElement("div", { className: "relative h-32 overflow-hidden" }, /* @__PURE__ */ React.createElement("img", { src: U(s.imgs[0], 600), alt: "", className: "h-full w-full object-cover transition duration-500 group-hover:scale-105" }), /* @__PURE__ */ React.createElement("span", { className: `absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${stColor(b.status)}` }, b.status)), /* @__PURE__ */ React.createElement("div", { className: "p-4" }, /* @__PURE__ */ React.createElement("h3", { className: "font-display font-bold" }, s.name), /* @__PURE__ */ React.createElement("p", { className: "mt-1 flex items-center gap-3 text-xs text-slate-500" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "calendar-days", size: 12 }), fmtDate(b.date)), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Icon, { n: "clock", size: 12 }), b.meta)), /* @__PURE__ */ React.createElement("div", { className: "mt-3.5 flex gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "space", params: { id: s.id } }), className: "flex-1 rounded-full bg-brand-50 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-100" }, "Voir l'espace"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      setBookings(bookings.filter((x) => x.id !== b.id));
      toast("R\xE9servation annul\xE9e (d\xE9mo)", "x");
    }, className: "rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 transition hover:border-rose-300 hover:text-rose-500" }, "Annuler"))));
  }))), /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h2", { className: "mb-4 font-display text-lg font-bold" }, "Historique"), /* @__PURE__ */ React.createElement("div", { className: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card" }, PAST_BOOKINGS.map((b, i) => {
    const s = SPACES.find((x) => x.id === b.spaceId);
    if (!s) return null;
    return /* @__PURE__ */ React.createElement("div", { key: b.id, className: `flex items-center gap-4 px-5 py-4 text-sm ${i > 0 ? "border-t border-slate-100" : ""}` }, /* @__PURE__ */ React.createElement("img", { src: U(s.imgs[0], 120), alt: "", className: "h-11 w-14 rounded-lg object-cover" }), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "truncate font-bold" }, s.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400" }, fmtDate(b.date), " \xB7 ", b.meta)), /* @__PURE__ */ React.createElement("span", { className: "hidden sm:block text-xs font-semibold text-slate-400" }, EUR.format(s.price)), /* @__PURE__ */ React.createElement("span", { className: `rounded-full px-2.5 py-1 text-[11px] font-bold ${stColor(b.status)}` }, b.status), /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "space", params: { id: s.id } }), className: "text-slate-300 transition hover:text-brand-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "chevron-right", size: 17 })));
  })))), tab === "ia" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "mb-5 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4" }, /* @__PURE__ */ React.createElement(Icon, { n: "sparkles", size: 18, className: "mt-0.5 shrink-0 text-brand-600" }), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-brand-900" }, "Suggestions g\xE9n\xE9r\xE9es \xE0 partir de vos favoris, de vos r\xE9servations pass\xE9es et de vos pr\xE9f\xE9rences. Elles s'affinent \xE0 chaque interaction.")), /* @__PURE__ */ React.createElement("div", { className: "grid gap-5 md:grid-cols-3" }, recommendations.map(({ s, score, reason }, i) => /* @__PURE__ */ React.createElement("article", { key: s.id, className: "group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-lift", "data-reveal": true, style: { transitionDelay: `${i * 80}ms` } }, /* @__PURE__ */ React.createElement("div", { className: "relative h-32 overflow-hidden" }, /* @__PURE__ */ React.createElement("img", { src: U(s.imgs[0], 500), alt: "", className: "h-full w-full object-cover transition duration-500 group-hover:scale-105" }), /* @__PURE__ */ React.createElement("span", { className: "absolute left-3 top-3 rounded-full bg-ink/80 px-2 py-1 text-[10px] font-bold text-white backdrop-blur" }, "Match ", score, "%")), /* @__PURE__ */ React.createElement("div", { className: "p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-display text-sm font-bold" }, s.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-slate-400" }, s.city, " \xB7 ", EUR.format(s.price), "/", s.unit)), /* @__PURE__ */ React.createElement(Ring, { v: score })), /* @__PURE__ */ React.createElement("p", { className: "mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-slate-500" }, /* @__PURE__ */ React.createElement(Icon, { n: "sparkles", size: 11, className: "mt-0.5 shrink-0 text-brand-500" }), reason), /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "space", params: { id: s.id } }), className: "mt-3 w-full rounded-full bg-navy py-2 text-xs font-bold text-white transition hover:bg-brand-700" }, "D\xE9couvrir")))))), tab === "favoris" && (favs.size === 0 ? /* @__PURE__ */ React.createElement("p", { className: "rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-400" }, "Aucun favori pour le moment \u2014 cliquez sur le \u2665 d'un espace.") : /* @__PURE__ */ React.createElement("div", { className: "grid gap-5 sm:grid-cols-2 xl:grid-cols-3" }, SPACES.filter((s) => favs.has(s.id)).map((s) => /* @__PURE__ */ React.createElement(SpaceCard, { key: s.id, s, nav, favs, toggleFav })))), tab === "prefs" && /* @__PURE__ */ React.createElement("div", { className: "max-w-xl space-y-6" }, /* @__PURE__ */ React.createElement("section", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display font-bold" }, "Notifications"), [["mail", "R\xE9capitulatifs par e-mail"], ["push", "Alertes de disponibilit\xE9 en temps r\xE9el"], ["news", "Newsletter mensuelle & bons plans"]].map(([k, l]) => /* @__PURE__ */ React.createElement("div", { key: k, className: "mt-4 flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-slate-600" }, l), /* @__PURE__ */ React.createElement(Toggle, { on: prefs[k], onClick: () => setPrefs({ ...prefs, [k]: !prefs[k] }) })))), /* @__PURE__ */ React.createElement("section", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display font-bold" }, "Pr\xE9f\xE9rences de recherche"), /* @__PURE__ */ React.createElement("div", { className: "mt-4 grid gap-4 sm:grid-cols-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Ville par d\xE9faut" }, /* @__PURE__ */ React.createElement("select", { value: prefs.city, onChange: (e) => setPrefs({ ...prefs, city: e.target.value }), className: inp }, CITIES.map((c) => /* @__PURE__ */ React.createElement("option", { key: c }, c)))), /* @__PURE__ */ React.createElement(Field, { label: "Type favori" }, /* @__PURE__ */ React.createElement("select", { value: prefs.type, onChange: (e) => setPrefs({ ...prefs, type: e.target.value }), className: inp }, TYPES.map((t) => /* @__PURE__ */ React.createElement("option", { key: t.id, value: t.id }, t.label))))), /* @__PURE__ */ React.createElement("button", { onClick: () => toast("Pr\xE9f\xE9rences enregistr\xE9es", "check"), className: "mt-5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white" }, "Enregistrer"))))));
};
const AdminDash = ({ nav, toast }) => {
  const [range, setRange] = useState("30j");
  const kpis = [
    { l: "Revenus du mois", v: "23 100 \u20AC", d: "+12,4 %", up: true, i: "euro", spark: [8, 10, 9, 13, 12, 15, 17, 16, 19] },
    { l: "Taux d'occupation", v: "78 %", d: "+3,1 pts", up: true, i: "trending-up", spark: [60, 64, 61, 70, 72, 74, 78] },
    { l: "R\xE9servations", v: "342", d: "+8,9 %", up: true, i: "calendar-days", spark: [20, 26, 24, 31, 29, 35, 38] },
    { l: "Panier moyen", v: "47 \u20AC", d: "\u22122,1 %", up: false, i: "receipt", spark: [52, 50, 51, 48, 49, 47, 47] }
  ];
  const donutItems = [
    { label: "Open space", v: 38, c: "#1F56D6" },
    { label: "Bureaux priv\xE9s", v: 27, c: "#0D2C5A" },
    { label: "Salles de r\xE9union", v: 21, c: "#5B90F7" },
    { label: "Studios & cabines", v: 14, c: "#BCD2FF" }
  ];
  return /* @__PURE__ */ React.createElement("main", { className: "bg-mist" }, /* @__PURE__ */ React.createElement("div", { className: "bg-navy" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-7xl px-4 py-8 md:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Kicker, null, /* @__PURE__ */ React.createElement("span", { className: "text-brand-300" }, "Tableau de bord")), /* @__PURE__ */ React.createElement("h1", { className: "mt-2 font-display text-3xl font-bold tracking-tight text-white" }, "Bonjour Claire \u{1F44B}"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm text-slate-400" }, "Voici la sant\xE9 de vos 10 espaces aujourd'hui.")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex rounded-full bg-white/10 p-1" }, ["7j", "30j", "12 mois"].map((r) => /* @__PURE__ */ React.createElement("button", { key: r, onClick: () => setRange(r), className: `rounded-full px-3.5 py-1.5 text-xs font-bold transition ${range === r ? "bg-white text-navy" : "text-slate-300 hover:text-white"}` }, r))), /* @__PURE__ */ React.createElement("button", { onClick: () => toast("Rapport CSV t\xE9l\xE9charg\xE9 (d\xE9mo)", "download"), className: "flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-500" }, /* @__PURE__ */ React.createElement(Icon, { n: "download", size: 14 }), "Exporter"))))), /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-7xl px-4 py-8 md:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-4 sm:grid-cols-2 xl:grid-cols-4" }, kpis.map((k, i) => /* @__PURE__ */ React.createElement("div", { key: k.l, className: "rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift", "data-reveal": true, style: { transitionDelay: `${i * 60}ms` } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400" }, k.l), /* @__PURE__ */ React.createElement("span", { className: "grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600" }, /* @__PURE__ */ React.createElement(Icon, { n: k.i, size: 15 }))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex items-end justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-display text-2xl font-bold" }, k.v), /* @__PURE__ */ React.createElement("p", { className: `mt-1 flex items-center gap-1 text-xs font-bold ${k.up ? "text-emerald-600" : "text-rose-500"}` }, /* @__PURE__ */ React.createElement(Icon, { n: k.up ? "trending-up" : "trending-down", size: 13 }), k.d, " vs mois dernier")), /* @__PURE__ */ React.createElement(Spark, { data: k.spark, color: k.up ? "#1F56D6" : "#F43F5E" }))))), /* @__PURE__ */ React.createElement("div", { className: "mt-6 grid gap-4 lg:grid-cols-3" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card lg:col-span-2", "data-reveal": true }, /* @__PURE__ */ React.createElement("div", { className: "mb-2 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display font-bold" }, "Revenus 2025 ", /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium text-slate-400" }, "(k\u20AC)")), /* @__PURE__ */ React.createElement("span", { className: "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600" }, "+24 % YoY")), /* @__PURE__ */ React.createElement(AreaChart, { data: REVENUE, labels: MONTHS })), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card", "data-reveal": true }, /* @__PURE__ */ React.createElement("h2", { className: "mb-4 font-display font-bold" }, "R\xE9partition par type"), /* @__PURE__ */ React.createElement(Donut, { items: donutItems, center: ["342", "r\xE9servations"] }), /* @__PURE__ */ React.createElement("div", { className: "mt-5 rounded-xl bg-mist p-3.5 text-xs text-slate-500" }, /* @__PURE__ */ React.createElement("b", { className: "text-ink" }, "Insight IA :"), " les salles de r\xE9union progressent de 18 % le jeudi. Envisagez un tarif dynamique."))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 grid gap-4 lg:grid-cols-3" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card", "data-reveal": true }, /* @__PURE__ */ React.createElement("h2", { className: "mb-4 font-display font-bold" }, "Occupation de la semaine"), /* @__PURE__ */ React.createElement(WeekBars, { data: WEEK_OCC, labels: DAYS })), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card lg:col-span-2", "data-reveal": true }, /* @__PURE__ */ React.createElement("h2", { className: "mb-4 font-display font-bold" }, "Occupation par espace"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3.5" }, SPACES.slice(0, 6).map((s) => /* @__PURE__ */ React.createElement("div", { key: s.id, className: "flex items-center gap-3 text-sm" }, /* @__PURE__ */ React.createElement("span", { className: "w-40 truncate font-semibold text-slate-600" }, s.name), /* @__PURE__ */ React.createElement("div", { className: "h-2 flex-1 overflow-hidden rounded-full bg-slate-100" }, /* @__PURE__ */ React.createElement("div", { className: `h-full rounded-full transition-all duration-1000 ${OCC[s.id] > 85 ? "bg-brand-600" : OCC[s.id] < 50 ? "bg-amber-400" : "bg-brand-400"}`, style: { width: OCC[s.id] + "%" } })), /* @__PURE__ */ React.createElement("b", { className: "w-10 text-right text-xs" }, OCC[s.id], "%")))))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 grid gap-4 lg:grid-cols-3" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card lg:col-span-2", "data-reveal": true }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-slate-100 px-6 py-4" }, /* @__PURE__ */ React.createElement("h2", { className: "font-display font-bold" }, "Gestion des espaces"), /* @__PURE__ */ React.createElement("button", { onClick: () => toast("Formulaire de cr\xE9ation (d\xE9mo)", "plus"), className: "flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-2 text-xs font-bold text-white" }, /* @__PURE__ */ React.createElement(Icon, { n: "plus", size: 13 }), "Ajouter")), /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full min-w-[560px] text-sm" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "text-left text-[11px] font-bold uppercase tracking-wide text-slate-400" }, /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3" }, "Espace"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-3" }, "Prix"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-3" }, "Occupation"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-3" }, "Statut"), /* @__PURE__ */ React.createElement("th", { className: "px-3 py-3" }))), /* @__PURE__ */ React.createElement("tbody", null, SPACES.slice(0, 6).map((s) => {
    const st = OCC[s.id] > 90 ? ["Complet", "bg-rose-50 text-rose-500"] : OCC[s.id] < 50 ? ["\xC0 promouvoir", "bg-amber-50 text-amber-600"] : ["Actif", "bg-emerald-50 text-emerald-600"];
    return /* @__PURE__ */ React.createElement("tr", { key: s.id, className: "border-t border-slate-100 transition hover:bg-mist/60" }, /* @__PURE__ */ React.createElement("td", { className: "px-6 py-3.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("img", { src: U(s.imgs[0], 100), alt: "", className: "h-9 w-12 rounded-lg object-cover" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-bold" }, s.name), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400" }, s.city)))), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-3.5 font-semibold" }, EUR.format(s.price), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-slate-400" }, "/", s.unit)), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-3.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "h-1.5 w-16 rounded-full bg-slate-100" }, /* @__PURE__ */ React.createElement("div", { className: "h-full rounded-full bg-brand-500", style: { width: OCC[s.id] + "%" } })), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold" }, OCC[s.id], "%"))), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-3.5" }, /* @__PURE__ */ React.createElement("span", { className: `rounded-full px-2.5 py-1 text-[11px] font-bold ${st[1]}` }, st[0])), /* @__PURE__ */ React.createElement("td", { className: "px-3 py-3.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, /* @__PURE__ */ React.createElement("button", { onClick: () => toast(`\xC9dition de \xAB ${s.name} \xBB (d\xE9mo)`, "pencil"), className: "grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-brand-50 hover:text-brand-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "pencil", size: 14 })), /* @__PURE__ */ React.createElement("button", { onClick: () => nav({ name: "space", params: { id: s.id } }), className: "grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-brand-50 hover:text-brand-600" }, /* @__PURE__ */ React.createElement(Icon, { n: "eye", size: 14 })))));
  }))))), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-card", "data-reveal": true }, /* @__PURE__ */ React.createElement("h2", { className: "mb-4 font-display font-bold" }, "R\xE9servations r\xE9centes"), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, RECENT.map((r) => /* @__PURE__ */ React.createElement("div", { key: r.c, className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700" }, r.c.split(" ").map((w) => w[0]).join("")), /* @__PURE__ */ React.createElement("div", { className: "min-w-0 flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "truncate text-sm" }, /* @__PURE__ */ React.createElement("b", null, r.c), " \xB7 ", r.s), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-400" }, r.d)), /* @__PURE__ */ React.createElement("div", { className: "text-right" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold" }, EUR.format(r.a)), /* @__PURE__ */ React.createElement("p", { className: `text-[10px] font-bold ${r.st === "Confirm\xE9e" ? "text-emerald-600" : "text-amber-600"}` }, r.st)))))))));
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
    toast("Inscription confirm\xE9e. Bienvenue !", "mail");
  };
  const cols = [
    ["Plateforme", [["Explorer les espaces", () => nav({ name: "explore" })], ["Villes desservies", () => nav({ name: "explore" })], ["Tarifs & abonnements", () => toast("Page tarifs (d\xE9mo)", "info")], ["Programme fid\xE9lit\xE9", () => toast("Programme fid\xE9lit\xE9 (d\xE9mo)", "info")]]],
    ["Gestionnaires", [["Dashboard d\xE9mo", () => nav({ name: "admin" })], ["R\xE9f\xE9rencer mon espace", () => toast("Onboarding gestionnaire (d\xE9mo)", "info")], ["API & int\xE9grations", () => toast("Documentation API (d\xE9mo)", "info")]]],
    ["Support", [["Centre d'aide", () => toast("Centre d'aide (d\xE9mo)", "info")], ["Annulations & remboursements", () => toast("Politique (d\xE9mo)", "info")], ["Nous contacter", () => toast("support@spotwork.fr", "mail")]]]
  ];
  return /* @__PURE__ */ React.createElement("footer", { className: "bg-ink text-slate-300" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto max-w-7xl px-4 py-14 md:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-10 lg:grid-cols-[1.3fr_2fr]" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 18 })), /* @__PURE__ */ React.createElement("span", { className: "font-display text-lg font-bold text-white" }, "Spotwork")), /* @__PURE__ */ React.createElement("p", { className: "mt-4 max-w-xs text-sm leading-relaxed text-slate-400" }, "La plateforme de r\xE9servation d'espaces de travail nouvelle g\xE9n\xE9ration. 6 villes, 320+ espaces v\xE9rifi\xE9s."), /* @__PURE__ */ React.createElement("form", { onSubmit: subscribe, className: "mt-6" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold uppercase tracking-wide text-slate-400" }, "Newsletter mensuelle"), /* @__PURE__ */ React.createElement("div", { className: "mt-2.5 flex gap-2" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      value: email,
      onChange: (e) => setEmail(e.target.value),
      placeholder: "votre@email.fr",
      className: `flex-1 rounded-xl border bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-brand-400 ${err ? "border-rose-400" : "border-white/15"}`
    }
  ), /* @__PURE__ */ React.createElement("button", { className: "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-500" }, /* @__PURE__ */ React.createElement(Icon, { n: "send", size: 15 }))), err && /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 text-xs text-rose-400" }, err))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-8 sm:grid-cols-3" }, cols.map(([title, links]) => /* @__PURE__ */ React.createElement("div", { key: title }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold uppercase tracking-[0.15em] text-slate-500" }, title), /* @__PURE__ */ React.createElement("ul", { className: "mt-4 space-y-2.5" }, links.map(([l, f]) => /* @__PURE__ */ React.createElement("li", { key: l }, /* @__PURE__ */ React.createElement("button", { onClick: f, className: "text-sm text-slate-300 transition hover:text-white" }, l)))))))), /* @__PURE__ */ React.createElement("div", { className: "mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500" }, /* @__PURE__ */ React.createElement("p", null, "\xA9 2025 Spotwork SAS \u2014 Prototype de d\xE9monstration, donn\xE9es fictives."), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement("button", { className: "transition hover:text-white" }, /* @__PURE__ */ React.createElement(Icon, { n: "globe", size: 15 })), /* @__PURE__ */ React.createElement("button", { className: "transition hover:text-white" }, /* @__PURE__ */ React.createElement(Icon, { n: "mail", size: 15 })), /* @__PURE__ */ React.createElement("button", { className: "transition hover:text-white" }, /* @__PURE__ */ React.createElement(Icon, { n: "message-circle", size: 15 }))))));
};
const App = () => {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState({ name: "home" });
  const [cart, setCart] = useState([]);
  const [favs, setFavs] = useState(/* @__PURE__ */ new Set([2, 7]));
  const [bookings, setBookings] = useState(INIT_BOOKINGS);
  const [toasts, setToasts] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
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
  const onDone = (b) => {
    setBookings((p) => [{ id: Date.now(), spaceId: b.spaceId, date: b.date, meta: b.meta, status: "Confirm\xE9e" }, ...p]);
    setCart([]);
  };
  if (!ready) return /* @__PURE__ */ React.createElement("div", { className: "grid min-h-screen place-items-center bg-mist" }, /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("span", { className: "mx-auto grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-brand-600 text-white" }, /* @__PURE__ */ React.createElement(Icon, { n: "map-pin", size: 22 })), /* @__PURE__ */ React.createElement("p", { className: "mt-3 font-display font-bold" }, "Spotwork")));
  return /* @__PURE__ */ React.createElement("div", { className: "font-body" }, /* @__PURE__ */ React.createElement(Navbar, { view, nav, cartCount: cart.length, menuOpen, setMenuOpen }), view.name === "home" && /* @__PURE__ */ React.createElement(Home, { nav, favs, toggleFav }), view.name === "explore" && /* @__PURE__ */ React.createElement(Explore, { params: view.params, nav, favs, toggleFav }), view.name === "space" && /* @__PURE__ */ React.createElement(SpaceDetail, { id: view.params.id, nav, favs, toggleFav, reserve }), view.name === "checkout" && /* @__PURE__ */ React.createElement(Checkout, { cart, setCart, nav, onDone, toast }), view.name === "user" && /* @__PURE__ */ React.createElement(UserDash, { initTab: view.params?.tab, bookings, setBookings, favs, toggleFav, nav, toast }), view.name === "admin" && /* @__PURE__ */ React.createElement(AdminDash, { nav, toast }), /* @__PURE__ */ React.createElement(Footer, { nav, toast }), /* @__PURE__ */ React.createElement("div", { className: "pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-2" }, toasts.map((t) => /* @__PURE__ */ React.createElement("div", { key: t.id, className: "toast pointer-events-auto flex items-center gap-2.5 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lift" }, /* @__PURE__ */ React.createElement("span", { className: "grid h-6 w-6 place-items-center rounded-full bg-brand-600" }, /* @__PURE__ */ React.createElement(Icon, { n: t.icon, size: 13 })), t.msg))));
};
ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
