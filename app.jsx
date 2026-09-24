const {useState,useEffect,useMemo,useRef}=React;

/* ================= HELPERS ================= */
const MAD = { format: (v) => `${Math.round(Number(v) || 0).toLocaleString('fr-FR')} DH` };
const EUR = MAD;
const fmtDate=v=>v?new Date(v+"T12:00").toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'}):"—";
const todayISO=()=>new Date().toISOString().slice(0,10);
const U=(id,w=900)=>!id?"":id.startsWith("http")?id:`https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

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
    dangerouslySetInnerHTML={{__html:html}}/>;
};

const smoothPath=pts=>{
  if(pts.length<2)return "";
  let d=`M${pts[0][0]},${pts[0][1]}`;
  for(let i=1;i<pts.length;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i],cx=(x0+x1)/2;
    d+=` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;}
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
    } catch {}
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
  {id:"open",label:"Open space",icon:"layout-grid"},
  {id:"office",label:"Bureau privé",icon:"door-closed"},
  {id:"meeting",label:"Salle de réunion",icon:"users"},
  {id:"studio",label:"Studio créatif",icon:"palette"},
  {id:"booth",label:"Cabine focus",icon:"headphones"}
];
const AMENITIES = [
  {id:"wifi",label:"Wifi fibre",icon:"wifi"},{id:"coffee",label:"Thé & Café illimités",icon:"coffee"},
  {id:"screen",label:"Écran & visio 4K",icon:"monitor"},{id:"board",label:"Tableau blanc",icon:"pen-tool"},
  {id:"print",label:"Impression",icon:"printer"},{id:"access",label:"Accès 24/7",icon:"key-round"},
  {id:"terrace",label:"Rooftop / Terrasse",icon:"sun"},{id:"bike",label:"Parking sécurisé",icon:"bike"}
];
const IMG = {
  a:"photo-1497366216548-37526070297c",b:"photo-1497366811353-6870744d04b2",c:"photo-1524758631624-e2822e304c36",
  d:"photo-1556761175-b413da4baf72",e:"photo-1497215728101-856f4ea42174",f:"photo-1527192491265-7e15c50b385d",
  g:"photo-1522202176988-66273c2fd55f",h:"photo-1519389950473-47ba0277781c",i:"photo-1504384308090-c894fdcc538d",
  j:"photo-1462826303086-329426d1aef5",k:"photo-1568992687947-868a62a9f598",l:"photo-1553877522-43269d4ea984",
  m:"photo-1593115057322-e94b77572f20",n:"photo-1541746972996-4e0b0f43e02a",q:"photo-1431540015161-0bf868a2d407",
  s:"photo-1521737604893-d14cc237f11d"
};
const SPACES = [
  {id:1,name:"L'Atelier Maarif",city:"Casablanca",district:"Maarif · Zerktouni",address:"42 Boulevard Al Massira Al Khadra, Maarif, Casablanca 20330",lat:33.5855,lng:-7.6322,transport:"Tramway T1 (Station Bd Hassan II à 350m) · Parking public Zerktouni",type:"open",price:45,unit:"heure",rating:4.9,rev:187,cap:45,surface:"320 m²",imgs:[IMG.a,IMG.b,IMG.c],am:["wifi","coffee","screen","print","access","terrace"],badge:"Coup de cœur",featured:true,host:"Mehdi El Fassi",desc:"Ancien atelier baigné de lumière naturelle au cœur de Maarif. Postes ergonomiques, phone boxes insonorisées, rooftop et communauté dynamique de résidents tech et startups.",busy:[]},
  {id:2,name:"Studio Guéliz",city:"Marrakech",district:"Guéliz · Av. Mohammed V",address:"88 Avenue Mohammed V, Guéliz, Marrakech 40000",lat:31.6346,lng:-8.0125,transport:"Bus L1, L16 (Arrêt Place 16 Novembre à 2 min) · Station Taxis Guéliz",type:"studio",price:65,unit:"heure",rating:4.8,rev:96,cap:12,surface:"85 m²",imgs:[IMG.n,IMG.h,IMG.i],am:["wifi","screen","board","coffee"],badge:"Nouveau",featured:true,host:"Karim Benjelloun",desc:"Studio créatif et podcast insonorisé avec lumière réglable, fond vert, micros pros et mur inscriptible. Idéal pour ateliers, workshops et sessions brainstorm.",busy:[2,5]},
  {id:3,name:"Oasis Work Gauthier",city:"Casablanca",district:"Gauthier · Taha Hussein",address:"15 Rue Taha Hussein, Quartier Gauthier, Casablanca 20070",lat:33.5912,lng:-7.6258,transport:"Tramway T1 (Station Place Mohammed V à 5 min) · Parking sécurisé sous-sol",type:"office",price:120,unit:"heure",rating:4.7,rev:143,cap:6,surface:"28 m²",imgs:[IMG.e,IMG.k,IMG.c],am:["wifi","screen","print","access","bike"],badge:"Exécutif",featured:true,host:"Mehdi El Fassi",desc:"Bureau privé fermé et climatisé, mobilier haut de gamme, salle de visio dédiée 4K et service de thé à la menthe offert.",busy:[]},
  {id:4,name:"Le Hub Agdal",city:"Rabat",district:"Agdal · Av. de France",address:"24 Avenue de France, Agdal, Rabat 10090",lat:33.9981,lng:-6.8525,transport:"Tramway L1 (Station Av. de France en face) · Gare Rabat Agdal à 6 min à pied",type:"meeting",price:50,unit:"heure",rating:4.9,rev:212,cap:10,surface:"35 m²",imgs:[IMG.d,IMG.j,IMG.l],am:["wifi","screen","board","coffee"],badge:"Populaire",featured:true,host:"Fatima Zahra Alaoui",desc:"Salle de réunion premium au cœur de Rabat Agdal : écran interactif 4K tactile, visio native Zoom/Teams, paperboard digital. Eau et café offerts.",busy:[1,4,6]},
  {id:5,name:"Marina Bay Focus",city:"Tanger",district:"Malabata · Marina Bay",address:"Port de Plaisance Marina Bay, Boulevard Mohamed VI, Malabata, Tanger 90000",lat:35.7767,lng:-5.7984,transport:"Ligne Bus 17 · Gare Tanger Ville TGV à 10 min en taxi · Parking Marina",type:"booth",price:25,unit:"heure",rating:4.6,rev:58,cap:1,surface:"3 m²",imgs:[IMG.m,IMG.i,IMG.g],am:["wifi","access"],badge:"Vue Mer",featured:false,host:"Salma Tazi",desc:"Cabine acoustique ultra-silencieuse avec vue panoramique sur la baie de Tanger. Double vitrage acoustique, ventilation douce, prise USB-C 100W.",busy:[0,3,7]},
  {id:6,name:"L'Espace Anfa",city:"Casablanca",district:"Anfa · Bd d'Anfa",address:"142 Boulevard d'Anfa, Racine / Anfa, Casablanca 20050",lat:33.5880,lng:-7.6450,transport:"Tramway T2 (Station Bd d'Anfa) · Stations taxis permanentes · Parking sous-sol",type:"open",price:40,unit:"heure",rating:4.8,rev:115,cap:35,surface:"240 m²",imgs:[IMG.b,IMG.f,IMG.k],am:["wifi","coffee","screen","access","bike"],badge:"Prestige",featured:false,host:"Mehdi El Fassi",desc:"Espace coworking prestigieux sur le Boulevard d'Anfa. Silence studieux, fibre optique dédiée 1 Gbps et barista permanent.",busy:[]},
  {id:7,name:"Coworking Palm Hivernage",city:"Marrakech",district:"Hivernage · Av. Echouhada",address:"Avenue Echouhada, Hivernage, Marrakech 40020",lat:31.6230,lng:-8.0160,transport:"À 5 min de la gare de Marrakech · Ligne Alsa Aéroport Express",type:"studio",price:55,unit:"heure",rating:4.8,rev:77,cap:16,surface:"120 m²",imgs:[IMG.h,IMG.n,IMG.s],am:["wifi","board","coffee","terrace"],badge:"Éco-responsable",featured:false,host:"Karim Benjelloun",desc:"Atelier modulable entouré de palmiers avec terrasse ensoleillée pour les pauses et sessions de networking. Mobilier artisanal contemporain.",busy:[3]},
  {id:8,name:"Technopark Agadir Hub",city:"Agadir",district:"Tilila · Cité Technopark",address:"Cité de l'Innovation & Technopark, Avenue Hassan II, Tilila, Agadir 80000",lat:30.4050,lng:-9.5580,transport:"Bus L22, L97 (Arrêt Technopark) · Parking gratuit 200 places sur site",type:"office",price:75,unit:"heure",rating:4.7,rev:62,cap:8,surface:"40 m²",imgs:[IMG.c,IMG.e,IMG.m],am:["wifi","screen","access","print"],badge:"Tech Hub",featured:true,host:"Omar Berrada",desc:"Bureau d'équipe moderne au sein du Technopark d'Agadir. Équipements complets, environnement innovant et parking sécurisé 24/7.",busy:[]},
  {id:9,name:"Détroit Meeting Tanger",city:"Tanger",district:"Centre · Bd Pasteur",address:"32 Boulevard Pasteur, Centre Ville, Tanger 90000",lat:35.7820,lng:-5.8110,transport:"Lignes urbaines 1, 2, 7 (Arrêt Place de France) · Parking Pasteur",type:"meeting",price:45,unit:"heure",rating:4.8,rev:134,cap:14,surface:"42 m²",imgs:[IMG.q,IMG.d,IMG.j],am:["wifi","screen","board","coffee","terrace"],badge:"Vue Détroit",featured:true,host:"Salma Tazi",desc:"Salle panoramique en plein centre-ville de Tanger avec vue sur le détroit de Gibraltar. Configuration flexible en U ou théâtre.",busy:[2,6]},
  {id:10,name:"Fès Medina Lab",city:"Fès",district:"Ville Nouvelle · Av. Hassan II",address:"56 Avenue Hassan II, Ville Nouvelle, Fès 30000",lat:34.0330,lng:-5.0010,transport:"Gare Fès-Ville à 7 min · Lignes de bus urbain 10, 19 · Parking Hassan II",type:"open",price:35,unit:"heure",rating:4.8,rev:88,cap:30,surface:"210 m²",imgs:[IMG.a,IMG.f,IMG.g],am:["wifi","coffee","print","access"],badge:"Créatif",featured:false,host:"Nadia Idrissi",desc:"Hub collaboratif moderne mêlant architecture marocaine et équipements high-tech. Ambiance chaleureuse et communauté cosmopolite.",busy:[]}
];
const HOURS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];
const REVIEWS = [
  {n:"Youssef Amrani",role:"Ingénieur Cloud & Data",d:"Oct. 2026",stars:5,t:"Réservé en 2 minutes à Casablanca Maarif, accueil irréprochable et connexion fibre ultra-stable. Un must pour travailler sereinement."},
  {n:"Salma Tazi",role:"Consultante Stratégie",d:"Sept. 2026",stars:5,t:"Espace lumineux à Rabat Agdal, excellent thé et organisation sans faille. Le paiement en ligne en Dirhams est très fluide."},
  {n:"Amine Naciri",role:"Tech Lead Freelance",d:"Sept. 2026",stars:4,t:"Très bon rapport qualité/prix à Marrakech Guéliz. L'ambiance studieuse et les recommandations de l'IA sont bluffantes."}
];
const INIT_BOOKINGS = [
  {id:1,spaceId:1,date:"2026-10-01",meta:"09:00 – 18:00 (Journée)",status:"Confirmée"},
  {id:2,spaceId:4,date:"2026-10-05",meta:"14:00 – 17:00 (3h)",status:"En attente"}
];
const PAST_BOOKINGS = [
  {id:9,spaceId:2,date:"2026-09-20",meta:"10:00 – 13:00 (3h)",status:"Terminée"},
  {id:8,spaceId:3,date:"2026-09-12",meta:"Journée complète",status:"Terminée"},
  {id:7,spaceId:5,date:"2026-09-04",meta:"14:00 – 16:00",status:"Terminée"}
];
const REVENUE = [124,141,132,168,185,172,214,231,220,256,273,298];
const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"];
const WEEK_OCC = [62,71,78,84,80,58,34];
const DAYS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const OCC = {1:86,2:74,3:68,4:91,5:57,6:63,7:82,8:44,9:77,10:71};
const RECENT = [
  {c:"Youssef A.",s:"L'Atelier Maarif",d:"Aujourd'hui 09:12",a:405,st:"Confirmée"},
  {c:"Salma T.",s:"Le Hub Agdal",d:"Aujourd'hui 08:47",a:150,st:"Confirmée"},
  {c:"Omar B.",s:"Studio Guéliz",d:"Hier 18:20",a:195,st:"En attente"},
  {c:"Nadia I.",s:"Marina Bay Focus",d:"Hier 15:03",a:75,st:"Confirmée"},
  {c:"Mehdi E.",s:"Oasis Work Gauthier",d:"Hier 11:36",a:340,st:"Confirmée"}
];

const INITIAL_MANAGER_BOOKINGS = [
  {
    id: "req-1",
    clientName: "Youssef Amrani",
    clientEmail: "youssef@proptech.ma",
    clientPhone: "+212 6 61 23 45 67",
    clientInitials: "YA",
    spaceId: 1,
    spaceName: "L'Atelier Maarif",
    city: "Casablanca",
    date: "2026-10-01",
    timeSlot: "09:00 – 18:00 (Journée complète)",
    hours: 9,
    seats: 45,
    totalPrice: 405,
    status: "confirmed",
    createdAt: "Il y a 2h",
    paymentMethod: "Carte Bancaire CMI (3D Secure)",
    invoiceRef: "FACT-2026-0041"
  },
  {
    id: "req-1b",
    clientName: "OCP Solutions & Tech",
    clientEmail: "contact@ocp-solutions.ma",
    clientPhone: "+212 5 22 99 88 77",
    clientInitials: "OS",
    spaceId: 1,
    spaceName: "L'Atelier Maarif",
    city: "Casablanca",
    date: "2026-10-02",
    timeSlot: "09:00 – 18:00 (Journée complète)",
    hours: 9,
    seats: 45,
    totalPrice: 405,
    status: "confirmed",
    createdAt: "Il y a 4h",
    paymentMethod: "Carte Bancaire CMI (3D Secure)",
    invoiceRef: "FACT-2026-0042"
  },
  {
    id: "req-3a",
    clientName: "Casablanca Finance City Group",
    clientEmail: "corporate@cfc.ma",
    clientPhone: "+212 5 22 45 12 34",
    clientInitials: "CF",
    spaceId: 3,
    spaceName: "Oasis Work Gauthier",
    city: "Casablanca",
    date: "2026-10-01",
    timeSlot: "09:00 – 18:00 (Journée complète)",
    hours: 9,
    seats: 6,
    totalPrice: 1080,
    status: "confirmed",
    createdAt: "Hier",
    paymentMethod: "Carte Bancaire CMI (3D Secure)",
    invoiceRef: "FACT-2026-0043"
  },
  {
    id: "req-3b",
    clientName: "Casablanca Finance City Group",
    clientEmail: "corporate@cfc.ma",
    clientPhone: "+212 5 22 45 12 34",
    clientInitials: "CF",
    spaceId: 3,
    spaceName: "Oasis Work Gauthier",
    city: "Casablanca",
    date: "2026-10-02",
    timeSlot: "09:00 – 18:00 (Journée complète)",
    hours: 9,
    seats: 6,
    totalPrice: 1080,
    status: "confirmed",
    createdAt: "Hier",
    paymentMethod: "Carte Bancaire CMI (3D Secure)",
    invoiceRef: "FACT-2026-0044"
  },
  {
    id: "req-2",
    clientName: "Salma Tazi",
    clientEmail: "salma.tazi@techmaroc.ma",
    clientPhone: "+212 6 62 89 01 23",
    clientInitials: "ST",
    spaceId: 4,
    spaceName: "Le Hub Agdal",
    city: "Rabat",
    date: "2026-10-05",
    timeSlot: "14:00 – 17:00 (3h)",
    hours: 3,
    seats: 10,
    totalPrice: 150,
    status: "pending",
    createdAt: "Il y a 35 min",
    paymentMethod: "Pré-autorisation CB CMI",
    invoiceRef: "FACT-2026-0045"
  },
  {
    id: "req-3",
    clientName: "Omar Berrada",
    clientEmail: "omar.berrada@startup.ma",
    clientPhone: "+212 6 63 45 67 89",
    clientInitials: "OB",
    spaceId: 2,
    spaceName: "Studio Guéliz",
    city: "Marrakech",
    date: "2026-10-06",
    timeSlot: "10:00 – 13:00 (3h)",
    hours: 3,
    seats: 4,
    totalPrice: 195,
    status: "pending",
    createdAt: "Il y a 1h",
    paymentMethod: "Pré-autorisation CB CMI",
    invoiceRef: "FACT-2026-0046"
  },
  {
    id: "req-4",
    clientName: "Nadia Idrissi",
    clientEmail: "nadia.idrissi@digital.ma",
    clientPhone: "+212 6 64 12 34 56",
    clientInitials: "NI",
    spaceId: 5,
    spaceName: "Marina Bay Focus",
    city: "Tanger",
    date: "2026-10-08",
    timeSlot: "14:00 – 17:00 (3h)",
    hours: 3,
    seats: 1,
    totalPrice: 75,
    status: "confirmed",
    createdAt: "Hier",
    paymentMethod: "Carte Bancaire CMI (3D Secure)",
    invoiceRef: "FACT-2026-0047"
  },
  {
    id: "req-5",
    clientName: "Amine Naciri",
    clientEmail: "amine.naciri@freelance.ma",
    clientPhone: "+212 6 65 78 90 12",
    clientInitials: "AN",
    spaceId: 3,
    spaceName: "Oasis Work Gauthier",
    city: "Casablanca",
    date: "2026-10-10",
    timeSlot: "09:00 – 12:00 (3h)",
    hours: 3,
    seats: 2,
    totalPrice: 360,
    status: "pending",
    createdAt: "Il y a 10 min",
    paymentMethod: "Pré-autorisation CB CMI",
    invoiceRef: "FACT-2026-0048"
  },
  {
    id: "req-6",
    clientName: "Karim Benjelloun",
    clientEmail: "karim.benj@innov.ma",
    clientPhone: "+212 6 66 33 22 11",
    clientInitials: "KB",
    spaceId: 6,
    spaceName: "L'Espace Anfa",
    city: "Casablanca",
    date: "2026-09-28",
    timeSlot: "09:00 – 17:00 (8h)",
    hours: 8,
    seats: 1,
    totalPrice: 320,
    status: "cancelled",
    createdAt: "Il y a 3j",
    paymentMethod: "Remboursement Carte CMI",
    invoiceRef: "FACT-2026-0049"
  }
];

const INITIAL_TRANSACTIONS = [
  {
    id: "TXN-2026-8801",
    bookingId: "req-1",
    clientName: "Youssef Amrani",
    clientEmail: "youssef@proptech.ma",
    clientPhone: "+212 6 61 23 45 67",
    clientCity: "Casablanca",
    spaceId: 1,
    spaceName: "L'Atelier Maarif",
    city: "Casablanca",
    date: "2026-10-01",
    timeSlot: "09:00 – 18:00 (Journée)",
    paidAt: "01/10/2026 09:12",
    grossAmount: 405,
    feeAmount: 32.40,
    netAmount: 372.60,
    paymentMethod: "Carte Bancaire Maroc CMI",
    cardLast4: "4242",
    status: "paid",
    invoiceNumber: "FACT-2026-0041"
  },
  {
    id: "TXN-2026-8802",
    bookingId: "req-1b",
    clientName: "OCP Solutions & Tech",
    clientEmail: "contact@ocp-solutions.ma",
    clientPhone: "+212 5 22 99 88 77",
    clientCity: "Casablanca",
    spaceId: 1,
    spaceName: "L'Atelier Maarif",
    city: "Casablanca",
    date: "2026-10-02",
    timeSlot: "09:00 – 18:00 (Journée)",
    paidAt: "01/10/2026 14:30",
    grossAmount: 405,
    feeAmount: 32.40,
    netAmount: 372.60,
    paymentMethod: "Carte Bancaire Maroc CMI",
    cardLast4: "8891",
    status: "paid",
    invoiceNumber: "FACT-2026-0042"
  },
  {
    id: "TXN-2026-8803",
    bookingId: "req-3a",
    clientName: "Casablanca Finance City Group",
    clientEmail: "corporate@cfc.ma",
    clientPhone: "+212 5 22 45 12 34",
    clientCity: "Casablanca",
    spaceId: 3,
    spaceName: "Oasis Work Gauthier",
    city: "Casablanca",
    date: "2026-10-01",
    timeSlot: "09:00 – 18:00 (Journée)",
    paidAt: "30/09/2026 18:45",
    grossAmount: 1080,
    feeAmount: 86.40,
    netAmount: 993.60,
    paymentMethod: "Carte Bancaire Maroc CMI",
    cardLast4: "1092",
    status: "paid",
    invoiceNumber: "FACT-2026-0043"
  },
  {
    id: "TXN-2026-8804",
    bookingId: "req-3b",
    clientName: "Casablanca Finance City Group",
    clientEmail: "corporate@cfc.ma",
    clientPhone: "+212 5 22 45 12 34",
    clientCity: "Casablanca",
    spaceId: 3,
    spaceName: "Oasis Work Gauthier",
    city: "Casablanca",
    date: "2026-10-02",
    timeSlot: "09:00 – 18:00 (Journée)",
    paidAt: "30/09/2026 18:47",
    grossAmount: 1080,
    feeAmount: 86.40,
    netAmount: 993.60,
    paymentMethod: "Carte Bancaire Maroc CMI",
    cardLast4: "1092",
    status: "paid",
    invoiceNumber: "FACT-2026-0044"
  },
  {
    id: "TXN-2026-8805",
    bookingId: "req-4",
    clientName: "Nadia Idrissi",
    clientEmail: "nadia.idrissi@digital.ma",
    clientPhone: "+212 6 64 12 34 56",
    clientCity: "Tanger",
    spaceId: 5,
    spaceName: "Marina Bay Focus",
    city: "Tanger",
    date: "2026-10-08",
    timeSlot: "14:00 – 17:00 (3h)",
    paidAt: "24/09/2026 15:03",
    grossAmount: 75,
    feeAmount: 6.00,
    netAmount: 69.00,
    paymentMethod: "Carte Bancaire Maroc CMI",
    cardLast4: "5512",
    status: "paid",
    invoiceNumber: "FACT-2026-0045"
  },
  {
    id: "TXN-2026-8806",
    bookingId: "req-2",
    clientName: "Salma Tazi",
    clientEmail: "salma.tazi@techmaroc.ma",
    clientPhone: "+212 6 62 89 01 23",
    clientCity: "Rabat",
    spaceId: 4,
    spaceName: "Le Hub Agdal",
    city: "Rabat",
    date: "2026-10-05",
    timeSlot: "14:00 – 17:00 (3h)",
    paidAt: "En attente de validation",
    grossAmount: 150,
    feeAmount: 12.00,
    netAmount: 138.00,
    paymentMethod: "Pré-autorisation CB CMI",
    cardLast4: "9934",
    status: "pending",
    invoiceNumber: "FACT-2026-0046"
  }
];

/* ================= MOTEUR DE GESTION DU PLANNING & DES DISPONIBILITÉS ================= */
const getSpaceAvailability = (space, dateStr, bookings = []) => {
  if (!space) return { availableSeats: 0, totalCapacity: 0, isSoldOut: false, isFullDay: false, bookedHours: [] };
  const cap = space.cap || 1;

  if (!dateStr) {
    return { availableSeats: cap, totalCapacity: cap, isSoldOut: false, isFullDay: false, bookedHours: [] };
  }

  // Active bookings on this space and date
  const dayBookings = (bookings || []).filter(b => 
    (b.spaceId === space.id || b.id === space.id) &&
    b.date === dateStr &&
    b.status !== "cancelled"
  );

  let bookedSeats = 0;
  const bookedHoursSet = new Set();
  let isFullDay = false;

  for (const b of dayBookings) {
    const isExclusiveRoom = ["office", "meeting", "booth", "studio"].includes(space.type);
    const isJournee = (b.timeSlot && b.timeSlot.includes("Journée")) || (b.meta && b.meta.includes("Journée")) || (b.hours && b.hours >= 8);

    if (isJournee) {
      isFullDay = true;
      bookedSeats = cap;
      HOURS.forEach(h => bookedHoursSet.add(h));
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
            bookedHoursSet.add(HOURS[i]);
          }
        }
      }
      if (isExclusiveRoom) {
        bookedSeats = cap;
      } else {
        bookedSeats += (b.seats || 1);
      }
    }
  }

  const availableSeats = Math.max(0, cap - bookedSeats);
  const isSoldOut = isFullDay || availableSeats === 0 || (bookedHoursSet.size >= HOURS.length);

  return {
    availableSeats,
    totalCapacity: cap,
    isSoldOut,
    isFullDay,
    bookedHours: Array.from(bookedHoursSet)
  };
};

const getNextAvailableDates = (space, bookings = [], daysAhead = 7) => {
  const dates = [];
  const base = new Date();
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const avail = getSpaceAvailability(space, dateStr, bookings);
    dates.push({
      date: dateStr,
      availableSeats: avail.availableSeats,
      totalCapacity: avail.totalCapacity,
      isSoldOut: avail.isSoldOut,
      label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    });
  }
  return dates;
};

/* ================= UI ATOMS ================= */
const Stars=({v,size=13})=>(
  <span className="inline-flex gap-0.5 text-amber-400">
    {[1,2,3,4,5].map(i=><Icon key={i} n="star" size={size} fill={i<=Math.round(v)?"currentColor":"none"} className={i<=Math.round(v)?"":"text-slate-300"}/>)}
  </span>
);
const Badge=({label})=>{
  if(!label)return null;
  const eco=label.includes("Éco");
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${eco?"bg-emerald-100 text-emerald-700":"bg-white/95 text-ink shadow-sm"}`}>
    {eco&&<Icon n="leaf" size={11}/>}{label}
  </span>;
};
const Kicker=({children})=>(
  <p className="flex items-center gap-2 text-[11px] md:text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
    <span className="h-px w-6 bg-brand-500"/>{children}
  </p>
);
const SecHead=({kicker,title,action})=>(
  <div className="flex flex-wrap items-end justify-between gap-4 mb-7" data-reveal>
    <div><Kicker>{kicker}</Kicker>
      <h2 className="font-display text-2xl md:text-[2rem] font-bold tracking-tight mt-2">{title}</h2>
    </div>
    {action}
  </div>
);
const Toggle=({on,onClick})=>(
  <button onClick={onClick} className={`relative w-11 h-6 rounded-full transition-colors ${on?"bg-brand-600":"bg-slate-200"}`}>
    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on?"left-[22px]":"left-0.5"}`}/>
  </button>
);
const Field=({label,err,children})=>(
  <div>
    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
    {children}
    {err&&<p className="flex items-center gap-1 text-xs text-rose-600 mt-1.5"><Icon n="alert-circle" size={12}/>{err}</p>}
  </div>
);
const inp="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";
const inpErr="border-rose-400 focus:border-rose-500 focus:ring-rose-500/10";

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
                  <td className="py-3.5 text-center text-slate-500">{dateStr}<br/>{timeSlot}</td>
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
const SpaceCard=({s,nav,favs,toggleFav,date,bookings=[]})=>{
  const liked=favs.has(s.id);
  const avail = getSpaceAvailability(s, date, bookings);
  return (
    <article onClick={()=>nav({name:"space",params:{id:s.id,date}})}
      className={`group cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift ${avail.isSoldOut ? "border-rose-200" : "border-slate-200/80"}`}>
      <div className="relative h-44 md:h-48 overflow-hidden">
        <img src={U(s.imgs[0],700)} alt={s.name} loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.07]"/>
        <div className="absolute left-3 top-3 flex flex-col gap-1 items-start">
          <Badge label={s.badge}/>
          {date && (
            avail.isSoldOut ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold bg-rose-600 text-white shadow-md">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"/>COMPLET (0 place)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold bg-emerald-600 text-white shadow-md">
                <span className="h-1.5 w-1.5 rounded-full bg-white"/>{avail.availableSeats} place{avail.availableSeats>1?"s":""} libre{avail.availableSeats>1?"s":""}
              </span>
            )
          )}
        </div>
        <button onClick={e=>{e.stopPropagation();toggleFav(s.id);}}
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full backdrop-blur transition ${liked?"bg-white text-rose-500":"bg-white/85 text-slate-500 hover:text-rose-500"}`}>
          <Icon n="heart" size={16} fill={liked?"currentColor":"none"} className={liked?"pop":""}/>
        </button>
        <span className="absolute bottom-3 right-3 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {s.unit==="heure"?"À l'heure":"À la journée"}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-[15px] leading-snug">{s.name}</h3>
          <span className="flex shrink-0 items-center gap-1 text-sm font-semibold"><Icon n="star" size={13} fill="currentColor" className="text-amber-400"/>{s.rating.toLocaleString('fr-FR')}</span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-[13px] text-slate-500">
          <Icon n="map-pin" size={12}/>{s.city} · {s.district}
        </p>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-slate-400">{TYPES.find(t=>t.id===s.type).label} · {s.surface}</span>
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
            {avail.isSoldOut ? "Voir planning" : "Voir l'espace"}<Icon n="arrow-right" size={13}/>
          </span>
        </div>
      </div>
    </article>
  );
};

/* ================= NAVBAR ================= */
const Navbar=({view,nav,cartCount,menuOpen,setMenuOpen,currentUser,onSelectUser,onLogout,toast})=>{
  const [scrolled,setScrolled]=useState(false);
  const [userMenu,setUserMenu]=useState(false);

  const isManagerOrAdmin = currentUser && (currentUser.role === 'manager' || currentUser.role === 'admin');

  useEffect(()=>{
    const f=()=>setScrolled(window.scrollY>8);f();
    window.addEventListener("scroll",f);
    return()=>window.removeEventListener("scroll",f);
  },[]);
  const link=(label,target,icon)=>(
    <button key={label} onClick={()=>{nav(target);setUserMenu(false);setMenuOpen(false);}}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${view.name===target.name?"bg-brand-50 text-brand-700":"text-slate-600 hover:text-ink hover:bg-slate-50"}`}>
      {icon&&<Icon n={icon} size={15}/>}{label}
    </button>);
  return (
    <header className={`sticky top-0 z-50 transition-all ${scrolled?"bg-white/92 backdrop-blur-md shadow-[0_1px_0_rgba(13,44,90,.08)]":"bg-white"}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <button onClick={()=>nav({name:"home"})} className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/30"><Icon n="map-pin" size={18}/></span>
          <div className="text-left">
            <span className="font-display text-lg font-bold tracking-tight block leading-tight">Spotwork</span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-brand-600 hidden sm:block">PropTech Maroc</span>
          </div>
        </button>
        <nav className="hidden lg:flex items-center gap-1">
          {link("Accueil",{name:"home"})}
          {link("Explorer",{name:"explore"},"search")}
          {link("Mes réservations",{name:"user"},"calendar-days")}
          {isManagerOrAdmin && link("Gestionnaire",{name:"admin"},"bar-chart-3")}
          {!currentUser && link("Connexion",{name:"login"},"user")}
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={()=>nav({name:"checkout"})} className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:border-brand-300 hover:text-brand-600">
            <Icon n="shopping-cart" size={17}/>
            {cartCount>0&&<span key={cartCount} className="pop absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{cartCount}</span>}
          </button>

          {currentUser ? (
            <div className="relative">
              <button onClick={()=>setUserMenu(!userMenu)} className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 transition hover:border-brand-300 bg-white">
                <span className={`grid h-8 w-8 place-items-center rounded-full font-bold text-white text-[11px] shadow-sm ${currentUser.avatarBg || "bg-brand-600"}`}>
                  {currentUser.initials || "U"}
                </span>
                <div className="hidden sm:flex items-center gap-1.5 text-left">
                  <span className="text-sm font-semibold text-slate-800">{currentUser.firstName || currentUser.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${currentUser.badgeCls || "bg-blue-50 text-brand-700 border-brand-200"}`}>
                    {currentUser.roleLabel || currentUser.role}
                  </span>
                </div>
                <Icon n="chevron-down" size={14} className="text-slate-400"/>
              </button>
              {userMenu&&(
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
                      <span className="text-slate-500 flex items-center gap-1"><Icon n="map-pin" size={11}/>{currentUser.city || "Maroc"}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold border ${currentUser.badgeCls || "bg-blue-50 text-brand-700 border-brand-200"}`}>{currentUser.roleLabel || currentUser.role}</span>
                    </div>
                  </div>

                  {/* Primary Nav Links */}
                  {[
                    ["Mon espace client","layout-grid",()=>nav({name:"user"})],
                    ["Mes favoris","heart",()=>nav({name:"user",params:{tab:"favoris"}})],
                    ...(isManagerOrAdmin ? [["Espace gestionnaire / Admin","bar-chart-3",()=>nav({name:"admin"})]] : [])
                  ].map(([l,i,f])=>(
                    <button key={l} onClick={()=>{f();setUserMenu(false);}} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-mist hover:text-ink">
                      <Icon n={i} size={15} className="text-slate-400"/>{l}
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
                    <button onClick={()=>{nav({name:"login"});setUserMenu(false);}} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition">
                      <Icon n="user" size={13}/>Gérer
                    </button>
                    <button onClick={()=>{onLogout();setUserMenu(false);}} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition">
                      <Icon n="log-out" size={13}/>Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={()=>nav({name:"login"})} className="flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-brand-700 transition">
              <Icon n="log-in" size={15}/><span>Se connecter</span>
            </button>
          )}

          <button onClick={()=>setMenuOpen(!menuOpen)} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 lg:hidden">
            <Icon n={menuOpen?"x":"menu"} size={18}/>
          </button>
        </div>
      </div>
      {menuOpen&&(
        <div className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {link("Accueil",{name:"home"},"home")}
            {link("Explorer les espaces",{name:"explore"},"search")}
            {link("Mes réservations",{name:"user"},"calendar-days")}
            {isManagerOrAdmin && link("Tableau de bord gestionnaire",{name:"admin"},"bar-chart-3")}
            {currentUser ? (
              <button onClick={()=>{onLogout();setMenuOpen(false);}} className="flex w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
                <Icon n="log-out" size={16}/>Déconnexion ({currentUser.firstName || currentUser.name})
              </button>
            ) : (
              link("Se connecter",{name:"login"},"log-in")
            )}
            {link("Panier",{name:"checkout"},"shopping-cart")}
          </div>
        </div>
      )}
    </header>
  );
};

/* ================= RECHERCHE (validation) ================= */
const SearchPanel=({nav})=>{
  const [city,setCity]=useState("");const [type,setType]=useState("");
  const [date,setDate]=useState("");const [budget,setBudget]=useState("150");
  const [errs,setErrs]=useState({});
  const submit=e=>{
    e.preventDefault();
    const er={};
    if(!city)er.city="Choisissez une ville";
    if(!date)er.date="Sélectionnez une date";
    setErrs(er);
    if(Object.keys(er).length)return;
    nav({name:"explore",params:{city,type,budget,date}});
  };
  const sel=has=>`${inp} appearance-none ${has?"":"text-slate-400"}`;
  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-lift md:p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Ville" err={errs.city}>
          <div className="relative">
            <Icon n="map-pin" size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <select value={city} onChange={e=>setCity(e.target.value)} className={`${sel(city)} pl-9`}>
              <option value="">Toutes les villes</option>
              {CITIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </Field>
        <Field label="Type d'espace">
          <select value={type} onChange={e=>setType(e.target.value)} className={sel(type)}>
            <option value="">Tous les types</option>
            {TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Date" err={errs.date}>
          <input type="date" min={todayISO()} value={date} onChange={e=>setDate(e.target.value)} className={`${inp} ${errs.date?inpErr:""}`}/>
        </Field>
        <Field label="Budget max">
          <select value={budget} onChange={e=>setBudget(e.target.value)} className={sel(true)}>
            <option value="35">≤ 35 DH</option><option value="60">≤ 60 DH</option>
            <option value="100">≤ 100 DH</option><option value="200">Tous budgets</option>
          </select>
        </Field>
      </div>
      <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Icon n="shield-check" size={14} className="text-emerald-500"/>Annulation gratuite jusqu'à 24 h avant
        </p>
        <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[.98] sm:w-auto">
          <Icon n="search" size={16}/>Rechercher un espace
        </button>
      </div>
    </form>
  );
};

/* ================= HERO ================= */
const Hero=({nav})=>(
  <section className="relative overflow-hidden bg-mist">
    <div className="absolute inset-0 bg-dots opacity-60"/>
    <div className="absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-brand-100 blur-3xl opacity-70"/>
    <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 md:px-6 md:pt-16 lg:pb-20">
      <div className="grid items-center gap-10 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
            <span className="dot-live h-2 w-2 rounded-full bg-emerald-500"/>320+ espaces vérifiés · 6 villes marocaines
          </span>
          <h1 className="mt-5 font-display text-[2.4rem] font-bold leading-[1.04] tracking-tight md:text-6xl">
            <span className="mask-line"><span style={{animationDelay:".05s"}}>Des espaces qui</span></span>
            <span className="mask-line"><span style={{animationDelay:".16s"}}>donnent envie de</span></span>
            <span className="mask-line"><span style={{animationDelay:".27s"}} className="text-brand-600">travailler.</span></span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-slate-600">
            Bureaux privés, open spaces, salles de réunion : comparez, visitez en photos et réservez en moins de deux minutes à Casablanca, Rabat, Marrakech et dans tout le Maroc.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {["YA","ME","FA","ST"].map((x,i)=>(
                <span key={x} className="grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white"
                  style={{background:["#1F56D6","#0D2C5A","#5B90F7","#142F7A"][i]}}>{x}</span>
              ))}
            </div>
            <p className="text-xs text-slate-500"><b className="text-ink">12 400+</b> professionnels au Maroc nous font confiance</p>
          </div>
          <div className="mt-8"><SearchPanel nav={nav}/></div>
        </div>
        <div className="relative hidden lg:col-span-6 lg:block">
          <div className="relative ml-auto w-[92%]">
            <div className="overflow-hidden rounded-3xl shadow-lift">
              <img src={U(IMG.f,900)} alt="Espace de coworking lumineux au Maroc" className="h-[430px] w-full object-cover"/>
            </div>
            <div className="absolute -bottom-8 -left-10 w-52 overflow-hidden rounded-2xl border-4 border-mist shadow-lift">
              <img src={U(IMG.g,500)} alt="Professionnels au travail" className="h-32 w-full object-cover"/>
            </div>
            <div className="floaty absolute -right-4 top-8 rounded-2xl bg-white p-3.5 shadow-lift">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <span className="dot-live h-1.5 w-1.5 rounded-full bg-emerald-500"/>Occupation en direct
              </p>
              <p className="mt-1 font-display text-sm font-bold">L'Atelier Maarif · Casablanca</p>
              <div className="mt-2 h-1.5 w-36 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[86%] rounded-full bg-brand-600"/>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-brand-700">86 % occupé</p>
            </div>
            <div className="floaty absolute -left-16 top-40 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-lift" style={{animationDelay:"1.4s"}}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-amber-500"><Icon n="star" size={16} fill="currentColor"/></span>
              <div><p className="font-display text-sm font-bold">4,9 / 5</p><p className="text-[11px] text-slate-400">2 140 avis vérifiés</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ================= CHARTS ================= */
const AreaChart=({data,labels})=>{
  const [hov,setHov]=useState(-1);
  const W=560,H=210,P=16,color="#1F56D6";
  const min=Math.min(...data)*0.88,max=Math.max(...data)*1.05;
  const X=i=>P+i*(W-2*P)/(data.length-1);
  const Y=v=>H-30-((v-min)/(max-min))*(H-58);
  const pts=data.map((v,i)=>[X(i),Y(v)]);
  const line=smoothPath(pts);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".22"/><stop offset="1" stopColor={color} stopOpacity="0"/>
        </linearGradient></defs>
        {[.22,.5,.78].map(t=><line key={t} x1={P} x2={W-P} y1={14+(H-50)*t} y2={14+(H-50)*t} stroke="#E6ECF5" strokeDasharray="3 6"/>)}
        <path d={line+` L${X(data.length-1)},${H-26} L${X(0)},${H-26} Z`} fill="url(#ag)"/>
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" className="chart-line"/>
        {pts.map(([x,y],i)=>(
          <g key={i}>
            {hov===i&&<g><line x1={x} x2={x} y1={16} y2={H-28} stroke={color} strokeDasharray="3 4" strokeWidth="1"/><circle cx={x} cy={y} r="4.5" fill="#fff" stroke={color} strokeWidth="2.5"/></g>}
            <rect x={x-22} y="0" width="44" height={H} fill="transparent" onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(-1)}/>
          </g>
        ))}
        {labels.map((l,i)=><text key={i} x={X(i)} y={H-8} fontSize="9.5" fill="#8CA0B8" textAnchor="middle" fontWeight="600">{l}</text>)}
      </svg>
      {hov>=0&&(
        <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{left:`${X(hov)/W*100}%`,top:`${Y(data[hov])/H*100}%`}}>
          <span className="opacity-60">{labels[hov]} · </span><b>{EUR.format(data[hov]*1000)}</b>
        </div>
      )}
    </div>
  );
};
const WeekBars=({data,labels})=>{
  const best=data.indexOf(Math.max(...data));
  return (
    <div className="flex h-40 items-end gap-2.5">
      {data.map((v,i)=>(
        <div key={i} className="group flex flex-1 flex-col items-center gap-2">
          <div className="relative flex h-full w-full items-end">
            <div className="grow w-full rounded-md" style={{height:`${v}%`,background:i===best?"#1F56D6":"#D9E4F7",animationDelay:`${i*70}ms`}}/>
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">{v}%</span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
};
const Donut=({items,center})=>{
  const total=items.reduce((s,x)=>s+x.v,0);
  const r=52,C=2*Math.PI*r;let acc=0;
  return (
    <div className="flex items-center gap-6">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#EEF2F8" strokeWidth="16"/>
        {items.map((it,i)=>{
          const frac=it.v/total,len=Math.max(frac*C-3,1);
          const el=<circle key={i} cx="70" cy="70" r={r} fill="none" stroke={it.c} strokeWidth="16"
            strokeDasharray={`${len} ${C-len}`} strokeDashoffset={-acc*C} transform="rotate(-90 70 70)"/>;
          acc+=frac;return el;
        })}
        <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0A1B33" fontFamily="Space Grotesk">{center[0]}</text>
        <text x="70" y="82" textAnchor="middle" fontSize="9" fill="#8CA0B8">{center[1]}</text>
      </svg>
      <ul className="space-y-2">
        {items.map(it=>(
          <li key={it.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{background:it.c}}/>
            <span className="text-slate-600">{it.label}</span>
            <b className="text-ink">{Math.round(it.v/total*100)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
};
const Spark=({data,color})=>{
  const W=88,H=30,max=Math.max(...data),min=Math.min(...data);
  const pts=data.map((v,i)=>`${(i/(data.length-1))*W},${H-3-((v-min)/((max-min)||1))*(H-8)}`).join(" ");
  return <svg width={W} height={H} className="overflow-visible"><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
};
const Ring=({v})=>(
  <svg width="46" height="46" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="16" fill="none" stroke="#E4EBF5" strokeWidth="4"/>
    <circle cx="20" cy="20" r="16" fill="none" stroke="#1F56D6" strokeWidth="4" strokeLinecap="round"
      pathLength="100" strokeDasharray={`${v} ${100-v}`} transform="rotate(-90 20 20)"/>
    <text x="20" y="24" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0A1B33">{v}%</text>
  </svg>
);

/* ================= HOME ================= */
const Home=({nav,favs,toggleFav,spaces=SPACES,bookings=[]})=>{
  const featured=spaces.filter(s=>s.featured);
  return (
    <main>
      <Hero nav={nav}/>
      {/* Marquee */}
      <div className="border-y border-slate-100 bg-white py-4">
        <div className="overflow-hidden">
          <div className="marquee flex w-max items-center gap-10 text-sm font-semibold text-slate-400">
            {[0,1].map(k=>(
              <div key={k} className="flex items-center gap-10">
                {[...CITIES,...CITIES].map((c,i)=>(
                  <span key={c+i} className="flex items-center gap-10 whitespace-nowrap">
                    <span className="font-display">{c}</span>
                    <Icon n="asterisk" size={12} className="text-brand-300"/>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Types */}
      <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <SecHead kicker="Parcourir" title="Explorer par type d'espace"/>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0" data-reveal>
          {TYPES.map((t,i)=>{
            const count=spaces.filter(s=>s.type===t.id).length;
            return (
              <button key={t.id} onClick={()=>nav({name:"explore",params:{type:t.id}})}
                className="group flex shrink-0 items-center gap-3 rounded-full border border-slate-200 bg-white py-2.5 pl-3.5 pr-5 transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-card"
                style={{transitionDelay:`${i*40}ms`}}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                  <Icon n={t.icon} size={16}/>
                </span>
                <span className="text-left"><span className="block text-sm font-bold">{t.label}</span>
                <span className="block text-[11px] text-slate-400">{count} espace{count>1?"s":""}</span></span>
              </button>
            );
          })}
        </div>
      </section>
      {/* En vedette */}
      <section className="bg-mist py-14">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SecHead kicker="Sélection" title="Espaces en vedette cette semaine"
            action={<button onClick={()=>nav({name:"explore"})} className="flex items-center gap-1.5 text-sm font-bold text-brand-600 transition hover:gap-2.5">Tout voir<Icon n="arrow-right" size={15}/></button>}/>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((s,i)=>(
              <div key={s.id} data-reveal style={{transitionDelay:`${i*70}ms`}}>
                <SpaceCard s={s} nav={nav} favs={favs} toggleFav={toggleFav} bookings={bookings}/>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Comment ça marche */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <SecHead kicker="Simple et rapide" title="Réservez en trois temps"/>
        <div className="relative grid gap-10 md:grid-cols-3 md:gap-6">
          <div className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-slate-200 md:block"/>
          {[
            {n:"01",i:"search",t:"Cherchez & comparez",d:"Filtrez par ville, type, budget et équipements. Photos réelles, avis vérifiés, tarifs transparents."},
            {n:"02",i:"badge-check",t:"Réservez en 2 min",d:"Choisissez votre créneau, payez en ligne de façon sécurisée. Confirmation instantanée par e-mail."},
            {n:"03",i:"calendar-check",t:"Installez-vous",d:"Accès direct le jour J. Annulation gratuite jusqu'à 24 h avant, report en un clic."}
          ].map((s,i)=>(
            <div key={s.n} className="relative flex gap-4 md:flex-col md:gap-0" data-reveal style={{transitionDelay:`${i*100}ms`}}>
              <div className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-navy text-white shadow-lg">
                <Icon n={s.i} size={22}/>
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
          <div className="absolute inset-0 bg-grid"/>
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl"/>
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
                {[["+32 %","d'occupation moyenne"],["0 €","avant la première réservation"]].map(([v,l])=>(
                  <div key={l}><p className="font-display text-2xl font-bold text-brand-300">{v}</p><p className="text-xs text-slate-400">{l}</p></div>
                ))}
              </div>
              <button onClick={()=>nav({name:"admin"})} className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-navy transition hover:bg-brand-50 active:scale-[.98]">
                Découvrir le dashboard gestionnaire<Icon n="arrow-right" size={15}/>
              </button>
            </div>
            <div className="relative">
              <div className="rotate-2 rounded-2xl bg-white p-4 shadow-lift transition-transform duration-500 hover:rotate-0">
                <div className="flex items-center justify-between"><p className="text-xs font-bold">Revenus · Ce mois</p><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">+12,4 %</span></div>
                <p className="font-display text-2xl font-bold">231 000 DH</p>
                <Spark data={[8,10,9,13,12,15,17,16,19]} color="#1F56D6"/>
                <div className="mt-3 space-y-2">
                  {[["L'Atelier Maarif",86],["Le Hub Agdal",91],["Studio Guéliz",82]].map(([n,v])=>(
                    <div key={n} className="flex items-center gap-2 text-[11px]">
                      <span className="w-24 truncate font-semibold text-slate-500">{n}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{width:v+"%"}}/></div>
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
          <SecHead kicker="Ils en parlent mieux que nous" title="La communauté Spotwork Maroc"/>
          <div className="grid gap-5 lg:grid-cols-3">
            <figure className="relative rounded-3xl bg-navy p-8 text-white lg:col-span-2" data-reveal>
              <Icon n="quote" size={34} className="text-brand-400"/>
              <blockquote className="mt-4 font-display text-xl font-semibold leading-relaxed md:text-2xl">
                "J'ai testé quatre espaces entre Casablanca et Rabat en deux semaines sans aucune friction. Le dashboard me suit partout, mes factures en Dirhams sont centralisées."
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-500 font-bold">ST</span>
                <div><p className="text-sm font-bold">Salma Tazi</p><p className="text-xs text-slate-400">Consultante Stratégie · Rabat</p></div>
                <div className="ml-auto"><Stars v={5}/></div>
              </figcaption>
            </figure>
            <div className="grid gap-5">
              {[
                {t:"La gestion de nos 3 espaces à Casablanca est devenue limpide. L'occupation a augmenté de 28 points en un trimestre.",n:"Karim B.",r:"Gérant Coworking · Casablanca",d:"KB"},
                {t:"Réservation un dimanche soir à 23 h pour le lundi matin à Marrakech. Expérience digitale remarquable.",n:"Youssef A.",r:"Développeur Cloud · Marrakech",d:"YA"}
              ].map((x,i)=>(
                <figure key={x.n} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card" data-reveal style={{transitionDelay:`${i*120}ms`}}>
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
const FilterPanel=({f,setF})=>{
  const flipType=id=>setF(p=>({...p,types:p.types.includes(id)?p.types.filter(t=>t!==id):[...p.types,id]}));
  const flipAm=id=>setF(p=>({...p,am:p.am.includes(id)?p.am.filter(t=>t!==id):[...p.am,id]}));
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Ville</label>
        <select value={f.city} onChange={e=>setF({...f,city:e.target.value})} className={inp}>
          <option value="">Toutes les villes</option>
          {CITIES.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Type</label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(t=>(
            <button key={t.id} onClick={()=>flipType(t.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${f.types.includes(t.id)?"border-brand-600 bg-brand-600 text-white":"border-slate-200 bg-white text-slate-600 hover:border-brand-300"}`}>
              <Icon n={t.icon} size={12}/>{t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 flex justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
          <span>Prix max</span><span className="text-brand-600">{f.max>=150?"Illimité":EUR.format(f.max)}</span>
        </label>
        <input type="range" min="10" max="150" step="5" value={f.max}
          onChange={e=>setF({...f,max:+e.target.value})} className="w-full accent-[#1F56D6]"/>
        <div className="flex justify-between text-[10px] text-slate-400"><span>10 DH</span><span>150 DH+</span></div>
      </div>
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Équipements</label>
        <div className="space-y-2.5">
          {AMENITIES.slice(0,6).map(a=>(
            <label key={a.id} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
              <input type="checkbox" checked={f.am.includes(a.id)} onChange={()=>flipAm(a.id)} className="h-4 w-4 rounded accent-[#1F56D6]"/>
              <Icon n={a.icon} size={14} className="text-slate-400"/>{a.label}
            </label>
          ))}
        </div>
      </div>
      <button onClick={()=>setF({city:"",types:[],max:150,am:[]})} className="flex items-center gap-1.5 text-xs font-bold text-rose-500 transition hover:text-rose-600">
        <Icon n="x" size={13}/>Réinitialiser les filtres
      </button>
    </div>
  );
};

const Explore=({params,nav,favs,toggleFav,spaces=SPACES,bookings=[]})=>{
  const [f,setF]=useState(()=>({
    city:params?.city||"",types:params?.type?[params.type]:[],
    max:params?.budget?+params.budget:150,am:[],
    date:params?.date||"2026-10-01",
    onlyAvailable:false
  }));
  const [sort,setSort]=useState("reco");
  const [open,setOpen]=useState(false);
  const results=useMemo(()=>{
    let r=spaces.filter(s=>{
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
    if(sort==="asc")r=[...r].sort((a,b)=>a.price-b.price);
    if(sort==="desc")r=[...r].sort((a,b)=>b.price-a.price);
    if(sort==="note")r=[...r].sort((a,b)=>b.rating-a.rating);
    return r;
  },[f,sort,spaces,bookings]);
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>Catalogue & Disponibilités en temps réel</Kicker>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Explorer les espaces</h1>
          <p className="mt-1 text-sm text-slate-500"><b className="text-ink">{results.length}</b> espace{results.length>1?"s":""} {f.onlyAvailable ? "avec places libres" : "référencé" + (results.length>1?"s":"")}
            {f.city&&<span> à <b className="text-brand-600">{f.city}</b></span>}
            {f.date&&<span> pour le <b>{fmtDate(f.date)}</b></span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Date Selector */}
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold shadow-2xs">
            <Icon n="calendar" size={13} className="text-brand-600"/>
            <span className="text-slate-400">Date :</span>
            <input
              type="date"
              value={f.date}
              onChange={e=>setF(prev=>({...prev, date:e.target.value}))}
              className="border-none bg-transparent outline-none text-xs font-bold text-ink cursor-pointer"
            />
          </div>
          {/* Toggle Only Available */}
          <button
            onClick={()=>setF(prev=>({...prev, onlyAvailable:!prev.onlyAvailable}))}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition border ${
              f.onlyAvailable
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-brand-300"
            }`}
          >
            <Icon n={f.onlyAvailable ? "check-circle-2" : "filter"} size={13}/>
            <span>Places libres uniquement</span>
          </button>
          <button onClick={()=>setOpen(!open)} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold lg:hidden">
            <Icon n="sliders-horizontal" size={13}/>Filtres
          </button>
          <select value={sort} onChange={e=>setSort(e.target.value)} className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold outline-none focus:border-brand-500">
            <option value="reco">Recommandés</option><option value="note">Mieux notés</option>
            <option value="asc">Prix croissant</option><option value="desc">Prix décroissant</option>
          </select>
        </div>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className={`${open?"block":"hidden"} lg:block`}>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:sticky lg:top-24">
            <FilterPanel f={f} setF={setF}/>
          </div>
        </aside>
        <div>
          {results.length===0?(
            <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-200 py-24 text-center">
              <div>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mist text-slate-400"><Icon n="search-x" size={24}/></span>
                <p className="mt-4 font-display font-bold">Aucun espace ne correspond</p>
                <p className="mt-1 text-sm text-slate-500">{f.onlyAvailable ? "Tous les espaces sont complets pour cette date ou vos filtres sont trop stricts." : "Essayez d'élargir vos critères."}</p>
                <button onClick={()=>setF({city:"",types:[],max:150,am:[],date:"2026-10-01",onlyAvailable:false})} className="mt-4 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white">Effacer les filtres</button>
              </div>
            </div>
          ):(
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((s,i)=>(
                <div key={s.id} data-reveal style={{transitionDelay:`${(i%3)*60}ms`}}>
                  <SpaceCard s={s} nav={nav} favs={favs} toggleFav={toggleFav} date={f.date} bookings={bookings}/>
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
const SpaceDetail=({id,nav,favs,toggleFav,reserve,spaces=SPACES,bookings=[]})=>{
  const s=spaces.find(x=>x.id===id);
  const [img,setImg]=useState(0);
  const [date,setDate]=useState(()=>{
    const d=new Date();
    d.setDate(d.getDate()+1);
    return d.toISOString().slice(0,10);
  });
  const [days,setDays]=useState(1);
  const [slots,setSlots]=useState([]);
  const [err,setErr]=useState("");

  if(!s)return <main className="py-24 text-center">Espace introuvable.</main>;
  const liked=favs.has(s.id);
  const isHour=s.unit==="heure";
  const base=isHour?slots.length*s.price:days*s.price;
  const fees=Math.round(base*0.08*100)/100;

  // Calcul dynamique des places et disponibilités selon les réservations enregistrées
  const availability = useMemo(() => getSpaceAvailability(s, date, bookings), [s, date, bookings]);
  const upcomingDates = useMemo(() => getNextAvailableDates(s, bookings, 7), [s, bookings]);
  const bookedHoursSet = useMemo(() => new Set(availability.bookedHours || []), [availability]);

  const flipSlot=h=>{
    if (availability.isSoldOut) return;
    setSlots(p=>p.includes(h)?p.filter(x=>x!==h):[...p,h].sort());
  };

  const book=()=>{
    if (availability.isSoldOut) {
      setErr(`Cet espace est complet pour le ${fmtDate(date)}. Choisissez une autre date disponible.`);
      return;
    }
    if(isHour&&slots.length===0){setErr("Sélectionnez au moins un créneau horaire.");return;}
    setErr("");
    reserve({
      key:Date.now(),
      id:s.id,
      name:s.name,
      img:s.imgs[0],
      city:s.city,
      date,
      seats: 1,
      meta:isHour?`${fmtDate(date)} · ${slots.length} h (${slots.join(', ')})`:`${fmtDate(date)} · ${days} jour${days>1?"s":""}`,
      total:base+fees
    });
  };
  const similar=spaces.filter(x=>x.id!==s.id&&(x.city===s.city||x.type===s.type)).slice(0,3);
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <button onClick={()=>nav({name:"explore"})} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-ink">
        <Icon n="arrow-left" size={16}/>Retour aux résultats
      </button>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge label={s.badge}/>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">{TYPES.find(t=>t.id===s.type).label}</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">{s.name}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1"><Icon n="map-pin" size={13}/>{s.city} · {s.district}</span>
            <span className="flex items-center gap-1"><Icon n="star" size={13} fill="currentColor" className="text-amber-400"/><b className="text-ink">{s.rating.toLocaleString('fr-FR')}</b>({s.rev} avis)</span>
          </p>

          {/* Statut disponibilité dynamique */}
          {availability.isSoldOut ? (
            <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50/90 p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-600 text-white">
                  <Icon n="alert-triangle" size={13}/>
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
                  <Icon n="check" size={13}/>
                </span>
                <span>{availability.availableSeats} place{availability.availableSeats>1?"s":""} disponible{availability.availableSeats>1?"s":""} sur {availability.totalCapacity} pour le {fmtDate(date)}</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-200/70 px-2.5 py-0.5 rounded-full">
                Réservation ouverte
              </span>
            </div>
          )}

          {/* Galerie */}
          <div className="mt-5 grid grid-cols-4 gap-2.5">
            <div className="col-span-4 overflow-hidden rounded-2xl md:col-span-3">
              <img src={U(s.imgs[img],1100)} alt={s.name} className="h-64 w-full object-cover transition-all duration-500 md:h-[380px]"/>
            </div>
            <div className="col-span-4 grid grid-cols-3 gap-2.5 md:col-span-1 md:grid-cols-1">
              {s.imgs.map((im,i)=>(
                <button key={i} onClick={()=>setImg(i)}
                  className={`overflow-hidden rounded-xl transition ${img===i?"ring-2 ring-brand-600 ring-offset-2":"opacity-80 hover:opacity-100"}`}>
                  <img src={U(im,300)} alt="" className="h-20 w-full object-cover md:h-[118px]"/>
                </button>
              ))}
            </div>
          </div>
          {/* Infos clés */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["users","Capacité totale",`${s.cap} pers.`],["user-check","Places libres",`${availability.availableSeats} pers.`],["ruler","Surface",s.surface],["clock","Réservation",isHour?"À l'heure":"À la journée"]].map(([i,l,v])=>(
              <div key={l} className="rounded-xl border border-slate-200 p-3.5 bg-white shadow-2xs">
                <Icon n={i} size={17} className="text-brand-600"/>
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
              <span className="grid h-11 w-11 place-items-center rounded-full bg-navy text-sm font-bold text-white">{s.host.split(" ").map(w=>w[0]).join("")}</span>
              <div><p className="text-sm font-bold">Géré par {s.host}</p><p className="text-xs text-slate-500">Répond en ~1 h · Membre certifié PropTech Maroc</p></div>
            </div>
          </div>
          {/* Équipements */}
          <div className="mt-8">
            <h2 className="font-display text-lg font-bold">Équipements inclus</h2>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {s.am.map(a=>{
                const am=AMENITIES.find(x=>x.id===a);
                return <span key={a} className="flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white"><Icon n={am.icon} size={14} className="text-brand-600"/>{am.label}</span>;
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
                <div className="mt-1 flex justify-center"><Stars v={s.rating}/></div>
                <p className="mt-1 text-xs text-slate-400">{s.rev} avis</p>
                <div className="mt-4 space-y-1.5">
                  {[70,20,6,3,1].map((w,i)=>(
                    <div key={i} className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="w-3">{5-i}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{width:w+"%"}}/></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {REVIEWS.map(r=>(
                  <article key={r.n} className="rounded-2xl border border-slate-200 p-5 bg-white shadow-2xs">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{r.n[0]}</span>
                      <div><p className="text-sm font-bold">{r.n}</p><p className="text-[11px] text-slate-400">{r.role} · {r.d}</p></div>
                      <div className="ml-auto"><Stars v={r.stars} size={11}/></div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{r.t}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Carte réservation synchronisée au planning */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lift">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-2xl font-bold">{EUR.format(s.price)}<span className="text-sm font-medium text-slate-400"> /{s.unit}</span></p>
              <button onClick={()=>toggleFav(s.id)} className={`grid h-10 w-10 place-items-center rounded-full border transition ${liked?"border-rose-200 bg-rose-50 text-rose-500":"border-slate-200 text-slate-400 hover:text-rose-500"}`}>
                <Icon n="heart" size={17} fill={liked?"currentColor":"none"} className={liked?"pop":""}/>
              </button>
            </div>

            {/* Planning & Sélecteur de date */}
            <div className="mt-4 space-y-3.5">
              <Field label="Date souhaitée">
                <input
                  type="date"
                  value={date}
                  onChange={e=>{
                    setDate(e.target.value);
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
                            : item.isSoldOut
                            ? "border-rose-200 bg-rose-50/50 hover:bg-rose-50"
                            : "border-slate-200 hover:border-brand-300 bg-white"
                        }`}
                      >
                        <p className="font-bold text-ink truncate capitalize">{item.label}</p>
                        <span className={`inline-block mt-1 text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                          item.isSoldOut ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {item.isSoldOut ? "Complet (0)" : `${item.availableSeats} libre${item.availableSeats>1?"s":""}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isHour?(
                <Field label={`Créneaux horaires (${slots.length} sélectionné${slots.length>1?"s":""})`} err={err}>
                  {availability.isSoldOut ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs text-rose-700 font-semibold">
                      Tous les créneaux sont réservés pour cette journée
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5">
                      {HOURS.map((h,i)=>{
                        const busyByDefault = s.busy.includes(i);
                        const busyByBooking = bookedHoursSet.has(h);
                        const busy = busyByDefault || busyByBooking || availability.isFullDay;
                        const on = slots.includes(h);
                        return (
                          <button
                            key={h}
                            disabled={busy}
                            onClick={()=>flipSlot(h)}
                            title={busy ? "Créneau déjà réservé" : "Disponible"}
                            className={`rounded-lg border px-1 py-2 text-[11px] font-bold transition ${
                              busy
                                ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through"
                                : on
                                ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                                : "border-slate-200 text-slate-600 hover:border-brand-400 bg-white"
                            }`}>
                            {h}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Field>
              ):(
                <Field label="Durée de location">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                    <button onClick={()=>setDays(Math.max(1,days-1))} className="grid h-8 w-8 place-items-center rounded-full bg-mist transition hover:bg-brand-50"><Icon n="minus" size={14}/></button>
                    <span className="text-sm font-bold">{days} jour{days>1?"s":""}</span>
                    <button onClick={()=>setDays(Math.min(10,days+1))} className="grid h-8 w-8 place-items-center rounded-full bg-mist transition hover:bg-brand-50"><Icon n="plus" size={14}/></button>
                  </div>
                </Field>
              )}
            </div>

            <div className="mt-5 space-y-2 border-t border-dashed border-slate-200 pt-4 text-sm">
              <div className="flex justify-between text-slate-500"><span>{isHour?`${slots.length} × ${EUR.format(s.price)}`:`${days} × ${EUR.format(s.price)}`}</span><span>{EUR.format(base)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Frais de service (8 %)</span><span>{EUR.format(fees)}</span></div>
              <div className="flex justify-between pt-1 font-display text-base font-bold"><span>Total TTC</span><span>{EUR.format(base+fees)}</span></div>
            </div>

            {/* Bouton de réservation avec blocage en cas de complet */}
            <button
              onClick={book}
              disabled={availability.isSoldOut}
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold shadow-lg transition ${
                availability.isSoldOut
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                  : "bg-brand-600 text-white shadow-brand-600/30 hover:bg-brand-700 active:scale-[.98]"
              }`}
            >
              <Icon n={availability.isSoldOut ? "slash" : "zap"} size={16}/>
              {availability.isSoldOut ? "Complet pour cette date" : "Réserver cet espace"}
            </button>

            {availability.isSoldOut ? (
              <p className="mt-3 text-center text-xs text-rose-600 font-semibold">
                Sélectionnez une autre date ci-dessus pour réserver.
              </p>
            ) : (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <Icon n="shield-check" size={13} className="text-emerald-500"/>Confirmation immédiate · Paiement CMI sécurisé
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Similaires */}
      <div className="mt-14">
        <SecHead kicker="Continuez l'exploration" title="Espaces similaires"/>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {similar.map(x=><SpaceCard key={x.id} s={x} nav={nav} favs={favs} toggleFav={toggleFav} date={date} bookings={bookings}/>)}
        </div>
      </div>
    </main>
  );
};

/* ================= CHECKOUT ================= */
const Checkout=({cart,setCart,nav,onDone,toast,currentUser})=>{
  const [promo,setPromo]=useState("");const [promoOn,setPromoOn]=useState(false);const [promoErr,setPromoErr]=useState("");
  const [form,setForm]=useState(()=>({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    card:"",exp:"",cvc:""
  }));
  const [errs,setErrs]=useState({});const [paid,setPaid]=useState(false);
  const ref=useMemo(()=>`SW-2026-${Math.floor(1000+Math.random()*9000)}`);
  const subtotal=cart.reduce((s,i)=>s+i.total,0);
  const discount=promoOn?subtotal*0.10:0;
  const total=subtotal-discount;
  const applyPromo=()=>{
    if(promo.trim().toUpperCase()==="COWORK10"){setPromoOn(true);setPromoErr("");toast("Code promo appliqué : −10 %","percent");}
    else setPromoErr("Code invalide. Essayez COWORK10 😉");
  };
  const fmtCard=v=>v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
  const fmtExp=v=>{const d=v.replace(/\D/g,"").slice(0,4);return d.length>2?d.slice(0,2)+"/"+d.slice(2):d;};
  const validate=()=>{
    const er={};
    if(form.name.trim().length<3)er.name="Nom trop court (3 caractères min.)";
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))er.email="Adresse e-mail invalide";
    if(form.card.replace(/\s/g,"").length!==16)er.card="Le numéro doit contenir 16 chiffres";
    if(!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.exp))er.exp="Format MM/AA attendu";
    else{const [m,y]=form.exp.split("/").map(Number);if(2000+y<2025||(2000+y===2025&&m<new Date().getMonth()+1))er.exp="Carte expirée";}
    if(!/^\d{3,4}$/.test(form.cvc))er.cvc="3 chiffres au dos";
    setErrs(er);return Object.keys(er).length===0;
  };
  const submit=e=>{
    e.preventDefault();
    if(cart.length===0)return;
    if(validate()){
      onDone({
        date:cart[0].date,
        meta:cart.length>1?`${cart.length} réservations`:cart[0].meta,
        spaceId:cart[0].id,
        name:form.name,
        email:form.email,
        total:total
      });
      setPaid(true);
      window.scrollTo({top:0});
    }
  };
  if(paid)return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <span className="pop mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Icon n="check-circle-2" size={40}/></span>
      <h1 className="mt-6 font-display text-3xl font-bold">Réservation confirmée !</h1>
      <p className="mt-2 text-sm text-slate-500">Référence <b className="text-ink">{ref}</b> · un e-mail de confirmation vient de partir.</p>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-mist p-5 text-left text-sm">
        {cart.map(i=>(
          <div key={i.key} className="flex justify-between py-1.5"><span className="text-slate-600">{i.name}</span><b>{EUR.format(i.total)}</b></div>
        ))}
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2.5 font-display font-bold"><span>Total payé</span><span>{EUR.format(total)}</span></div>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button onClick={()=>nav({name:"user"})} className="rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/30">Voir mes réservations</button>
        <button onClick={()=>nav({name:"home"})} className="rounded-full border border-slate-200 px-6 py-3 text-sm font-bold">Retour à l'accueil</button>
      </div>
    </main>
  );
  if(cart.length===0)return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-mist text-slate-400"><Icon n="shopping-cart" size={28}/></span>
      <h1 className="mt-5 font-display text-2xl font-bold">Votre panier est vide</h1>
      <p className="mt-2 text-sm text-slate-500">Trouvez l'espace parfait et réservez-le en quelques clics.</p>
      <button onClick={()=>nav({name:"explore"})} className="mt-6 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white">Explorer les espaces</button>
    </main>
  );
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <Kicker>Paiement</Kicker>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Finaliser la réservation</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
        <form onSubmit={submit} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="flex items-center gap-2 font-display font-bold"><Icon n="user" size={17} className="text-brand-600"/>Vos coordonnées</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nom complet" err={errs.name}>
                <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Youssef Amrani" className={`${inp} ${errs.name?inpErr:""}`}/>
              </Field>
              <Field label="E-mail" err={errs.email}>
                <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="youssef@proptech.ma" className={`${inp} ${errs.email?inpErr:""}`}/>
              </Field>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display font-bold"><Icon n="credit-card" size={17} className="text-brand-600"/>Paiement sécurisé</h2>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><Icon n="lock" size={12}/>Chiffré SSL</span>
            </div>
            <div className="mt-4 space-y-4">
              <Field label="Numéro de carte" err={errs.card}>
                <input value={form.card} onChange={e=>setForm({...form,card:fmtCard(e.target.value)})} placeholder="4242 4242 4242 4242" className={`${inp} tracking-widest ${errs.card?inpErr:""}`}/>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Expiration" err={errs.exp}>
                  <input value={form.exp} onChange={e=>setForm({...form,exp:fmtExp(e.target.value)})} placeholder="MM/AA" className={`${inp} ${errs.exp?inpErr:""}`}/>
                </Field>
                <Field label="CVC" err={errs.cvc}>
                  <input value={form.cvc} onChange={e=>setForm({...form,cvc:e.target.value.replace(/\D/g,"").slice(0,4)})} placeholder="123" className={`${inp} ${errs.cvc?inpErr:""}`}/>
                </Field>
              </div>
            </div>
          </section>
          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-4 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[.99]">
            <Icon n="lock" size={15}/>Payer {EUR.format(total)}
          </button>
        </form>
        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="font-display font-bold">Votre panier <span className="text-slate-400">({cart.length})</span></h2>
            <div className="mt-4 space-y-4">
              {cart.map(i=>(
                <div key={i.key} className="flex gap-3">
                  <img src={U(i.img,200)} alt="" className="h-16 w-20 rounded-xl object-cover"/>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{i.name}</p>
                    <p className="text-xs text-slate-500">{i.city} · {i.meta}</p>
                    <p className="mt-1 text-sm font-bold text-brand-700">{EUR.format(i.total)}</p>
                  </div>
                  <button onClick={()=>setCart(cart.filter(x=>x.key!==i.key))} className="h-fit text-slate-300 transition hover:text-rose-500"><Icon n="trash-2" size={16}/></button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input value={promo} onChange={e=>setPromo(e.target.value)} placeholder="Code promo" className={`${inp} ${promoErr?inpErr:""}`}/>
              <button onClick={applyPromo} className="shrink-0 rounded-xl bg-navy px-4 text-sm font-bold text-white transition hover:bg-ink">OK</button>
            </div>
            {promoErr&&<p className="mt-1.5 text-xs text-rose-600">{promoErr}</p>}
            {promoOn&&<p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-emerald-600"><Icon n="check" size={12}/>COWORK10 appliqué</p>}
          </div>
          <div className="rounded-2xl bg-navy p-5 text-white shadow-card">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-300"><span>Sous-total</span><span>{EUR.format(subtotal)}</span></div>
              {promoOn&&<div className="flex justify-between text-emerald-400"><span>Remise −10 %</span><span>−{EUR.format(discount)}</span></div>}
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
const UserDash=({initTab,bookings,setBookings,favs,toggleFav,nav,toast,currentUser,spaces=SPACES})=>{
  if (!currentUser) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 md:p-12 shadow-card">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 mb-4">
            <Icon n="user" size={26}/>
          </span>
          <h1 className="font-display text-2xl font-bold text-ink">Espace Membre Spotwork</h1>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Connectez-vous pour retrouver vos réservations en cours, vos espaces favoris et les recommandations personnalisées de l'IA.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={()=>nav({name:"login"})} className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition">
              <Icon n="log-in" size={15}/>Se connecter
            </button>
            <button onClick={()=>nav({name:"explore"})} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">
              <Icon n="search" size={15}/>Explorer les espaces
            </button>
          </div>
        </div>
      </main>
    );
  }
  const user = currentUser;
  const [tab,setTab]=useState(initTab||"resas");
  const [userInvoice, setUserInvoice] = useState(null);
  const [prefs,setPrefs]=useState(()=>{
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
      } catch {}
      if (res && res.status === "success") {
        toast("Préférences de recherche synchronisées avec PostgreSQL Supabase", "check-circle");
      } else {
        toast("Préférences enregistrées localement", "check");
      }
    } catch {
      toast("Préférences enregistrées", "check");
    } finally {
      setSavingPrefs(false);
    }
  };
  const tabs=[["resas","Mes réservations","calendar-days"],["ia","Recommandations","sparkles"],["favoris","Favoris","heart"],["prefs","Préférences","settings"]];
  const recommendations=useMemo(()=>{
    const favTypes=new Set([...favs].map(id=>spaces.find(s=>s.id===id)?.type));
    return spaces.filter(s=>!favs.has(s.id))
      .map(s=>({s,score:favTypes.has(s.type)?88+Math.round(s.rating*2):55+Math.round(s.rating*6),
        reason:favTypes.has(s.type)?`Correspond à votre préférence « ${TYPES.find(t=>t.id===s.type)?.label.toLowerCase()} »`:`Très bien noté à ${s.city}`}))
      .sort((a,b)=>b.score-a.score).slice(0,3);
  },[favs, spaces]);
  const stColor=st=>st==="Confirmée"?"bg-emerald-50 text-emerald-600":st==="En attente"?"bg-amber-50 text-amber-600":"bg-slate-100 text-slate-500";
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
        <button onClick={()=>nav({name:"explore"})} className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25">
          <Icon n="plus" size={15}/>Nouvelle réservation
        </button>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[230px_1fr]">
        <nav className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
          {tabs.map(([id,l,i])=>(
            <button key={id} onClick={()=>setTab(id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab===id?"bg-navy text-white shadow-card":"text-slate-500 hover:bg-mist hover:text-ink"}`}>
              <Icon n={i} size={16}/>{l}
            </button>
          ))}
        </nav>
        <div>
          {tab==="resas"&&(
            <div className="space-y-8">
              <section>
                <h2 className="mb-4 font-display text-lg font-bold">À venir</h2>
                {bookings.length===0&&<p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">Aucune réservation à venir.</p>}
                <div className="grid gap-4 md:grid-cols-2">
                  {bookings.map(b=>{
                    const s=spaces.find(x=>x.id===b.spaceId);if(!s)return null;
                    return (
                      <article key={b.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:shadow-lift">
                        <div className="relative h-32 overflow-hidden">
                          <img src={U(s.imgs[0],600)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/>
                          <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${stColor(b.status)}`}>{b.status}</span>
                        </div>
                        <div className="p-4">
                          <h3 className="font-display font-bold">{s.name}</h3>
                          <p className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Icon n="calendar-days" size={12}/>{fmtDate(b.date)}</span>
                            <span className="flex items-center gap-1"><Icon n="clock" size={12}/>{b.meta}</span>
                          </p>
                          <div className="mt-3.5 flex flex-wrap gap-2">
                            <button onClick={()=>nav({name:"space",params:{id:s.id}})} className="flex-1 rounded-full bg-brand-50 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-100">Voir l'espace</button>
                            <button onClick={()=>{
                              setUserInvoice({
                                invoiceNumber: b.invoiceRef || `FACT-2026-004${b.id.toString().slice(-1) || '1'}`,
                                clientName: user.name,
                                clientEmail: user.email,
                                clientPhone: user.phone || "+212 6 61 23 45 67",
                                clientCity: user.city || "Casablanca",
                                spaceName: s.name,
                                date: b.date,
                                timeSlot: b.meta,
                                grossAmount: b.totalPrice || (s.price * (b.hours || 3)),
                                paymentMethod: b.paymentMethod || "Carte Bancaire Maroc CMI (3D Secure)",
                                paidAt: "01/10/2026 10:15",
                                status: b.status === "Confirmée" ? "paid" : "pending"
                              });
                            }} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 flex items-center gap-1">
                              <Icon n="file-text" size={13}/>Reçu / Facture
                            </button>
                            <button onClick={async ()=>{
                              try {
                                await SpotworkAPI.cancelBooking(b.id);
                              } catch {}
                              setBookings(bookings.filter(x=>x.id!==b.id));
                              toast("Réservation annulée et mise à jour en base de données","trash");
                            }} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition hover:border-rose-300 hover:text-rose-500">Annuler</button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
              <section>
                <h2 className="mb-4 font-display text-lg font-bold">Historique</h2>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
                  {PAST_BOOKINGS.map((b,i)=>{
                    const s=spaces.find(x=>x.id===b.spaceId);if(!s)return null;
                    return (
                      <div key={b.id} className={`flex items-center gap-4 px-5 py-4 text-sm ${i>0?"border-t border-slate-100":""}`}>
                        <img src={U(s.imgs[0],120)} alt="" className="h-11 w-14 rounded-lg object-cover"/>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{s.name}</p>
                          <p className="text-xs text-slate-400">{fmtDate(b.date)} · {b.meta}</p>
                        </div>
                        <span className="hidden sm:block text-xs font-semibold text-slate-400">{EUR.format(s.price)}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${stColor(b.status)}`}>{b.status}</span>
                        <button
                          onClick={()=>{
                            setUserInvoice({
                              invoiceNumber: `FACT-2026-003${b.id.toString().slice(-1) || '0'}`,
                              clientName: user.name,
                              clientEmail: user.email,
                              clientPhone: user.phone || "+212 6 61 23 45 67",
                              clientCity: user.city || "Casablanca",
                              spaceName: s.name,
                              date: b.date,
                              timeSlot: b.meta,
                              grossAmount: s.price * 4,
                              paymentMethod: "Carte Bancaire Maroc CMI (3D Secure)",
                              paidAt: "20/09/2026 14:00",
                              status: "paid"
                            });
                          }}
                          className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-brand-600 hover:bg-slate-50 transition"
                        >
                          <Icon n="file-text" size={11}/>Facture
                        </button>
                        <button onClick={()=>nav({name:"space",params:{id:s.id}})} className="text-slate-300 transition hover:text-brand-600"><Icon n="chevron-right" size={17}/></button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
          {tab==="ia"&&(
            <div>
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4">
                <Icon n="sparkles" size={18} className="mt-0.5 shrink-0 text-brand-600"/>
                <p className="text-sm text-brand-900">Suggestions générées à partir de vos favoris, de vos réservations passées et de vos préférences. Elles s'affinent à chaque interaction.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                {recommendations.map(({s,score,reason},i)=>(
                  <article key={s.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-lift" data-reveal style={{transitionDelay:`${i*80}ms`}}>
                    <div className="relative h-32 overflow-hidden">
                      <img src={U(s.imgs[0],500)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/>
                      <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">Match {score}%</span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div><h3 className="font-display text-sm font-bold">{s.name}</h3><p className="text-xs text-slate-400">{s.city} · {EUR.format(s.price)}/{s.unit}</p></div>
                        <Ring v={score}/>
                      </div>
                      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-slate-500"><Icon n="sparkles" size={11} className="mt-0.5 shrink-0 text-brand-500"/>{reason}</p>
                      <button onClick={()=>nav({name:"space",params:{id:s.id}})} className="mt-3 w-full rounded-full bg-navy py-2 text-xs font-bold text-white transition hover:bg-brand-700">Découvrir</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
          {tab==="favoris"&&(
            favs.size===0?<p className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">Aucun favori pour le moment — cliquez sur le ♥ d'un espace.</p>:
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {spaces.filter(s=>favs.has(s.id)).map(s=><SpaceCard key={s.id} s={s} nav={nav} favs={favs} toggleFav={toggleFav}/>)}
            </div>
          )}
          {tab==="prefs"&&(
            <div className="max-w-xl space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <h2 className="font-display font-bold">Notifications</h2>
                {[["mail","Récapitulatifs par e-mail"],["push","Alertes de disponibilité en temps réel"],["news","Newsletter mensuelle & bons plans"]].map(([k,l])=>(
                  <div key={k} className="mt-4 flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <p className="text-sm text-slate-600">{l}</p>
                    <Toggle on={prefs[k]} onClick={()=>setPrefs({...prefs,[k]:!prefs[k]})}/>
                  </div>
                ))}
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <h2 className="font-display font-bold">Préférences de recherche</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Ville par défaut">
                    <select value={prefs.city} onChange={e=>setPrefs({...prefs,city:e.target.value})} className={inp}>{CITIES.map(c=><option key={c}>{c}</option>)}</select>
                  </Field>
                  <Field label="Type favori">
                    <select value={prefs.type} onChange={e=>setPrefs({...prefs,type:e.target.value})} className={inp}>{TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select>
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
              <Icon n="plus-circle" size={20}/>
            </span>
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Créer un nouvel espace</h2>
              <p className="text-xs text-slate-500">Ajoutez un espace de coworking au catalogue Spotwork Maroc</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <Icon n="x" size={18}/>
          </button>
        </div>

        {err && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
            <Icon n="alert-circle" size={15}/>{err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom de l'espace *">
              <input value={name} onChange={e=>{setName(e.target.value);setErr("");}} placeholder="Ex: Loft Tech Guéliz" className={inp} required/>
            </Field>
            <Field label="Ville au Maroc *">
              <select value={city} onChange={e=>setCity(e.target.value)} className={inp}>
                {CITIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quartier / Adresse">
              <input value={district} onChange={e=>setDistrict(e.target.value)} placeholder="Ex: Maarif · Bd Zerktouni" className={inp}/>
            </Field>
            <Field label="Type d'espace">
              <select value={type} onChange={e=>setType(e.target.value)} className={inp}>
                {TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tarif par heure (DH) *">
              <div className="relative">
                <input type="number" min="10" step="5" value={price} onChange={e=>setPrice(e.target.value)} className={`${inp} pr-12 font-bold`} required/>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">DH/h</span>
              </div>
            </Field>
            <Field label="Capacité (personnes)">
              <input type="number" min="1" value={cap} onChange={e=>setCap(e.target.value)} className={inp}/>
            </Field>
            <Field label="Surface estimée">
              <input value={surface} onChange={e=>setSurface(e.target.value)} placeholder="Ex: 85 m²" className={inp}/>
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
                  <img src={U(IMG[k], 200)} alt="" className="h-full w-full object-cover"/>
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
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-brand-500"/>
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
                      {checked && <Icon n="check" size={11}/>}
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
              onChange={e=>setDesc(e.target.value)}
              placeholder="Décrivez l'espace, l'ambiance, la connexion fibre, les horaires et les services offerts..."
              className={inp}/>
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
              <Icon n="check" size={14}/>Publier l'espace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ================= MODAL MODIFICATION DU TARIF & ESPACE ================= */
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <Icon n="pencil" size={18}/>
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Modifier le tarif & l'espace</h2>
              <p className="text-xs text-slate-500">{space.city} · {space.district}</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <Icon n="x" size={18}/>
          </button>
        </div>

        {err && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 border border-rose-200">
            <Icon n="alert-circle" size={14}/>{err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-mist p-3">
            <img src={U(space.imgs[0], 120)} alt="" className="h-12 w-16 rounded-lg object-cover"/>
            <div>
              <p className="font-bold text-sm text-ink">{space.name}</p>
              <p className="text-xs text-slate-400">Tarif actuel : <b className="text-brand-600">{EUR.format(space.price)}</b>/{space.unit}</p>
            </div>
          </div>

          <Field label="Nom de l'espace">
            <input value={name} onChange={e=>setName(e.target.value)} className={inp}/>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Nouveau tarif horaire (DH) *">
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  step="5"
                  value={price}
                  onChange={e=>setPrice(e.target.value)}
                  className={`${inp} pr-12 font-bold text-brand-700 text-base`}
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">DH/h</span>
              </div>
            </Field>
            <Field label="Capacité d'accueil">
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={cap}
                  onChange={e=>setCap(e.target.value)}
                  className={inp}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">pers.</span>
              </div>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              rows={3}
              value={desc}
              onChange={e=>setDesc(e.target.value)}
              className={inp}
            />
          </Field>

          <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
              Annuler
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition">
              <Icon n="check" size={14}/>Enregistrer le nouveau tarif
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ================= DASHBOARD GESTIONNAIRE & ADMIN ================= */
const AdminDash=({
  nav,
  toast,
  currentUser,
  onSelectUser,
  spaces = SPACES,
  onUpdateSpace,
  onCreateSpace,
  onDeleteSpace,
  bookings = INITIAL_MANAGER_BOOKINGS,
  onUpdateBookingStatus
})=>{
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState("30j");
  const [cityFilter, setCityFilter] = useState("");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [paymentsStatus, setPaymentsStatus] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [txns, setTxns] = useState(INITIAL_TRANSACTIONS);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);

  useEffect(() => {
    SpotworkAPI.getPayments().then(res => {
      if (res && res.transactions && res.transactions.length > 0) {
        setTxns(res.transactions);
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

  const kpis=[
    {l:"Revenus du mois",v:"231 000 DH",d:"+12,4 %",up:true,i:"trending-up",spark:[8,10,9,13,12,15,17,16,19]},
    {l:"Taux d'occupation",v:"78 %",d:"+3,1 pts",up:true,i:"activity",spark:[60,64,61,70,72,74,78]},
    {l:"Demandes en attente",v:String(pendingBookings.length),d:pendingBookings.length > 0 ? "À traiter" : "À jour",up:pendingBookings.length === 0,i:"clock",spark:[2,4,3,5,6,4,pendingBookings.length]},
    {l:"Total espaces actifs",v:String(spaces.length),d:"6 villes au Maroc",up:true,i:"layout-grid",spark:[6,7,8,9,9,10,spaces.length]}
  ];

  const donutItems=[
    {label:"Open space",v:38,c:"#1F56D6"},{label:"Bureaux privés",v:27,c:"#0D2C5A"},
    {label:"Salles de réunion",v:21,c:"#5B90F7"},{label:"Studios & cabines",v:14,c:"#BCD2FF"}
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
                <Icon n="plus" size={15}/>Créer un espace
              </button>
              <button onClick={()=>toast("Rapport financier exporté en format CSV","download")} className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20">
                <Icon n="download" size={14}/>Exporter
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
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  tab === t.id
                    ? "bg-white text-navy shadow-sm"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}>
                <Icon n={t.icon} size={15}/>
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
              {kpis.map((k,i)=>(
                <div key={k.l} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k.l}</p>
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon n={k.i} size={15}/></span>
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <div>
                      <p className="font-display text-2xl font-bold">{k.v}</p>
                      <p className={`mt-1 flex items-center gap-1 text-xs font-bold ${k.up?"text-emerald-600":"text-rose-500"}`}>
                        <Icon n={k.up?"trending-up":"trending-down"} size={13}/>{k.d}
                      </p>
                    </div>
                    <Spark data={k.spark} color={k.up?"#1F56D6":"#F43F5E"}/>
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
                <AreaChart data={REVENUE} labels={MONTHS}/>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <h2 className="mb-4 font-display font-bold">Répartition par type</h2>
                <Donut items={donutItems} center={["342","réservations"]}/>
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
                            <Icon n="check" size={13}/>Accepter
                          </button>
                          <button
                            onClick={() => onUpdateBookingStatus(b.id, "cancelled")}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-300 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition">
                            <Icon n="x" size={13}/>Refuser
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
                    <span className="flex items-center gap-2"><Icon n="plus-circle" size={16} className="text-emerald-600"/>Créer un nouvel espace</span>
                    <Icon n="chevron-right" size={14} className="text-slate-400"/>
                  </button>
                  <button
                    onClick={() => setTab("spaces")}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700 hover:border-brand-500 hover:bg-brand-50/30 transition">
                    <span className="flex items-center gap-2"><Icon n="dollar-sign" size={16} className="text-brand-600"/>Modifier les prix & capacités</span>
                    <Icon n="chevron-right" size={14} className="text-slate-400"/>
                  </button>
                  <button
                    onClick={() => setTab("bookings")}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700 hover:border-brand-500 hover:bg-brand-50/30 transition">
                    <span className="flex items-center gap-2"><Icon n="inbox" size={16} className="text-amber-600"/>Consulter toutes les demandes ({bookings.length})</span>
                    <Icon n="chevron-right" size={14} className="text-slate-400"/>
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
                <Icon n="plus" size={15}/>Créer un espace
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
                      const occVal = OCC[s.id] || 65;
                      const st = occVal > 90 ? ["Complet", "bg-rose-50 text-rose-500 border-rose-200"] : occVal < 50 ? ["À promouvoir", "bg-amber-50 text-amber-600 border-amber-200"] : ["Actif", "bg-emerald-50 text-emerald-600 border-emerald-200"];
                      return (
                        <tr key={s.id} className="border-t border-slate-100 transition hover:bg-mist/40">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={U(s.imgs[0], 100)} alt="" className="h-10 w-14 rounded-xl object-cover shadow-sm"/>
                              <div>
                                <p className="font-bold text-ink">{s.name}</p>
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                  <Icon n="map-pin" size={11}/>{s.city} · {s.district}
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
                                <div className={`h-full rounded-full ${occVal > 85 ? "bg-brand-600" : "bg-brand-400"}`} style={{ width: `${occVal}%` }}/>
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
                                title="Modifier le prix et les caractéristiques"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 transition">
                                <Icon n="pencil" size={13}/><span>Modifier prix</span>
                              </button>
                              <button
                                onClick={() => nav({ name: "space", params: { id: s.id } })}
                                title="Voir la fiche publique"
                                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-brand-600 transition">
                                <Icon n="eye" size={14}/>
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Confirmez-vous la suppression de l'espace « ${s.name} » ?`)) {
                                    onDeleteSpace(s.id);
                                  }
                                }}
                                title="Supprimer cet espace"
                                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition">
                                <Icon n="trash-2" size={14}/>
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
                  { id: "cancelled", label: "Annulées / Refusées", count: bookings.filter(b=>b.status==='cancelled').length, cls: "text-rose-700" }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setBookingFilter(f.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      bookingFilter === f.id
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
                  <Icon n="inbox" size={24}/>
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
                      className={`relative flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-card transition-all hover:shadow-lift ${
                        isPending ? "border-amber-300 ring-1 ring-amber-300/40 bg-gradient-to-r from-amber-50/30 to-white" : "border-slate-200"
                      }`}>
                      <div className="flex items-start gap-3.5 min-w-[240px]">
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-bold text-white text-xs shadow-sm ${
                          isPending ? "bg-amber-500" : isConfirmed ? "bg-emerald-600" : "bg-slate-400"
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
                              <Icon n="phone" size={11}/>{b.clientPhone}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4 min-w-[220px]">
                        <p className="font-bold text-sm text-ink">{b.spaceName}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Icon n="map-pin" size={11}/>{b.city}
                        </p>
                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 font-medium">
                          <Icon n="calendar" size={12} className="text-brand-600"/>
                          {b.date} · {b.timeSlot}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                        <div className="text-left md:text-right">
                          <p className="font-display text-base font-bold text-ink">{EUR.format(b.totalPrice)}</p>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            isPending ? "bg-amber-100 text-amber-800" : isConfirmed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}>
                            <Icon n={isPending ? "clock" : isConfirmed ? "check" : "x"} size={11}/>
                            {isPending ? "En attente" : isConfirmed ? "Confirmée" : "Annulée"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => onUpdateBookingStatus(b.id, "confirmed")}
                                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700 transition">
                                <Icon n="check" size={14}/>Accepter
                              </button>
                              <button
                                onClick={() => onUpdateBookingStatus(b.id, "cancelled")}
                                className="inline-flex items-center gap-1 rounded-full border border-rose-300 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition">
                                <Icon n="x" size={14}/>Refuser
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
                              <Icon n="x-circle" size={13}/>Annuler
                            </button>
                          )}
                          {isCancelled && (
                            <button
                              onClick={() => onUpdateBookingStatus(b.id, "confirmed")}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-emerald-300 hover:text-emerald-700 transition">
                              <Icon n="refresh-cw" size={13}/>Rétablir
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
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><Icon n="trending-up" size={15}/></span>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-ink">
                  {txns.filter(t => t.status === "paid").reduce((acc, t) => acc + (t.grossAmount || 0), 0).toLocaleString('fr-FR')} DH
                </p>
                <p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <Icon n="check-circle-2" size={12}/>Encaissements validés CMI Maroc
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Commissions Spotwork (8%)</p>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon n="percent" size={15}/></span>
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
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50 text-purple-600"><Icon n="wallet" size={15}/></span>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-purple-700">
                  {txns.filter(t => t.status === "paid").reduce((acc, t) => acc + (t.netAmount || 0), 0).toFixed(2)} DH
                </p>
                <p className="mt-1 text-xs text-purple-600 font-semibold flex items-center gap-1">
                  <Icon n="arrow-up-right" size={12}/>Virements bancaires aux gestionnaires
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Succès Règlements CMI</p>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600"><Icon n="shield-check" size={15}/></span>
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
                <Icon n="file-spreadsheet" size={13}/>Exporter Journal Comptable
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
                            <Icon n="credit-card" size={12} className="text-brand-600"/>
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
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            txn.status === "paid" ? "bg-emerald-100 text-emerald-800" : txn.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                          }`}>
                            {txn.status === "paid" ? "✓ Payé" : txn.status === "pending" ? "En attente" : "Annulé"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedInvoice(txn)}
                            className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-100 transition shadow-2xs"
                          >
                            <Icon n="file-text" size={12}/>Facture
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
                        className={`mt-4 w-full rounded-xl py-2 text-xs font-bold transition ${
                          isCurrent
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
            <Icon n="shield-check" size={13} className="text-brand-600"/>Portail d'authentification PropTech Maroc
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
              <Icon n="zap" size={17} className="text-amber-500"/>
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
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Actif
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
                      <Icon n="map-pin" size={11}/>{acc.city}, Maroc
                    </p>
                  </div>

                  <button
                    onClick={() => handlePresetLogin(acc)}
                    className={`mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold transition shadow-sm ${
                      isActive
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        : acc.role === "admin"
                        ? "bg-navy text-white hover:bg-slate-800"
                        : acc.role === "manager"
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-brand-600 text-white hover:bg-brand-700"
                    }`}>
                    <Icon n={acc.role === "client" ? "user-check" : acc.role === "manager" ? "bar-chart-2" : "shield"} size={14}/>
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
                    className={`rounded-xl py-2 text-xs font-bold border transition ${
                      selectedRole === r.id
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
                <Icon n="log-in" size={15}/>
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
const Footer=({nav,toast})=>{
  const [email,setEmail]=useState("");const [err,setErr]=useState("");
  const subscribe=e=>{
    e.preventDefault();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setErr("Adresse e-mail invalide");return;}
    setErr("");setEmail("");toast("Inscription confirmée. Bienvenue sur Spotwork Maroc !","mail");
  };
  const cols=[
    ["Plateforme",[["Explorer les espaces",()=>nav({name:"explore"})],["Villes marocaines",()=>nav({name:"explore"})],["Comptes de test & Login",()=>nav({name:"login"})],["Tarifs & abonnements (DH)",()=>toast("Tarifs en Dirhams (DH)","info")]]],
    ["Gestionnaires",[["Dashboard gestionnaire",()=>nav({name:"admin"})],["Espaces à Casablanca",()=>nav({name:"explore",params:{city:"Casablanca"}})],["Espaces à Rabat",()=>nav({name:"explore",params:{city:"Rabat"}})],["Espaces à Marrakech",()=>nav({name:"explore",params:{city:"Marrakech"}})]]],
    ["Support",[["Centre d'aide",()=>toast("Centre d'aide Spotwork Maroc","info")],["API & Documentation",()=>toast("API Express / Supabase active","info")],["Contact PropTech Maroc",()=>toast("support@spotwork.ma","mail")]]]
  ];
  return (
    <footer className="bg-ink text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white"><Icon n="map-pin" size={18}/></span>
              <div>
                <span className="font-display text-lg font-bold text-white block leading-tight">Spotwork</span>
                <span className="text-[10px] text-brand-400 font-semibold tracking-wider uppercase">PropTech Maroc</span>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">La plateforme de réservation d'espaces de coworking nouvelle génération au Maroc. Casablanca, Rabat, Marrakech, Tanger, Agadir, Fès.</p>
            <form onSubmit={subscribe} className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Newsletter mensuelle</p>
              <div className="mt-2.5 flex gap-2">
                <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.ma"
                  className={`flex-1 rounded-xl border bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-brand-400 ${err?"border-rose-400":"border-white/15"}`}/>
                <button className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-500"><Icon n="send" size={15}/></button>
              </div>
              {err&&<p className="mt-1.5 text-xs text-rose-400">{err}</p>}
            </form>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {cols.map(([title,links])=>(
              <div key={title}>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{title}</p>
                <ul className="mt-4 space-y-2.5">
                  {links.map(([l,f])=>(<li key={l}><button onClick={f} className="text-sm text-slate-300 transition hover:text-white">{l}</button></li>))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500">
          <p>© 2026 Spotwork PropTech Maroc — Développé avec Node.js, Express, Supabase & Claude AI.</p>
          <div className="flex items-center gap-4">
            <button onClick={()=>nav({name:"home"})} className="transition hover:text-white" title="Accueil"><Icon n="globe" size={15}/></button>
            <button onClick={()=>nav({name:"login"})} className="transition hover:text-white" title="Connexion"><Icon n="user" size={15}/></button>
            <button onClick={()=>toast("support@spotwork.ma","mail")} className="transition hover:text-white" title="Support"><Icon n="mail" size={15}/></button>
          </div>
        </div>
      </div>
    </footer>
  );
};

/* ================= APP ================= */
const App=()=>{
  const [ready,setReady]=useState(false);
  const [view,setView]=useState({name:"home"});
  const [cart,setCart]=useState([]);
  const [favs,setFavs]=useState(new Set([2,7]));
  const [spacesList,setSpacesList]=useState(SPACES);
  const [allBookings,setAllBookings]=useState(INITIAL_MANAGER_BOOKINGS);
  const [userBookings,setUserBookings]=useState(INIT_BOOKINGS);
  const [toasts,setToasts]=useState([]);
  const [menuOpen,setMenuOpen]=useState(false);

  // Authenticated user state: defaults to Youssef Amrani on first visit, or null if logged out
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      if (localStorage.getItem("spotwork_logged_out") === "true") return null;
      const saved = localStorage.getItem("spotwork_user");
      if (saved) return JSON.parse(saved);
    } catch {}
    return PRESET_ACCOUNTS[0];
  });

  const onLogin = (user) => {
    setCurrentUser(user);
    try {
      localStorage.removeItem("spotwork_logged_out");
      localStorage.setItem("spotwork_user", JSON.stringify(user));
    } catch {}
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
    } catch {}
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
    setSpacesList(prev => prev.map(s => {
      if (s.id === spaceId) {
        return {
          ...s,
          ...updatedFields,
          price: updatedFields.price !== undefined ? Number(updatedFields.price) : s.price,
          cap: updatedFields.capacity !== undefined ? Number(updatedFields.capacity) : s.cap
        };
      }
      return s;
    }));
    SpotworkAPI.updateSpace(spaceId, updatedFields);
    toast(`Tarif et espace mis à jour (${updatedFields.price || ""} DH/h) !`, "check");
  };

  const handleDeleteSpace = (spaceId) => {
    const deleted = spacesList.find(s => s.id === spaceId);
    setSpacesList(prev => prev.filter(s => s.id !== spaceId));
    SpotworkAPI.deleteSpace(spaceId);
    toast(`Espace « ${deleted?.name || ""} » supprimé du catalogue.`, "trash");
  };

  const handleUpdateBookingStatus = (bookingId, newStatus) => {
    setAllBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
    const statusFr = newStatus === 'confirmed' ? "Confirmée" : newStatus === 'cancelled' ? "Annulée" : "En attente";
    setUserBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: statusFr } : b));
    SpotworkAPI.updateBookingStatus(bookingId, newStatus);
    if (newStatus === 'confirmed') {
      toast("Demande de réservation acceptée et confirmée !", "check-circle");
    } else if (newStatus === 'cancelled') {
      toast("Demande de réservation refusée.", "x-circle");
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
    if (b.meta && b.meta.includes(' – ')) {
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

    const newBookingId = "bk-" + Date.now();
    const totalPrice = b.total || (bookedSpace ? bookedSpace.price * 4 : 180);

    // Synchronisation en temps réel avec l'API backend et PostgreSQL Supabase
    SpotworkAPI.createBooking({
      space_id: spaceUuid,
      booking_date: b.date || new Date().toISOString().slice(0, 10),
      start_time: startTime,
      end_time: endTime,
      total_price: totalPrice
    }).then(res => {
      if (res && res.status === "success") {
        toast("Réservation synchronisée dans la base PostgreSQL Supabase !", "check-circle");
      }
    }).catch(() => {});

    setUserBookings(p => [{
      id: newBookingId,
      spaceId: spaceId,
      date: b.date,
      meta: b.meta,
      status: "Confirmée",
      totalPrice: totalPrice,
      invoiceRef: `FACT-2026-${String(newBookingId).slice(-6)}`
    }, ...p]);

    setAllBookings(p => [{
      id: newBookingId,
      clientName: currentUser?.name || b.name || "Client PropTech",
      clientEmail: currentUser?.email || b.email || "client@proptech.ma",
      clientPhone: currentUser?.phone || "+212 6 61 23 45 67",
      clientInitials: currentUser?.initials || "CP",
      spaceId: spaceId,
      spaceName: spaceName,
      city: city,
      date: b.date,
      timeSlot: b.meta,
      hours: 4,
      totalPrice: totalPrice,
      status: "confirmed",
      createdAt: "À l'instant"
    }, ...p]);

    setCart([]);
  };

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
              meta: `${b.start_time.slice(0, 5)} – ${b.end_time.slice(0, 5)}`,
              status: b.status === 'confirmed' ? "Confirmée" : b.status === 'cancelled' ? "Annulée" : "En attente",
              totalPrice: b.total_price,
              invoiceRef: `FACT-2026-${String(b.id).slice(-6)}`
            };
          });
          setUserBookings(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const fresh = mapped.filter(m => !existingIds.has(m.id));
            return [...fresh, ...prev];
          });
        }
      }).catch(() => {});
    }
  }, [currentUser]);

  useEffect(()=>{
    let tries=0;
    const t=setInterval(()=>{
      if(window.lucide||tries>25){setReady(true);clearInterval(t);}
      tries++;
    },60);
    return()=>clearInterval(t);
  },[]);
  useEffect(()=>{
    const id=requestAnimationFrame(()=>{
      document.querySelectorAll("[data-reveal]:not(.is-in)").forEach(el=>{
        const io=new IntersectionObserver(es=>es.forEach(e=>{
          if(e.isIntersecting){e.target.classList.add("is-in");io.unobserve(e.target);}
        }),{threshold:.1});
        io.observe(el);
      });
    });
    return()=>cancelAnimationFrame(id);
  },[view,ready]);

  const nav=v=>{setView(v);setMenuOpen(false);window.scrollTo({top:0});};
  const toast=(msg,icon="check")=>{
    const id=Date.now()+Math.random();
    setToasts(t=>[...t,{id,msg,icon}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3200);
  };
  const toggleFav=id=>{
    setFavs(prev=>{
      const n=new Set(prev);
      if(n.has(id)){n.delete(id);toast("Retiré des favoris","heart");}
      else{n.add(id);toast("Ajouté à vos favoris","heart");}
      return n;
    });
  };
  const reserve=item=>{setCart(c=>[...c,item]);nav({name:"checkout"});};

  if(!ready)return (
    <div className="grid min-h-screen place-items-center bg-mist">
      <div className="text-center">
        <span className="mx-auto grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-brand-600 text-white"><Icon n="map-pin" size={22}/></span>
        <p className="mt-3 font-display font-bold">Spotwork PropTech Maroc</p>
      </div>
    </div>
  );

  const isManagerOrAdmin = currentUser && (currentUser.role === 'manager' || currentUser.role === 'admin');

  return (
    <div className="font-body">
      <Navbar view={view} nav={nav} cartCount={cart.length} menuOpen={menuOpen} setMenuOpen={setMenuOpen} currentUser={currentUser} onSelectUser={onLogin} onLogout={onLogout} toast={toast}/>
      {view.name==="home"&&<Home nav={nav} favs={favs} toggleFav={toggleFav} spaces={spacesList} bookings={allBookings}/>}
      {view.name==="explore"&&<Explore params={view.params} nav={nav} favs={favs} toggleFav={toggleFav} spaces={spacesList} bookings={allBookings}/>}
      {view.name==="space"&&<SpaceDetail id={view.params.id} nav={nav} favs={favs} toggleFav={toggleFav} reserve={reserve} spaces={spacesList} bookings={allBookings}/>}
      {view.name==="checkout"&&<Checkout cart={cart} setCart={setCart} nav={nav} onDone={onDone} toast={toast} currentUser={currentUser}/>}
      {view.name==="user"&&<UserDash initTab={view.params?.tab} bookings={userBookings} setBookings={setUserBookings} favs={favs} toggleFav={toggleFav} nav={nav} toast={toast} currentUser={currentUser} spaces={spacesList}/>}
      {view.name==="admin" && (
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
      {view.name==="login"&&<LoginPage currentUser={currentUser} onLogin={onLogin} nav={nav} toast={toast}/>}
      <Footer nav={nav} toast={toast}/>
      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
        {toasts.map(t=>(
          <div key={t.id} className="toast pointer-events-auto flex items-center gap-2.5 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lift">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600"><Icon n={t.icon} size={13}/></span>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);