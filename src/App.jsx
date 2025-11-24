import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, Monitor, LayoutDashboard, Plus, Search, 
  AlertCircle, CreditCard, Trash2, Edit, Save, X, 
  Phone, RefreshCw, Send, FileText, Database, 
  Settings, Copy, Check, MessageSquare, RotateCcw,
  Megaphone, Archive, ChevronDown, ChevronUp, Filter,
  LogOut, Menu, User, TrendingUp, TrendingDown, Activity,
  AlertTriangle, List, Music, Paperclip, Clock, Image as ImageIcon,
  Camera, Lock, Mail, PlayCircle, Layers, LogIn
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  updateEmail,
  updatePassword
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query,
  writeBatch,
  getDocs,
  setDoc,
  getDoc,
  where
} from 'firebase/firestore';

// --- 1. INICIALIZACIÓN SEGURA ---
const firebaseConfig = {
  apiKey: "AIzaSyAuIQ04z7xXcxwGmEBqLoPWgxIiAjX0NNA",
  authDomain: "streamplay-manager-9dfd9.firebaseapp.com",
  projectId: "streamplay-manager-9dfd9",
  storageBucket: "streamplay-manager-9dfd9.firebasestorage.app",
  messagingSenderId: "324817329926",
  appId: "1:324817329926:web:20d5d6fdd2fe5576508887",
  measurementId: "G-EXTD01Z6BB"
};

// 1. Arranca la App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "streamplay-manager-9dfd9";

// --- 2. CONSTANTES & UTILS ---
const DEFAULT_SERVICES = [
  "NETFLIX (VE)", "NETFLIX (CO)", "NETFLIX (EXT)", "NETFLIX (ALQ)",
  "DISNEY+ PREM", "DISNEY+ EST", "HBO MAX", "PRIME VIDEO",
  "SPOTIFY (CO)", "SPOTIFY (AR)", "SPOTIFY (VE)", 
  "APPLE TV", "CANVA PRO", "CRUNCHYROLL", "FLUJO TV", 
  "PARAMOUNT (AR)", "VIX+"
];

const PERIODS = [
  { label: "1 Mes", value: 1 },
  { label: "2 Meses", value: 2 },
  { label: "3 Meses", value: 3 },
  { label: "6 Meses", value: 6 },
  { label: "12 Meses", value: 12 }
];

const PROVIDERS = [
  "Propia", "Gudfy P2P", "WOWstore", "Dfgames", "Héctor Vásquez", 
  "StreamingFlash", "Ever Martínez", "Miguel Netflix", "Ayalanet"
];

const PAYMENT_METHODS = [
  "Binance", "Zinli", "Wally", "PayPal (zinli)", "PayPal (wally)", "BBVA", "Efectivo", "Pago Móvil"
];

const STATUS_OPTIONS = [
  { id: "ACTIVA", color: "bg-green-100 text-green-800" },
  { id: "VENCIDA", color: "bg-red-100 text-red-800" },
  { id: "POR VENCER", color: "bg-orange-100 text-orange-800" },
  { id: "SALDO CARGADO", color: "bg-blue-100 text-blue-800" },
  { id: "NO RENOVARÉ", color: "bg-gray-100 text-gray-800" },
  { id: "PAUSA", color: "bg-purple-100 text-purple-800" },
  { id: "SUSPENDIDA", color: "bg-rose-100 text-rose-800" }
];

const DEFAULTS = {
  welcome: `Hola {nombre}! 👋
Aquí tienes los datos de acceso para tu cuenta de {servicio}:

👤 Usuario: {usuario}
🔑 Clave: {clave}
👤 Perfil: {perfil} {perfil_nombre}
📌 PIN: {pin}
📅 Vence: {vencimiento}

¡Que lo disfrutes! 🍿`,
  reminder3: `Hola {nombre}! 👋
Te recordamos que tu suscripción de {servicio} vence en 3 días ({vencimiento}).

💰 Monto: {precio}

Atentos para renovar. ¡Gracias!`,
  reminderToday: `Hola {nombre}! 👋
Tu suscripción de {servicio} VENCE HOY {vencimiento}.

💰 Monto: {precio}
Por favor enviar comprobante para evitar corte.`,
  expired: `Hola {nombre}.
Tu suscripción de {servicio} ha finalizado.
Esperamos tu pago para reactivar. Saludos.`
};

const formatDateDDMMYYYY = (dateString) => {
  if (!dateString) return "Sin fecha";
  try {
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  } catch (e) { return dateString; }
};

const getDaysRemaining = (expiryDate) => {
  if (!expiryDate) return null;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0); 
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) { return 0; }
};

const getExpiryColorClass = (days, status) => {
  if (status === 'VENCIDA' || status === 'SUSPENDIDA') return 'bg-red-50 border-red-200 text-red-700';
  if (days === null) return 'bg-gray-50';
  if (days < 0) return 'bg-red-100 text-red-800 font-bold';
  if (days === 0) return 'bg-red-500 text-white font-bold animate-pulse'; 
  if (days === 1) return 'bg-orange-500 text-white font-bold';
  if (days === 2) return 'bg-orange-300 text-orange-900 font-bold';
  if (days === 3) return 'bg-yellow-300 text-yellow-900 font-bold';
  if (days === 4) return 'bg-lime-300 text-lime-900 font-bold';
  return 'bg-green-100 text-green-800'; 
};

const fillTemplate = (template, data) => {
  if (!data) return "";
  let text = template || "";
  
  const cleanService = (data.service || "").replace(/\s*\(.*?\)\s*/g, '').trim();
  const isSpotify = (data.service || "").toUpperCase().includes("SPOTIFY");

  text = text.replace(/{nombre}/g, data.name || "");
  text = text.replace(/{servicio}/g, cleanService);
  
  if (isSpotify) {
    text = text.replace(/{usuario}/g, data.clientEmail || data.emailAssigned || "");
    text = text.replace(/{clave}/g, data.clientPassword || data.passwordAssigned || "");
  } else {
    text = text.replace(/{usuario}/g, data.emailAssigned || "");
    text = text.replace(/{clave}/g, data.passwordAssigned || "");
  }

  text = text.replace(/{perfil}/g, data.profileAssigned || "");
  text = text.replace(/{perfil_nombre}/g, data.profileName ? `(${data.profileName})` : "");
  text = text.replace(/{pin}/g, data.pinAssigned || "");
  text = text.replace(/{vencimiento}/g, formatDateDDMMYYYY(data.expiryDate) || "");
  text = text.replace(/{precio}/g, data.price ? `$${data.price}` : "");
  return text;
};

const copySafe = (text, onSuccess) => {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => onSuccess && onSuccess())
      .catch(() => fallbackCopy(text, onSuccess));
  } else {
    fallbackCopy(text, onSuccess);
  }
};

const fallbackCopy = (text, onSuccess) => {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful && onSuccess) onSuccess();
  } catch (err) {
    console.error("Fallback copy failed", err);
  }
};

// --- 3. COMPONENTES VISUALES ---

const Card = ({ children, className = "" }) => <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>{children}</div>;

const Badge = ({ status }) => {
  const style = STATUS_OPTIONS.find(s => s.id === status)?.color || "bg-gray-100 text-gray-800";
  return <span className={`px-2 py-1 rounded-full text-xs font-bold ${style}`}>{status}</span>;
};

const BrandLogo = ({ src, className = "w-10 h-10" }) => {
  if (src) {
    return (
      <div className={`${className} rounded-lg overflow-hidden shadow-sm border border-slate-100 bg-white flex items-center justify-center`}>
        <img src={src} alt="Logo" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${className} bg-gradient-to-br from-blue-600 to-rose-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg`}>
      <PlayCircle className="w-1/2 h-1/2" />
    </div>
  );
};

// --- 4. LOGIN VIEW (NUEVO) ---
const LoginView = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // El estado del usuario cambiará automáticamente y StreamPlayManager renderizará el dashboard
    } catch (err) {
      console.error(err);
      let msg = "Error de autenticación";
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') msg = "Correo o contraseña incorrectos.";
      if (err.code === 'auth/email-already-in-use') msg = "Este correo ya está registrado.";
      if (err.code === 'auth/weak-password') msg = "La contraseña debe tener al menos 6 caracteres.";
      if (err.code === 'auth/too-many-requests') msg = "Demasiados intentos. Espera un momento.";
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <BrandLogo className="w-16 h-16 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800">StreamPlay Manager</h1>
          <p className="text-slate-500">{isRegistering ? "Crea tu cuenta de administrador" : "Inicia sesión para gestionar"}</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="email" 
                required
                className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="password" 
                required
                minLength={6}
                className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform active:scale-95"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            {isRegistering ? "Registrarse" : "Entrar"}
          </button>
        </form>

        <div className="mt-6 text-center pt-4 border-t border-slate-100">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {isRegistering ? "¿Ya tienes cuenta? Inicia Sesión" : "¿No tienes cuenta? Regístrate gratis"}
          </button>
        </div>
      </Card>
    </div>
  );
};


// --- 5. SUB-COMPONENTES FUNCIONALES (Sin cambios mayores) ---

const ActivityLog = ({ activityLog, onAddNote }) => {
  const [newNote, setNewNote] = useState("");
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5242880) { alert("⚠️ Archivo > 5MB."); return; }
      const reader = new FileReader();
      reader.onload = (e) => setAttachment(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newNote.trim() && !attachment) return;
    onAddNote({ text: newNote, attachment: attachment, date: new Date().toISOString() });
    setNewNote("");
    setAttachment(null);
  };

  const sortedLog = (activityLog || []).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
      <div className="flex-1 p-3 overflow-y-auto space-y-3 max-h-60">
        {sortedLog.length === 0 && <p className="text-center text-slate-400 text-xs py-4">No hay actividad registrada</p>}
        {sortedLog.map((log, idx) => (
          <div key={idx} className="flex flex-col bg-white p-3 rounded-lg shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(log.date).toLocaleString()}</span>
            </div>
            {log.text && <p className="text-sm text-slate-700 whitespace-pre-wrap">{log.text}</p>}
            {log.attachment && (<div className="mt-2"><img src={log.attachment} alt="Adjunto" className="max-h-32 rounded border border-slate-200 object-cover" /></div>)}
          </div>
        ))}
      </div>
      <div className="p-2 bg-white border-t border-slate-200 flex flex-col gap-2">
        {attachment && (
          <div className="flex items-center justify-between bg-blue-50 p-2 rounded text-xs text-blue-700">
            <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3"/> Adjunto</span>
            <button type="button" onClick={() => setAttachment(null)}><X className="w-3 h-3 hover:text-red-500"/></button>
          </div>
        )}
        <div className="flex gap-2">
          <input type="text" className="flex-1 p-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Escribir nota..." value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)} />
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Paperclip className="w-4 h-4" /></button>
          <button type="button" onClick={handleSubmit} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar", isDestructive = false }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-fadeIn">
        <h3 className={`text-lg font-bold mb-2 ${isDestructive ? 'text-red-600' : 'text-slate-800'}`}>{title}</h3>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium">{cancelText}</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-white rounded-lg font-medium ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const SummaryModal = ({ isOpen, onClose, accounts, clients, servicesList }) => {
  if (!isOpen) return null;
  const summary = useMemo(() => {
    const data = {};
    const activeServices = servicesList || DEFAULT_SERVICES;
    activeServices.forEach(svc => {
      const serviceAccounts = (accounts || []).filter(a => a && !a.deleted && a.service === svc && a.status === 'ACTIVA');
      if (serviceAccounts.length === 0) return;
      if (!data[svc]) data[svc] = { accounts: 0, totalSlots: 0, soldSlots: 0, cost: 0, revenue: 0 };
      serviceAccounts.forEach(acc => {
        data[svc].accounts += 1;
        data[svc].totalSlots += parseInt(acc?.totalProfiles || 0) || 0;
        data[svc].cost += parseFloat(acc?.cost || 0) || 0;
      });
      const serviceClients = (clients || []).filter(c => c && !c.deleted && c.service === svc && c.status === 'ACTIVA');
      data[svc].soldSlots = serviceClients.length;
      data[svc].revenue = serviceClients.reduce((acc, curr) => acc + (parseFloat(curr?.price || 0) || 0), 0);
    });
    return Object.entries(data).map(([service, stats]) => ({ service, ...stats }));
  }, [accounts, clients, servicesList]);

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Activity className="w-5 h-5 text-blue-600" /> Análisis</h3>
          <button onClick={onClose}><X className="text-slate-400 hover:text-red-500" /></button>
        </div>
        <div className="overflow-y-auto p-6"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs"><tr><th className="p-3 rounded-l-lg">Servicio</th><th className="p-3 text-center">Cuentas</th><th className="p-3 text-center">Perfiles</th><th className="p-3 text-center">Ocupación</th><th className="p-3 text-right">Costo</th><th className="p-3 text-right">Ingreso</th><th className="p-3 text-right rounded-r-lg">Ganancia</th></tr></thead><tbody className="divide-y divide-slate-100">{summary.map((item) => {const occupancy = item.totalSlots > 0 ? (item.soldSlots / item.totalSlots) * 100 : 0; const profit = item.revenue - item.cost; return (<tr key={item.service} className="hover:bg-slate-50"><td className="p-3 font-medium text-blue-600">{item.service}</td><td className="p-3 text-center">{item.accounts}</td><td className="p-3 text-center font-mono">{item.soldSlots} / {item.totalSlots}</td><td className="p-3 text-center"><div className="flex items-center justify-center gap-2"><div className="w-16 bg-slate-200 rounded-full h-2"><div className={`h-2 rounded-full ${occupancy >= 100 ? 'bg-red-500' : 'bg-green-500'}`} style={{width: `${Math.min(occupancy, 100)}%`}}></div></div><span className="text-xs">{Math.round(occupancy)}%</span></div></td><td className="p-3 text-right text-red-500">-${item.cost.toFixed(2)}</td><td className="p-3 text-right text-green-600">+${item.revenue.toFixed(2)}</td><td className={`p-3 text-right font-bold ${profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>${profit.toFixed(2)}</td></tr>);})}{summary.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-slate-400">No hay datos.</td></tr>}</tbody></table></div></div>
        <div className="p-4 border-t bg-white rounded-b-2xl flex justify-end"><button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white rounded-lg">Cerrar</button></div>
      </div>
    </div>
  );
};

const AccountCard = ({ acc, clients, showDeleted, onEdit, onDelete, onRestore, onHardDelete, onStatusChange, onRenew }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!acc) return null;
  const days = getDaysRemaining(acc.expiryDate);
  const assignedClients = (clients || []).filter(c => c && !c.deleted && c.accountId === acc.id);
  const used = assignedClients.length;
  const total = parseInt(acc.totalProfiles || 0) || 1;
  const totalDisp = total - used;

  return (
    <Card className={`relative overflow-hidden group hover:shadow-lg transition-all ${acc.deleted ? 'opacity-70 grayscale' : ''}`}>
      <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
         <div className="flex flex-col truncate pr-2"><span className="text-xs font-bold text-blue-600">{acc.provider}</span><span className="font-bold text-lg truncate">{acc.service}</span></div>
         {!showDeleted && <select className={`text-xs font-bold px-2 py-1 rounded-full border-none outline-none cursor-pointer ${STATUS_OPTIONS.find(s=>s.id===acc.status)?.color || ''}`} value={acc.status} onChange={(e) => onStatusChange(acc.id, e.target.value)}>{STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}</select>}
      </div>
      <div className="p-4 space-y-3">
         <div className="flex items-center gap-2 text-sm"><Monitor className="w-4 h-4 text-slate-400" /><span className="font-mono font-bold truncate">{acc.email}</span></div>
         <div className="flex items-center gap-2 text-sm"><CreditCard className="w-4 h-4 text-slate-400" /><span>Costo: <b>${acc.cost}</b></span></div>
         <div className="space-y-1 pt-2"><div className="flex justify-between text-xs font-semibold text-slate-600"><span>Ocupación</span><span>{Math.max(0, totalDisp)} Disp</span></div><div className="w-full bg-slate-200 rounded-full h-2"><div className={`h-2 rounded-full ${totalDisp<=0?'bg-red-500':'bg-blue-500'}`} style={{width: `${Math.min((used/total)*100, 100)}%`}}></div></div></div>
         <button onClick={() => setIsExpanded(!isExpanded)} className="w-full text-xs text-center text-blue-600 hover:bg-blue-50 py-1 rounded border border-blue-100 flex items-center justify-center gap-1">{isExpanded ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>} {isExpanded ? 'Ocultar' : `Ver ${used} Usuarios`}</button>
         {isExpanded && (<div className="bg-slate-50 p-2 rounded text-xs space-y-1 max-h-32 overflow-y-auto border">{assignedClients.length > 0 ? assignedClients.map(c => (<div key={c.id} className="flex justify-between border-b border-slate-200 pb-1 last:border-0"><span className="truncate w-24">{c.name}</span><span className="font-bold text-slate-500 flex gap-1">P{c.profileAssigned} {c.profileName && <span className="text-blue-600 font-normal">({c.profileName})</span>}</span></div>)) : <span className="text-slate-400 italic">Sin usuarios asignados</span>}</div>)}
         <div className={`p-2 rounded flex justify-between items-center ${getExpiryColorClass(days, acc.status)}`}><span className="text-sm font-bold">{days < 0 ? 'Vencida' : `${days} días`}</span>{!showDeleted && <button onClick={() => onRenew(acc)} className="p-1 hover:bg-white/20 rounded" title="Renovar"><RefreshCw className="w-4 h-4"/></button>}</div>
      </div>
      <div className="p-3 border-t flex justify-between">
         {showDeleted ? (<><button onClick={() => onRestore(acc.id)} className="text-green-600 text-xs font-bold flex gap-1"><RotateCcw className="w-4 h-4"/> Restaurar</button><button onClick={() => onHardDelete(acc.id)} className="text-red-600 text-xs font-bold flex gap-1"><Trash2 className="w-4 h-4"/> Eliminar</button></>) : (<><button onClick={() => onEdit(acc)} className="text-blue-600 text-sm flex gap-1 items-center"><Edit className="w-4 h-4"/> Editar</button><button onClick={() => onDelete(acc.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button></>)}
      </div>
    </Card>
  );
};

const Dashboard = ({ clients, accounts, onSeedData, servicesList, user, userProfile }) => {
  const [showSummary, setShowSummary] = useState(false);
  const activeClients = (clients || []).filter(c => c && !c.deleted && c.status === 'ACTIVA');
  const activeAccounts = (accounts || []).filter(a => a && !a.deleted && a.status === 'ACTIVA');
  const revenue = activeClients.reduce((acc, curr) => acc + (parseFloat(curr?.price || 0) || 0), 0);
  const expenses = activeAccounts.reduce((acc, curr) => acc + (parseFloat(curr?.cost || 0) || 0), 0);
  const totalSlots = activeAccounts.reduce((acc, curr) => acc + (parseInt(curr?.totalProfiles || 0) || 0), 0);
  const usedSlots = activeClients.length;
  
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ENCABEZADO DEL DASHBOARD CON LOGO DE LA APP */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <BrandLogo src={userProfile?.logo} className="w-16 h-16" />
          <div>
             <h2 className="text-2xl font-bold text-slate-800">StreamPlay Manager</h2>
             <p className="text-slate-500 text-sm">Bienvenido, {user?.displayName || 'Usuario'}</p>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setShowSummary(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-lg"><Activity className="w-4 h-4" /> Rentabilidad</button>
           <button onClick={onSeedData} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-lg transition-transform hover:scale-105"><Database className="w-4 h-4" /> Cargar Demo</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none">
          <div className="flex justify-between items-start">
             <div><p className="text-blue-100 mb-1 flex items-center gap-1"><TrendingUp className="w-4 h-4"/> Ingresos (Mes)</p><h3 className="text-3xl font-bold">${revenue.toFixed(2)}</h3></div>
             <div className="text-right"><p className="text-blue-200 text-xs mb-1 flex items-center justify-end gap-1"><TrendingDown className="w-3 h-3"/> Egresos</p><h4 className="text-xl font-bold text-blue-100">-${expenses.toFixed(2)}</h4><div className="mt-2 bg-white/20 px-2 py-1 rounded text-xs font-bold">Neto: ${(revenue - expenses).toFixed(2)}</div></div>
          </div>
        </Card>
        <Card className="p-6 bg-white"><div><p className="text-slate-500 mb-1">Clientes Activos</p><h3 className="text-3xl font-bold text-slate-800">{activeClients.length}</h3><p className="text-xs text-slate-400 mt-2">Suscripciones vigentes</p></div></Card>
        <Card className="p-6 bg-white"><div><p className="text-slate-500 mb-1">Disponibilidad Global</p><div className="flex items-baseline gap-2"><h3 className="text-3xl font-bold text-blue-600">{Math.max(0, totalSlots - usedSlots)}</h3><span className="text-sm text-slate-400">/ {totalSlots} perfiles</span></div><div className="w-full bg-slate-100 rounded-full h-2 mt-3"><div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{width: `${totalSlots > 0 ? Math.min((usedSlots/totalSlots)*100, 100) : 0}%`}}></div></div></div></Card>
      </div>
      <SummaryModal isOpen={showSummary} onClose={() => setShowSummary(false)} accounts={accounts} clients={clients} servicesList={servicesList} />
    </div>
  );
};

// --- SETTINGS VIEW ---
const SettingsView = ({ settings, onSaveSettings }) => {
  const [local, setLocal] = useState(settings);
  const [newService, setNewService] = useState("");
  useEffect(() => { setLocal(settings); }, [settings]);
  const handleAddService = () => { if (newService.trim()) { const updatedList = [...(local.servicesList || DEFAULT_SERVICES), newService.trim()]; setLocal({...local, servicesList: updatedList}); setNewService(""); }};
  const handleDeleteService = (index) => { const currentList = local.servicesList || DEFAULT_SERVICES; const updatedList = currentList.filter((_, i) => i !== index); setLocal({...local, servicesList: updatedList}); };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <h2 className="text-2xl font-bold text-slate-800">Configuración Global</h2>
      <form onSubmit={(e) => { e.preventDefault(); onSaveSettings(local); }} className="space-y-6">
        <Card className="p-6">
           <h3 className="font-bold text-lg text-slate-700 mb-4 flex items-center gap-2"><List className="w-5 h-5 text-blue-500" /> Lista de Servicios</h3>
           <div className="mb-4 flex gap-2"><input type="text" className="flex-1 p-2 border rounded-lg" placeholder="Nuevo Servicio (Ej: Disney+ Premium)" value={newService} onChange={e => setNewService(e.target.value)}/><button type="button" onClick={handleAddService} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus className="w-5 h-5"/></button></div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border rounded bg-slate-50">{(local.servicesList || DEFAULT_SERVICES).map((svc, idx) => (<div key={idx} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm"><span className="text-sm font-medium truncate">{svc}</span><button type="button" onClick={() => handleDeleteService(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button></div>))}</div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card className="p-4"><label className="font-bold mb-2 block">Bienvenida (Datos)</label><textarea className="w-full h-32 p-2 border rounded font-mono text-xs" value={local.welcome || DEFAULTS.welcome} onChange={e => setLocal({...local, welcome: e.target.value})} /></Card>
           <Card className="p-4"><label className="font-bold mb-2 block">Vence en 3 Días</label><textarea className="w-full h-32 p-2 border rounded font-mono text-xs" value={local.reminder3 || DEFAULTS.reminder3} onChange={e => setLocal({...local, reminder3: e.target.value})} /></Card>
           <Card className="p-4"><label className="font-bold mb-2 block">Vence HOY</label><textarea className="w-full h-32 p-2 border rounded font-mono text-xs" value={local.reminderToday || DEFAULTS.reminderToday} onChange={e => setLocal({...local, reminderToday: e.target.value})} /></Card>
           <Card className="p-4"><label className="font-bold mb-2 block">Vencida</label><textarea className="w-full h-32 p-2 border rounded font-mono text-xs" value={local.expired || DEFAULTS.expired} onChange={e => setLocal({...local, expired: e.target.value})} /></Card>
        </div>
        <div className="flex justify-end"><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center gap-2"><Save className="w-4 h-4" /> Guardar Todo</button></div>
      </form>
    </div>
  );
};

// --- PROFILE VIEW ---
const ProfileView = ({ user, onUpdateProfile }) => {
  const [formData, setFormData] = useState({ displayName: '', email: '', password: '', photo: null });
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFormData({ ...formData, displayName: user.displayName || '', email: user.email || '' });
      getDoc(doc(db, 'artifacts', typeof __app_id !== 'undefined' ? __app_id : 'default-app-id', 'users', user.uid, 'settings', 'profile')).then(s => {
        if(s.exists() && s.data().logo) setFormData(prev => ({...prev, photo: s.data().logo}));
      });
    }
  }, [user]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5000000) { alert("Logo máximo 5MB"); return; }
      const reader = new FileReader();
      reader.onload = (ev) => setFormData(prev => ({ ...prev, photo: ev.target.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (formData.displayName !== user.displayName) {
        await updateProfile(user, { displayName: formData.displayName });
      }
      if (formData.photo) {
        await setDoc(doc(db, 'artifacts', typeof __app_id !== 'undefined' ? __app_id : 'default-app-id', 'users', user.uid, 'settings', 'profile'), { logo: formData.photo });
      }
      if (formData.email !== user.email) await updateEmail(user, formData.email);
      if (formData.password) await updatePassword(user, formData.password);
      
      onUpdateProfile(); 
      alert("Perfil actualizado correctamente.");
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn p-4">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Mi Cuenta / Perfil</h2>
      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-50 overflow-hidden relative group">
              {formData.photo ? (<img src={formData.photo} alt="Logo" className="w-full h-full object-cover" />) : (<Camera className="w-8 h-8 text-slate-400" />)}
              <div className="absolute inset-0 bg-black/30 hidden group-hover:flex items-center justify-center text-white text-xs">Cambiar</div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
            <p className="text-xs text-slate-400">Toca para subir tu Logo</p>
          </div>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Negocio / Usuario</label><div className="relative"><User className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" /><input type="text" className="w-full pl-10 p-2 border rounded-lg" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} /></div></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico (Acceso)</label><div className="relative"><Mail className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" /><input type="email" className="w-full pl-10 p-2 border rounded-lg" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña (Opcional)</label><div className="relative"><Lock className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" /><input type="password" className="w-full pl-10 p-2 border rounded-lg" placeholder="Dejar vacío para no cambiar" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div></div>
          </div>
          <div className="flex justify-end pt-4"><button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center gap-2">{loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Cambios</button></div>
        </form>
      </Card>
    </div>
  );
};

// --- 5. MODALES ---
// (Incluidos para completar el archivo)

const AccountModal = ({ isOpen, onClose, formData, setFormData, onSave, isEditing, services }) => {
  if (!isOpen) return null;
  const activityLog = Array.isArray(formData.activityLog) ? formData.activityLog : (formData.notes ? [{ text: formData.notes, date: new Date().toISOString() }] : []);
  const handleAddNote = (noteObj) => { const newLog = [...activityLog, noteObj]; setFormData({ ...formData, activityLog: newLog, notes: "" }); };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl flex-shrink-0"><h3 className="text-xl font-bold text-slate-800">{isEditing ? 'Editar Cuenta' : 'Nueva Cuenta'}</h3><button onClick={onClose}><X className="text-slate-400 hover:text-red-500" /></button></div>
        <div className="overflow-y-auto p-6 flex-1">
          <form id="account-form" onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="md:col-span-2 space-y-4"><h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider border-b pb-1">Servicio</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-slate-700 mb-1">SERVICIO</label><select className="w-full p-2 border rounded-lg" value={formData.service || ''} onChange={e => setFormData({...formData, service: e.target.value})} required><option value="">Seleccionar...</option>{services.map(s => <option key={s} value={s}>{s}</option>)}</select></div><div><label className="block text-sm font-bold text-slate-700 mb-1">PERIODO</label><select className="w-full p-2 border rounded-lg" value={formData.period || ''} onChange={e => setFormData({...formData, period: e.target.value})}><option value="">Seleccionar...</option>{PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div></div></div>
             <div className="space-y-4"><h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider border-b pb-1">Credenciales</h4><div><label className="block text-sm font-medium text-slate-700 mb-1">Correo/Usuario</label><input type="text" className="w-full p-2 border rounded-lg" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} required /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label><input type="text" className="w-full p-2 border rounded-lg font-mono bg-slate-50" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} /></div><div><label className="block text-sm font-bold text-slate-700 mb-1 text-blue-600">Perfiles Disponibles (Total)</label><input type="number" min="1" max="10" className="w-full p-2 border border-blue-200 bg-blue-50 rounded-lg text-center font-bold" value={formData.totalProfiles || ''} onChange={e => setFormData({...formData, totalProfiles: e.target.value})} required /></div></div>
             <div className="space-y-4"><h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider border-b pb-1">Detalles Compra</h4><div><label className="block text-sm font-medium text-slate-700 mb-1">Proveedor</label><div className="flex gap-2"><select className="w-full p-2 border rounded-lg" value={formData.provider || ''} onChange={e => setFormData({...formData, provider: e.target.value})}><option value="">Sel...</option>{PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}</select><input type="text" placeholder="Otro..." className="w-full p-2 border rounded-lg" onChange={e => setFormData({...formData, provider: e.target.value})} /></div></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Costo ($)</label><input type="number" step="0.01" className="w-full p-2 border rounded-lg" value={formData.cost || ''} onChange={e => setFormData({...formData, cost: e.target.value})} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Método de Pago (Compra)</label><select className="w-full p-2 border rounded-lg" value={formData.paymentMethod || ''} onChange={e => setFormData({...formData, paymentMethod: e.target.value})}><option value="">Sel...</option>{PAYMENT_METHODS.map(p => <option key={p} value={p}>{p}</option>)}</select></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Vencimiento</label><input type="date" className="w-full p-2 border rounded-lg" value={formData.expiryDate || ''} onChange={e => setFormData({...formData, expiryDate: e.target.value})} required /></div></div>
          </form>
          <div className="md:col-span-2 mt-6 pt-4 border-t"><label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><MessageSquare className="w-4 h-4"/> Historial de Actividad / Notas</label><div className="h-64"><ActivityLog activityLog={activityLog} onAddNote={handleAddNote} /></div></div>
        </div>
        <div className="p-4 border-t bg-white rounded-b-2xl flex justify-end gap-3"><button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" form="account-form" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"><Save className="w-4 h-4" /> Guardar</button></div>
      </div>
    </div>
  );
};

const ClientModal = ({ isOpen, onClose, formData, setFormData, onSave, isEditing, accounts, clients, templates, services }) => {
  if (!isOpen) return null;
  const [copySuccess, setCopySuccess] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const activityLog = Array.isArray(formData.activityLog) ? formData.activityLog : (formData.notes ? [{ text: formData.notes, date: new Date().toISOString() }] : []);
  const handleAddNote = (noteObj) => { const newLog = [...activityLog, noteObj]; setFormData({ ...formData, activityLog: newLog }); };
  const isSpotify = formData.service && formData.service.toUpperCase().includes("SPOTIFY");
  const availableAccounts = (accounts || []).filter(acc => acc && !acc.deleted && acc.service === formData.service && acc.status === 'ACTIVA');
  const getAvailableProfilesForAccount = (account) => {
    if (!account) return [];
    const assignedClients = (clients || []).filter(c => c && !c.deleted && (c.accountId === account.id || c.emailAssigned === account.email));
    const takenProfiles = assignedClients.map(c => c.profileAssigned);
    const total = parseInt(account.totalProfiles || 0) || 1;
    const allProfiles = Array.from({length: total}, (_, i) => String(i + 1));
    const currentProfile = isEditing ? formData.profileAssigned : null;
    return allProfiles.filter(p => !takenProfiles.includes(p) || p === currentProfile);
  };
  const handleAccountSelection = (e) => {
    const accId = e.target.value;
    const acc = accounts.find(a => a.id === accId);
    if (acc) { setFormData({...formData, accountId: acc.id, emailAssigned: acc.email, passwordAssigned: acc.password, profileAssigned: ''}); } 
    else { setFormData({...formData, accountId: '', emailAssigned: '', passwordAssigned: '', profileAssigned: ''}); }
  };
  const applyTemplate = (key) => {
    const t = templates?.[key] || DEFAULTS[key];
    setFormData({...formData, notes: fillTemplate(t, formData)});
    setShowTemplateMenu(false);
  };
  const handleCopy = () => {
    copySafe(formData.notes, () => { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); });
  };
  const availableProfilesList = accounts.find(a => a.id === formData.accountId) ? getAvailableProfilesForAccount(accounts.find(a => a.id === formData.accountId)) : [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl flex-shrink-0"><h3 className="text-xl font-bold text-slate-800">{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</h3><button onClick={onClose}><X className="text-slate-400 hover:text-red-500" /></button></div>
        <div className="overflow-y-auto p-6 flex-1">
          <form id="client-form" onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4"><h4 className="text-sm font-bold text-rose-500 border-b pb-1">Datos Básicos</h4><div><label className="block text-sm font-medium text-slate-700">Nombre</label><input type="text" className="w-full p-2 border rounded-lg" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required /></div><div><label className="block text-sm font-medium text-slate-700">WhatsApp</label><input type="tel" className="w-full p-2 border rounded-lg" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div></div>
            <div className="space-y-4"><h4 className="text-sm font-bold text-rose-500 border-b pb-1">Asignación</h4><div><label className="block text-sm font-bold text-slate-700">Servicio</label><select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-rose-500" value={formData.service || ''} onChange={e => setFormData({...formData, service: e.target.value, accountId: '', emailAssigned: '', profileAssigned: ''})} required><option value="">Seleccionar...</option>{services.map(s => <option key={s} value={s}>{s}</option>)}</select></div><div><label className="block text-sm font-bold text-slate-700">Cuenta (Inventario)</label><select className="w-full p-2 border rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-500" value={formData.accountId || ''} onChange={handleAccountSelection} disabled={!formData.service} required><option value="">Seleccionar Cuenta...</option>{availableAccounts.map(acc => { const avail = getAvailableProfilesForAccount(acc).length; return (<option key={acc.id} value={acc.id} disabled={avail === 0 && acc.id !== formData.accountId}>{acc.email} ({avail} Disp)</option>)})}</select></div>{isSpotify && (<div className="md:col-span-2 space-y-4 p-4 bg-green-50 rounded-lg border border-green-100"><h4 className="text-sm font-bold text-green-700 border-b border-green-200 pb-1 flex items-center gap-2"><Music className="w-4 h-4"/> Datos Personales (Spotify)</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-green-800">Correo del Cliente</label><input type="email" className="w-full p-2 border border-green-200 rounded-lg" value={formData.clientEmail || ''} onChange={e => setFormData({...formData, clientEmail: e.target.value})} /></div><div><label className="block text-sm font-medium text-green-800">Contraseña del Cliente</label><input type="text" className="w-full p-2 border border-green-200 rounded-lg" value={formData.clientPassword || ''} onChange={e => setFormData({...formData, clientPassword: e.target.value})} /></div></div></div>)}<div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-slate-700">Perfil N°</label><select className="w-full p-2 border rounded-lg" value={formData.profileAssigned || ''} onChange={e => setFormData({...formData, profileAssigned: e.target.value})} disabled={!formData.accountId} required><option value="">Sel...</option>{availableProfilesList.map(p => <option key={p} value={p}>Perfil {p}</option>)}</select></div><div><label className="block text-sm font-bold text-slate-700">Alias / Nombre</label><input type="text" className="w-full p-2 border rounded-lg" placeholder="Ej: Juan" value={formData.profileName || ''} onChange={e => setFormData({...formData, profileName: e.target.value})} /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700">PIN (Manual)</label><input type="text" className="w-full p-2 border rounded-lg text-center" value={formData.pinAssigned || ''} onChange={e => setFormData({...formData, pinAssigned: e.target.value})} /></div><div></div></div>{formData.emailAssigned && (<div className="text-xs bg-slate-100 p-2 rounded">Asignado a: <b>{formData.emailAssigned}</b><br/>Clave: <b className="font-mono">{formData.passwordAssigned}</b></div>)}</div>
            <div className="md:col-span-2 pt-4 border-t grid grid-cols-3 gap-4"><div><label className="block text-sm font-medium text-slate-700">Vence</label><input type="date" className="w-full p-2 border rounded-lg" value={formData.expiryDate || ''} onChange={e => setFormData({...formData, expiryDate: e.target.value})} required /></div><div><label className="block text-sm font-medium text-slate-700">Precio</label><input type="number" step="0.01" className="w-full p-2 border rounded-lg" value={formData.price || ''} onChange={e => setFormData({...formData, price: e.target.value})} /></div><div><label className="block text-sm font-medium text-slate-700">Pago</label><select className="w-full p-2 border rounded-lg" value={formData.paymentMethod || ''} onChange={e => setFormData({...formData, paymentMethod: e.target.value})}><option value="">Sel...</option>{PAYMENT_METHODS.map(p => <option key={p} value={p}>{p}</option>)}</select></div></div>
            <div className="md:col-span-2 space-y-2 relative border-t pt-4 mt-4"><div className="flex justify-between items-center"><span className="text-sm font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-rose-500" /> Mensajes & Plantillas</span><div className="flex gap-2"><div className="relative"><button type="button" onClick={() => setShowTemplateMenu(!showTemplateMenu)} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 font-bold flex items-center gap-1">✨ Generar <ChevronDown className="w-3 h-3"/></button>{showTemplateMenu && (<div className="absolute right-0 bottom-8 w-48 bg-white shadow-xl border rounded-lg overflow-hidden z-10"><button type="button" onClick={() => applyTemplate('welcome')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b">👋 Bienvenida</button><button type="button" onClick={() => applyTemplate('reminder3')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b">📅 Vence en 3 días</button><button type="button" onClick={() => applyTemplate('reminderToday')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b">🚨 Vence HOY</button><button type="button" onClick={() => applyTemplate('expired')} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-red-600">❌ Vencida</button></div>)}</div><button type="button" onClick={handleCopy} className="text-xs bg-slate-100 px-3 py-1.5 rounded hover:bg-slate-200">{copySuccess ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}</button><button type="button" onClick={() => { if(!formData.notes) return; window.open(`https://wa.me/${formData.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(formData.notes)}`, '_blank'); }} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded hover:bg-green-200 flex items-center gap-1"><Send className="w-3 h-3" /> WP</button></div></div><textarea className="w-full p-2 border rounded-lg h-24 resize-none font-mono text-sm" value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Aquí aparece el mensaje generado..." /></div>
          </form>
          <div className="mt-6 pt-4 border-t"><h4 className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2"><Clock className="w-4 h-4"/> Historial de Notas Internas</h4><div className="h-48"><ActivityLog activityLog={activityLog} onAddNote={handleAddNote} /></div></div>
        </div>
        <div className="p-4 border-t bg-white rounded-b-2xl flex justify-end gap-3"><button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button><button type="submit" form="client-form" className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium flex items-center gap-2"><Save className="w-4 h-4" /> Guardar</button></div>
      </div>
    </div>
  );
};

// --- 6. MAIN COMPONENT ---

export default function StreamPlayManager() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [accounts, setAccounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [settings, setSettings] = useState({});
  const [servicesList, setServicesList] = useState(DEFAULT_SERVICES);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [editingItem, setEditingItem] = useState(null);
  const [accountForm, setAccountForm] = useState({ totalProfiles: 1 });
  const [clientForm, setClientForm] = useState({});
  const [globalSearch, setGlobalSearch] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  // Filtros
  const [filterService, setFilterService] = useState("");
  const [filterProvider, setFilterProvider] = useState("");
  const [filterInvService, setFilterInvService] = useState("");

  useEffect(() => {
    // Escucha cambios en la autenticación.
    // MODIFICADO: Solo escucha si hay usuario o no, y deja de cargar.
    // Se eliminó la lógica de __initial_auth_token que causaba el error con llaves personalizadas.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Función para recargar el perfil cuando cambia
  const loadProfile = async (uid) => {
    const s = await getDoc(doc(db, 'artifacts', typeof __app_id !== 'undefined' ? __app_id : 'default-app-id', 'users', uid, 'settings', 'profile'));
    if(s.exists()) setUserProfile(s.data());
  };

  useEffect(() => {
    if (!user || !db) return;
    
    loadProfile(user.uid);

    const unsubA = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'accounts')), (s) => setAccounts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubC = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'clients')), (s) => { setClients(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    getDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general')).then(s => { 
      if (s.exists()) {
        const data = s.data();
        setSettings(data);
        if(data.servicesList) setServicesList(data.servicesList);
      }
    });
    return () => { unsubA(); unsubC(); };
  }, [user]);

  // Callback para actualizar la UI cuando el perfil cambia en ProfileView
  const handleProfileUpdate = () => {
    if(user) loadProfile(user.uid);
  };
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // setUser(null) lo hará automáticamente el onAuthStateChanged
    } catch (error) {
      console.error("Error al salir", error);
    }
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if(!user || !db) return;
    const coll = collection(db, 'artifacts', appId, 'users', user.uid, 'accounts');
    try {
      if (editingItem) {
        await updateDoc(doc(coll, editingItem.id), accountForm);
        if (accountForm.email !== editingItem.email || accountForm.password !== editingItem.password) {
           const batch = writeBatch(db);
           clients.filter(c => c.accountId === editingItem.id).forEach(c => {
             batch.update(doc(db, 'artifacts', appId, 'users', user.uid, 'clients', c.id), {
               emailAssigned: accountForm.email,
               passwordAssigned: accountForm.password
             });
           });
           if (clients.some(c => c.accountId === editingItem.id)) await batch.commit();
        }
      } else {
        await addDoc(coll, { ...accountForm, status: 'ACTIVA', deleted: false, createdAt: new Date().toISOString() });
      }
      setIsAccountModalOpen(false); setEditingItem(null); setAccountForm({ totalProfiles: 1 });
    } catch (error) { console.error(error); }
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    if(!user || !db) return;
    const coll = collection(db, 'artifacts', appId, 'users', user.uid, 'clients');
    if (editingItem) await updateDoc(doc(coll, editingItem.id), clientForm);
    else await addDoc(coll, { ...clientForm, status: 'ACTIVA', deleted: false, createdAt: new Date().toISOString() });
    setIsClientModalOpen(false); setEditingItem(null); setClientForm({});
  };

  const confirmAction = (title, message, action, isDestructive = false) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm: async () => { await action(); setConfirmModal({ ...confirmModal, isOpen: false }); }, isDestructive });
  };

  const handleToggleDelete = async (type, id, currentDeletedState) => {
    if(!user || !db) return;
    const colName = type === 'account' ? 'accounts' : 'clients';
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, colName, id), { deleted: !currentDeletedState });
  };

  const handleHardDelete = async (type, id) => {
    if(!user || !db) return;
    const colName = type === 'account' ? 'accounts' : 'clients';
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, colName, id));
  };

  const handleSeedData = async () => {
    if(!user || !db) return;
    setLoading(true);
    const batch = writeBatch(db);
    accounts.forEach(a => batch.delete(doc(db, 'artifacts', appId, 'users', user.uid, 'accounts', a.id)));
    clients.forEach(c => batch.delete(doc(db, 'artifacts', appId, 'users', user.uid, 'clients', c.id)));
    const today = new Date();
    const d15 = new Date(today); d15.setDate(today.getDate()+15);
    const accRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'accounts'));
    batch.set(accRef, { service: "NETFLIX (VE)", provider: "Propia", cost: "10", expiryDate: d15.toISOString().split('T')[0], status: "ACTIVA", period: "1", totalProfiles: "5", password: "Password123", email: "demo@netflix.com", deleted: false, createdAt: new Date().toISOString() });
    const cliRef = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'clients'));
    batch.set(cliRef, { name: "Cliente Demo", phone: "+584121234567", service: "NETFLIX (VE)", price: "4", expiryDate: d15.toISOString().split('T')[0], status: "ACTIVA", accountId: accRef.id, emailAssigned: "demo@netflix.com", passwordAssigned: "Password123", profileAssigned: "1", pinAssigned: "1234", profileName: "Miguel", deleted: false });
    await batch.commit();
    setLoading(false);
  };

  const handleRenew = async (item, type) => {
    if(!user || !db) return;
    const months = 1; 
    const currentExpiry = new Date(item.expiryDate);
    const newExpiry = new Date(currentExpiry.setMonth(currentExpiry.getMonth() + months));
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, type, item.id), {
      expiryDate: newExpiry.toISOString().split('T')[0], status: 'ACTIVA'
    });
  };

  const toggleReminderSent = async (client) => {
    if(!user || !db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'clients', client.id), {
      reminderSent: !client.reminderSent
    });
  };

  const updateAccountStatus = async (id, newStatus) => {
    if(!user || !db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'accounts', id), { status: newStatus });
  };

  if (!app) return <div className="h-screen flex flex-col items-center justify-center bg-red-50 text-red-600 p-4 text-center"><AlertTriangle className="w-12 h-12 mb-4" /><h2 className="text-xl font-bold">Error de Configuración</h2><p>No se pudo conectar a la base de datos.</p></div>;
  
  // CONDICIONAL DE CARGA Y LOGIN
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-blue-600 animate-pulse font-bold">Cargando StreamPlay...</div>;
  if (!user) return <LoginView />; // SI NO HAY USUARIO, MUESTRA LOGIN

  // --- SAFE FILTERING ---
  const filteredClients = clients.filter(c => {
    if (!c) return false;
    const searchLower = (globalSearch || "").toLowerCase();
    const matchesSearch = !globalSearch || (
      (c.name || "").toLowerCase().includes(searchLower) ||
      (c.emailAssigned || "").toLowerCase().includes(searchLower) ||
      (c.service || "").toLowerCase().includes(searchLower) ||
      (c.phone || "").toLowerCase().includes(searchLower)
    );
    const matchesDeleted = showDeleted ? c.deleted : !c.deleted;
    const matchesService = filterService ? c.service === filterService : true;
    return matchesSearch && matchesDeleted && matchesService;
  });

  const filteredAccounts = accounts.filter(a => {
    if (!a) return false;
    const searchLower = (globalSearch || "").toLowerCase();
    const matchesSearch = !globalSearch || (
      (a.email || "").toLowerCase().includes(searchLower) ||
      (a.service || "").toLowerCase().includes(searchLower) ||
      (a.provider || "").toLowerCase().includes(searchLower)
    );
    const matchesDeleted = showDeleted ? a.deleted : !a.deleted;
    const matchesProvider = filterProvider ? a.provider === filterProvider : true;
    const matchesService = filterInvService ? a.service === filterInvService : true;
    return matchesSearch && matchesDeleted && matchesProvider && matchesService;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 z-20 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
           <BrandLogo src={userProfile?.logo} className="w-12 h-12" />
           <div>
             <h1 className="font-bold text-lg leading-tight text-slate-800 truncate w-32">
               {user?.displayName || 'Usuario'}
             </h1>
             <p className="text-xs text-slate-400">Manager v1.0</p>
           </div>
        </div>
        <nav className="p-4 space-y-1 flex-1">
          {['dashboard', 'accounts', 'clients', 'settings', 'profile'].map(v => (
            <button key={v} onClick={() => setView(v)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all capitalize ${view === v ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              {v === 'dashboard' && <LayoutDashboard className="w-5 h-5" />}
              {v === 'accounts' && <Monitor className="w-5 h-5" />}
              {v === 'clients' && <Users className="w-5 h-5" />}
              {v === 'settings' && <Settings className="w-5 h-5" />}
              {v === 'profile' && <User className="w-5 h-5" />}
              {v === 'accounts' ? 'Inventario' : v === 'clients' ? 'Clientes' : v === 'settings' ? 'Configuración' : v === 'profile' ? 'Mi Cuenta' : v}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium">
            <LogOut className="w-5 h-5" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto h-screen flex flex-col">
        <header className="bg-white border-b px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-10 shadow-sm">
           <h2 className="text-xl font-bold text-slate-800 capitalize">{view === 'accounts' ? 'Inventario de Cuentas' : view === 'clients' ? 'Cartera de Clientes' : view === 'profile' ? 'Mi Perfil' : view}</h2>
           <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Buscar global..." className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500" value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} />
           </div>
        </header>

        <div className="p-4 md:p-8 flex-1">
          {view === 'dashboard' && <Dashboard clients={clients} accounts={accounts} onSeedData={() => confirmAction('Cargar Demo', 'Se borrarán todos los datos actuales. ¿Continuar?', handleSeedData, true)} servicesList={servicesList} user={user} userProfile={userProfile} />}
          {view === 'settings' && <SettingsView settings={settings} onSaveSettings={async (s) => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'general'), s); alert("Guardado"); if(s.servicesList) setServicesList(s.servicesList); }} />}
          {view === 'profile' && <ProfileView user={user} onUpdateProfile={handleProfileUpdate} />}

          {view === 'accounts' && (
            <div className="animate-fadeIn space-y-6">
              <div className="flex flex-col xl:flex-row justify-between items-start gap-4">
                 <div className="flex flex-wrap gap-2 items-center">
                    <select className="p-2 border rounded-lg text-sm max-w-[150px]" value={filterProvider} onChange={e => setFilterProvider(e.target.value)}><option value="">Todos Proveedores</option>{PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}</select>
                    <select className="p-2 border rounded-lg text-sm max-w-[150px]" value={filterInvService} onChange={e => setFilterInvService(e.target.value)}><option value="">Todos Servicios</option>{servicesList.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    <button onClick={() => setShowDeleted(!showDeleted)} className={`px-3 py-2 rounded-lg text-sm flex gap-2 ${showDeleted ? 'bg-slate-800 text-white' : 'bg-white border hover:bg-slate-50'}`}>{showDeleted ? <RotateCcw className="w-4 h-4"/> : <Trash2 className="w-4 h-4"/>} {showDeleted ? 'Ver Activos' : 'Papelera'}</button>
                 </div>
                 {!showDeleted && <button onClick={() => { setEditingItem(null); setAccountForm({totalProfiles: 1}); setIsAccountModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md"><Plus className="w-5 h-5" /> Nueva Cuenta</button>}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredAccounts.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-slate-400">No se encontraron cuentas en el inventario.</div>
                ) : (
                  filteredAccounts.map(acc => (
                    <AccountCard 
                      key={acc.id} 
                      acc={acc} 
                      clients={clients} 
                      showDeleted={showDeleted}
                      onEdit={(item) => { setEditingItem(item); setAccountForm(item); setIsAccountModalOpen(true); }}
                      onDelete={(id) => confirmAction('Mover a Papelera', 'La cuenta se moverá a la papelera.', () => handleToggleDelete('account', id, false))}
                      onRestore={(id) => handleToggleDelete('account', id, true)}
                      onHardDelete={(id) => confirmAction('Borrar Definitivamente', 'No podrás recuperar esta cuenta.', () => handleHardDelete('account', id), true)}
                      onStatusChange={updateAccountStatus}
                      onRenew={(item) => handleRenew(item, 'accounts')}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {view === 'clients' && (
            <div className="animate-fadeIn space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="flex gap-2 items-center">
                    <select className="p-2 border rounded-lg text-sm" value={filterService} onChange={e => setFilterService(e.target.value)}><option value="">Todos los Servicios</option>{servicesList.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    <button onClick={() => setShowDeleted(!showDeleted)} className={`px-3 py-2 rounded-lg text-sm flex gap-2 ${showDeleted ? 'bg-slate-800 text-white' : 'bg-white border hover:bg-slate-50'}`}>{showDeleted ? <RotateCcw className="w-4 h-4"/> : <Trash2 className="w-4 h-4"/>} {showDeleted ? 'Papelera' : 'Papelera'}</button>
                 </div>
                 {!showDeleted && <button onClick={() => { setEditingItem(null); setClientForm({}); setIsClientModalOpen(true); }} className="bg-rose-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md"><Plus className="w-5 h-5" /> Nuevo Cliente</button>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-slate-400">No se encontraron clientes.</div>
                ) : (
                  filteredClients.map(client => {
                     const days = getDaysRemaining(client.expiryDate);
                     const isSpotify = client.service && client.service.toUpperCase().includes("SPOTIFY");
                     
                     return (
                       <Card key={client.id} className={`overflow-hidden border-l-4 ${showDeleted ? 'border-l-slate-400 grayscale' : 'border-l-blue-500'}`}>
                          <div className="p-4 border-b flex justify-between items-start">
                             <div>
                               <h3 className="font-bold text-slate-800">{client.name}</h3>
                               <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Phone className="w-3 h-3"/> {client.phone}</div>
                             </div>
                             <Badge status={client.status} />
                          </div>
                          
                          <div className="p-4 space-y-2 text-sm">
                             <div className="flex justify-between items-center">
                                <span className="font-bold text-blue-600">{client.service}</span>
                                <span className="text-slate-500 text-xs bg-slate-100 px-2 py-1 rounded">
                                  P{client.profileAssigned} {client.profileName ? `(${client.profileName})` : ''}
                                </span>
                             </div>
                             
                             <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="text-slate-500 text-xs uppercase">Precio Venta</span>
                                <span className="text-lg font-bold text-green-600">${client.price}</span>
                             </div>

                             <div className="bg-slate-50 p-2 rounded text-xs space-y-1 font-mono text-slate-600 border">
                                {isSpotify ? (
                                  <>
                                     <div className="flex justify-between border-b border-slate-200 pb-1 mb-1">
                                       <span className="text-slate-500">Cuenta Principal:</span> 
                                       <span className="truncate w-32 text-right font-bold text-blue-600">{client.emailAssigned}</span>
                                     </div>
                                     <div className="flex justify-between"><span>👤 Cliente:</span> <span className="truncate w-32 text-right font-bold">{client.clientEmail || 'N/A'}</span></div>
                                     <div className="flex justify-between"><span>🔑 Clave:</span> <span>{client.clientPassword || 'N/A'}</span></div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex justify-between"><span>📧:</span> <span className="truncate w-32 text-right font-bold">{client.emailAssigned}</span></div>
                                    <div className="flex justify-between"><span>🔑:</span> <span>{client.passwordAssigned}</span></div>
                                    <div className="flex justify-between"><span>📌 PIN:</span> <span className="font-bold text-rose-500">{client.pinAssigned || 'N/A'}</span></div>
                                  </>
                                )}
                             </div>
                             
                             <div className={`flex items-center justify-between p-2 rounded ${getExpiryColorClass(days, client.status)}`}>
                                <div className="flex flex-col leading-tight"><span className="text-[10px] uppercase opacity-80">Vence: {formatDateDDMMYYYY(client.expiryDate)}</span><span className="font-bold">{days < 0 ? 'VENCIDA' : `${days} días`}</span></div>
                             </div>
                          </div>

                          <div className="p-3 border-t bg-slate-50 flex justify-between items-center">
                             {showDeleted ? (
                                <>
                                  <button onClick={() => handleToggleDelete('client', client.id, true)} className="text-green-600 text-xs font-bold flex gap-1"><RotateCcw className="w-4 h-4"/> Restaurar</button>
                                  <button onClick={() => confirmAction('Borrar Definitivamente', 'Esta acción no se puede deshacer.', () => handleHardDelete('client', client.id), true)} className="text-red-600 text-xs font-bold flex gap-1"><Trash2 className="w-4 h-4"/> Eliminar</button>
                                </>
                             ) : (
                                <div className="w-full flex items-center justify-between gap-2">
                                  <div className="flex gap-1">
                                    <button onClick={() => { 
                                      const template = settings.reminderTemplate || DEFAULTS.reminderToday;
                                      const text = fillTemplate(template, client);
                                      copySafe(text, () => {
                                         toggleReminderSent(client);
                                      });
                                      alert("Mensaje copiado");
                                    }} className="bg-green-100 text-green-700 p-2 rounded hover:bg-green-200" title="Copiar Mensaje"><Copy className="w-4 h-4"/></button>
                                    
                                    <button onClick={() => {
                                       const template = settings.reminderTemplate || DEFAULTS.reminderToday;
                                       const text = fillTemplate(template, client);
                                       const url = `https://wa.me/${client.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
                                       window.open(url, '_blank');
                                       toggleReminderSent(client);
                                    }} className="bg-green-600 text-white p-2 rounded hover:bg-green-700" title="WhatsApp"><Send className="w-4 h-4"/></button>

                                    <button onClick={() => handleRenew(client, 'clients')} className="bg-blue-100 text-blue-700 p-2 rounded hover:bg-blue-200" title="Renovar 1 Mes"><RefreshCw className="w-4 h-4"/></button>
                                  </div>
                                  <div className="flex gap-1">
                                    <button onClick={() => { setEditingItem(client); setClientForm(client); setIsClientModalOpen(true); }} className="text-slate-400 p-2 hover:text-blue-600"><Edit className="w-4 h-4"/></button>
                                    <button onClick={() => confirmAction('Mover a Papelera', 'El cliente se moverá a la papelera.', () => handleToggleDelete('client', client.id, false))} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                  </div>
                                </div>
                             )}
                          </div>
                       </Card>
                     )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modales */}
      <AccountModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} formData={accountForm} setFormData={setAccountForm} onSave={handleSaveAccount} isEditing={!!editingItem} services={servicesList} />
      <ClientModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} formData={clientForm} setFormData={setClientForm} onSave={handleSaveClient} isEditing={!!editingItem} accounts={accounts} clients={clients} templates={settings} services={servicesList} />
      <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal({...confirmModal, isOpen: false})} isDestructive={confirmModal.isDestructive} />
    </div>
  );
}