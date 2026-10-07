"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { AiProvidersPanel } from "./ai-providers-panel";
import { AutomationsPanel } from "./automations-panel";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Braces,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Database,
  Download,
  Eye,
  FileText,
  Gauge,
  KeyRound,
  ListFilter,
  MessageSquareText,
  MoreHorizontal,
  Paperclip,
  PlayCircle,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  StopCircle,
  Timer,
  Trash2,
  TrendingUp,
  Users,
  Copy,
  Plus,
  Bot,
  Server,
  Link2,
  Pencil,
  Power,
  FlaskConical,
  Layers3,
  LockKeyhole,
  Cable,
  Cpu,
  BadgeCheck,
} from "lucide-react";

// Keep the gateway module bundle invalidated after local dev server restarts.

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8081";
type Instance = {
  id: string;
  name: string;
  wahaSession: string;
  status: string;
  engine?: "NOWEB" | "GOWS";
  createdAt: string;
  providerReachable?: boolean;
  providerStatus?: string;
  liveCheckedAt?: string;
  error?: string;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: HeadersInit = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined")
      window.dispatchEvent(new Event("service-waha-auth-expired"));
    throw new Error(
      `Request failed (${response.status}): ${data.message ?? data.error ?? "Unauthorized"}`,
    );
  }
  return data;
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();
  useEffect(() => {
    setToken(localStorage.getItem("service_waha_access_token"));
    setHydrated(true);
  }, []);
  useEffect(() => {
    const endSession = () => {
      localStorage.removeItem("service_waha_access_token");
      setToken(null);
      router.replace("/");
    };
    window.addEventListener("service-waha-auth-expired", endSession);
    return () =>
      window.removeEventListener("service-waha-auth-expired", endSession);
  }, [router]);
  if (!hydrated)
    return (
      <main className="grid min-h-screen place-items-center bg-[#080d1b] text-cyan-300">
        <div className="text-sm font-bold tracking-[.24em]">
          WHATSAPP GATEWAY
        </div>
      </main>
    );
  if (!token)
    return (
      <AuthScreen
        onAuth={(value) => {
          localStorage.setItem("service_waha_access_token", value);
          setToken(value);
        }}
      />
    );
  return (
    <Dashboard
      token={token}
      onLogout={() => {
        localStorage.removeItem("service_waha_access_token");
        setToken(null);
      }}
    />
  );
}

function AuthScreen({ onAuth }: { onAuth: (token: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    tenantName: "",
  });
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const data = await request<{ accessToken: string }>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      onAuth(data.accessToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tidak dapat masuk.");
    }
  }
  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30";
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080d1b] px-6 py-10 text-white">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-indigo-600/20 blur-3xl" />
      <section className="relative mx-auto grid min-h-[calc(100vh-80px)] max-w-6xl items-center gap-16 lg:grid-cols-[1.1fr_.9fr]">
        <div className="hidden lg:block">
          <div className="mb-7 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-400 font-black text-slate-950">
              S
            </div>
            <span className="text-sm font-bold tracking-[.24em] text-cyan-300">
              WHATSAPP GATEWAY
            </span>
          </div>
          <h1 className="max-w-xl text-6xl font-semibold leading-[1.02] tracking-tight">
            Satu pusat untuk semua koneksi WhatsApp.
          </h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-slate-400">
            Kelola instance, pairing QR, pesan, dan tim dalam workspace yang
            aman dan terisolasi.
          </p>
          <div className="mt-10 flex gap-3 text-sm text-slate-300">
            <Pill text="Multi-tenant" />
            <Pill text="Queue-ready" />
            <Pill text="WAHA powered" />
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/[.06] p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="mb-8 lg:hidden">
            <p className="text-sm font-bold tracking-[.24em] text-cyan-300">
              WHATSAPP GATEWAY
            </p>
          </div>
          <p className="text-sm font-medium text-cyan-300">
            {mode === "login" ? "Welcome back" : "Workspace baru"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold">
            {mode === "login" ? "Masuk ke dashboard" : "Buat workspace"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {mode === "login"
              ? "Lanjutkan mengelola koneksi kamu."
              : "Mulai dengan satu tenant dan tambah tim nanti."}
          </p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Email">
              <input
                className={inputClass}
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@bisnis.com"
              />
            </Field>
            <Field label="Password">
              <input
                className={inputClass}
                required
                minLength={8}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimal 8 karakter"
              />
            </Field>
            {mode === "register" && (
              <>
                <Field label="Nama">
                  <input
                    className={inputClass}
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nama kamu"
                  />
                </Field>
                <Field label="Nama workspace">
                  <input
                    className={inputClass}
                    required
                    value={form.tenantName}
                    onChange={(e) =>
                      setForm({ ...form, tenantName: e.target.value })
                    }
                    placeholder="Contoh: Toko Utama"
                  />
                </Field>
              </>
            )}
            {error && (
              <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}
            <button className="w-full rounded-xl bg-cyan-400 px-4 py-3.5 font-bold text-slate-950 transition hover:bg-cyan-300">
              {mode === "login" ? "Masuk" : "Buat workspace"}
            </button>
          </form>
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            className="mt-6 w-full text-sm text-slate-400 hover:text-white"
          >
            {mode === "login"
              ? "Belum punya workspace? Daftar"
              : "Sudah punya akun? Masuk"}
          </button>
        </div>
      </section>
    </main>
  );
}

function Dashboard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [overviewStats, setOverviewStats] = useState({
    campaigns: [] as any[],
    contacts: [] as any[],
    conversations: [] as any[],
  });
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<"NOWEB" | "GOWS">("NOWEB");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [qrInstanceId, setQrInstanceId] = useState<string | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(60);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const activeModule = pathname.split("/")[1] || "overview";
  const [selectedModule, setSelectedModule] = useState(activeModule);
  useEffect(() => {
    setSelectedModule(activeModule);
  }, [activeModule]);
  useEffect(() => {
    const syncFromHistory = () => {
      setSelectedModule(window.location.pathname.split("/")[1] || "overview");
    };
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);
  useEffect(
    () => setDarkMode(localStorage.getItem("gateway_dark_mode") === "true"),
    [],
  );
  useEffect(() => {
    if (!notice) return;
    const isError = /gagal|error|tidak|belum/i.test(notice);
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: isError ? "error" : "success",
      title: notice,
      showConfirmButton: false,
      timer: 4500,
      timerProgressBar: true,
    });
    setNotice("");
  }, [notice]);
  async function load() {
    setLoading(true);
    try {
      const [instanceData, campaignResult, contactResult, conversationResult] =
        await Promise.all([
          request<Instance[]>("/instances", {}, token),
          request<any[]>("/campaigns", {}, token).catch(() => []),
          request<any[]>("/contacts", {}, token).catch(() => []),
          request<any[]>("/conversations", {}, token).catch(() => []),
        ]);
      setInstances(instanceData);
      setOverviewStats({
        campaigns: campaignResult,
        contacts: contactResult,
        conversations: conversationResult,
      });
    } catch (e) {
      if (String(e).includes("401")) onLogout();
      else setNotice(String(e));
    } finally {
      setLoading(false);
    }
  }
  async function refreshStatuses() {
    const current = await request<Instance[]>("/instances", {}, token);
    const updated = await Promise.all(
      current.map(async (instance) => {
        try {
          const status = await request<{ status?: string }>(
            `/instances/${instance.id}/status`,
            {},
            token,
          );
          return {
            ...instance,
            status: String(status.status ?? instance.status).toUpperCase(),
          };
        } catch {
          return {
            ...instance,
            status: "UNREACHABLE",
            providerReachable: false,
          };
        }
      }),
    );
    setInstances(updated);
  }
  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      refreshStatuses().catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!qr || !qrInstanceId) return;
    const timer = window.setInterval(async () => {
      try {
        const current = await request<{ status?: string }>(
          `/instances/${qrInstanceId}/status`,
          {},
          token,
        );
        const status = String(current.status ?? "").toUpperCase();
        if (status === "WORKING" || status === "CONNECTED") {
          URL.revokeObjectURL(qr);
          setQr(null);
          setQrInstanceId(null);
          await refreshStatuses();
          await Swal.fire({
            icon: "success",
            title: "Device sudah terkoneksi",
            text: "WhatsApp berhasil dipairing dan siap digunakan.",
            confirmButtonText: "Selesai",
            confirmButtonColor: "#10b981",
          });
        }
      } catch {
        /* ignore transient polling errors */
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [qr, qrInstanceId, token]);
  useEffect(() => {
    if (!qr || !qrInstanceId) return;
    let seconds = 60;
    const timer = window.setInterval(async () => {
      seconds -= 1;
      if (seconds > 0) {
        setQrSecondsLeft(seconds);
        return;
      }
      try {
        const response = await fetch(`${API}/instances/${qrInstanceId}/qr`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const blob = await response.blob();
        if (!response.ok || !blob.type.startsWith("image/")) {
          seconds = 5;
          setQrSecondsLeft(seconds);
          return;
        }
        const nextQr = URL.createObjectURL(blob);
        setQr((current) => {
          if (current) URL.revokeObjectURL(current);
          return nextQr;
        });
        seconds = 60;
        setQrSecondsLeft(seconds);
      } catch {
        seconds = 5;
        setQrSecondsLeft(seconds);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [qr, qrInstanceId, token]);
  async function create(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setNotice("Menghubungkan instance ke WAHA...");
    try {
      await request(
        "/instances",
        { method: "POST", body: JSON.stringify({ name: name.trim(), engine }) },
        token,
      );
      setName("");
      setEngine("NOWEB");
      setNotice("Instance dibuat. Tekan Start untuk memunculkan QR.");
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Gagal membuat instance.");
    } finally {
      setCreating(false);
    }
  }
  async function action(instance: Instance, actionName: "start" | "stop") {
    if (actionName === "start" && instance.status === "WORKING") {
      await Swal.fire({
        icon: "info",
        title: "Sudah terkoneksi",
        text: "Session WhatsApp masih tersimpan dan sudah aktif.",
        confirmButtonText: "Mengerti",
        confirmButtonColor: "#06b6d4",
      });
      return;
    }
    if (
      actionName === "start" &&
      (instance.status === "STARTING" || instance.status === "SCAN_QR_CODE")
    ) {
      await Swal.fire({
        icon: "info",
        title: "Session sedang berjalan",
        text: "Session sudah dimulai dan sedang menunggu proses pairing. Gunakan tombol QR untuk menampilkan kode.",
        confirmButtonText: "Mengerti",
        confirmButtonColor: "#06b6d4",
      });
      return;
    }
    try {
      const result = await request<{ status?: string }>(
        `/instances/${instance.id}/${actionName}`,
        { method: "POST" },
        token,
      );
      const status = String(result.status ?? "").toUpperCase();
      if (actionName === "start" && status === "FAILED")
        await Swal.fire({
          icon: "error",
          title: `Provider ${instance.engine ?? "NOWEB"} gagal memulai session`,
          text: `Provider ${instance.engine ?? "NOWEB"} melaporkan session ${instance.name} gagal dimulai. Buka log provider untuk melihat detailnya.`,
          confirmButtonText: "Mengerti",
        });
      else if (
        actionName === "start" &&
        (status === "WORKING" || status === "CONNECTED")
      )
        await Swal.fire({
          icon: "info",
          title: "Session masih tersimpan",
          text: "WhatsApp masih login. Stop tidak menghapus pairing, jadi session langsung terkoneksi tanpa QR.",
          confirmButtonText: "Mengerti",
          confirmButtonColor: "#06b6d4",
        });
      else
        setNotice(
          actionName === "start"
            ? "Session dimulai. Tunggu status kuning lalu ambil QR."
            : "Session dihentikan. Pairing tetap tersimpan di WAHA.",
        );
      await refreshStatuses();
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Aksi gagal",
        text: e instanceof Error ? e.message : "Terjadi kesalahan.",
      });
    }
  }
  async function remove(instance: Instance) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus instance?",
      text: `Session ${instance.name} dan data instance ini akan dihapus.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await request(`/instances/${instance.id}`, { method: "DELETE" }, token);
      await Swal.fire({
        icon: "success",
        title: "Instance dihapus",
        text: `${instance.name} berhasil dihapus.`,
        confirmButtonText: "Selesai",
        confirmButtonColor: "#10b981",
      });
      await load();
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "Gagal menghapus",
        text: e instanceof Error ? e.message : "Terjadi kesalahan.",
      });
    }
  }
  async function showQr(instance: Instance) {
    try {
      const response = await fetch(`${API}/instances/${instance.id}/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "QR belum tersedia, start session dulu.");
      }
      const blob = await response.blob();
      if (!blob.type.startsWith("image/"))
        throw new Error("QR belum tersedia, start session dulu.");
      setQrInstanceId(instance.id);
      setQr(URL.createObjectURL(blob));
      setQrSecondsLeft(60);
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "QR belum tersedia",
        text: e instanceof Error ? e.message : "Start session dulu.",
      });
    }
  }
  const navItemClass = (module: string) =>
    `flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
      selectedModule === module
        ? "bg-indigo-50 font-semibold text-indigo-700"
        : "text-slate-600 hover:bg-slate-50"
    }`;
  return (
    <main
      className={`${darkMode ? "gateway-dark" : ""} min-h-screen bg-[#f6f8fc] text-slate-900`}
    >
      <header className="border-b border-slate-200 bg-white">
        <div
          className={`${sidebarCollapsed ? "md:ml-20" : "md:ml-64"} flex items-center justify-between px-6 py-5 transition-all`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Buka sidebar" : "Ciutkan sidebar"}
              aria-label={sidebarCollapsed ? "Buka sidebar" : "Ciutkan sidebar"}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <span className="sidebar-toggle-icon" />
            </button>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 font-black text-white">
              S
            </div>
            <div>
              <p className="text-xs font-bold tracking-[.2em] text-indigo-600">
                WHATSAPP GATEWAY
              </p>
              <p className="text-sm text-slate-500">Gateway control center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !darkMode;
                setDarkMode(next);
                localStorage.setItem("gateway_dark_mode", String(next));
              }}
              title={darkMode ? "Light mode" : "Dark mode"}
              aria-label={darkMode ? "Light mode" : "Dark mode"}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              <span
                className={
                  darkMode
                    ? "theme-icon theme-icon-sun"
                    : "theme-icon theme-icon-moon"
                }
              />
            </button>
            <button
              onClick={onLogout}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>
      <nav
        data-collapsed={sidebarCollapsed}
        onClick={(event) => {
          const label = (event.target as HTMLElement).textContent
            ?.trim()
            .toLowerCase();
          const module = label?.includes("inbox")
            ? "inbox"
            : label?.includes("contacts")
              ? "contacts"
              : label?.includes("template")
                ? "templates"
                : label?.includes("data sheet")
                  ? "data-sheets"
                  : label?.includes("automations")
                    ? "automations"
                    : label?.includes("broadcast") || label?.includes("blast")
                      ? "broadcast"
                      : label?.includes("webhook")
                        ? "webhooks"
                        : label?.includes("team")
                          ? "team"
                          : label?.includes("usage")
                            ? "usage"
                            : label?.includes("laporan") ||
                                label?.includes("report")
                              ? "reports"
                              : label?.includes("api key")
                                ? "api-keys"
                                : label?.includes("ai provider")
                                  ? "ai-providers"
                                : label?.includes("api console")
                                  ? "api-console"
                                  : label?.includes("system monitor")
                                  ? "system-monitor"
                                  : label?.includes("settings")
                                    ? "settings"
                                    : "overview";
          const nextPath = module === "overview" ? "/overview" : `/${module}`;
          setSelectedModule(module);
          window.history.pushState({}, "", nextPath);
        }}
        className={`${sidebarCollapsed ? "w-20" : "w-64"} fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white transition-all md:block`}
      >
        <div className="flex h-full flex-col px-4 py-6 text-sm">
          <div
            className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} gap-3 px-3 pb-8`}
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 font-black text-white">
              W
            </div>
            {!sidebarCollapsed && (
              <div>
                <p className="font-bold tracking-tight text-slate-900">
                  WhatsApp Gateway
                </p>
                <p className="text-xs text-slate-400">Workspace admin</p>
              </div>
            )}
          </div>
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Workspace
          </p>
          <div className="space-y-1">
            <span className={navItemClass("overview")}>
              ▦ <span>Overview</span>
            </span>
            <span className={navItemClass("inbox")}>
              ☷ <span>Inbox</span>
            </span>
            <span className={navItemClass("contacts")}>
              ◉ <span>Contacts</span>
            </span>
            <span className={navItemClass("automations")}>
              ⌁ <span>Automations</span>
            </span>
            <span className={navItemClass("broadcast")}>
              <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-current text-[10px]">
                B
              </span>{" "}
              <span>Broadcast</span>
            </span>
            <span className={navItemClass("templates")}>
              <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-current text-[10px]">
                T
              </span>
              <span>Templates</span>
            </span>
            <span className={navItemClass("data-sheets")}>
              <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-current text-[10px]">
                D
              </span>
              <span>Data Sheets</span>
            </span>
          </div>
          <div className="space-y-1">
            <span className={navItemClass("webhooks")}>
              <span className="text-indigo-500">Webhook</span>
              <span>Webhooks</span>
            </span>
          </div>
          <p className="px-3 pb-2 pt-8 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Manage
          </p>
          <div className="space-y-1">
            <span className={navItemClass("team")}>
              ▣ <span>Team & roles</span>
            </span>
            <span className={navItemClass("usage")}>
              ◌ <span>Usage & logs</span>
            </span>
            <span className={navItemClass("reports")}>
              <BarChart3 className="size-4" /> <span>Laporan</span>
            </span>
            <span className={navItemClass("api-console")}>
              <Braces className="size-4" /> <span>API Console</span>
            </span>
            <span className={navItemClass("api-keys")}>
              <KeyRound className="size-4" /> <span>API Keys</span>
            </span>
            <span className={navItemClass("ai-providers")}>
              <Bot className="size-4" /> <span>AI Providers</span>
            </span>
            <span className={navItemClass("system-monitor")}>
              <Activity className="size-4" /> <span>System Monitor</span>
            </span>
            <span className={navItemClass("settings")}>
              ⚙ <span>Settings</span>
            </span>
          </div>
          <div className="mt-auto rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
            <p className="font-semibold text-slate-700">Gateway status</p>
            <p className="mt-2 flex items-center gap-2">
              <i className="h-2 w-2 rounded-full bg-emerald-500" />
              All systems operational
            </p>
          </div>
        </div>
      </nav>
      {selectedModule !== "overview" && (
        <ModulePanel
          module={selectedModule}
          collapsed={sidebarCollapsed}
          token={token}
        />
      )}
      {selectedModule === "overview" && (
        <div
          className={`${sidebarCollapsed ? "md:ml-20 max-w-none" : "md:ml-64 max-w-7xl"} mx-0 px-6 py-10 transition-all`}
        >
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-medium text-indigo-600">Workspace</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight">
                WhatsApp instances
              </h1>
              <p className="mt-3 text-slate-500">
                Pair dan pantau nomor WhatsApp kamu dari sini.
              </p>
            </div>
            <form onSubmit={create} className="flex flex-wrap gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-60 rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none ring-indigo-400 placeholder:text-slate-400 focus:ring-2"
                placeholder="Nama instance"
              />
              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value as "NOWEB" | "GOWS")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="NOWEB">NOWEB</option>
                <option value="GOWS">GOWS</option>
              </select>
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "Menghubungkan..." : "Tambah"}
              </button>
            </form>
          </div>
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <Stat label="Total instance" value={String(instances.length)} />
            <Stat
              label="Working"
              value={String(
                instances.filter((i) => i.status === "WORKING").length,
              )}
            />
            <Stat
              label="Needs pairing"
              value={String(
                instances.filter(
                  (i) => i.status === "SCAN_QR_CODE" || i.status === "STARTING",
                ).length,
              )}
            />
          </div>
          <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Campaign",
                value: overviewStats.campaigns.length,
                detail: "campaign tersimpan",
                icon: BarChart3,
                tone: "bg-blue-50 text-blue-600",
              },
              {
                label: "Kontak",
                value: overviewStats.contacts.length,
                detail: "kontak di workspace",
                icon: Users,
                tone: "bg-emerald-50 text-emerald-600",
              },
              {
                label: "Percakapan",
                value: overviewStats.conversations.length,
                detail: "percakapan aktif",
                icon: MessageSquareText,
                tone: "bg-violet-50 text-violet-600",
              },
              {
                label: "Pesan terkirim",
                value: overviewStats.campaigns.reduce(
                  (total, campaign) =>
                    total + Number(campaign.stats?.sent ?? 0),
                  0,
                ),
                detail: "dari semua campaign",
                icon: Send,
                tone: "bg-amber-50 text-amber-600",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <section
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid size-11 place-items-center rounded-xl ${card.tone}`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{card.label}</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {card.value}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {card.detail}
                      </p>
                    </div>
                  </div>
                </section>
              );
            })}
          </section>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="font-semibold">Connection list</h2>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>
                  <i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />
                  Tidak konek
                </span>
                <span>
                  <i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
                  Belum pairing
                </span>
                <span>
                  <i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  Terkoneksi
                </span>
              </div>
            </div>
            {loading ? (
              <div className="p-8 text-slate-400">Memuat instance...</div>
            ) : instances.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cyan-400/10 text-2xl">
                  ＋
                </div>
                <h3 className="mt-4 font-semibold">Belum ada koneksi</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Buat instance pertama untuk mulai pairing.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {instances.map((instance) => (
                  <div
                    key={instance.id}
                    className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-3.5 w-3.5 rounded-full ${statusColor(instance.status)}`}
                      />
                      <div>
                        <p className="font-semibold">{instance.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {statusLabel(instance.status)} ·{" "}
                          {instance.engine ?? "NOWEB"} · {instance.wahaSession}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={
                          instance.status === "WORKING" ||
                          instance.status === "STARTING" ||
                          instance.status === "SCAN_QR_CODE"
                        }
                        onClick={() => action(instance, "start")}
                        className={
                          instance.status === "WORKING"
                            ? "rounded-lg bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700"
                            : instance.status === "STARTING" ||
                                instance.status === "SCAN_QR_CODE"
                              ? "cursor-not-allowed rounded-lg bg-amber-100 px-3 py-2 text-sm font-bold text-amber-700"
                              : "rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-500"
                        }
                      >
                        {instance.status === "WORKING"
                          ? "Connected"
                          : instance.status === "STARTING" ||
                              instance.status === "SCAN_QR_CODE"
                            ? "Berjalan"
                            : "Start"}
                      </button>
                      <button
                        disabled={instance.status === "WORKING"}
                        onClick={() => showQr(instance)}
                        className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"
                      >
                        {instance.status === "WORKING" ? "QR Aktif" : "QR"}
                      </button>
                      <button
                        onClick={() => action(instance, "stop")}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Stop
                      </button>
                      <button
                        onClick={() => remove(instance)}
                        className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
      {qr && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100/95 p-4 backdrop-blur-sm sm:p-8">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
            <div className="grid gap-5 p-5 lg:grid-cols-[1.7fr_1fr]">
              <section className="grid gap-5 md:grid-cols-[260px_1fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                  <div className="rounded-lg border-2 border-emerald-500/40 bg-white p-3">
                    <img
                      src={qr}
                      alt="WhatsApp QR"
                      className="mx-auto aspect-square w-full max-w-[230px]"
                    />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Scan kode QR ini menggunakan aplikasi WhatsApp di ponsel
                    Anda.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-5">
                  <h2 className="text-lg font-bold">Langkah-langkah Pairing</h2>
                  <div className="mt-5 space-y-5">
                    {[
                      [
                        "Buka aplikasi WhatsApp di ponsel Anda",
                        "Pastikan Anda menggunakan akun yang ingin dihubungkan.",
                      ],
                      [
                        "Masuk ke menu Perangkat Tertaut",
                        "Ketuk ikon titik tiga di kanan atas, lalu pilih Perangkat Tertaut.",
                      ],
                      [
                        "Pindai kode QR",
                        "Arahkan kamera ponsel ke kode QR di sebelah kiri hingga proses pemindaian berhasil.",
                      ],
                      [
                        "Tunggu hingga terhubung",
                        "Setelah berhasil, status akan berubah menjadi Terhubung.",
                      ],
                    ].map(([title, description], index) => (
                      <div key={title} className="flex gap-3">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">
                            {title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              <aside className="space-y-5">
                <div className="rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-bold">Status Koneksi</h3>
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                      W
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        Belum Terhubung
                      </p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Scan QR untuk menghubungkan akun WhatsApp.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-bold">Informasi Instance</h3>
                  <dl className="mt-3 divide-y divide-slate-100 text-xs">
                    <div className="flex justify-between gap-4 py-2">
                      <dt className="text-slate-500">Nama Instance</dt>
                      <dd className="font-medium text-slate-700">
                        {instances.find((item) => item.id === qrInstanceId)
                          ?.name ?? "-"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 py-2">
                      <dt className="text-slate-500">Provider</dt>
                      <dd className="font-medium text-slate-700">
                        {instances.find((item) => item.id === qrInstanceId)
                          ?.engine ?? "NOWEB"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 py-2">
                      <dt className="text-slate-500">QR berlaku</dt>
                      <dd className="font-medium text-slate-700">
                        {qrSecondsLeft} detik
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
                  <h3 className="text-sm font-bold text-slate-700">
                    Tips dan Catatan
                  </h3>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                    <li>Gunakan nomor WhatsApp yang aktif.</li>
                    <li>Pastikan aplikasi WhatsApp terbaru.</li>
                    <li>Jangan menutup halaman selama proses pairing.</li>
                  </ul>
                </div>
              </aside>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  const instance = instances.find(
                    (item) => item.id === qrInstanceId,
                  );
                  if (instance) void showQr(instance);
                }}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Refresh QR
              </button>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(qr);
                  setQrInstanceId(null);
                  setQr(null);
                }}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function InboxPanel({
  collapsed,
  token,
}: {
  collapsed: boolean;
  token: string;
}) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [instanceFilter, setInstanceFilter] = useState("ALL");
  const [body, setBody] = useState("");
  const [chatId, setChatId] = useState("");
  const [instanceId, setInstanceId] = useState("");
  async function loadConversations() {
    const data = await request<any[]>("/conversations", {}, token);
    setConversations(data);
    if (selected) {
      const fresh = data.find((item) => item.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }
  async function openConversation(conversation: any, syncFilter = true) {
    setSelected(conversation);
    setChatId(conversation.chatId);
    setInstanceId(conversation.instanceId);
    if (syncFilter) setInstanceFilter(conversation.instanceId);
    setMessages(
      await request<any[]>(
        `/conversations/${conversation.id}/messages`,
        {},
        token,
      ),
    );
  }
  useEffect(() => {
    Promise.all([
      request<any[]>("/conversations", {}, token),
      request<any[]>("/instances", {}, token),
    ])
      .then(([items, available]) => {
        setConversations(items);
        setInstances(available);
        if (!selected && items[0]) void openConversation(items[0], false);
      })
      .catch(() => undefined);
  }, [token]);
  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        await loadConversations();
        if (selected)
          setMessages(
            await request<any[]>(
              `/conversations/${selected.id}/messages`,
              {},
              token,
            ),
          );
      } catch {
        // Ignore transient polling errors.
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [token, selected?.id]);
  const visibleConversations = conversations.filter(
    (conversation) =>
      instanceFilter === "ALL" || conversation.instanceId === instanceFilter,
  );
  const groupedConversations = new Map<string, any[]>();
  visibleConversations.forEach((conversation) => {
    const key = conversation.chatKey || conversation.chatId;
    const group = groupedConversations.get(key) ?? [];
    group.push(conversation);
    groupedConversations.set(key, group);
  });
  const visibleConversationGroups = Array.from(
    groupedConversations.entries(),
  ).map(([chatKey, group]) => ({
    ...group[0],
    chatKey,
    groupedInstances: group,
  }));
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() || !chatId.trim() || !instanceId) return;
    try {
      await request(
        `/instances/${instanceId}/messages/text`,
        {
          method: "POST",
          body: JSON.stringify({ chatId: chatId.trim(), body: body.trim() }),
        },
        token,
      );
      setBody("");
      await loadConversations();
      if (selected)
        setMessages(
          await request<any[]>(
            `/conversations/${selected.id}/messages`,
            {},
            token,
          ),
        );
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Pesan masuk antrean",
        showConfirmButton: false,
        timer: 2500,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Pesan gagal dikirim",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    }
  }
  async function retry(message: any) {
    if (!selected || !instanceId) return;
    try {
      await request(
        `/instances/${instanceId}/messages/${message.id}/retry`,
        { method: "POST" },
        token,
      );
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title: "Retry dieksekusi",
        text: "Menunggu hasil pengiriman...",
        showConfirmButton: false,
        timer: 2200,
      });
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        const latest = await request<any[]>(
          `/conversations/${selected.id}/messages`,
          {},
          token,
        );
        setMessages(latest);
        const result = latest.find((item) => item.id === message.id);
        if (result?.status === "SENT") {
          await Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Pesan berhasil dikirim ulang",
            showConfirmButton: false,
            timer: 2500,
          });
          return;
        }
        if (result?.status === "FAILED") {
          await Swal.fire({
            toast: true,
            position: "top-end",
            icon: "error",
            title: "Retry gagal",
            text: "Pesan sudah dieksekusi ulang tetapi tetap gagal dikirim.",
            showConfirmButton: false,
            timer: 4000,
          });
          return;
        }
      }
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: "Retry masih diproses",
        text: "Status pengiriman belum final.",
        showConfirmButton: false,
        timer: 3500,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Kirim ulang gagal",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    }
  }
  async function removeConversationGroup(conversation: any) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus conversation?",
      text: "Semua pesan pada conversation ini akan dihapus dari Inbox.",
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
    });
    if (!result.isConfirmed) return;
    try {
      await Promise.all(
        conversation.groupedInstances.map((item: any) =>
          request(`/conversations/${item.id}`, { method: "DELETE" }, token),
        ),
      );
      setConversations((current) =>
        current.filter(
          (item) =>
            !conversation.groupedInstances.some(
              (group: any) => group.id === item.id,
            ),
        ),
      );
      if (
        conversation.groupedInstances.some(
          (item: any) => item.id === selected?.id,
        )
      ) {
        setSelected(null);
        setMessages([]);
        setChatId("");
        setInstanceId("");
      }
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Conversation dihapus",
        showConfirmButton: false,
        timer: 2200,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal menghapus conversation",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    }
  }
  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} mx-auto max-w-none px-6 py-10 transition-all`}
    >
      <div className="mb-8">
        <p className="text-sm font-semibold text-indigo-600">
          Workspace module
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
          Inbox
        </h1>
        <p className="mt-3 text-slate-500">
          Pantau conversation dan kirim pesan dari semua instance.
        </p>
      </div>
      <div className="grid min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">Conversations</p>
                <p className="mt-1 text-xs text-slate-500">
                  {visibleConversationGroups.length} conversation
                </p>
              </div>
              <select
                value={instanceFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  setInstanceFilter(value);
                  const next = conversations.find(
                    (conversation) =>
                      value === "ALL" || conversation.instanceId === value,
                  );
                  if (next) void openConversation(next);
                  else {
                    setSelected(null);
                    setMessages([]);
                    setChatId("");
                    setInstanceId("");
                  }
                }}
                className="max-w-[150px] rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600 outline-none focus:border-indigo-500"
              >
                <option value="ALL">Semua instance</option>
                {instances.map((instance) => (
                  <option key={instance.id} value={instance.id}>
                    {instance.name} · {instance.engine ?? "NOWEB"}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {visibleConversationGroups.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => openConversation(conversation)}
                className={`relative block w-full cursor-pointer px-5 py-4 text-left hover:bg-indigo-50 ${selected?.id === conversation.id ? "bg-indigo-50" : ""}`}
              >
                <p className="font-semibold text-slate-900">
                  {conversation.title || conversation.chatId}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {conversation.messages?.[0]?.body || "Belum ada pesan"}
                </p>
                <p className="mt-2 text-[11px] text-indigo-600">
                  {conversation.instance?.name} ·{" "}
                  {conversation.instance?.engine ?? "NOWEB"}
                </p>
                <button
                  type="button"
                  title="Hapus conversation"
                  aria-label="Hapus conversation"
                  onClick={(event) => {
                    event.stopPropagation();
                    void removeConversationGroup(conversation);
                  }}
                  className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 7h16" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
                  </svg>
                </button>
              </div>
            ))}
            {visibleConversationGroups.length === 0 && (
              <p className="p-6 text-sm text-slate-500">
                Belum ada conversation. Kirim pesan pertama dari form di kanan.
              </p>
            )}
          </div>
        </aside>
        <section className="flex min-w-0 flex-col">
          <div className="border-b border-slate-100 px-6 py-4">
            <p className="font-semibold text-slate-900">
              {selected ? selected.chatId : "New message"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Pesan outbound dan inbound akan tampil di sini.
            </p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-6">
            {messages.length === 0 ? (
              <div className="grid h-full min-h-64 place-items-center text-sm text-slate-400">
                Pilih conversation atau kirim pesan baru.
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-xl rounded-2xl px-4 py-3 text-sm ${message.status === "FAILED" ? "ml-auto border border-rose-200 bg-rose-50 text-rose-900" : message.direction === "OUTBOUND" ? "ml-auto bg-indigo-600 text-white" : "bg-white text-slate-800 shadow-sm"}`}
                >
                  <p>{message.body}</p>
                  <div
                    className={`mt-2 flex items-center justify-between gap-4 text-[10px] ${message.status === "FAILED" ? "text-rose-600" : message.direction === "OUTBOUND" ? "text-indigo-100" : "text-slate-400"}`}
                  >
                    {message.status} ·{" "}
                    {new Date(message.createdAt).toLocaleString()}
                    {message.status === "FAILED" && (
                      <button
                        type="button"
                        title="Kirim ulang"
                        aria-label="Kirim ulang"
                        onClick={() => retry(message)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-2 py-1 font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20 11a8 8 0 1 0 2 5" />
                          <path d="M20 5v6h-6" />
                        </svg>
                        Kirim ulang
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <form
            onSubmit={send}
            className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-[180px_1fr_auto]"
          >
            <select
              value={instanceId}
              onChange={(event) => {
                const value = event.target.value;
                setInstanceId(value);
                if (!value) return;
                setInstanceFilter(value);
                const next = conversations.find(
                  (conversation) => conversation.instanceId === value,
                );
                if (next) void openConversation(next);
                else {
                  setSelected(null);
                  setMessages([]);
                }
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
            >
              <option value="">Pilih instance</option>
              {instances.map((instance) => (
                <option key={instance.id} value={instance.id}>
                  {instance.name}
                </option>
              ))}
            </select>
            <input
              value={chatId}
              onChange={(event) => setChatId(event.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
              placeholder="628xxxxxxxxxx atau 628xxxxxxxxxx@c.us"
            />
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-500"
            >
              Kirim
            </button>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="md:col-span-3 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
              placeholder="Tulis pesan..."
              rows={2}
            />
          </form>
        </section>
      </div>
    </div>
  );
}

function WebhooksPanel({
  collapsed,
  token,
}: {
  collapsed: boolean;
  token: string;
}) {
  const [hooks, setHooks] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    url: "",
    secret: "",
    isDefault: true,
    events: ["message", "message.any", "message.ack", "session.status"],
  });
  const [selectedInstance, setSelectedInstance] = useState("");
  const [selectedHook, setSelectedHook] = useState("");
  const [saving, setSaving] = useState(false);
  async function load() {
    const [endpointData, instanceData] = await Promise.all([
      request<any[]>("/webhooks", {}, token),
      request<any[]>("/instances", {}, token),
    ]);
    setHooks(endpointData);
    setInstances(instanceData);
  }
  useEffect(() => {
    load().catch(() => undefined);
  }, [token]);
  function toggleEvent(event: string) {
    setForm((current) => ({
      ...current,
      events: current.events.includes(event)
        ? current.events.filter((item) => item !== event)
        : [...current.events, event],
    }));
  }
  async function create(event: FormEvent) {
    event.preventDefault();
    if (!form.name || !form.url || !form.events.length) return;
    setSaving(true);
    try {
      await request(
        "/webhooks",
        { method: "POST", body: JSON.stringify(form) },
        token,
      );
      setForm({
        name: "",
        url: "",
        secret: "",
        isDefault: false,
        events: ["message", "message.any", "message.ack", "session.status"],
      });
      await load();
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Webhook tersimpan",
        showConfirmButton: false,
        timer: 2200,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Webhook gagal disimpan",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    } finally {
      setSaving(false);
    }
  }
  async function assign(event: FormEvent) {
    event.preventDefault();
    if (!selectedInstance) return;
    try {
      await request(
        `/webhooks/instances/${selectedInstance}/assign`,
        {
          method: "POST",
          body: JSON.stringify({ webhookEndpointId: selectedHook || null }),
        },
        token,
      );
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: selectedHook
          ? "Webhook dipasang ke instance"
          : "Instance memakai default webhook",
        showConfirmButton: false,
        timer: 2200,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Webhook gagal dipasang",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    }
  }
  async function remove(id: string) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus webhook?",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
    });
    if (!result.isConfirmed) return;
    try {
      await request(`/webhooks/${id}`, { method: "DELETE" }, token);
      await load();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Webhook gagal dihapus",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    }
  }
  const eventOptions = [
    {
      name: "message",
      description:
        "Pesan masuk atau keluar. Wajib untuk menampilkan chat di Inbox.",
    },
    {
      name: "message.any",
      description:
        "Semua aktivitas pesan, termasuk pesan dari device dan pesan yang dikirim gateway.",
    },
    {
      name: "message.ack",
      description:
        "Perubahan status pengiriman: terkirim, delivered, dibaca, atau gagal.",
    },
    {
      name: "session.status",
      description:
        "Perubahan koneksi instance seperti starting, pairing, working, atau stopped.",
    },
  ];
  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} mx-auto max-w-6xl px-6 py-10 transition-all`}
    >
      <div className="mb-8">
        <p className="text-sm font-semibold text-indigo-600">
          Gateway configuration
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
          Webhooks
        </h1>
        <p className="mt-3 max-w-2xl text-slate-500">
          Kelola endpoint event secara global, lalu pilih endpoint khusus untuk
          setiap instance.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-semibold text-slate-900">Endpoint webhook</h2>
            <p className="mt-1 text-sm text-slate-500">
              Default dipakai oleh instance yang tidak memilih endpoint khusus.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {hooks.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">Belum ada webhook.</p>
            ) : (
              hooks.map((hook) => (
                <div
                  key={hook.id}
                  className="flex items-start justify-between gap-4 px-6 py-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {hook.name}
                      </p>
                      {hook.isDefault && (
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {hook.url}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">
                      {hook._count?.instances ?? 0} instance ·{" "}
                      {hook.events.join(", ")}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(hook.id)}
                    className="shrink-0 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Hapus
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
        <div className="space-y-6">
          <form
            onSubmit={create}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="font-semibold text-slate-900">Tambah endpoint</h2>
            <div className="mt-4 space-y-3">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                placeholder="Nama webhook"
              />
              <input
                required
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                placeholder="https://domain.com/webhooks/waha"
              />
              <input
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                placeholder="Secret HMAC, opsional"
              />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500">
                  Event yang diterima
                </p>
                {eventOptions.map((event) => (
                  <label
                    key={event.name}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 p-3 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={form.events.includes(event.name)}
                      onChange={() => toggleEvent(event.name)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block font-semibold text-slate-800">
                        {event.name}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        {event.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) =>
                    setForm({ ...form, isDefault: e.target.checked })
                  }
                />
                Jadikan default tenant
              </label>
              <button
                disabled={saving}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan webhook"}
              </button>
            </div>
          </form>
          <form
            onSubmit={assign}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="font-semibold text-slate-900">Pakai di instance</h2>
            <p className="mt-1 text-sm text-slate-500">
              Kosongkan webhook untuk memakai default tenant.
            </p>
            <div className="mt-4 space-y-3">
              <select
                required
                value={selectedInstance}
                onChange={(e) => setSelectedInstance(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">Pilih instance</option>
                {instances.map((instance) => (
                  <option key={instance.id} value={instance.id}>
                    {instance.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedHook}
                onChange={(e) => setSelectedHook(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">Default tenant webhook</option>
                {hooks.map((hook) => (
                  <option key={hook.id} value={hook.id}>
                    {hook.name}
                  </option>
                ))}
              </select>
              <button className="w-full rounded-xl border border-indigo-200 px-4 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
                Terapkan ke instance
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ContactsPanel({
  collapsed,
  token,
}: {
  collapsed: boolean;
  token: string;
}) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
  });
  const [saving, setSaving] = useState(false);
  const [instances, setInstances] = useState<any[]>([]);
  const [instanceId, setInstanceId] = useState("");
  const [preview, setPreview] = useState<any | null>(null);
  const [previewQuery, setPreviewQuery] = useState("");
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  async function load() {
    setContacts(
      await request<any[]>(
        `/contacts${query ? `?q=${encodeURIComponent(query)}` : ""}`,
        {},
        token,
      ),
    );
  }
  useEffect(() => {
    load().catch(() => undefined);
    request<any[]>("/instances", {}, token)
      .then(setInstances)
      .catch(() => undefined);
  }, [token, query]);
  async function importSource(source: "contacts" | "groups") {
    if (!instanceId) {
      await Swal.fire({
        icon: "info",
        title: "Pilih instance",
        text: "Pilih instance WhatsApp yang ingin diambil datanya.",
      });
      return;
    }
    let elapsed = 0;
    const progressTitle =
      source === "groups"
        ? "Mengambil anggota group..."
        : "Mengambil kontak WhatsApp...";
    Swal.fire({
      title: progressTitle,
      html: '<p id="import-progress-text">Menghubungkan ke instance WhatsApp...</p><p id="import-progress-time" class="mt-2 text-xs text-slate-400">Waktu berjalan: 0 detik</p>',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const progressTimer = window.setInterval(() => {
      elapsed += 1;
      const text = document.getElementById("import-progress-text");
      const time = document.getElementById("import-progress-time");
      if (elapsed >= 3 && text)
        text.textContent =
          source === "groups"
            ? "Membaca daftar group dan anggota..."
            : "Membaca daftar kontak dari WAHA...";
      if (elapsed >= 10 && text)
        text.textContent = "Masih diproses. Jangan tutup halaman ini...";
      if (time) time.textContent = `Waktu berjalan: ${elapsed} detik`;
    }, 1000);
    try {
      const result = await request<any>(
        `/contacts/import/${instanceId}/preview`,
        { method: "POST", body: JSON.stringify({ source }) },
        token,
      );
      Swal.close();
      setPreview(result);
      setPreviewQuery("");
      setSelectedPhones(
        result.contacts
          .filter((item: any) => !item.alreadyExists)
          .map((item: any) => item.phone),
      );
    } catch (error) {
      Swal.close();
      await Swal.fire({
        icon: "error",
        title: "Import gagal",
        text:
          error instanceof Error
            ? error.message
            : "Pastikan session sudah terkoneksi dan NOWEB Store aktif.",
      });
    } finally {
      window.clearInterval(progressTimer);
    }
  }
  const visiblePreview = (preview?.contacts ?? []).filter((item: any) => {
    const value =
      `${item.name} ${item.phone} ${item.groupName ?? ""}`.toLowerCase();
    return value.includes(previewQuery.toLowerCase().trim());
  });
  function togglePreviewPhone(phone: string) {
    setSelectedPhones((current) =>
      current.includes(phone)
        ? current.filter((item) => item !== phone)
        : [...current, phone],
    );
  }
  function selectVisiblePreview(select: boolean) {
    const visiblePhones = visiblePreview
      .filter((item: any) => !item.alreadyExists)
      .map((item: any) => item.phone);
    setSelectedPhones((current) =>
      select
        ? Array.from(new Set([...current, ...visiblePhones]))
        : current.filter((phone) => !visiblePhones.includes(phone)),
    );
  }
  async function commitPreview() {
    if (!preview || !selectedPhones.length) return;
    const selected = preview.contacts.filter((item: any) =>
      selectedPhones.includes(item.phone),
    );
    try {
      const result = await request<{ imported: number }>(
        `/contacts/import/${instanceId}/commit`,
        {
          method: "POST",
          body: JSON.stringify({ source: preview.source, contacts: selected }),
        },
        token,
      );
      setPreview(null);
      await load();
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `${result.imported} kontak ditambahkan`,
        showConfirmButton: false,
        timer: 2400,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal menyimpan kontak",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    }
  }
  async function create(event: FormEvent) {
    event.preventDefault();
    if (!form.name || !form.phone) return;
    setSaving(true);
    try {
      await request(
        "/contacts",
        { method: "POST", body: JSON.stringify(form) },
        token,
      );
      setForm({ name: "", phone: "", email: "", company: "" });
      await load();
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Kontak tersimpan",
        showConfirmButton: false,
        timer: 2200,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Kontak gagal disimpan",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    } finally {
      setSaving(false);
    }
  }
  async function remove(id: string) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus kontak?",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
    });
    if (!result.isConfirmed) return;
    try {
      await request(`/contacts/${id}`, { method: "DELETE" }, token);
      await load();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Kontak gagal dihapus",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    }
  }
  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} mx-auto max-w-6xl px-6 py-10 transition-all`}
    >
      <div className="mb-8">
        <p className="text-sm font-semibold text-indigo-600">
          Workspace module
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
          Contacts
        </h1>
        <p className="mt-3 text-slate-500">
          Simpan kontak pelanggan dan gunakan nomor yang sama untuk Inbox.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Daftar kontak</h2>
              <p className="mt-1 text-sm text-slate-500">
                {contacts.length} kontak
              </p>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              placeholder="Cari kontak..."
            />
          </div>
          <div className="divide-y divide-slate-100">
            {contacts.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">Belum ada kontak.</p>
            ) : (
              contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {contact.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {contact.phone}
                      {contact.company ? ` · ${contact.company}` : ""}
                    </p>
                    {contact.email && (
                      <p className="mt-1 text-xs text-slate-400">
                        {contact.email}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => remove(contact.id)}
                    className="shrink-0 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Hapus
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Import dari WhatsApp
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ambil kontak tersimpan atau anggota group dari instance yang
              terkoneksi.
            </p>
            <select
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Pilih instance</option>
              {instances.map((instance) => (
                <option key={instance.id} value={instance.id}>
                  {instance.name} ({instance.status})
                </option>
              ))}
            </select>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => importSource("contacts")}
                className="rounded-xl border border-indigo-200 px-3 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                Import kontak
              </button>
              <button
                type="button"
                onClick={() => importSource("groups")}
                className="rounded-xl border border-indigo-200 px-3 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                Import anggota group
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              Import kontak WAHA membutuhkan NOWEB Store aktif pada session.
            </p>
          </section>
          <form
            onSubmit={create}
            className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="font-semibold text-slate-900">Tambah kontak</h2>
            <div className="mt-4 space-y-3">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                placeholder="Nama kontak"
              />
              <input
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                placeholder="628xxxxxxxxxx"
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                placeholder="Email, opsional"
              />
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                placeholder="Perusahaan, opsional"
              />
              <button
                disabled={saving}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan kontak"}
              </button>
            </div>
          </form>
        </div>
      </div>
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Preview data WhatsApp
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {preview.total} data ditemukan, {preview.newCount} baru,{" "}
                  {preview.existingCount} sudah tersimpan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
            <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={previewQuery}
                onChange={(event) => setPreviewQuery(event.target.value)}
                placeholder="Filter nama, nomor, atau group"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 sm:max-w-sm"
              />
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => selectVisiblePreview(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                  Pilih semua
                </button>
                <button
                  type="button"
                  onClick={() => selectVisiblePreview(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-slate-600 hover:bg-slate-50"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                  Batal pilih semua
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {visiblePreview.length === 0 ? (
                <p className="p-8 text-sm text-slate-500">
                  Data tidak ditemukan.
                </p>
              ) : (
                visiblePreview.map((item: any) => (
                  <label
                    key={`${item.phone}-${item.groupId ?? "contact"}`}
                    className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-6 py-3 hover:bg-slate-50 ${item.alreadyExists ? "opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      disabled={item.alreadyExists}
                      checked={selectedPhones.includes(item.phone)}
                      onChange={() => togglePreviewPhone(item.phone)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-900">
                        {item.name || item.phone}
                      </span>
                      <span className="block text-sm text-slate-500">
                        {item.phone}
                        {item.groupName ? ` · ${item.groupName}` : ""}
                      </span>
                    </span>
                    <span
                      className={`text-xs font-semibold ${item.alreadyExists ? "text-slate-400" : "text-emerald-600"}`}
                    >
                      {item.alreadyExists ? "Sudah ada" : "Kontak baru"}
                    </span>
                  </label>
                ))
              )}
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {selectedPhones.length} kontak dipilih
              </p>
              <button
                type="button"
                disabled={!selectedPhones.length}
                onClick={commitPreview}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tambahkan yang dipilih
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WysiwygEditor({
  value,
  onChange,
  variables = ["name", "phone"],
  onAttachFile,
}: {
  value: string;
  onChange: (value: string) => void;
  variables?: string[];
  onAttachFile?: (file: File) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const [activeVariables, setActiveVariables] = useState(variables);
  const [variablesExpanded, setVariablesExpanded] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  useEffect(() => {
    const update = () => {
      const custom =
        document.body.dataset.broadcastFields?.split(",").filter(Boolean) ?? [];
      setActiveVariables(
        Array.from(
          new Set([...variables, ...custom].map(normalizeDatasetField)),
        ).filter(Boolean),
      );
    };
    window.addEventListener("broadcast-fields", update);
    update();
    return () => window.removeEventListener("broadcast-fields", update);
  }, [variables.join(",")]);
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value)
      editorRef.current.innerHTML = value;
  }, [value]);
  function saveSelection() {
    const selection = window.getSelection();
    const root = editorRef.current;
    if (!selection?.rangeCount || !root) return;
    const range = selection.getRangeAt(0);
    if (root.contains(range.commonAncestorContainer))
      selectionRangeRef.current = range.cloneRange();
  }
  function restoreSelection() {
    const selection = window.getSelection();
    const range = selectionRangeRef.current;
    if (!selection || !range) return;
    selection.removeAllRanges();
    selection.addRange(range);
  }
  function syncEditor() {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }
  function applyCommand(command: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false);
    saveSelection();
    syncEditor();
  }
  function insertText(text: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand("insertText", false, text);
    saveSelection();
    syncEditor();
  }
  function insertVariable(variable: string) {
    insertText(`{{${variable}}}`);
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="relative flex flex-wrap gap-2 border-b border-slate-100 p-2">
        <button
          type="button"
          onClick={() => setShowEmojiPicker((current) => !current)}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
        >
          <span className="grid size-4 place-items-center rounded-full border border-amber-400 text-[10px] text-amber-600">
            •
          </span>
          Emoji
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyCommand("bold")}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyCommand("italic")}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm italic"
        >
          I
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyCommand("insertUnorderedList")}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        >
          List
        </button>
        <span className="relative">
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) insertVariable(event.target.value);
              event.currentTarget.value = "";
            }}
            className="min-w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
            aria-label="Sisipkan variabel"
          >
            <option value="">{} Sisipkan Variabel</option>
            {activeVariables.map((variable) => (
              <option
                key={variable}
                value={variable}
              >{`{{${variable}}}`}</option>
            ))}
          </select>
        </span>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyCommand("insertLineBreak")}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M4 7h13M4 12h9M4 17h13M17 10l3 2-3 2" />
          </svg>
          Baris Baru
        </button>
        {onAttachFile && (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700">
            <input
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onAttachFile(file);
                event.currentTarget.value = "";
              }}
            />
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7" />
            </svg>
            Lampirkan File
          </label>
        )}
        <button
          type="button"
          onClick={() => setVariablesExpanded((current) => !current)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${variablesExpanded ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-700"}`}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M8 4 5 8l3 4M16 4l3 4-3 4M14 3l-4 18" />
          </svg>
          {variablesExpanded ? "Sembunyikan Variabel" : "Variabel Cepat"}
        </button>
        {showEmojiPicker && (
          <div className="absolute left-2 top-[52px] z-30 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <EmojiPicker
              theme={Theme.LIGHT}
              emojiStyle={EmojiStyle.NATIVE}
              width={340}
              height={390}
              onEmojiClick={(emoji) => {
                insertText(emoji.emoji);
                setShowEmojiPicker(false);
              }}
            />
          </div>
        )}
      </div>
      {variablesExpanded && (
        <div className="flex flex-wrap gap-2 border-b border-emerald-100 bg-emerald-50/60 p-2">
          {activeVariables.map((variable, index) => (
            <button
              type="button"
              key={variable}
              onClick={() => insertVariable(variable)}
              className={`rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold ${["border-blue-200 bg-blue-50 text-blue-700", "border-emerald-200 bg-emerald-50 text-emerald-700", "border-violet-200 bg-violet-50 text-violet-700", "border-amber-200 bg-amber-50 text-amber-700", "border-rose-200 bg-rose-50 text-rose-700"][index % 5]}`}
            >{`{{${variable}}}`}</button>
          ))}
        </div>
      )}
      <div
        ref={editorRef}
        dir="ltr"
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => {
          saveSelection();
          onChange(event.currentTarget.innerHTML);
        }}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onFocus={saveSelection}
        onBlur={saveSelection}
        className="min-h-44 p-4 text-left text-sm outline-none"
        style={{
          direction: "ltr",
          unicodeBidi: "plaintext",
          textAlign: "left",
        }}
        data-placeholder="Tulis template pesan..."
      />
    </div>
  );
}

function normalizeDatasetField(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function BroadcastCreatePanel({
  collapsed,
  token,
  onBack,
}: {
  collapsed: boolean;
  token: string;
  onBack: () => void;
}) {
  const [step, setStep] = useState(1);
  const [contacts, setContacts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "Campaign baru",
    body: "",
    instanceId: "",
    delayMs: 1500,
    batchSize: 20,
    scheduledAt: "",
  });
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupContactIds, setGroupContactIds] = useState<string[]>([]);
  const [contactQuery, setContactQuery] = useState("");
  const [targetCount, setTargetCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [manualRows, setManualRows] = useState<any[]>([
    { name: "", phone: "" },
  ]);
  const [syncPreview, setSyncPreview] = useState<any | null>(null);
  const [syncQuery, setSyncQuery] = useState("");
  const [syncSelected, setSyncSelected] = useState<string[]>([]);
  const visibleContacts = contacts.filter((contact) =>
    `${contact.name} ${contact.phone}`
      .toLowerCase()
      .includes(contactQuery.toLowerCase()),
  );
  async function load() {
    const [contactData, groupData, instanceData, campaignData] =
      await Promise.all([
        request<any[]>("/contacts", {}, token),
        request<any[]>("/contact-groups", {}, token),
        request<any[]>("/instances", {}, token),
        request<any[]>("/campaigns", {}, token),
      ]);
    setContacts(contactData);
    setGroups(groupData);
    setInstances(instanceData);
    setCampaigns(campaignData);
    if (!form.instanceId && instanceData[0])
      setForm((current) => ({ ...current, instanceId: instanceData[0].id }));
  }
  useEffect(() => {
    load().catch(() => undefined);
  }, [token]);
  useEffect(() => {
    request<{ total: number }>(
      "/campaigns/preview",
      {
        method: "POST",
        body: JSON.stringify({
          groupIds: selectedGroups,
          contactIds: selectedContacts,
        }),
      },
      token,
    )
      .then((result) => setTargetCount(result.total))
      .catch(() => setTargetCount(0));
  }, [selectedGroups, selectedContacts, token]);
  async function createGroup(event: FormEvent) {
    event.preventDefault();
    if (!groupName.trim()) return;
    try {
      await request(
        "/contact-groups",
        {
          method: "POST",
          body: JSON.stringify({
            name: groupName,
            contactIds: groupContactIds,
          }),
        },
        token,
      );
      setGroupName("");
      setGroupContactIds([]);
      await load();
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Grouping tersimpan",
        showConfirmButton: false,
        timer: 2200,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Grouping gagal",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const rows: any[] = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]],
      );
      const mapped = rows
        .map((row) => {
          const get = (keys: string[]) => {
            const key = Object.keys(row).find((item) =>
              keys.includes(item.toLowerCase().replace(/[^a-z]/g, "")),
            );
            return key ? row[key] : "";
          };
          const custom = Object.fromEntries(
            customFields.map((field) => [field, String(row[field] ?? "")]),
          );
          return {
            name: String(
              get(["name", "nama", "contact", "kontak"]) || "Kontak",
            ),
            phone: String(
              get(["phone", "nomor", "number", "telepon"]) || "",
            ).replace(/\s+/g, ""),
            email: String(get(["email", "mail"]) || ""),
            company: String(get(["company", "perusahaan"]) || ""),
            customFields: custom,
          };
        })
        .filter((item) => item.phone);
      const result = await request<{ imported: number; contacts: any[] }>(
        "/contacts/bulk",
        { method: "POST", body: JSON.stringify({ contacts: mapped }) },
        token,
      );
      setSelectedContacts((current) =>
        Array.from(
          new Set([
            ...current,
            ...result.contacts.map((contact) => contact.id),
          ]),
        ),
      );
      await load();
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `${result.imported} kontak diimpor`,
        showConfirmButton: false,
        timer: 2400,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Import file gagal",
        text:
          error instanceof Error
            ? error.message
            : "Gunakan kolom name/nama dan phone/nomor.",
      });
    }
  }
  async function syncWhatsApp(source: "contacts" | "groups") {
    if (!form.instanceId) {
      await Swal.fire({
        icon: "info",
        title: "Pilih instance",
        text: "Pilih instance pengambil data terlebih dahulu.",
      });
      return;
    }
    let elapsed = 0;
    Swal.fire({
      title:
        source === "groups"
          ? "Membaca anggota group..."
          : "Membaca kontak WhatsApp...",
      html: '<p id="broadcast-sync-progress">Menghubungkan ke instance...</p><p id="broadcast-sync-time" class="mt-2 text-xs text-slate-400">Waktu berjalan: 0 detik</p>',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const timer = window.setInterval(() => {
      elapsed += 1;
      const progress = document.getElementById("broadcast-sync-progress");
      const time = document.getElementById("broadcast-sync-time");
      if (progress && elapsed >= 3)
        progress.textContent =
          source === "groups"
            ? "Membaca group dan peserta..."
            : "Membaca daftar kontak...";
      if (time) time.textContent = `Waktu berjalan: ${elapsed} detik`;
    }, 1000);
    try {
      const preview = await request<any>(
        `/contacts/import/${form.instanceId}/preview`,
        { method: "POST", body: JSON.stringify({ source }) },
        token,
      );
      Swal.close();
      setSyncPreview(preview);
      setSyncQuery("");
      setSyncSelected(
        preview.contacts
          .filter((item: any) => !item.alreadyExists)
          .map((item: any) => item.phone),
      );
    } catch (error) {
      Swal.close();
      await Swal.fire({
        icon: "error",
        title: "Sinkronisasi gagal",
        text:
          error instanceof Error ? error.message : "Periksa koneksi instance.",
      });
    } finally {
      window.clearInterval(timer);
    }
  }
  const visibleSyncContacts = (syncPreview?.contacts ?? []).filter(
    (item: any) =>
      `${item.name} ${item.phone} ${item.groupName ?? ""}`
        .toLowerCase()
        .includes(syncQuery.toLowerCase().trim()),
  );
  function selectSyncVisible(select: boolean) {
    const phones = visibleSyncContacts
      .filter((item: any) => !item.alreadyExists)
      .map((item: any) => item.phone);
    setSyncSelected((current) =>
      select
        ? Array.from(new Set([...current, ...phones]))
        : current.filter((phone) => !phones.includes(phone)),
    );
  }
  async function commitSyncPreview() {
    if (!syncPreview || !syncSelected.length) return;
    try {
      const selected = syncPreview.contacts.filter((item: any) =>
        syncSelected.includes(item.phone),
      );
      await request(
        `/contacts/import/${form.instanceId}/commit`,
        {
          method: "POST",
          body: JSON.stringify({
            source: syncPreview.source,
            contacts: selected,
          }),
        },
        token,
      );
      const contactData = await request<any[]>("/contacts", {}, token);
      const phones = new Set(selected.map((item: any) => String(item.phone)));
      setContacts(contactData);
      setSelectedContacts((current) =>
        Array.from(
          new Set([
            ...current,
            ...contactData
              .filter((contact) => phones.has(contact.phone))
              .map((contact) => contact.id),
          ]),
        ),
      );
      setSyncPreview(null);
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `${selected.length} kontak masuk ke penerima campaign`,
        showConfirmButton: false,
        timer: 2200,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal memasukkan penerima",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    }
  }
  async function addManualContacts() {
    const valid = manualRows.filter(
      (row) => row.name?.trim() && row.phone?.trim(),
    );
    if (!valid.length) return;
    try {
      const result = await request<{ contacts: any[] }>(
        "/contacts/bulk",
        {
          method: "POST",
          body: JSON.stringify({
            contacts: valid.map((row) => ({
              name: row.name,
              phone: row.phone,
              customFields: Object.fromEntries(
                customFields.map((field) => [field, row[field] ?? ""]),
              ),
            })),
          }),
        },
        token,
      );
      setSelectedContacts((current) =>
        Array.from(
          new Set([
            ...current,
            ...result.contacts.map((contact) => contact.id),
          ]),
        ),
      );
      setManualOpen(false);
      setManualRows([{ name: "", phone: "" }]);
      await load();
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `${result.contacts.length} penerima ditambahkan`,
        showConfirmButton: false,
        timer: 2200,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Kontak gagal ditambahkan",
        text:
          error instanceof Error ? error.message : "Periksa nama dan nomor HP.",
      });
    }
  }
  function downloadTemplate() {
    const headers = ["name", "phone", ...customFields];
    const sheet = XLSX.utils.aoa_to_sheet([
      headers,
      ["Nama penerima", "628xxxxxxxxxx", ...customFields.map(() => "")],
    ]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Recipients");
    XLSX.writeFile(book, "template-penerima-broadcast.xlsx");
  }
  async function addCustomField() {
    const result = await Swal.fire({
      title: "Tambah field",
      input: "text",
      inputPlaceholder: "Contoh: kota atau customer_id",
      showCancelButton: true,
      confirmButtonText: "Tambah",
      cancelButtonText: "Batal",
    });
    const value = String(result.value ?? "")
      .trim()
      .replace(/\s+/g, "_");
    if (result.isConfirmed && value && !customFields.includes(value))
      setCustomFields((current) => [...current, value]);
  }
  async function createCampaign() {
    setSaving(true);
    try {
      const campaign = await request<any>(
        "/campaigns",
        {
          method: "POST",
          body: JSON.stringify({
            ...form,
            delayMs: Number(form.delayMs),
            batchSize: Number(form.batchSize),
            groupIds: selectedGroups,
            contactIds: selectedContacts,
            scheduledAt: form.scheduledAt || undefined,
          }),
        },
        token,
      );
      await request(
        `/campaigns/${campaign.id}/queue`,
        { method: "POST" },
        token,
      );
      setStep(4);
      await load();
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Campaign masuk queue",
        showConfirmButton: false,
        timer: 2400,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Broadcast gagal dibuat",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    } finally {
      setSaving(false);
    }
  }
  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} mx-auto max-w-7xl px-6 py-10 transition-all`}
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-5 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
      >
        Kembali ke campaign
      </button>
      <div className="mb-8">
        <p className="text-sm font-semibold text-indigo-600">Create campaign</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
          Buat broadcast
        </h1>
        <p className="mt-3 text-slate-500">
          Tentukan penerima, template, pengaturan, lalu masukkan pesan ke queue.
        </p>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Tambah manual kontak
        </button>
        <button
          type="button"
          onClick={downloadTemplate}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
        >
          Download template Excel
        </button>
        <label className="cursor-pointer rounded-xl border border-indigo-200 px-4 py-2.5 text-sm font-semibold text-indigo-700">
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(event) => importFile(event.target.files?.[0])}
          />
          Import Excel
        </label>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="text-sm font-semibold text-slate-700">
          Sinkronisasi kontak:
        </span>
        <select
          value={form.instanceId}
          onChange={(event) =>
            setForm({ ...form, instanceId: event.target.value })
          }
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Pilih instance</option>
          {instances.map((instance) => (
            <option key={instance.id} value={instance.id}>
              {instance.name} · {instance.engine}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => syncWhatsApp("contacts")}
          className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700"
        >
          Kontak WhatsApp
        </button>
        <button
          type="button"
          onClick={() => syncWhatsApp("groups")}
          className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700"
        >
          Anggota group instance
        </button>
      </div>
      {syncPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Preview kontak WhatsApp
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {syncPreview.total} data ditemukan, {syncPreview.newCount}{" "}
                  baru, {syncPreview.existingCount} sudah tersimpan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSyncPreview(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                Tutup
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
              <input
                value={syncQuery}
                onChange={(event) => setSyncQuery(event.target.value)}
                placeholder="Filter nama, nomor, atau group"
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => selectSyncVisible(true)}
                  className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700"
                >
                  Pilih semua
                </button>
                <button
                  type="button"
                  onClick={() => selectSyncVisible(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  Batal pilih
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {visibleSyncContacts.map((item: any) => (
                <label
                  key={`${item.phone}-${item.groupId ?? "contact"}`}
                  className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-6 py-3 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    disabled={item.alreadyExists}
                    checked={syncSelected.includes(item.phone)}
                    onChange={() =>
                      setSyncSelected((current) =>
                        current.includes(item.phone)
                          ? current.filter((phone) => phone !== item.phone)
                          : [...current, item.phone],
                      )
                    }
                    className="h-4 w-4 accent-indigo-600"
                  />
                  <span className="flex-1">
                    <span className="block font-medium text-slate-900">
                      {item.name || item.phone}
                    </span>
                    <span className="text-sm text-slate-500">
                      {item.phone}
                      {item.groupName ? ` · ${item.groupName}` : ""}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-emerald-600">
                    {item.alreadyExists ? "Sudah ada di kontak" : "Kontak baru"}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
              <p className="text-sm text-slate-500">
                {syncSelected.length} kontak dipilih untuk campaign
              </p>
              <button
                type="button"
                disabled={!syncSelected.length}
                onClick={commitSyncPreview}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                Tambahkan ke penerima campaign
              </button>
            </div>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3">
            <h2 className="font-semibold text-slate-900">
              Editor pesan WYSIWYG
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Format pesan dengan bold, italic, dan list. Gunakan {"{{name}}"}{" "}
              atau {"{{phone}}"} untuk personalisasi.
            </p>
          </div>
          <WysiwygEditor
            value={form.body}
            onChange={(body) => setForm({ ...form, body })}
          />
        </div>
      )}
      <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Preview pesan</h2>
          <p className="mt-1 text-xs text-slate-500">
            Tampilan pesan pada WhatsApp
          </p>
        </div>
        <div
          className="min-h-[360px] space-y-3 bg-[#efeae2] p-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(239,234,226,.82), rgba(239,234,226,.82)), url('/bg-wa.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="mx-auto max-w-md rounded-lg bg-white/90 px-3 py-2 text-xs text-slate-500 shadow-sm">
            Preview penerima
          </div>
          <div className="ml-auto max-w-md rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-4 py-3 text-sm text-slate-800 shadow-sm">
            <p className="whitespace-pre-wrap">
              {form.body || "Tulis pesan untuk melihat preview..."}
            </p>
            <p className="mt-2 text-right text-[10px] text-slate-500">
              10:24 ✓✓
            </p>
          </div>
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-7 grid grid-cols-4 gap-2">
            {["Target", "Template", "Pengaturan", "Queue"].map(
              (label, index) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => index + 1 < step && setStep(index + 1)}
                  className={`rounded-xl px-3 py-3 text-sm font-semibold ${step === index + 1 ? "bg-indigo-600 text-white" : step > index + 1 ? "bg-indigo-50 text-indigo-700" : "bg-slate-50 text-slate-400"}`}
                >
                  {index + 1}. {label}
                </button>
              ),
            )}
          </div>
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Tentukan penerima
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Pilih grouping atau kontak tertentu. Penerima yang sama
                  otomatis digabung.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {groups.map((group) => (
                  <label
                    key={group.id}
                    className={`cursor-pointer rounded-xl border p-4 ${selectedGroups.includes(group.id) ? "border-indigo-500 bg-indigo-50" : "border-slate-200"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group.id)}
                      onChange={() =>
                        setSelectedGroups((current) =>
                          current.includes(group.id)
                            ? current.filter((id) => id !== group.id)
                            : [...current, group.id],
                        )
                      }
                      className="mr-3 accent-indigo-600"
                    />
                    {group.name}
                    <span className="ml-2 text-xs text-slate-400">
                      {group._count?.members ?? 0} kontak
                    </span>
                  </label>
                ))}
                {!groups.length && (
                  <p className="text-sm text-slate-500">
                    Belum ada grouping. Buat dari panel kanan.
                  </p>
                )}
              </div>
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-900">
                    Kontak individual
                  </h3>
                  <input
                    value={contactQuery}
                    onChange={(event) => setContactQuery(event.target.value)}
                    placeholder="Cari nomor..."
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-slate-200">
                  {visibleContacts.map((contact) => (
                    <label
                      key={contact.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() =>
                          setSelectedContacts((current) =>
                            current.includes(contact.id)
                              ? current.filter((id) => id !== contact.id)
                              : [...current, contact.id],
                          )
                        }
                        className="accent-indigo-600"
                      />
                      <span className="flex-1">
                        {contact.name}
                        <span className="ml-2 text-slate-400">
                          {contact.phone}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="button"
                disabled={!selectedGroups.length && !selectedContacts.length}
                onClick={() => setStep(2)}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                Lanjut ke template
              </button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Template pesan
              </h2>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Nama campaign"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              />
              <textarea
                value={form.body}
                onChange={(event) =>
                  setForm({ ...form, body: event.target.value })
                }
                rows={8}
                placeholder="Tulis pesan broadcast... Gunakan {{name}} atau {{phone}}."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={!form.body.trim()}
                  onClick={() => setStep(3)}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Lanjut ke pengaturan
                </button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Pengaturan pengiriman
              </h2>
              <select
                value={form.instanceId}
                onChange={(event) =>
                  setForm({ ...form, instanceId: event.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <option value="">Pilih instance pengirim</option>
                {instances.map((instance) => (
                  <option key={instance.id} value={instance.id}>
                    {instance.name} · {instance.engine} · {instance.status}
                  </option>
                ))}
              </select>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-slate-600">
                  Jeda antar pesan (ms)
                  <input
                    type="number"
                    min={250}
                    value={form.delayMs}
                    onChange={(event) =>
                      setForm({ ...form, delayMs: Number(event.target.value) })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  Ukuran batch
                  <input
                    type="number"
                    min={1}
                    value={form.batchSize}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        batchSize: Number(event.target.value),
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                  />
                </label>
              </div>
              <label className="text-sm text-slate-600">
                Jadwalkan (opsional)
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(event) =>
                    setForm({ ...form, scheduledAt: event.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"
                />
              </label>
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Target: <strong>{targetCount} pilihan</strong>. Pesan akan
                diproses oleh Redis queue secara bertahap.
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={saving || !form.instanceId}
                  onClick={createCampaign}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {saving ? "Memasukkan..." : "Review dan masukkan queue"}
                </button>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Queue broadcast
              </h2>
              <p className="text-sm text-slate-500">
                Campaign sudah diserahkan ke queue. Status pengiriman dapat
                dipantau dari tabel di samping.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setSelectedGroups([]);
                  setSelectedContacts([]);
                  setForm((current) => ({
                    ...current,
                    body: "",
                    name: "Campaign baru",
                  }));
                }}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
              >
                Buat campaign baru
              </button>
            </div>
          )}
        </section>
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Grouping kontak</h2>
            <p className="mt-1 text-sm text-slate-500">
              Buat target reusable untuk broadcast berikutnya.
            </p>
            <form onSubmit={createGroup} className="mt-4 space-y-3">
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Nama grouping"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <select
                multiple
                value={groupContactIds}
                onChange={(event) =>
                  setGroupContactIds(
                    Array.from(
                      event.target.selectedOptions,
                      (option) => option.value,
                    ),
                  )
                }
                className="h-32 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option disabled>Pilih kontak (Ctrl untuk multi-select)</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} · {contact.phone}
                  </option>
                ))}
              </select>
              <button className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                Simpan grouping
              </button>
            </form>
            <div className="mt-4 space-y-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span>{group.name}</span>
                  <span className="text-slate-400">
                    {group._count?.members ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Import Excel / CSV</h2>
            <p className="mt-1 text-sm text-slate-500">
              Kolom yang dikenali: name/nama dan phone/nomor. Email dan company
              opsional.
            </p>
            <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-indigo-300 px-4 py-5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => importFile(event.target.files?.[0])}
              />
              Pilih file untuk diimpor
            </label>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Campaign terakhir</h2>
            <div className="mt-3 space-y-2">
              {campaigns.slice(0, 5).map((campaign) => (
                <div
                  key={campaign.id}
                  className="rounded-lg border border-slate-100 px-3 py-2 text-sm"
                >
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{campaign.name}</span>
                    <span className="text-xs text-indigo-600">
                      {campaign.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {campaign._count?.recipients ?? 0} penerima ·{" "}
                    {campaign.instance?.engine}
                  </p>
                </div>
              ))}
              {!campaigns.length && (
                <p className="text-sm text-slate-400">Belum ada campaign.</p>
              )}
            </div>
          </section>
        </div>
      </div>
      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Tambah penerima manual
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Nama dan nomor HP wajib diisi. Field tambahan tersimpan
                  sebagai data custom.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                Tutup
              </button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addCustomField}
                className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700"
              >
                Tambah field
              </button>
              <button
                type="button"
                onClick={downloadTemplate}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Download template Excel
              </button>
            </div>
            <div className="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-3 py-3">Nama *</th>
                    <th className="px-3 py-3">Nomor HP *</th>
                    {customFields.map((field) => (
                      <th key={field} className="px-3 py-3">
                        {field}
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {manualRows.map((row, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <input
                          value={row.name}
                          onChange={(event) =>
                            setManualRows((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, name: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-2"
                          placeholder="Nama"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.phone}
                          onChange={(event) =>
                            setManualRows((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, phone: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-2"
                          placeholder="628..."
                        />
                      </td>
                      {customFields.map((field) => (
                        <td key={field} className="px-3 py-2">
                          <input
                            value={row[field] ?? ""}
                            onChange={(event) =>
                              setManualRows((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, [field]: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 px-2 py-2"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            setManualRows((current) =>
                              current.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            )
                          }
                          className="text-rose-600"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setManualRows((current) => [
                    ...current,
                    { name: "", phone: "" },
                  ])
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                Tambah baris
              </button>
              <button
                type="button"
                onClick={addManualContacts}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
              >
                Simpan ke penerima
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BroadcastIcon({
  type,
}: {
  type:
    | "device"
    | "contact"
    | "upload"
    | "group"
    | "filter"
    | "text"
    | "template"
    | "media"
    | "document"
    | "settings";
}) {
  const paths: Record<string, string> = {
    device: "M4 5h16v14H4z M8 19v2h8v-2",
    contact: "M16 20a4 4 0 0 0-8 0 M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
    upload: "M12 16V4m0 0L7 9m5-5 5 5 M5 20h14",
    group:
      "M16 20a4 4 0 0 0-8 0 M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M19 8a2 2 0 1 0-2-2",
    filter: "M4 5h16l-6 7v5l-4 2v-7z",
    text: "M5 5h14M5 12h14M5 19h9",
    template: "M6 3h9l3 3v15H6z M9 12h6M9 16h6",
    media: "M4 5h16v14H4z M8 14l2-2 2 2 3-3 3 4",
    document: "M7 3h8l3 3v15H7z M10 13h5M10 17h5",
    settings: "M12 8v8M8 12h8 M4 4h16v16H4z",
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[type].split(" M").map((path, index) => (
        <path key={index} d={`${index ? "M" : ""}${path}`} />
      ))}
    </svg>
  );
}

function BroadcastBuilder({
  collapsed,
  token,
  onBack,
}: {
  collapsed: boolean;
  token: string;
  onBack: () => void;
}) {
  const [step, setStep] = useState(1);
  const [contacts, setContacts] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    name: "Campaign baru",
    instanceId: "",
    body: "",
    delayMs: 1500,
    batchSize: 20,
    scheduledAt: "",
  });
  const [manualOpen, setManualOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([{ name: "", phone: "" }]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    Promise.all([
      request<any[]>("/contacts", {}, token),
      request<any[]>("/instances", {}, token),
    ])
      .then(([contactData, instanceData]) => {
        setContacts(contactData);
        setInstances(instanceData);
        if (instanceData[0])
          setForm((current) => ({
            ...current,
            instanceId: instanceData[0].id,
          }));
      })
      .catch(() => undefined);
  }, [token]);
  const visible = contacts.filter((contact) =>
    `${contact.name} ${contact.phone}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  function toggleContact(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }
  async function addManual() {
    const valid = rows.filter((row) => row.name?.trim() && row.phone?.trim());
    if (!valid.length) return;
    try {
      const result = await request<any>(
        "/contacts/bulk",
        { method: "POST", body: JSON.stringify({ contacts: valid }) },
        token,
      );
      const fresh = await request<any[]>("/contacts", {}, token);
      setContacts(fresh);
      setSelected((current) =>
        Array.from(
          new Set([...current, ...result.contacts.map((item: any) => item.id)]),
        ),
      );
      setManualOpen(false);
      setRows([{ name: "", phone: "" }]);
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Kontak masuk ke penerima",
        showConfirmButton: false,
        timer: 2200,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Kontak gagal ditambahkan",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    }
  }
  async function importExcel(file?: File) {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const data: any[] = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]],
      );
      const mapped = data
        .map((row) => ({
          name: String(row.name ?? row.nama ?? ""),
          phone: String(row.phone ?? row.nomor ?? row.number ?? "").replace(
            /\s+/g,
            "",
          ),
        }))
        .filter((row) => row.name && row.phone);
      const result = await request<any>(
        "/contacts/bulk",
        { method: "POST", body: JSON.stringify({ contacts: mapped }) },
        token,
      );
      const fresh = await request<any[]>("/contacts", {}, token);
      setContacts(fresh);
      setSelected((current) =>
        Array.from(
          new Set([...current, ...result.contacts.map((item: any) => item.id)]),
        ),
      );
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `${result.imported} kontak diparsing`,
        showConfirmButton: false,
        timer: 2200,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Import Excel gagal",
        text: error instanceof Error ? error.message : "Periksa format file.",
      });
    }
  }
  async function submit() {
    if (!form.instanceId || !form.body.trim() || !selected.length) return;
    setSaving(true);
    try {
      const campaign = await request<any>(
        "/campaigns",
        {
          method: "POST",
          body: JSON.stringify({
            ...form,
            delayMs: Number(form.delayMs),
            batchSize: Number(form.batchSize),
            contactIds: selected,
          }),
        },
        token,
      );
      await request(
        `/campaigns/${campaign.id}/queue`,
        { method: "POST" },
        token,
      );
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Campaign masuk queue",
        showConfirmButton: false,
        timer: 2200,
      });
      onBack();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Campaign gagal dibuat",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    } finally {
      setSaving(false);
    }
  }
  function downloadTemplate() {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["name", "phone"],
      ["Nama penerima", "628xxxxxxxxxx"],
    ]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Recipients");
    XLSX.writeFile(book, "template-penerima-broadcast.xlsx");
  }
  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} mx-auto max-w-[1500px] px-6 py-8 transition-all`}
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-semibold text-indigo-600"
      >
        Kembali ke campaign
      </button>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
        <main className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-7 flex items-center gap-3">
            <span className="text-lg">Buat Broadcast Baru</span>
          </div>
          <div className="mb-8 flex items-center gap-2">
            {["Pesan", "Penerima", "Jadwal", "Review"].map((label, index) => (
              <div key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${step === index + 1 ? "bg-emerald-600 text-white" : step > index + 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-xs ${step === index + 1 ? "font-semibold text-emerald-700" : "text-slate-500"}`}
                >
                  {label}
                </span>
                {index < 3 && <span className="h-px flex-1 bg-slate-200" />}
              </div>
            ))}
          </div>
          <section className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                1. Pilih Perangkat (Device)
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Pilih perangkat WhatsApp yang akan digunakan untuk mengirim
                broadcast.
              </p>
              <select
                value={form.instanceId}
                onChange={(event) =>
                  setForm({ ...form, instanceId: event.target.value })
                }
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
              >
                <option value="">Pilih device</option>
                {instances.map((instance) => (
                  <option key={instance.id} value={instance.id}>
                    {instance.name} · {instance.engine} · {instance.status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  2. Pilih Penerima
                </h2>
                <span className="text-xs font-semibold text-emerald-600">
                  {selected.length} kontak dipilih
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setManualOpen(true)}
                  className="rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white"
                >
                  Kontak Manual
                </button>
                <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2.5 text-center text-xs font-semibold text-slate-600">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(event) => importExcel(event.target.files?.[0])}
                  />
                  Upload File
                </label>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600"
                >
                  Group Kontak
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600"
                >
                  Filter Kontak
                </button>
              </div>
              <div className="mt-3 rounded-xl border border-slate-200">
                <div className="flex gap-2 border-b border-slate-100 p-3">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari kontak atau nomor..."
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSelected(visible.map((contact) => contact.id))
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                  >
                    Pilih semua
                  </button>
                </div>
                <div className="max-h-52 overflow-auto">
                  {visible.map((contact) => (
                    <label
                      key={contact.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-sm last:border-0"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(contact.id)}
                        onChange={() => toggleContact(contact.id)}
                        className="accent-emerald-600"
                      />
                      <span className="flex-1">
                        {contact.name}
                        <span className="ml-2 text-xs text-slate-400">
                          {contact.phone}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  3. Pesan
                </h2>
                <span className="text-xs text-slate-400">
                  {form.body.length}/4096
                </span>
              </div>
              <div className="mt-3">
                <WysiwygEditor
                  value={form.body}
                  onChange={(body) => setForm({ ...form, body })}
                />
              </div>
            </div>
            <details className="rounded-xl border border-slate-200 px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                Pengaturan Lanjutan
              </summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-slate-500">
                  Jeda antar pesan (ms)
                  <input
                    type="number"
                    min={250}
                    value={form.delayMs}
                    onChange={(event) =>
                      setForm({ ...form, delayMs: Number(event.target.value) })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Ukuran batch
                  <input
                    type="number"
                    min={1}
                    value={form.batchSize}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        batchSize: Number(event.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </details>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm"
              >
                Simpan Draft
              </button>
              <button
                type="button"
                disabled={
                  saving ||
                  !form.instanceId ||
                  !form.body.trim() ||
                  !selected.length
                }
                onClick={submit}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {saving ? "Memproses..." : "Kirim Campaign"}
              </button>
            </div>
          </section>
        </main>
        <aside className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Preview Pesan</h2>
              <div className="mt-3 flex border-b border-slate-100 text-xs">
                <button
                  type="button"
                  className="border-b-2 border-emerald-500 px-3 pb-2 font-semibold text-emerald-700"
                >
                  WhatsApp (Android)
                </button>
                <button type="button" className="px-3 pb-2 text-slate-400">
                  WhatsApp (iOS)
                </button>
              </div>
            </div>
            <div
              className="min-h-[430px] bg-[#efeae2] p-5"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(239,234,226,.72), rgba(239,234,226,.72)), url('/bg-wa.png')",
                backgroundSize: "cover",
              }}
            >
              <div className="mx-auto max-w-sm rounded-xl bg-[#d9fdd3] px-4 py-3 text-sm text-slate-800 shadow-sm">
                <p className="whitespace-pre-wrap">
                  {form.body ||
                    "Halo (nama),\n\nTulis pesan untuk melihat preview..."}
                </p>
                <p className="mt-2 text-right text-[10px] text-slate-500">
                  10:24 ✓✓
                </p>
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">
              Tambahkan Media{" "}
              <span className="text-xs font-normal text-slate-400">
                (Opsional)
              </span>
            </h2>
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
              Seret & lepas file di sini atau klik untuk memilih
              <br />
              <span className="text-[10px]">
                Format JPG, PNG, PDF, MP4 (maks. 16MB)
              </span>
            </div>
          </section>
        </aside>
      </div>
      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Kontak Manual</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Nama dan nomor HP wajib diisi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                Tutup
              </button>
            </div>
            <div className="mt-5 max-h-80 overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3">Nama *</th>
                    <th className="px-3 py-3">Nomor HP *</th>
                    <th className="px-3 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <input
                          value={row.name}
                          onChange={(event) =>
                            setRows((current) =>
                              current.map((item, rowIndex) =>
                                rowIndex === index
                                  ? { ...item, name: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-2"
                          placeholder="Nama"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.phone}
                          onChange={(event) =>
                            setRows((current) =>
                              current.map((item, rowIndex) =>
                                rowIndex === index
                                  ? { ...item, phone: event.target.value }
                                  : item,
                              ),
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-2"
                          placeholder="628..."
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            setRows((current) =>
                              current.filter(
                                (_, rowIndex) => rowIndex !== index,
                              ),
                            )
                          }
                          className="text-rose-600"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-between">
              <button
                type="button"
                onClick={() =>
                  setRows((current) => [...current, { name: "", phone: "" }])
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                Tambah baris
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  Download template Excel
                </button>
                <button
                  type="button"
                  onClick={addManual}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Simpan ke penerima
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BroadcastBuilderV2({
  collapsed,
  token,
  onBack,
}: {
  collapsed: boolean;
  token: string;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<"system" | "dataset">("system");
  const [contacts, setContacts] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([{ name: "", phone: "" }]);
  const [datasetRecipients, setDatasetRecipients] = useState<any[]>([]);
  const [form, setForm] = useState({
    instanceId: "",
    body: "",
    delayMs: 1500,
    batchSize: 20,
  });
  const [syncPreview, setSyncPreview] = useState<any | null>(null);
  const [syncSelected, setSyncSelected] = useState<string[]>([]);
  const [mapping, setMapping] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([
      request<any[]>("/contacts", {}, token),
      request<any[]>("/instances", {}, token),
    ])
      .then(([contactData, instanceData]) => {
        setContacts(contactData);
        setInstances(instanceData);
        if (instanceData[0])
          setForm((current) => ({
            ...current,
            instanceId: instanceData[0].id,
          }));
      })
      .catch(() => undefined);
  }, [token]);
  const visible = contacts.filter((item) =>
    `${item.name} ${item.phone}`.toLowerCase().includes(query.toLowerCase()),
  );
  async function sync(source: "contacts" | "groups") {
    if (!form.instanceId)
      return Swal.fire({
        icon: "info",
        title: "Pilih instance",
        text: "Pilih instance untuk sinkronisasi.",
      });
    let seconds = 0;
    Swal.fire({
      title: "Menyinkronkan kontak...",
      html: '<p id="sync-status">Menghubungkan ke instance...</p><p id="sync-seconds">0 detik</p>',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const timer = window.setInterval(() => {
      seconds += 1;
      const status = document.getElementById("sync-status");
      const elapsed = document.getElementById("sync-seconds");
      if (status)
        status.textContent =
          source === "groups"
            ? "Membaca anggota group..."
            : "Membaca kontak WhatsApp...";
      if (elapsed) elapsed.textContent = `${seconds} detik`;
    }, 1000);
    try {
      const result = await request<any>(
        `/contacts/import/${form.instanceId}/preview`,
        { method: "POST", body: JSON.stringify({ source }) },
        token,
      );
      Swal.close();
      setSyncPreview(result);
      setSyncSelected(
        result.contacts
          .filter((item: any) => !item.alreadyExists)
          .map((item: any) => item.phone),
      );
    } catch (error) {
      Swal.close();
      await Swal.fire({
        icon: "error",
        title: "Sinkronisasi gagal",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    } finally {
      window.clearInterval(timer);
    }
  }
  async function commitSync() {
    if (!syncPreview) return;
    const picked = syncPreview.contacts.filter((item: any) =>
      syncSelected.includes(item.phone),
    );
    await request(
      `/contacts/import/${form.instanceId}/commit`,
      {
        method: "POST",
        body: JSON.stringify({ source: syncPreview.source, contacts: picked }),
      },
      token,
    );
    const fresh = await request<any[]>("/contacts", {}, token);
    setContacts(fresh);
    setSelected((current) =>
      Array.from(
        new Set([
          ...current,
          ...fresh
            .filter((item) =>
              picked.some((pickedItem: any) => pickedItem.phone === item.phone),
            )
            .map((item) => item.id),
        ]),
      ),
    );
    setSyncPreview(null);
    await Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Kontak masuk ke kontak sistem",
      showConfirmButton: false,
      timer: 2200,
    });
  }
  async function importExcel(file?: File) {
    if (!file) return;
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const data: any[] = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]],
    );
    const headers = Object.keys(data[0] ?? {});
    setMapping({ data, headers });
  }
  async function commitImport(mappingValue: { name: string; phone: string }) {
    if (!mapping) return;
    const payload = mapping.data
      .map((row: any) => ({
        name: String(row[mappingValue.name] ?? ""),
        phone: String(row[mappingValue.phone] ?? "").replace(/\s+/g, ""),
        customFields: Object.fromEntries(
          fields.map((field) => [field, String(row[field] ?? "")]),
        ),
      }))
      .filter((item: any) => item.name && item.phone);
    const result = await request<any>(
      "/contacts/bulk",
      { method: "POST", body: JSON.stringify({ contacts: payload }) },
      token,
    );
    const fresh = await request<any[]>("/contacts", {}, token);
    setContacts(fresh);
    setSelected((current) =>
      Array.from(
        new Set([...current, ...result.contacts.map((item: any) => item.id)]),
      ),
    );
    setMapping(null);
    await Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `${result.imported} baris masuk ke data set`,
      showConfirmButton: false,
      timer: 2200,
    });
  }
  async function addManual() {
    const payload = rows
      .filter((row) => row.name && row.phone)
      .map((row) => ({
        name: row.name,
        phone: row.phone,
        customFields: Object.fromEntries(
          fields.map((field) => [field, row[field] ?? ""]),
        ),
      }));
    const result = await request<any>(
      "/contacts/bulk",
      { method: "POST", body: JSON.stringify({ contacts: payload }) },
      token,
    );
    const fresh = await request<any[]>("/contacts", {}, token);
    setContacts(fresh);
    setSelected((current) =>
      Array.from(
        new Set([...current, ...result.contacts.map((item: any) => item.id)]),
      ),
    );
    setRows([{ name: "", phone: "" }]);
    await Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Data set ditambahkan ke penerima",
      showConfirmButton: false,
      timer: 2200,
    });
  }
  function downloadTemplate() {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["name", "phone", ...fields],
      ["Nama penerima", "628xxxxxxxxxx", ...fields.map(() => "")],
    ]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Data Set");
    XLSX.writeFile(book, "template-data-set-broadcast.xlsx");
  }
  async function addField() {
    const result = await Swal.fire({
      title: "Tambah field data set",
      input: "text",
      inputPlaceholder: "Contoh: kota, produk, atau customer_id",
      showCancelButton: true,
      confirmButtonText: "Tambah",
    });
    const field = String(result.value ?? "")
      .trim()
      .replace(/\s+/g, "_");
    if (result.isConfirmed && field && !fields.includes(field))
      setFields((current) => [...current, field]);
  }
  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} mx-auto max-w-[1500px] px-6 py-8 transition-all`}
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-semibold text-indigo-600"
      >
        Kembali ke campaign
      </button>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <main className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-900">
              Buat Broadcast Baru
            </h1>
            <span className="text-xs text-slate-500">
              Penerima: {selected.length}
            </span>
          </div>
          <div className="mb-7 flex items-center gap-2">
            {["Pesan", "Penerima", "Jadwal", "Review"].map((label, index) => (
              <div key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${index === 0 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  {index + 1}
                </span>
                <span className="text-xs text-slate-600">{label}</span>
                {index < 3 && <span className="h-px flex-1 bg-slate-200" />}
              </div>
            ))}
          </div>
          <label className="block text-sm font-semibold text-slate-800">
            Pilih perangkat{" "}
            <select
              value={form.instanceId}
              onChange={(event) =>
                setForm({ ...form, instanceId: event.target.value })
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
            >
              <option value="">Pilih device</option>
              {instances.map((instance) => (
                <option key={instance.id} value={instance.id}>
                  {instance.name} · {instance.engine} · {instance.status}
                </option>
              ))}
            </select>
          </label>
          <section className="mt-7">
            <h2 className="text-sm font-semibold text-slate-900">
              Pilih penerima
            </h2>
            <div className="mt-3 flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setTab("system")}
                className={`px-4 py-3 text-sm font-semibold ${tab === "system" ? "border-b-2 border-emerald-600 text-emerald-700" : "text-slate-500"}`}
              >
                Kontak sistem
              </button>
              <button
                type="button"
                onClick={() => setTab("dataset")}
                className={`px-4 py-3 text-sm font-semibold ${tab === "dataset" ? "border-b-2 border-emerald-600 text-emerald-700" : "text-slate-500"}`}
              >
                Data set
              </button>
            </div>
            {tab === "system" ? (
              <div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari nama atau nomor HP"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setSelected(visible.map((item) => item.id))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                  >
                    Pilih semua
                  </button>
                </div>
                <div className="mt-3 max-h-52 overflow-auto rounded-xl border border-slate-200">
                  {visible.map((contact) => (
                    <label
                      key={contact.id}
                      className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(contact.id)}
                        onChange={() =>
                          setSelected((current) =>
                            current.includes(contact.id)
                              ? current.filter((id) => id !== contact.id)
                              : [...current, contact.id],
                          )
                        }
                        className="accent-emerald-600"
                      />
                      <span className="flex-1 font-medium text-slate-800">
                        {contact.name}
                        <span className="ml-2 font-normal text-slate-400">
                          {contact.phone}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => sync("contacts")}
                    className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700"
                  >
                    Sinkron kontak WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => sync("groups")}
                    className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700"
                  >
                    Sinkron anggota group
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setRows((current) => [
                        ...current,
                        { name: "", phone: "" },
                      ])
                    }
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Tambah baris
                  </button>
                  <button
                    type="button"
                    onClick={addField}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                  >
                    Tambah field
                  </button>
                  <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(event) => importExcel(event.target.files?.[0])}
                    />
                    Import Excel
                  </label>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                  >
                    Download template
                  </button>
                </div>
                <div className="mt-3 overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-3">Nama *</th>
                        <th className="px-3 py-3">Nomor HP *</th>
                        {fields.map((field) => (
                          <th key={field} className="px-3 py-3">
                            {field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={index} className="border-t border-slate-100">
                          <td className="px-2 py-2">
                            <input
                              value={row.name}
                              onChange={(event) =>
                                setRows((current) =>
                                  current.map((item, rowIndex) =>
                                    rowIndex === index
                                      ? { ...item, name: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={row.phone}
                              onChange={(event) =>
                                setRows((current) =>
                                  current.map((item, rowIndex) =>
                                    rowIndex === index
                                      ? { ...item, phone: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                            />
                          </td>
                          {fields.map((field) => (
                            <td key={field} className="px-2 py-2">
                              <input
                                value={row[field] ?? ""}
                                onChange={(event) =>
                                  setRows((current) =>
                                    current.map((item, rowIndex) =>
                                      rowIndex === index
                                        ? {
                                            ...item,
                                            [field]: event.target.value,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={addManual}
                  className="mt-3 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Simpan data set ke penerima
                </button>
              </div>
            )}
          </section>
          <section className="mt-7">
            <h2 className="text-sm font-semibold text-slate-900">Pesan</h2>
            <div className="mt-3">
              <WysiwygEditor
                value={form.body}
                onChange={(body) => setForm({ ...form, body })}
              />
            </div>
          </section>
          <details className="mt-5 rounded-xl border border-slate-200 px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Pengaturan lanjutan
            </summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                type="number"
                min={250}
                value={form.delayMs}
                onChange={(event) =>
                  setForm({ ...form, delayMs: Number(event.target.value) })
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={1}
                value={form.batchSize}
                onChange={(event) =>
                  setForm({ ...form, batchSize: Number(event.target.value) })
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </details>
        </main>
        <aside className="flex justify-center">
          <div className="w-full max-w-[340px] overflow-hidden rounded-[28px] border-[8px] border-slate-900 bg-[#efeae2] shadow-xl">
            <div className="border-b border-slate-200 bg-white px-4 py-3 text-xs font-semibold">
              Preview Pesan
            </div>
            <div
              className="min-h-[560px] bg-[#efeae2] p-4"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(239,234,226,.7), rgba(239,234,226,.7)), url('/bg-wa.png')",
                backgroundSize: "cover",
              }}
            >
              <div className="mt-5 rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-3 text-sm text-slate-800 shadow">
                <p className="whitespace-pre-wrap">
                  {form.body ||
                    "Halo (nama),\n\nTulis pesan untuk melihat preview..."}
                </p>
                <p className="mt-2 text-right text-[10px] text-slate-500">
                  10:24 ✓✓
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
      {syncPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[85vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-6">
            <h2 className="text-lg font-semibold">
              Preview hasil sinkronisasi
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pilih data yang ingin dimasukkan ke kontak sistem.
            </p>
            <div className="mt-4 overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3">Pilih</th>
                    <th className="px-3 py-3">Nama</th>
                    <th className="px-3 py-3">Nomor HP</th>
                    <th className="px-3 py-3">Group</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {syncPreview.contacts.map((item: any) => (
                    <tr
                      key={`${item.phone}-${item.groupId ?? "contact"}`}
                      className="border-t border-slate-100"
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          disabled={item.alreadyExists}
                          checked={syncSelected.includes(item.phone)}
                          onChange={() =>
                            setSyncSelected((current) =>
                              current.includes(item.phone)
                                ? current.filter(
                                    (phone) => phone !== item.phone,
                                  )
                                : [...current, item.phone],
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-3">{item.name}</td>
                      <td className="px-3 py-3">{item.phone}</td>
                      <td className="px-3 py-3">{item.groupName ?? "-"}</td>
                      <td className="px-3 py-3">
                        {item.alreadyExists ? "Sudah ada" : "Kontak baru"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSyncPreview(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={commitSync}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Masukkan yang dipilih
              </button>
            </div>
          </div>
        </div>
      )}
      {mapping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6">
            <h2 className="text-lg font-semibold">Mapping kolom Excel</h2>
            <p className="mt-1 text-sm text-slate-500">
              Tentukan kolom sumber untuk nama dan nomor HP.
            </p>
            <div className="mt-4 grid gap-3">
              <label className="text-sm">
                Kolom nama
                <select
                  id="mapping-name"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  {mapping.headers.map((header: string) => (
                    <option key={header}>{header}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Kolom nomor HP
                <select
                  id="mapping-phone"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  {mapping.headers.map((header: string) => (
                    <option key={header}>{header}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMapping(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() =>
                  commitImport({
                    name: (
                      document.getElementById(
                        "mapping-name",
                      ) as HTMLSelectElement
                    ).value,
                    phone: (
                      document.getElementById(
                        "mapping-phone",
                      ) as HTMLSelectElement
                    ).value,
                  })
                }
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Import data set
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BroadcastBuilderV3({
  collapsed,
  token,
  onBack,
}: {
  collapsed: boolean;
  token: string;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<"system" | "dataset">("dataset");
  const [rows, setRows] = useState<any[]>([{ name: "", phone: "" }]);
  const [fields, setFields] = useState<string[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [instances, setInstances] = useState<any[]>([]);
  const [instanceId, setInstanceId] = useState("");
  const [body, setBody] = useState("");
  const [mapping, setMapping] = useState({ name: "", phone: "" });
  useEffect(() => {
    document.body.dataset.broadcastFields = fields.join(",");
    window.dispatchEvent(new CustomEvent("broadcast-fields"));
    return () => {
      delete document.body.dataset.broadcastFields;
    };
  }, [fields]);
  useEffect(() => {
    if (importRows.length)
      setFields(
        headers.filter(
          (header) => header !== mapping.name && header !== mapping.phone,
        ),
      );
  }, [headers, mapping.name, mapping.phone, importRows.length]);
  useEffect(() => {
    if (
      importRows.length &&
      headers.some((header) => normalizeDatasetField(header) !== header)
    ) {
      const normalizedHeaders = headers.map(normalizeDatasetField);
      setHeaders(normalizedHeaders);
      setMapping((current) => ({
        name: normalizeDatasetField(current.name),
        phone: normalizeDatasetField(current.phone),
      }));
      setImportRows(
        importRows.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
              normalizeDatasetField(key),
              value,
            ]),
          ),
        ),
      );
    }
  }, [importRows.length, headers]);
  useEffect(() => {
    Promise.all([
      request<any[]>("/contacts", {}, token),
      request<any[]>("/instances", {}, token),
    ])
      .then(([contactData, instanceData]) => {
        setContacts(contactData);
        setInstances(instanceData);
        if (instanceData[0]) setInstanceId(instanceData[0].id);
      })
      .catch(() => undefined);
  }, [token]);
  const visible = contacts.filter((item) =>
    `${item.name} ${item.phone}`.toLowerCase().includes(query.toLowerCase()),
  );
  async function parseExcel(file?: File) {
    if (!file) return;
    const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const data: any[] = XLSX.utils.sheet_to_json(
      book.Sheets[book.SheetNames[0]],
    );
    const fileHeaders = Object.keys(data[0] ?? {});
    setHeaders(fileHeaders);
    setImportRows(data);
    setMapping({
      name:
        fileHeaders.find((header) => /name|nama/i.test(header)) ??
        fileHeaders[0] ??
        "",
      phone:
        fileHeaders.find((header) =>
          /phone|nomor|number|telepon/i.test(header),
        ) ??
        fileHeaders[1] ??
        "",
    });
  }
  function applyImport() {
    const parsed = importRows
      .map((row) => ({
        name: String(row[mapping.name] ?? "").trim(),
        phone: String(row[mapping.phone] ?? "")
          .replace(/\s+/g, "")
          .trim(),
        ...Object.fromEntries(
          fields.map((field) => [field, String(row[field] ?? "")]),
        ),
      }))
      .filter((row) => row.name && row.phone);
    setRows(parsed);
    setImportRows([]);
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `${parsed.length} penerima tampil di Data set`,
      showConfirmButton: false,
      timer: 2200,
    });
  }
  function addManualRows() {
    const valid = rows.filter((row) => row.name?.trim() && row.phone?.trim());
    setRows([...valid, { name: "", phone: "" }]);
  }
  async function addField() {
    const result = await Swal.fire({
      title: "Tambah field Data set",
      input: "text",
      showCancelButton: true,
      confirmButtonText: "Tambah",
    });
    const field = String(result.value ?? "")
      .trim()
      .replace(/\s+/g, "_");
    if (result.isConfirmed && field && !fields.includes(field)) {
      setFields([...fields, field]);
      setRows(rows.map((row) => ({ ...row, [field]: row[field] ?? "" })));
    }
  }
  function downloadTemplate() {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["name", "phone", ...fields],
      ["Nama penerima", "628xxxxxxxxxx", ...fields.map(() => "")],
    ]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Data set");
    XLSX.writeFile(book, "template-data-set-broadcast.xlsx");
  }
  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} mx-auto max-w-[1500px] px-6 py-8 transition-all`}
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-semibold text-indigo-600"
      >
        Kembali ke campaign
      </button>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            Buat Broadcast Baru
          </h1>
          <label className="mt-5 block text-sm font-semibold">
            Pilih perangkat
            <select
              value={instanceId}
              onChange={(event) => setInstanceId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
            >
              <option value="">Pilih instance</option>
              {instances.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.engine} · {item.status}
                </option>
              ))}
            </select>
          </label>
          <section className="mt-8">
            <h2 className="text-sm font-semibold">Pilih penerima</h2>
            <div className="mt-3 flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setTab("system")}
                className={`px-4 py-3 text-sm font-semibold ${tab === "system" ? "border-b-2 border-emerald-600 text-emerald-700" : "text-slate-500"}`}
              >
                Kontak sistem
              </button>
              <button
                type="button"
                onClick={() => setTab("dataset")}
                className={`px-4 py-3 text-sm font-semibold ${tab === "dataset" ? "border-b-2 border-emerald-600 text-emerald-700" : "text-slate-500"}`}
              >
                Data set{" "}
                <span className="ml-1 text-xs">
                  {rows.filter((row) => row.name && row.phone).length}
                </span>
              </button>
            </div>
            {tab === "system" ? (
              <div className="mt-4">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari kontak atau nomor HP"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-slate-200">
                  {visible.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={() =>
                          setSelected((current) =>
                            current.includes(item.id)
                              ? current.filter((id) => id !== item.id)
                              : [...current, item.id],
                          )
                        }
                        className="accent-emerald-600"
                      />
                      <span>
                        {item.name}
                        <span className="ml-2 text-slate-400">
                          {item.phone}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setRows([...rows, { name: "", phone: "" }])}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Tambah baris
                  </button>
                  <button
                    type="button"
                    onClick={addField}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    Tambah field
                  </button>
                  <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(event) => parseExcel(event.target.files?.[0])}
                    />
                    Import Excel
                  </label>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    Download template
                  </button>
                </div>
                {importRows.length > 0 && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold">
                      Mapping Excel sebelum masuk Data set
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs">
                        Kolom nama
                        <select
                          value={mapping.name}
                          onChange={(event) =>
                            setMapping({ ...mapping, name: event.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                        >
                          {headers.map((header) => (
                            <option key={header}>{header}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs">
                        Kolom nomor HP
                        <select
                          value={mapping.phone}
                          onChange={(event) =>
                            setMapping({
                              ...mapping,
                              phone: event.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                        >
                          {headers.map((header) => (
                            <option key={header}>{header}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={applyImport}
                      className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Tampilkan hasil parsing
                    </button>
                  </div>
                )}
                <div className="mt-3 max-w-full overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[900px] w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-3">Nama *</th>
                        <th className="px-3 py-3">Nomor HP *</th>
                        {fields.map((field) => (
                          <th key={field} className="px-3 py-3">
                            {field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={index} className="border-t border-slate-100">
                          <td className="px-2 py-2">
                            <input
                              value={row.name}
                              onChange={(event) =>
                                setRows((current) =>
                                  current.map((item, rowIndex) =>
                                    rowIndex === index
                                      ? { ...item, name: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              className="w-full min-w-[180px] rounded-lg border border-slate-200 px-2 py-2"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={row.phone}
                              onChange={(event) =>
                                setRows((current) =>
                                  current.map((item, rowIndex) =>
                                    rowIndex === index
                                      ? { ...item, phone: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              className="w-full min-w-[180px] rounded-lg border border-slate-200 px-2 py-2"
                            />
                          </td>
                          {fields.map((field) => (
                            <td key={field} className="px-2 py-2">
                              <input
                                value={row[field] ?? ""}
                                onChange={(event) =>
                                  setRows((current) =>
                                    current.map((item, rowIndex) =>
                                      rowIndex === index
                                        ? {
                                            ...item,
                                            [field]: event.target.value,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                                className="w-full min-w-[180px] rounded-lg border border-slate-200 px-2 py-2"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    {rows.filter((row) => row.name && row.phone).length}{" "}
                    penerima Data set siap digunakan
                  </span>
                  <button
                    type="button"
                    onClick={addManualRows}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Simpan perubahan tabel
                  </button>
                </div>
              </div>
            )}
          </section>
          <section className="mt-8">
            <h2 className="text-sm font-semibold">Pesan</h2>
            <div className="mt-3">
              <WysiwygEditor value={body} onChange={setBody} />
            </div>
          </section>
        </main>
        <aside className="flex justify-center">
          <div className="w-full max-w-[340px] overflow-hidden rounded-[28px] border-[8px] border-slate-900 bg-[#efeae2] shadow-xl">
            <div className="bg-white px-4 py-3 text-xs font-semibold">
              Preview Pesan
            </div>
            <div
              className="min-h-[560px] bg-[#efeae2] p-4"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(239,234,226,.7), rgba(239,234,226,.7)), url('/bg-wa.png')",
                backgroundSize: "cover",
              }}
            >
              <div className="mt-5 rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-3 text-sm">
                <p className="whitespace-pre-wrap">
                  {body || "Tulis pesan untuk melihat preview..."}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function BroadcastBuilderFlow({
  collapsed,
  token,
  onBack,
}: {
  collapsed: boolean;
  token: string;
  onBack: () => void;
}) {
  const [step, setStep] = useState(1);
  const [instances, setInstances] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([{ name: "", phone: "" }]);
  const [fields, setFields] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [name, setName] = useState("Campaign baru");
  const [instanceId, setInstanceId] = useState("");
  const [delayMs, setDelayMs] = useState(1500);
  const [batchSize, setBatchSize] = useState(20);
  const [scheduledAt, setScheduledAt] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({ name: "", phone: "" });
  useEffect(() => {
    Promise.all([
      request<any[]>("/instances", {}, token),
      request<any[]>("/contacts", {}, token),
    ])
      .then(([instanceData, contactData]) => {
        setInstances(instanceData);
        setContacts(contactData);
        if (instanceData[0]) setInstanceId(instanceData[0].id);
      })
      .catch(() => undefined);
  }, [token]);
  useEffect(() => {
    document.body.dataset.broadcastFields = fields.join(",");
    window.dispatchEvent(new CustomEvent("broadcast-fields"));
    return () => {
      delete document.body.dataset.broadcastFields;
    };
  }, [fields]);
  const validRows = rows.filter(
    (row) => String(row.name ?? "").trim() && String(row.phone ?? "").trim(),
  );
  const visibleContacts = contacts.filter((contact) =>
    `${contact.name} ${contact.phone}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  function addRow() {
    setRows((current) => [
      ...current,
      {
        name: "",
        phone: "",
        ...Object.fromEntries(fields.map((field) => [field, ""])),
      },
    ]);
  }
  async function addField() {
    const result = await Swal.fire({
      title: "Tambah field Data set",
      input: "text",
      inputPlaceholder: "Contoh: customer_id atau tanggal lahir",
      showCancelButton: true,
      confirmButtonText: "Tambah",
      cancelButtonText: "Batal",
    });
    const field = normalizeDatasetField(String(result.value ?? ""));
    if (result.isConfirmed && field && !fields.includes(field)) {
      setFields((current) => [...current, field]);
      setRows((current) =>
        current.map((row) => ({ ...row, [field]: row[field] ?? "" })),
      );
    }
  }
  async function importExcel(file?: File) {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const data: any[] = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]],
      );
      const headers = Object.keys(data[0] ?? {}).map(normalizeDatasetField);
      const normalized = data.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            normalizeDatasetField(key),
            value,
          ]),
        ),
      );
      setImportHeaders(headers);
      setImportPreview(normalized);
      setMapping({
        name:
          headers.find((item) => item === "name" || item === "nama") ??
          headers[0] ??
          "",
        phone:
          headers.find((item) =>
            ["phone", "nomor_hp", "nomor", "number"].includes(item),
          ) ??
          headers[1] ??
          "",
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Import Excel gagal",
        text: error instanceof Error ? error.message : "Periksa format file.",
      });
    }
  }
  function applyImport() {
    if (!importPreview) return;
    const extra = importHeaders.filter(
      (header) => header !== mapping.name && header !== mapping.phone,
    );
    setFields((current) => Array.from(new Set([...current, ...extra])));
    setRows(
      importPreview
        .map((item) => ({
          name: String(item[mapping.name] ?? "").trim(),
          phone: String(item[mapping.phone] ?? "")
            .replace(/\s+/g, "")
            .trim(),
          ...Object.fromEntries(
            extra.map((field) => [field, String(item[field] ?? "")]),
          ),
        }))
        .filter((item) => item.name && item.phone),
    );
    setImportPreview(null);
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Data set tampil di tabel",
      showConfirmButton: false,
      timer: 2200,
    });
  }
  function downloadTemplate() {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["name", "phone", ...fields],
      ["Nama penerima", "628xxxxxxxxxx", ...fields.map(() => "")],
    ]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Data Set");
    XLSX.writeFile(book, "template-data-set-broadcast.xlsx");
  }
  async function submit() {
    if (
      !instanceId ||
      !body.trim() ||
      (!selectedContacts.length && !validRows.length)
    )
      return;
    setSaving(true);
    try {
      let contactIds = [...selectedContacts];
      if (validRows.length) {
        const result = await request<any>(
          "/contacts/bulk",
          {
            method: "POST",
            body: JSON.stringify({
              contacts: validRows.map((row) => ({
                name: row.name,
                phone: row.phone,
                customFields: Object.fromEntries(
                  fields.map((field) => [field, row[field] ?? ""]),
                ),
              })),
            }),
          },
          token,
        );
        contactIds = Array.from(
          new Set([
            ...contactIds,
            ...result.contacts.map((item: any) => item.id),
          ]),
        );
      }
      const normalizedBody = body
        .replaceAll("[NAMA]", "{{name}}")
        .replaceAll("[NOMOR_HP]", "{{phone}}");
      const campaign = await request<any>(
        "/campaigns",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            instanceId,
            body: normalizedBody,
            delayMs: Number(delayMs),
            batchSize: Number(batchSize),
            scheduledAt: scheduledAt || undefined,
            contactIds,
          }),
        },
        token,
      );
      await request(
        `/campaigns/${campaign.id}/queue`,
        { method: "POST" },
        token,
      );
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Campaign masuk ke antrean",
        showConfirmButton: false,
        timer: 2400,
      });
      onBack();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Broadcast gagal dibuat",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    } finally {
      setSaving(false);
    }
  }
  const stepNames = ["Pesan", "Penerima", "Jadwal", "Review"];
  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} mx-auto max-w-[1500px] px-6 py-8 transition-all`}
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-semibold text-indigo-600"
      >
        Kembali ke campaign
      </button>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            Buat broadcast
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Susun pesan, penerima, jadwal, lalu masukkan ke antrean pengiriman.
          </p>
          <div className="my-7 flex items-center gap-2">
            {stepNames.map((label, index) => (
              <div key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${step === index + 1 ? "bg-indigo-600 text-white" : step > index + 1 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-xs ${step === index + 1 ? "font-semibold text-indigo-700" : "text-slate-500"}`}
                >
                  {label}
                </span>
                {index < 3 && <span className="h-px flex-1 bg-slate-200" />}
              </div>
            ))}
          </div>
          {step === 1 && (
            <section className="space-y-5">
              <label className="block text-sm font-semibold">
                Nama campaign
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                />
              </label>
              <label className="block text-sm font-semibold">
                Pilih perangkat pengirim
                <select
                  value={instanceId}
                  onChange={(event) => setInstanceId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal"
                >
                  <option value="">Pilih instance</option>
                  {instances.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.engine} · {item.status}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <p className="mb-2 text-sm font-semibold">Pesan</p>
                <WysiwygEditor
                  value={body}
                  onChange={setBody}
                  variables={[
                    "NAMA",
                    "NOMOR_HP",
                    ...fields.map((field) => field.toUpperCase()),
                  ]}
                />
              </div>
              <button
                type="button"
                disabled={!instanceId || !body.trim()}
                onClick={() => setStep(2)}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                Lanjut ke penerima
              </button>
            </section>
          )}
          {step === 2 && (
            <section>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Pilih penerima</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Kontak sistem dan Data set campaign dikelola terpisah dari
                    kontak global.
                  </p>
                </div>
                <span className="text-sm font-semibold text-indigo-600">
                  {selectedContacts.length + validRows.length} penerima
                </span>
              </div>
              <div className="mt-5 flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="border-b-2 border-indigo-600 px-4 py-3 text-sm font-semibold text-indigo-700"
                >
                  Kontak sistem
                </button>
                <button
                  type="button"
                  className="px-4 py-3 text-sm font-semibold text-slate-500"
                >
                  Data set
                </button>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200">
                <div className="flex gap-2 border-b border-slate-100 p-3">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari kontak atau nomor HP"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedContacts(
                        visibleContacts.map((item) => item.id),
                      )
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"
                  >
                    Pilih semua
                  </button>
                </div>
                <div className="max-h-48 overflow-auto">
                  {visibleContacts.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(item.id)}
                        onChange={() =>
                          setSelectedContacts((current) =>
                            current.includes(item.id)
                              ? current.filter((id) => id !== item.id)
                              : [...current, item.id],
                          )
                        }
                        className="accent-indigo-600"
                      />
                      <span>
                        {item.name}
                        <span className="ml-2 text-slate-400">
                          {item.phone}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-6 border-t border-slate-200 pt-5">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addRow}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Tambah baris
                  </button>
                  <button
                    type="button"
                    onClick={addField}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    Tambah field
                  </button>
                  <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(event) => importExcel(event.target.files?.[0])}
                    />
                    Import Excel
                  </label>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    Download template
                  </button>
                </div>
                {importPreview && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold">Mapping kolom Excel</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs">
                        Kolom nama
                        <select
                          value={mapping.name}
                          onChange={(event) =>
                            setMapping({ ...mapping, name: event.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                        >
                          {importHeaders.map((header) => (
                            <option key={header}>{header}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs">
                        Kolom nomor HP
                        <select
                          value={mapping.phone}
                          onChange={(event) =>
                            setMapping({
                              ...mapping,
                              phone: event.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                        >
                          {importHeaders.map((header) => (
                            <option key={header}>{header}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={applyImport}
                      className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Tampilkan ke Data set
                    </button>
                  </div>
                )}
                <div className="mt-3 max-w-full overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[900px] w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-3">Nama *</th>
                        <th className="px-3 py-3">Nomor HP *</th>
                        {fields.map((field) => (
                          <th key={field} className="px-3 py-3">
                            {field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={index} className="border-t border-slate-100">
                          <td className="px-2 py-2">
                            <input
                              value={row.name}
                              onChange={(event) =>
                                setRows((current) =>
                                  current.map((item, rowIndex) =>
                                    rowIndex === index
                                      ? { ...item, name: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              className="w-full min-w-[180px] rounded-lg border border-slate-200 px-2 py-2"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={row.phone}
                              onChange={(event) =>
                                setRows((current) =>
                                  current.map((item, rowIndex) =>
                                    rowIndex === index
                                      ? { ...item, phone: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              className="w-full min-w-[180px] rounded-lg border border-slate-200 px-2 py-2"
                            />
                          </td>
                          {fields.map((field) => (
                            <td key={field} className="px-2 py-2">
                              <input
                                value={row[field] ?? ""}
                                onChange={(event) =>
                                  setRows((current) =>
                                    current.map((item, rowIndex) =>
                                      rowIndex === index
                                        ? {
                                            ...item,
                                            [field]: event.target.value,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                                className="w-full min-w-[180px] rounded-lg border border-slate-200 px-2 py-2"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    {validRows.length} penerima Data set siap digunakan
                  </span>
                  <button
                    type="button"
                    onClick={addRow}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Tambah baris
                  </button>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={!selectedContacts.length && !validRows.length}
                  onClick={() => setStep(3)}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Lanjut ke jadwal
                </button>
              </div>
            </section>
          )}
          {step === 3 && (
            <section className="space-y-5">
              <h2 className="text-lg font-semibold">Pengaturan pengiriman</h2>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm">
                <input
                  type="checkbox"
                  checked={!scheduledAt}
                  onChange={() => setScheduledAt("")}
                />{" "}
                Kirim segera setelah masuk queue
              </label>
              <label className="block text-sm">
                Jadwalkan pada waktu tertentu
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  Jeda antar pesan (ms)
                  <input
                    type="number"
                    min={250}
                    value={delayMs}
                    onChange={(event) =>
                      setDelayMs(Math.max(250, Number(event.target.value)))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"
                  />
                </label>
                <label className="text-sm">
                  Ukuran batch
                  <input
                    type="number"
                    min={1}
                    value={batchSize}
                    onChange={(event) =>
                      setBatchSize(Math.max(1, Number(event.target.value)))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"
                  />
                </label>
              </div>
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Pesan dikirim bertahap melalui Redis queue. Jeda {delayMs} ms,
                maksimal {batchSize} penerima per batch.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
                >
                  Lanjut ke review
                </button>
              </div>
            </section>
          )}
          {step === 4 && (
            <section className="space-y-5">
              <h2 className="text-lg font-semibold">Review campaign</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <p className="text-slate-500">Campaign</p>
                  <p className="mt-1 font-semibold">{name}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <p className="text-slate-500">Penerima</p>
                  <p className="mt-1 font-semibold">
                    {selectedContacts.length + validRows.length}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <p className="text-slate-500">Jadwal</p>
                  <p className="mt-1 font-semibold">
                    {scheduledAt
                      ? new Date(scheduledAt).toLocaleString()
                      : "Segera"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <p className="text-slate-500">Pengiriman</p>
                  <p className="mt-1 font-semibold">
                    {delayMs} ms · batch {batchSize}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-2 text-sm font-semibold">Isi pesan</p>
                <p className="whitespace-pre-wrap text-sm text-slate-600">
                  {body}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={submit}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {saving ? "Memasukkan..." : "Kirim ke antrean"}
                </button>
              </div>
            </section>
          )}
        </main>
        <aside className="flex justify-center">
          <div className="w-full max-w-[340px] overflow-hidden rounded-[28px] border-[8px] border-slate-900 bg-[#efeae2] shadow-xl">
            <div className="bg-white px-4 py-3 text-xs font-semibold">
              Preview pesan
            </div>
            <div
              className="min-h-[560px] bg-[#efeae2] p-4"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(239,234,226,.7), rgba(239,234,226,.7)), url('/bg-wa.png')",
                backgroundSize: "cover",
              }}
            >
              <div className="mt-5 rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-3 text-sm">
                <p className="whitespace-pre-wrap">
                  {body || "Tulis pesan untuk melihat preview..."}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function BroadcastBuilderDatasetFirst({
  collapsed,
  token,
  onBack,
}: {
  collapsed: boolean;
  token: string;
  onBack: () => void;
}) {
  const [step, setStep] = useState(1);
  const [instances, setInstances] = useState<any[]>([]);
  const [instanceId, setInstanceId] = useState("");
  const [rows, setRows] = useState<any[]>([{ name: "", phone: "" }]);
  const [fields, setFields] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [name, setName] = useState("Campaign baru");
  const [delayMs, setDelayMs] = useState(1500);
  const [batchSize, setBatchSize] = useState(20);
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [importData, setImportData] = useState<any[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({ name: "", phone: "" });
  useEffect(() => {
    request<any[]>("/instances", {}, token)
      .then((data) => {
        setInstances(data);
        if (data[0]) setInstanceId(data[0].id);
      })
      .catch(() => undefined);
  }, [token]);
  useEffect(() => {
    document.body.dataset.broadcastFields = fields.join(",");
    window.dispatchEvent(new CustomEvent("broadcast-fields"));
    return () => {
      delete document.body.dataset.broadcastFields;
    };
  }, [fields]);
  const validRows = rows.filter(
    (row) => String(row.name ?? "").trim() && String(row.phone ?? "").trim(),
  );
  function addRow() {
    setRows((current) => [
      ...current,
      {
        name: "",
        phone: "",
        ...Object.fromEntries(fields.map((field) => [field, ""])),
      },
    ]);
  }
  async function addField() {
    const result = await Swal.fire({
      title: "Tambah field Data set",
      input: "text",
      inputPlaceholder: "Contoh: customer_id atau tanggal lahir",
      showCancelButton: true,
      confirmButtonText: "Tambah",
      cancelButtonText: "Batal",
    });
    const field = normalizeDatasetField(String(result.value ?? ""));
    if (result.isConfirmed && field && !fields.includes(field)) {
      setFields((current) => [...current, field]);
      setRows((current) =>
        current.map((row) => ({ ...row, [field]: row[field] ?? "" })),
      );
    }
  }
  async function importExcel(file?: File) {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const source: any[] = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]],
      );
      const nextHeaders = Object.keys(source[0] ?? {}).map(
        normalizeDatasetField,
      );
      setHeaders(nextHeaders);
      setImportData(
        source.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
              normalizeDatasetField(key),
              value,
            ]),
          ),
        ),
      );
      setMapping({
        name:
          nextHeaders.find((key) => key === "name" || key === "nama") ??
          nextHeaders[0] ??
          "",
        phone:
          nextHeaders.find((key) =>
            ["phone", "nomor_hp", "nomor", "number"].includes(key),
          ) ??
          nextHeaders[1] ??
          "",
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Import Excel gagal",
        text: error instanceof Error ? error.message : "Periksa file Excel.",
      });
    }
  }
  function applyImport() {
    if (!importData) return;
    const extras = headers.filter(
      (header) => header !== mapping.name && header !== mapping.phone,
    );
    setFields((current) => Array.from(new Set([...current, ...extras])));
    setRows(
      importData
        .map((row) => ({
          name: String(row[mapping.name] ?? "").trim(),
          phone: String(row[mapping.phone] ?? "")
            .replace(/\s+/g, "")
            .trim(),
          ...Object.fromEntries(
            extras.map((field) => [field, String(row[field] ?? "")]),
          ),
        }))
        .filter((row) => row.name && row.phone),
    );
    setImportData(null);
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Data set siap digunakan",
      showConfirmButton: false,
      timer: 2200,
    });
  }
  function downloadTemplate() {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["name", "phone", ...fields],
      ["Nama penerima", "628xxxxxxxxxx", ...fields.map(() => "")],
    ]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Data Set");
    XLSX.writeFile(book, "template-data-set-broadcast.xlsx");
  }
  async function submit() {
    if (!instanceId || !body.trim() || !validRows.length) return;
    setSaving(true);
    try {
      const imported = await request<any>(
        "/contacts/bulk",
        {
          method: "POST",
          body: JSON.stringify({
            contacts: validRows.map((row) => ({
              name: row.name,
              phone: row.phone,
              customFields: Object.fromEntries(
                fields.map((field) => [field, row[field] ?? ""]),
              ),
            })),
          }),
        },
        token,
      );
      const campaign = await request<any>(
        "/campaigns",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            instanceId,
            body: body
              .replaceAll("[NAMA]", "{{name}}")
              .replaceAll("[NOMOR_HP]", "{{phone}}"),
            delayMs,
            batchSize,
            scheduledAt: scheduledAt || undefined,
            contactIds: imported.contacts.map((contact: any) => contact.id),
          }),
        },
        token,
      );
      await request(
        `/campaigns/${campaign.id}/queue`,
        { method: "POST" },
        token,
      );
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Campaign masuk ke antrean",
        showConfirmButton: false,
        timer: 2200,
      });
      onBack();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Broadcast gagal dibuat",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    } finally {
      setSaving(false);
    }
  }
  const steps = ["Data set", "Pesan", "Jadwal", "Review"];
  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} mx-auto max-w-[1500px] px-6 py-8 transition-all`}
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-semibold text-indigo-600"
      >
        Kembali ke campaign
      </button>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Buat broadcast</h1>
          <p className="mt-2 text-sm text-slate-500">
            Siapkan penerima terlebih dahulu, kemudian buat pesan dan atur
            pengirimannya.
          </p>
          <div className="my-7 flex items-center gap-2">
            {steps.map((label, index) => (
              <div key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${step === index + 1 ? "bg-indigo-600 text-white" : step > index + 1 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {index + 1}
                </span>
                <span className="text-xs text-slate-600">{label}</span>
                {index < 3 && <span className="h-px flex-1 bg-slate-200" />}
              </div>
            ))}
          </div>
          {step === 1 && (
            <section className="space-y-5">
              <label className="block text-sm font-semibold">
                Nama campaign
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                />
              </label>
              <label className="block text-sm font-semibold">
                Pilih instance pengirim
                <select
                  value={instanceId}
                  onChange={(event) => setInstanceId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                >
                  <option value="">Pilih instance</option>
                  {instances.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.engine} · {item.status}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addRow}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  Tambah baris
                </button>
                <button
                  type="button"
                  onClick={addField}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  Tambah field
                </button>
                <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(event) => importExcel(event.target.files?.[0])}
                  />
                  Import Excel
                </label>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  Download template
                </button>
              </div>
              {importData && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold">Mapping kolom Excel</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs">
                      Kolom nama
                      <select
                        value={mapping.name}
                        onChange={(event) =>
                          setMapping({ ...mapping, name: event.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                      >
                        {headers.map((header) => (
                          <option key={header}>{header}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs">
                      Kolom nomor HP
                      <select
                        value={mapping.phone}
                        onChange={(event) =>
                          setMapping({ ...mapping, phone: event.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                      >
                        {headers.map((header) => (
                          <option key={header}>{header}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={applyImport}
                    className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Tampilkan ke Data set
                  </button>
                </div>
              )}
              <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-[900px] w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-3">Nama *</th>
                      <th className="px-3 py-3">Nomor HP *</th>
                      {fields.map((field) => (
                        <th key={field} className="px-3 py-3">
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index} className="border-t border-slate-100">
                        <td className="p-2">
                          <input
                            value={row.name}
                            onChange={(event) =>
                              setRows((current) =>
                                current.map((item, rowIndex) =>
                                  rowIndex === index
                                    ? { ...item, name: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            className="w-full min-w-[180px] rounded-lg border border-slate-200 px-2 py-2"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={row.phone}
                            onChange={(event) =>
                              setRows((current) =>
                                current.map((item, rowIndex) =>
                                  rowIndex === index
                                    ? { ...item, phone: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            className="w-full min-w-[180px] rounded-lg border border-slate-200 px-2 py-2"
                          />
                        </td>
                        {fields.map((field) => (
                          <td key={field} className="p-2">
                            <input
                              value={row[field] ?? ""}
                              onChange={(event) =>
                                setRows((current) =>
                                  current.map((item, rowIndex) =>
                                    rowIndex === index
                                      ? { ...item, [field]: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              className="w-full min-w-[180px] rounded-lg border border-slate-200 px-2 py-2"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  {validRows.length} penerima siap digunakan
                </span>
                <button
                  type="button"
                  onClick={addRow}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Tambah baris
                </button>
              </div>
              <button
                type="button"
                disabled={!instanceId || !validRows.length}
                onClick={() => setStep(2)}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                Lanjut ke pesan
              </button>
            </section>
          )}
          {step === 2 && (
            <section>
              <div className="mb-4">
                <p className="text-sm font-semibold">Pesan broadcast</p>
                <p className="mt-1 text-sm text-slate-500">
                  Field dari Data set tersedia sebagai placeholder di bawah
                  editor.
                </p>
              </div>
              <WysiwygEditor
                value={body}
                onChange={setBody}
                variables={[
                  "NAMA",
                  "NOMOR_HP",
                  ...fields.map((field) => field.toUpperCase()),
                ]}
              />
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={!body.trim()}
                  onClick={() => setStep(3)}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Lanjut ke jadwal
                </button>
              </div>
            </section>
          )}
          {step === 3 && (
            <section className="space-y-5">
              <h2 className="text-lg font-semibold">Pengaturan pengiriman</h2>
              <label className="block text-sm">
                Jadwalkan pada waktu tertentu (kosongkan untuk kirim segera)
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  Jeda antar pesan (ms)
                  <input
                    type="number"
                    min={250}
                    value={delayMs}
                    onChange={(event) =>
                      setDelayMs(Math.max(250, Number(event.target.value)))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"
                  />
                </label>
                <label className="text-sm">
                  Ukuran batch
                  <input
                    type="number"
                    min={1}
                    value={batchSize}
                    onChange={(event) =>
                      setBatchSize(Math.max(1, Number(event.target.value)))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"
                  />
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
                >
                  Lanjut ke review
                </button>
              </div>
            </section>
          )}
          {step === 4 && (
            <section className="space-y-5">
              <h2 className="text-lg font-semibold">Review campaign</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <span className="text-slate-500">Penerima</span>
                  <p className="font-semibold">{validRows.length}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-sm">
                  <span className="text-slate-500">Jadwal</span>
                  <p className="font-semibold">
                    {scheduledAt
                      ? new Date(scheduledAt).toLocaleString()
                      : "Segera"}
                  </p>
                </div>
              </div>
              <p className="whitespace-pre-wrap rounded-xl border border-slate-200 p-4 text-sm">
                {body}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={submit}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {saving ? "Memasukkan..." : "Kirim ke antrean"}
                </button>
              </div>
            </section>
          )}
        </main>
        {step === 3 && (
          <aside className="flex justify-center">
            <div className="w-full max-w-[340px] overflow-hidden rounded-[28px] border-[8px] border-slate-900 bg-[#efeae2] shadow-xl">
              <div className="bg-white px-4 py-3 text-xs font-semibold">
                Preview pesan
              </div>
              <div
                className="min-h-[560px] bg-[#efeae2] p-4"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(239,234,226,.7), rgba(239,234,226,.7)), url('/bg-wa.png')",
                  backgroundSize: "cover",
                }}
              >
                <div className="mt-5 rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-3 text-sm">
                  <p className="whitespace-pre-wrap">
                    {body || "Tulis pesan untuk melihat preview..."}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function BroadcastBuilderAdvanced({
  collapsed,
  token,
  onBack,
}: {
  collapsed: boolean;
  token: string;
  onBack: () => void;
}) {
  const [step, setStep] = useState(1);
  const [instances, setInstances] = useState<any[]>([]);
  const [instanceId, setInstanceId] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [campaignName, setCampaignName] = useState("Campaign baru");
  const [delayMs, setDelayMs] = useState(1500);
  const [batchSize, setBatchSize] = useState(20);
  const [scheduledAt, setScheduledAt] = useState("");
  const [mapping, setMapping] = useState({ name: "", phone: "" });
  const [headers, setHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [attachmentName] = useState("");
  const [attachmentMode] = useState<"caption" | "separate">("caption");
  const [attachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrl] = useState("");
  useEffect(() => {
    request<any[]>("/instances", {}, token)
      .then((data) => {
        setInstances(data);
        if (data[0]) setInstanceId(data[0].id);
      })
      .catch(() => undefined);
  }, [token]);
  useEffect(() => {
    document.body.dataset.broadcastFields = fields.join(",");
    window.dispatchEvent(new CustomEvent("broadcast-fields"));
    return () => {
      delete document.body.dataset.broadcastFields;
    };
  }, [fields]);
  const validRows = rows.filter(
    (row) => String(row.name ?? "").trim() && String(row.phone ?? "").trim(),
  );
  const invalidRowCount = Math.max(0, rows.length - validRows.length);
  const previewRecipient =
    validRows[Math.min(previewIndex, Math.max(0, validRows.length - 1))] ?? {};
  function renderPreviewMessage(value: string) {
    return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (token, field) =>
      String(previewRecipient[normalizeDatasetField(String(field))] ?? token),
    );
  }
  async function readFile(file?: File) {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
      });
      const raw: any[] = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]],
        { raw: false, dateNF: "dd/mm/yyyy" },
      );
      const nextHeaders = Object.keys(raw[0] ?? {}).map(normalizeDatasetField);
      const normalized = raw.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            normalizeDatasetField(key),
            value,
          ]),
        ),
      );
      setHeaders(nextHeaders);
      setImportRows(normalized);
      setMapping({
        name:
          nextHeaders.find((key) => ["name", "nama"].includes(key)) ??
          nextHeaders[0] ??
          "",
        phone:
          nextHeaders.find((key) =>
            ["phone", "nomor_hp", "nomor", "number"].includes(key),
          ) ??
          nextHeaders[1] ??
          "",
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "File tidak dapat dibaca",
        text: error instanceof Error ? error.message : "Periksa format file.",
      });
    }
  }
  function applyMapping() {
    const extra = headers.filter(
      (header) => header !== mapping.name && header !== mapping.phone,
    );
    setFields(extra);
    setRows(
      importRows
        .map((row) => ({
          name: String(row[mapping.name] ?? "").trim(),
          phone: String(row[mapping.phone] ?? "")
            .replace(/\s+/g, "")
            .trim(),
          ...Object.fromEntries(
            extra.map((field) => [field, String(row[field] ?? "")]),
          ),
        }))
        .filter((row) => row.name && row.phone),
    );
    setStep(2);
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Data berhasil dipetakan",
      showConfirmButton: false,
      timer: 2200,
    });
  }
  function addRow() {
    setRows((current) => [
      ...current,
      {
        name: "",
        phone: "",
        ...Object.fromEntries(fields.map((field) => [field, ""])),
      },
    ]);
  }
  async function addField() {
    const result = await Swal.fire({
      title: "Tambah field",
      input: "text",
      inputPlaceholder: "Contoh: jabatan atau customer_id",
      showCancelButton: true,
      confirmButtonText: "Tambah",
      cancelButtonText: "Batal",
    });
    const field = normalizeDatasetField(String(result.value ?? ""));
    if (result.isConfirmed && field && !fields.includes(field)) {
      setFields((current) => [...current, field]);
      setRows((current) => current.map((row) => ({ ...row, [field]: "" })));
    }
  }
  function downloadTemplate() {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["name", "phone", ...fields],
      ["Nama penerima", "628xxxxxxxxxx", ...fields.map(() => "")],
    ]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Broadcast");
    XLSX.writeFile(book, "template-broadcast.xlsx");
  }
  async function submit() {
    if (!instanceId || !body.trim() || !validRows.length) return;
    setSaving(true);
    try {
      const contacts = await request<any>(
        "/contacts/bulk",
        {
          method: "POST",
          body: JSON.stringify({
            contacts: validRows.map((row) => ({
              name: row.name,
              phone: row.phone,
              customFields: Object.fromEntries(
                fields.map((field) => [field, row[field] ?? ""]),
              ),
            })),
          }),
        },
        token,
      );
      const campaign = await request<any>(
        "/campaigns",
        {
          method: "POST",
          body: JSON.stringify({
            name: campaignName,
            instanceId,
            body: body
              .replaceAll("[NAMA]", "{{name}}")
              .replaceAll("[NOMOR_HP]", "{{phone}}"),
            delayMs,
            batchSize,
            scheduledAt: scheduledAt || undefined,
            contactIds: contacts.contacts.map((item: any) => item.id),
          }),
        },
        token,
      );
      await request(
        `/campaigns/${campaign.id}/queue`,
        { method: "POST" },
        token,
      );
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Campaign masuk ke antrean",
        showConfirmButton: false,
        timer: 2200,
      });
      onBack();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Broadcast gagal dibuat",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    } finally {
      setSaving(false);
    }
  }
  const steps = [
    { title: "Data Sheet", sub: "Upload data penerima" },
    { title: "Mapping Data", sub: "Atur kolom dan variabel" },
    { title: "Tulis Pesan", sub: "Buat pesan broadcast" },
    { title: "Preview & Kirim", sub: "Cek dan kirim pesan" },
  ];
  const updateCell = (index: number, key: string, value: string) =>
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    );
  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-slate-50 px-6 py-7 transition-all`}
    >
      <div className="mx-auto max-w-[1500px]">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 text-sm font-semibold text-indigo-600"
        >
          Kembali ke campaign
        </button>
        <header className="mb-6">
          <p className="text-sm font-semibold text-indigo-600">
            Messaging module
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Broadcast WhatsApp
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kirim pesan yang dipersonalisasi menggunakan data penerima.
          </p>
        </header>
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            {steps.map((item, index) => (
              <div
                key={item.title}
                className="flex min-w-0 flex-1 items-start gap-3"
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${step > index + 1 ? "bg-emerald-100 text-emerald-700" : step === index + 1 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  {step > index + 1 ? "✓" : String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p
                    className={`text-sm font-semibold ${step === index + 1 ? "text-indigo-700" : "text-slate-700"}`}
                  >
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-400">{item.sub}</p>
                </div>
                {index < 3 && (
                  <span className="mt-4 h-px flex-1 bg-slate-200" />
                )}
              </div>
            ))}
          </div>
        </div>
        {step === 1 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Upload Data Sheet
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Upload Excel atau buat data penerima secara manual.
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                {validRows.length} record
              </span>
            </div>
            <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
              <div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="cursor-pointer rounded-xl border-2 border-indigo-500 bg-indigo-50 p-5">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(event) => readFile(event.target.files?.[0])}
                    />
                    <div className="text-lg font-bold text-indigo-700">
                      Upload File
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      .xlsx, .xls, atau .csv
                    </p>
                    <div className="mt-4 rounded-lg border border-dashed border-indigo-300 p-3 text-center text-xs text-indigo-700">
                      Pilih file
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={addRow}
                    className="rounded-xl border border-slate-200 p-5 text-left hover:border-indigo-400"
                  >
                    <div className="text-lg font-bold text-slate-900">
                      Input Manual
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Tambah penerima satu per satu.
                    </p>
                    <span className="mt-4 block rounded-lg bg-indigo-50 px-3 py-2 text-center text-xs font-semibold text-indigo-700">
                      + Tambah baris
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="rounded-xl border border-slate-200 p-5 text-left hover:border-indigo-400"
                  >
                    <div className="text-lg font-bold text-slate-900">
                      Template Excel
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Download struktur data yang siap diisi.
                    </p>
                    <span className="mt-4 block rounded-lg bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-700">
                      Download template
                    </span>
                  </button>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addField}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    + Tambah field
                  </button>
                  <button
                    type="button"
                    onClick={addRow}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    + Tambah baris
                  </button>
                </div>
              </div>
              <aside className="rounded-xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">
                  Ringkasan data
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-2xl font-bold text-indigo-600">
                      {validRows.length}
                    </p>
                    <p className="text-xs text-slate-500">record valid</p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-2xl font-bold text-slate-900">
                      {fields.length + 2}
                    </p>
                    <p className="text-xs text-slate-500">kolom</p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Kolom wajib: nama dan nomor HP. Field lain dapat dipakai
                  sebagai variabel pesan.
                </p>
              </aside>
            </div>
            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-3">No</th>
                    <th className="px-3 py-3">Nama *</th>
                    <th className="px-3 py-3">Nomor HP *</th>
                    {fields.map((field) => (
                      <th key={field} className="px-3 py-3">
                        {field}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-400">{index + 1}</td>
                      {["name", "phone", ...fields].map((key) => (
                        <td key={key} className="px-2 py-2">
                          <input
                            value={row[key] ?? ""}
                            onChange={(event) =>
                              updateCell(index, key, event.target.value)
                            }
                            className="w-full min-w-[150px] rounded-lg border border-slate-200 px-2 py-2 text-sm"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <p className="p-8 text-center text-sm text-slate-400">
                  Upload file atau tambah baris untuk melihat data.
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!instanceId || !validRows.length}
                onClick={() => setStep(2)}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                Lanjut ke Mapping Data
              </button>
            </div>
          </section>
        )}
        {step === 2 && (
          <section className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            <main className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Mapping Data</h2>
              <p className="mt-1 text-sm text-slate-500">
                Pastikan setiap field terhubung dengan kolom yang benar.
              </p>
              <div className="mt-5 space-y-3">
                {[
                  ["Nama penerima", "name"],
                  ["Nomor WhatsApp", "phone"],
                  ...fields.map((field) => [field, field]),
                ].map(([label, key]) => (
                  <label key={key} className="flex items-center gap-3 text-sm">
                    <span className="w-40 font-medium text-slate-700">
                      {label}
                    </span>
                    <select
                      value={
                        key === "name"
                          ? "name"
                          : key === "phone"
                            ? "phone"
                            : key
                      }
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <option>{key}</option>
                    </select>
                    <span className="text-emerald-600">✓</span>
                  </label>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-sm font-semibold text-indigo-800">
                  Variabel tersedia
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "NAMA",
                    "NOMOR_HP",
                    ...fields.map((field) => field.toUpperCase()),
                  ].map((field) => (
                    <span
                      key={field}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700"
                    >
                      [{field}]
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
                >
                  Lanjut ke Tulis Pesan
                </button>
              </div>
            </main>
            <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold">Pilih instance pengirim</p>
              <select
                value={instanceId}
                onChange={(event) => setInstanceId(event.target.value)}
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
              >
                <option value="">Pilih instance</option>
                {instances.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.engine} · {item.status}
                  </option>
                ))}
              </select>
              <p className="mt-6 text-sm font-semibold">Data siap dikirim</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">
                {validRows.length}
              </p>
              <p className="text-xs text-slate-500">penerima valid</p>
            </aside>
          </section>
        )}
        {step === 4 && (
          <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <main className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Tulis Pesan</h2>
              <p className="mt-1 text-sm text-slate-500">
                Klik variabel untuk memasukkan data penerima ke pesan.
              </p>
              <div className="mt-5">
                <WysiwygEditor
                  value={body}
                  onChange={setBody}
                  variables={[
                    "NAMA",
                    "NOMOR_HP",
                    ...fields.map((field) => field.toUpperCase()),
                  ]}
                />
              </div>
              <label className="mt-5 block text-sm font-semibold">
                Nama campaign
                <input
                  value={campaignName}
                  onChange={(event) => setCampaignName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                />
              </label>
              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={!body.trim()}
                  onClick={() => setStep(4)}
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Lanjut ke Preview & Kirim
                </button>
              </div>
            </main>
            <aside className="overflow-hidden rounded-[28px] border-[8px] border-slate-900 bg-[#efeae2] shadow-xl">
              <div className="bg-white px-4 py-3 text-xs font-semibold">
                Preview WhatsApp
              </div>
              <div
                className="min-h-[500px] bg-[#efeae2] p-4"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(239,234,226,.68), rgba(239,234,226,.68)), url('/bg-wa.png')",
                  backgroundSize: "cover",
                }}
              >
                <div className="mt-8 rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-3 text-sm">
                  <p className="whitespace-pre-wrap">
                    {body || "Tulis pesan untuk melihat preview..."}
                  </p>
                  <p className="mt-2 text-right text-[10px] text-slate-500">
                    10:24 ✓✓
                  </p>
                </div>
              </div>
            </aside>
          </section>
        )}
        {step === 4 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Preview & Kirim</h2>
            <p className="mt-1 text-sm text-slate-500">
              Periksa pengaturan sebelum memasukkan pesan ke antrean.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="text-sm">
                <span className="block font-semibold text-slate-700">
                  Waktu pengiriman
                </span>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSendMode("now");
                      setScheduledAt("");
                    }}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${sendMode === "now" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}
                  >
                    Kirim sekarang
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendMode("schedule")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${sendMode === "schedule" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}
                  >
                    Jadwalkan
                  </button>
                </div>
                {sendMode === "schedule" && (
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"
                  />
                )}
              </div>
              <label className="text-sm">
                Interval antar pesan (ms)
                <input
                  type="number"
                  min={250}
                  value={delayMs}
                  onChange={(event) =>
                    setDelayMs(Math.max(250, Number(event.target.value)))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"
                />
              </label>
              <label className="text-sm">
                Ukuran batch
                <input
                  type="number"
                  min={1}
                  value={batchSize}
                  onChange={(event) =>
                    setBatchSize(Math.max(1, Number(event.target.value)))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"
                />
              </label>
            </div>
            <div className="mt-6 rounded-xl bg-slate-50 p-5">
              <p className="text-sm font-semibold">{campaignName}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                {body}
              </p>
              <p className="mt-4 text-xs text-slate-500">
                {validRows.length} penerima ·{" "}
                {scheduledAt
                  ? new Date(scheduledAt).toLocaleString()
                  : "kirim segera"}{" "}
                · interval {delayMs} ms · batch {batchSize}
              </p>
            </div>
            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
              <div className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Preview Pesan
                      </h3>
                      <p className="text-xs text-slate-500">
                        Contoh pesan berdasarkan penerima.
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewIndex((current) => Math.max(0, current - 1))
                        }
                        className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewIndex((current) =>
                            Math.min(
                              Math.max(0, validRows.length - 1),
                              current + 1,
                            ),
                          )
                        }
                        className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                  <select
                    value={Math.min(
                      previewIndex,
                      Math.max(0, validRows.length - 1),
                    )}
                    onChange={(event) =>
                      setPreviewIndex(Number(event.target.value))
                    }
                    className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {validRows.map((row, index) => (
                      <option key={index} value={index}>
                        {row.name || row.phone} ({index + 1} dari{" "}
                        {validRows.length})
                      </option>
                    ))}
                  </select>
                  <div
                    className="mt-3 rounded-xl p-4"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(239,234,226,.7), rgba(239,234,226,.7)), url('/bg-wa.png')",
                      backgroundSize: "cover",
                    }}
                  >
                    <div className="mx-auto max-w-[350px] overflow-hidden rounded-[24px] border-[6px] border-slate-900 bg-[#efeae2]">
                      <div className="bg-[#075e54] px-3 py-2 text-sm text-white">
                        <b>{previewRecipient.name || "Penerima"}</b>
                        <p className="text-[10px] text-white/70">
                          terakhir dilihat hari ini
                        </p>
                      </div>
                      <div className="min-h-48 p-3">
                        {attachmentFile && attachmentMode === "separate" && (
                          <div className="mb-2 rounded bg-white p-2 text-xs shadow">
                            {attachmentPreviewUrl ? (
                              <img
                                src={attachmentPreviewUrl}
                                alt={attachmentName}
                                className="h-20 w-full rounded object-cover"
                              />
                            ) : (
                              attachmentName
                            )}
                          </div>
                        )}
                        <div className="ml-auto w-[90%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-sm leading-6">
                          {attachmentFile &&
                            attachmentMode === "caption" &&
                            (attachmentPreviewUrl ? (
                              <img
                                src={attachmentPreviewUrl}
                                alt={attachmentName}
                                className="mb-2 h-24 w-full rounded object-cover"
                              />
                            ) : (
                              <p className="mb-2 rounded bg-white/70 p-2 text-xs">
                                {attachmentName}
                              </p>
                            ))}
                          <div
                            className="whitespace-pre-wrap [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                            dangerouslySetInnerHTML={{
                              __html: body
                                ? renderPreviewMessage(body)
                                : "Tulis pesan untuk melihat preview...",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between bg-white px-4 py-3">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Daftar Penerima Siap Kirim
                      </h3>
                      <p className="text-xs text-slate-500">
                        Hanya nomor valid yang masuk antrean.
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {validRows.length} data
                    </span>
                  </div>
                  <div className="max-h-52 overflow-auto">
                    <table className="w-full bg-white text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-2">No</th>
                          <th>Nama</th>
                          <th>Nomor WhatsApp</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validRows.slice(0, 100).map((row, index) => (
                          <tr key={index} className="border-t border-slate-100">
                            <td className="px-4 py-2">{index + 1}</td>
                            <td>{row.name}</td>
                            <td>{row.phone}</td>
                            <td>
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                                Siap dikirim
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
              <aside className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="font-bold text-slate-900">
                    Checklist Sebelum Kirim
                  </h3>
                  <div className="mt-3 space-y-3 text-sm">
                    {[
                      [Boolean(body.trim()), "Pesan sudah dipreview"],
                      [Boolean(instanceId), "Instance pengirim dipilih"],
                      [validRows.length > 0, "Nomor WhatsApp valid"],
                      [
                        !attachmentFile || Boolean(attachmentName),
                        "Lampiran siap dikirim",
                      ],
                    ].map(([valid, label]) => (
                      <div
                        key={String(label)}
                        className="flex items-center gap-2"
                      >
                        <span
                          className={`grid size-5 place-items-center rounded-full text-xs font-bold ${valid ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}
                        >
                          {valid ? "✓" : "!"}
                        </span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                  {invalidRowCount > 0 && (
                    <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                      {invalidRowCount} data perlu diperiksa dan tidak akan
                      dikirim.
                    </p>
                  )}
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="font-bold text-slate-900">
                    Ringkasan Validasi
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-emerald-50 p-3">
                      <b className="block text-xl text-emerald-600">
                        {validRows.length}
                      </b>
                      siap dikirim
                    </div>
                    <div className="rounded-lg bg-amber-50 p-3">
                      <b className="block text-xl text-amber-600">
                        {invalidRowCount}
                      </b>
                      perlu diperiksa
                    </div>
                  </div>
                </section>
              </aside>
            </div>
            <div className="mt-6 flex flex-wrap justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={submit}
                className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {saving ? "Memproses..." : "Kirim ke antrean"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function WizardSourceIcon({
  type,
}: {
  type: "upload" | "manual" | "database" | "contacts";
}) {
  const path =
    type === "upload"
      ? "M7 18a4 4 0 0 1-.7-7.94A5.5 5.5 0 0 1 16.9 8.5 4.5 4.5 0 0 1 18 17.37M12 12v9m0-9-3 3m3-3 3 3"
      : type === "manual"
        ? "M4 7h16v12H4zM8 11h2m2 0h2m2 0h1M8 15h5"
        : type === "database"
          ? "M5 6c0-2 14-2 14 0s-14 2-14 0Zm0 0v6c0 2 14 2 14 0V6m-14 6v6c0 2 14 2 14 0v-6"
          : "M16 21a4 4 0 0 0-8 0m4-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6M5 17a3 3 0 0 0-3 3m17-3a3 3 0 0 1 3 3";
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

function normalizeBroadcastPhone(value: unknown) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0062")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return digits;
}

function isValidBroadcastPhone(value: unknown) {
  return /^62[1-9]\d{7,12}$/.test(String(value ?? "").trim());
}

function broadcastColumnType(field: string) {
  return /phone|nomor|no_hp|whatsapp|wa$/i.test(field)
    ? "Nomor"
    : /tanggal|date|tgl/i.test(field)
      ? "Tanggal"
      : /nominal|harga|rupiah/i.test(field)
        ? "Rupiah"
        : /amount|total/i.test(field)
          ? "Angka"
          : "Teks";
}

function formatBroadcastCurrency(value: string, dataType: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const amount = BigInt(digits);
  return dataType === "Dollar"
    ? `$${amount.toLocaleString("en-US")}`
    : `Rp${amount.toLocaleString("id-ID")}`;
}

function sanitizeBroadcastValue(value: string, dataType: string) {
  if (dataType === "Nomor") return value.replace(/\D/g, "");
  if (dataType === "Angka") return value.replace(/[^0-9.,-]/g, "");
  if (dataType === "Rupiah" || dataType === "Dollar")
    return formatBroadcastCurrency(value, dataType);
  return value;
}

function broadcastDateValue(value: unknown) {
  const text = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function convertBroadcastValue(value: unknown, dataType: string) {
  const text = String(value ?? "");
  if (dataType === "Tanggal") return broadcastDateValue(text) || text;
  return sanitizeBroadcastValue(text, dataType);
}

function RowActionIcon({ type }: { type: "copy" | "trash" }) {
  if (type === "copy")
    return (
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </svg>
    );
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
    </svg>
  );
}

function DynamicVariableCallout({ fields }: { fields: string[] }) {
  const exampleName = fields.includes("name") ? "name" : (fields[0] ?? "nama");
  const exampleExtra =
    fields.find((field) => field !== exampleName && field !== "phone") ??
    "instansi";
  return (
    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow-sm ring-8 ring-emerald-100/70">
          <svg
            viewBox="0 0 24 24"
            className="size-8"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.966-.273-.099-.471-.149-.67.149-.198.297-.767.966-.94 1.164-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.009-.371-.011-.57-.011s-.52.074-.792.371c-.272.297-1.04 1.016-1.04 2.479s1.065 2.875 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.693.625.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.981.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.886 9.888-9.886 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.894 6.99c-.003 5.45-4.437 9.887-9.884 9.887m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="font-bold text-emerald-950">Variabel yang Tersedia</p>
          <p className="mt-1 text-sm text-emerald-800/80">
            Klik variabel untuk menyisipkannya ke dalam pesan. Variabel akan
            diganti dengan data penerima saat dikirim.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {fields.map((field) => (
              <span
                key={field}
                className="rounded-md border border-emerald-200 bg-white/70 px-3 py-1.5 font-mono text-xs font-semibold text-emerald-700"
              >
                {`{{${field}}}`}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-emerald-100 bg-white/55 px-4 py-3 text-sm text-emerald-950">
        <p className="text-xs font-semibold">Contoh penggunaan di pesan:</p>
        <p className="mt-2 font-mono text-xs leading-5">
          {`Halo {{${exampleName}}},`}
          <br />
          {`Kami dari {{${exampleExtra}}} ingin menginformasikan bahwa ...`}
        </p>
      </div>
    </section>
  );
}

function BroadcastWizardStepper({ current }: { current: number }) {
  const steps = ["Data Sheet", "Tulis Pesan", "Kirim"];
  return (
    <div className="flex min-w-[520px] items-start">
      {steps.map((label, index) => {
        const number = index + 1;
        return (
          <div key={label} className="flex flex-1 items-start">
            <div className="flex flex-col items-center text-center">
              <span
                className={`grid size-10 place-items-center rounded-full border-2 text-sm font-bold ${number <= current ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-500"}`}
              >
                {String(number).padStart(2, "0")}
              </span>
              <span
                className={`mt-1 text-sm font-semibold ${number <= current ? "text-blue-600" : "text-slate-700"}`}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span className="mx-3 mt-5 h-px flex-1 bg-slate-300" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ManualDataEntryPage({
  collapsed,
  rows,
  fields,
  onRowsChange,
  onFieldsChange,
  onBack,
  onContinue,
}: {
  collapsed: boolean;
  rows: any[];
  fields: string[];
  onRowsChange: (rows: any[]) => void;
  onFieldsChange: (fields: string[]) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const columns = ["name", "phone", ...fields];
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [validationFilter, setValidationFilter] = useState<
    "all" | "valid" | "invalid" | "duplicate"
  >("all");
  const [bulkField, setBulkField] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [columnTypes, setColumnTypes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      columns.map((field) => [field, broadcastColumnType(field)]),
    ),
  );
  const phoneCounts = rows.reduce((result: Record<string, number>, row) => {
    const phone = normalizeBroadcastPhone(row.phone);
    if (phone) result[phone] = (result[phone] ?? 0) + 1;
    return result;
  }, {});
  const invalidCount = rows.filter(
    (row) =>
      !String(row.name ?? "").trim() || !isValidBroadcastPhone(row.phone),
  ).length;
  const duplicateCount = rows.filter(
    (row) => phoneCounts[normalizeBroadcastPhone(row.phone)] > 1,
  ).length;
  const validCount = Math.max(0, rows.length - invalidCount - duplicateCount);
  const filteredRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      const matchesQuery = columns.some((column) =>
        String(row[column] ?? "")
          .toLowerCase()
          .includes(query.toLowerCase()),
      );
      if (!matchesQuery) return false;
      const phone = normalizeBroadcastPhone(row.phone);
      const invalid =
        !String(row.name ?? "").trim() || !isValidBroadcastPhone(row.phone);
      const duplicate = Boolean(phone && phoneCounts[phone] > 1);
      if (validationFilter === "invalid") return invalid;
      if (validationFilter === "duplicate") return !invalid && duplicate;
      if (validationFilter === "valid") return !invalid && !duplicate;
      return true;
    });
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * pageSize;
  const visibleRows = filteredRows.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize, validationFilter]);

  function updateCell(index: number, field: string, value: string) {
    const dataType = columnTypes[field] ?? broadcastColumnType(field);
    const sanitizedValue = sanitizeBroadcastValue(value, dataType);
    onRowsChange(
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: sanitizedValue } : row,
      ),
    );
  }

  function addRow() {
    onRowsChange([
      ...rows,
      Object.fromEntries(columns.map((field) => [field, ""])),
    ]);
  }

  async function addColumn() {
    const result = await Swal.fire({
      title: "Tambah kolom",
      input: "text",
      inputLabel: "Nama field",
      inputPlaceholder: "Contoh: instansi",
      showCancelButton: true,
      confirmButtonText: "Tambahkan",
      cancelButtonText: "Batal",
      inputValidator: (value) => {
        const field = normalizeDatasetField(value);
        if (!field) return "Nama field wajib diisi.";
        if (columns.includes(field)) return "Field tersebut sudah tersedia.";
        return undefined;
      },
    });
    if (!result.isConfirmed) return;
    const field = normalizeDatasetField(String(result.value));
    onFieldsChange([...fields, field]);
    onRowsChange(rows.map((row) => ({ ...row, [field]: "" })));
    setColumnTypes((current) => ({
      ...current,
      [field]: broadcastColumnType(field),
    }));
  }

  async function renameColumn(field: string) {
    if (field === "name" || field === "phone") return;
    const result = await Swal.fire({
      title: "Edit field",
      input: "text",
      inputValue: field.replaceAll("_", " "),
      inputLabel: "Nama field baru",
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      inputValidator: (value) => {
        const nextField = normalizeDatasetField(value);
        if (!nextField) return "Nama field wajib diisi.";
        if (nextField !== field && columns.includes(nextField))
          return "Field tersebut sudah tersedia.";
        return undefined;
      },
    });
    if (!result.isConfirmed) return;
    const nextField = normalizeDatasetField(String(result.value));
    if (nextField === field) return;
    onFieldsChange(fields.map((item) => (item === field ? nextField : item)));
    onRowsChange(
      rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key === field ? nextField : key,
            value,
          ]),
        ),
      ),
    );
    setColumnTypes((current) => {
      const next = { ...current, [nextField]: current[field] ?? "Teks" };
      delete next[field];
      return next;
    });
  }

  async function removeColumn(field: string) {
    if (field === "name" || field === "phone") return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus field?",
      text: `Semua data pada kolom ${field.replaceAll("_", " ")} akan dihapus.`,
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    onFieldsChange(fields.filter((item) => item !== field));
    onRowsChange(
      rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).filter(([key]) => key !== field),
        ),
      ),
    );
    setColumnTypes((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function deleteSelected() {
    if (!selectedRows.length) return;
    onRowsChange(rows.filter((_, index) => !selectedRows.includes(index)));
    setSelectedRows([]);
  }

  async function clearManualData() {
    const result = await Swal.fire({
      icon: "warning",
      title: "Kosongkan data manual?",
      text: "Seluruh baris dan field custom pada input manual akan dihapus.",
      showCancelButton: true,
      confirmButtonText: "Kosongkan data",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    onRowsChange([]);
    onFieldsChange([]);
    setSelectedRows([]);
  }

  function autoCorrectPhones() {
    let corrected = 0;
    const nextRows = rows.map((row) => {
      const current = String(row.phone ?? "");
      const normalized = normalizeBroadcastPhone(current);
      if (normalized !== current && isValidBroadcastPhone(normalized)) {
        corrected += 1;
        return { ...row, phone: normalized };
      }
      return row;
    });
    onRowsChange(nextRows);
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: corrected ? "success" : "info",
      title: corrected
        ? `${corrected} nomor berhasil dikoreksi`
        : "Tidak ada nomor yang dapat dikoreksi otomatis",
      showConfirmButton: false,
      timer: 2200,
    });
  }

  function applyManualBulk(scope: "selected" | "filtered") {
    if (!bulkField) return;
    const indexes =
      scope === "selected"
        ? new Set(selectedRows)
        : new Set(filteredRows.map(({ index }) => index));
    if (!indexes.size) return;
    const type = columnTypes[bulkField] ?? broadcastColumnType(bulkField);
    const value =
      type === "Tanggal" ? bulkValue : sanitizeBroadcastValue(bulkValue, type);
    onRowsChange(
      rows.map((row, index) =>
        indexes.has(index) ? { ...row, [bulkField]: value } : row,
      ),
    );
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `Nilai diterapkan ke ${indexes.size} baris`,
      showConfirmButton: false,
      timer: 1800,
    });
  }

  function applyPastedText(text: string) {
    const matrix = text
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split("\t"));
    if (!matrix.length || !matrix[0].length) return;
    const firstRow = matrix[0].map((cell) => normalizeDatasetField(cell));
    const hasHeader = firstRow.some((cell) =>
      /^(name|nama|phone|nomor|nomor_hp|no_hp|nomor_whatsapp|whatsapp|wa)$/.test(
        cell,
      ),
    );
    const pastedHeaders = hasHeader
      ? firstRow.map((header, index) => header || `field_${index + 1}`)
      : columns.slice(0, matrix[0].length);
    const mappedHeaders = pastedHeaders.map((header, index) => {
      if (/^(name|nama|nama_lengkap)$/.test(header)) return "name";
      if (
        /^(phone|nomor|nomor_hp|no_hp|nomor_whatsapp|whatsapp|wa)$/.test(header)
      )
        return "phone";
      return header || `field_${index + 1}`;
    });
    const customHeaders = mappedHeaders.filter(
      (field) => field !== "name" && field !== "phone",
    );
    const nextFields = Array.from(new Set([...fields, ...customHeaders]));
    const dataRows = hasHeader ? matrix.slice(1) : matrix;
    const nextRows = dataRows
      .filter((cells) => cells.some((cell) => cell.trim()))
      .map((cells) =>
        Object.fromEntries(
          mappedHeaders.map((field, index) => [
            field,
            convertBroadcastValue(
              cells[index] ?? "",
              broadcastColumnType(field),
            ),
          ]),
        ),
      );
    onFieldsChange(nextFields);
    onRowsChange([
      ...rows.filter((row) => columns.some((key) => row[key])),
      ...nextRows,
    ]);
    setColumnTypes((current) => ({
      ...current,
      ...Object.fromEntries(
        mappedHeaders.map((field) => [field, broadcastColumnType(field)]),
      ),
    }));
  }

  async function pasteFromExcel() {
    let clipboardText = "";
    try {
      clipboardText = await navigator.clipboard.readText();
    } catch {
      clipboardText = "";
    }
    if (!clipboardText.trim()) {
      const result = await Swal.fire({
        title: "Paste dari Excel",
        input: "textarea",
        inputLabel: "Salin tabel dari Excel lalu tempel di sini",
        inputPlaceholder: "Nama\tNomor WhatsApp\tInstansi",
        showCancelButton: true,
        confirmButtonText: "Masukkan data",
        cancelButtonText: "Batal",
      });
      if (!result.isConfirmed) return;
      clipboardText = String(result.value ?? "");
    }
    if (!clipboardText.trim()) return;
    applyPastedText(clipboardText);
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Data Excel berhasil dimasukkan",
      showConfirmButton: false,
      timer: 1800,
    });
  }

  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-[#f7f9fc] px-5 py-6 transition-all`}
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Broadcast WhatsApp
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Kirim pesan WhatsApp personal ke banyak kontak dengan mudah dan
              cepat.
            </p>
          </div>
          <BroadcastWizardStepper current={1} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_275px]">
          <main className="min-w-0">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">
                Input Manual
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Masukkan data penerima dan variabel pesan secara manual atau
                paste langsung dari Excel atau spreadsheet.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3">
                <button
                  type="button"
                  onClick={addRow}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  + Tambah Baris
                </button>
                <button
                  type="button"
                  disabled={!selectedRows.length}
                  onClick={deleteSelected}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-40"
                >
                  Hapus Baris
                </button>
                <button
                  type="button"
                  onClick={addColumn}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  + Tambah Kolom
                </button>
                <button
                  type="button"
                  onClick={pasteFromExcel}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  Paste dari Excel
                </button>
                <button
                  type="button"
                  disabled={!rows.length}
                  onClick={clearManualData}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 disabled:opacity-40"
                >
                  Kosongkan data
                </button>
                <div className="ml-auto text-right">
                  <p className="text-sm font-semibold text-emerald-600">
                    Autosave aktif
                  </p>
                  <p className="text-xs text-slate-400">
                    Perubahan tersimpan otomatis
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold">Tabel Data Manual</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                    {columns.length} kolom · {rows.length} baris
                  </span>
                </div>
                <div className="flex gap-2">
                  <select
                    value={validationFilter}
                    onChange={(event) =>
                      setValidationFilter(
                        event.target.value as typeof validationFilter,
                      )
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="all">Semua status</option>
                    <option value="valid">Valid ({validCount})</option>
                    <option value="invalid">
                      Tidak valid ({invalidCount})
                    </option>
                    <option value="duplicate">
                      Duplikat ({duplicateCount})
                    </option>
                  </select>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari data..."
                    className="w-56 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <select
                    value={pageSize}
                    onChange={(event) =>
                      setPageSize(Number(event.target.value))
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value={10}>10 baris</option>
                    <option value={25}>25 baris</option>
                    <option value={50}>50 baris</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <label className="min-w-44 flex-1 text-xs font-semibold text-slate-600">
                  Bulk isi kolom
                  <select
                    value={bulkField}
                    onChange={(event) => {
                      setBulkField(event.target.value);
                      setBulkValue("");
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                  >
                    <option value="">Pilih kolom</option>
                    {columns.map((field) => (
                      <option key={field} value={field}>
                        {field.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="min-w-56 flex-[2] text-xs font-semibold text-slate-600">
                  Nilai seragam
                  <input
                    type={
                      (columnTypes[bulkField] ??
                        broadcastColumnType(bulkField)) === "Tanggal"
                        ? "date"
                        : "text"
                    }
                    inputMode={
                      ["Nomor", "Angka", "Rupiah", "Dollar"].includes(
                        columnTypes[bulkField] ??
                          broadcastColumnType(bulkField),
                      )
                        ? "numeric"
                        : undefined
                    }
                    value={bulkValue}
                    disabled={!bulkField}
                    onChange={(event) =>
                      setBulkValue(
                        sanitizeBroadcastValue(
                          event.target.value,
                          columnTypes[bulkField] ??
                            broadcastColumnType(bulkField),
                        ),
                      )
                    }
                    placeholder="Contoh: Jakarta"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal disabled:bg-slate-100"
                  />
                </label>
                <button
                  type="button"
                  disabled={!bulkField || !selectedRows.length}
                  onClick={() => applyManualBulk("selected")}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-600 disabled:opacity-40"
                >
                  Terapkan ke dipilih ({selectedRows.length})
                </button>
                <button
                  type="button"
                  disabled={!bulkField || !filteredRows.length}
                  onClick={() => applyManualBulk("filtered")}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Terapkan ke semua hasil
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-700">
                    <tr>
                      <th className="w-12 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={
                            !!visibleRows.length &&
                            visibleRows.every(({ index }) =>
                              selectedRows.includes(index),
                            )
                          }
                          onChange={(event) =>
                            setSelectedRows(
                              event.target.checked
                                ? visibleRows.map(({ index }) => index)
                                : [],
                            )
                          }
                        />
                      </th>
                      <th className="w-12 px-2 py-3">No</th>
                      {columns.map((field) => (
                        <th key={field} className="min-w-40 px-2 py-3">
                          {field === "name"
                            ? "Nama"
                            : field === "phone"
                              ? "Nomor WhatsApp"
                              : field.replaceAll("_", " ")}
                        </th>
                      ))}
                      <th className="w-20 px-3 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map(({ row, index }) => {
                      const phoneInvalid = !isValidBroadcastPhone(row.phone);
                      return (
                        <tr key={index} className="border-t border-slate-100">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedRows.includes(index)}
                              onChange={(event) =>
                                setSelectedRows((current) =>
                                  event.target.checked
                                    ? [...current, index]
                                    : current.filter((item) => item !== index),
                                )
                              }
                            />
                          </td>
                          <td className="px-2 py-2 text-slate-400">
                            {pageStart + index + 1}
                          </td>
                          {columns.map((field) => (
                            <td key={field} className="p-1.5">
                              <input
                                type={
                                  (columnTypes[field] ??
                                    broadcastColumnType(field)) === "Tanggal"
                                    ? "date"
                                    : "text"
                                }
                                inputMode={
                                  (columnTypes[field] ??
                                    broadcastColumnType(field)) === "Nomor"
                                    ? "numeric"
                                    : ["Angka", "Rupiah", "Dollar"].includes(
                                          columnTypes[field] ??
                                            broadcastColumnType(field),
                                        )
                                      ? "decimal"
                                      : undefined
                                }
                                value={row[field] ?? ""}
                                onChange={(event) =>
                                  updateCell(index, field, event.target.value)
                                }
                                aria-invalid={field === "phone" && phoneInvalid}
                                className={`w-full rounded-md border px-2.5 py-2 outline-none ${field === "phone" && phoneInvalid ? "border-red-300 bg-red-50 text-red-600" : "border-slate-200 focus:border-blue-500"}`}
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title="Duplikat baris"
                                aria-label="Duplikat baris"
                                onClick={() =>
                                  onRowsChange([
                                    ...rows.slice(0, index + 1),
                                    { ...row },
                                    ...rows.slice(index + 1),
                                  ])
                                }
                                className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                              >
                                <RowActionIcon type="copy" />
                              </button>
                              <button
                                type="button"
                                title="Hapus baris"
                                aria-label="Hapus baris"
                                onClick={() =>
                                  onRowsChange(
                                    rows.filter(
                                      (_, rowIndex) => rowIndex !== index,
                                    ),
                                  )
                                }
                                className="grid size-8 place-items-center rounded-md text-red-500 hover:bg-red-50"
                              >
                                <RowActionIcon type="trash" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-500">
                  Menampilkan {filteredRows.length ? pageStart + 1 : 0}–
                  {Math.min(pageStart + pageSize, filteredRows.length)} dari{" "}
                  {filteredRows.length} data
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safePage === 1}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    className="grid size-8 place-items-center rounded-md border border-slate-200 text-sm disabled:opacity-30"
                  >
                    ‹
                  </button>
                  <span className="grid h-8 min-w-8 place-items-center rounded-md bg-blue-600 px-2 text-xs font-semibold text-white">
                    {safePage}
                  </span>
                  <button
                    type="button"
                    disabled={safePage === pageCount}
                    onClick={() =>
                      setPage((current) => Math.min(pageCount, current + 1))
                    }
                    className="grid size-8 place-items-center rounded-md border border-slate-200 text-sm disabled:opacity-30"
                  >
                    ›
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={addRow}
                className="m-3 w-[calc(100%-1.5rem)] rounded-lg border border-dashed border-slate-300 px-4 py-2 text-left text-sm text-slate-500"
              >
                + Klik untuk menambah baris baru
              </button>
            </section>

            <div className="mt-4">
              <DynamicVariableCallout fields={columns} />
            </div>
          </main>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-bold">Deteksi & Validasi Kolom</h3>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              Kolom yang terdeteksi ({columns.length} kolom)
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {columns.map((field) => (
                <div
                  key={field}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-700">
                      {field}
                    </span>
                    {field !== "name" && field !== "phone" && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => renameColumn(field)}
                          className="rounded px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeColumn(field)}
                          className="rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                  <select
                    value={columnTypes[field] ?? broadcastColumnType(field)}
                    onChange={(event) => {
                      const nextType = event.target.value;
                      setColumnTypes((current) => ({
                        ...current,
                        [field]: nextType,
                      }));
                      onRowsChange(
                        rows.map((row) => ({
                          ...row,
                          [field]: convertBroadcastValue(row[field], nextType),
                        })),
                      );
                    }}
                    className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs"
                  >
                    <option>Teks</option>
                    <option>Nomor</option>
                    <option>Tanggal</option>
                    <option>Angka</option>
                    <option>Rupiah</option>
                    <option>Dollar</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold">Kolom Nomor WhatsApp</p>
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                Nomor WhatsApp
              </div>
            </div>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold">Ringkasan Validasi Data</p>
              <div className="mt-3 flex flex-col gap-2">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <strong>{validCount} valid</strong>
                  <span className="block text-xs">Nomor valid dan lengkap</span>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  <strong>{invalidCount} format tidak valid</strong>
                  <span className="block text-xs">Periksa nama dan nomor</span>
                  <button
                    type="button"
                    disabled={!invalidCount}
                    onClick={autoCorrectPhones}
                    className="mt-2 w-full rounded-md border border-red-200 bg-white px-2 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-40"
                  >
                    Auto-correct nomor
                  </button>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  <strong>{duplicateCount} duplikat</strong>
                  <span className="block text-xs">
                    Nomor yang sama terdeteksi
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-4 flex flex-wrap items-center gap-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="min-w-[260px] flex-1">
            <p className="text-lg font-bold">Data siap diproses</p>
            <p className="text-sm text-slate-500">
              Periksa kembali data sebelum melanjutkan ke tahap berikutnya.
            </p>
          </div>
          <div className="flex gap-7 text-center">
            <div>
              <strong className="block text-2xl text-blue-600">
                {rows.length}
              </strong>
              <span className="text-xs text-slate-500">record</span>
            </div>
            <div>
              <strong className="block text-2xl">{columns.length}</strong>
              <span className="text-xs text-slate-500">kolom</span>
            </div>
            <div>
              <strong className="block text-2xl text-emerald-600">
                {validCount}
              </strong>
              <span className="text-xs text-slate-500">siap dikirim</span>
            </div>
            <div>
              <strong className="block text-2xl text-orange-500">
                {invalidCount + duplicateCount}
              </strong>
              <span className="text-xs text-slate-500">perlu diperiksa</span>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold"
            >
              Kembali
            </button>
            <button
              type="button"
              disabled={!validCount || invalidCount > 0 || duplicateCount > 0}
              onClick={onContinue}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              Lanjutkan ke Tulis Pesan
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function UploadDataReviewPage({
  collapsed,
  fileName,
  rows,
  fields,
  onRowsChange,
  onReplaceFile,
  onBack,
  onContinue,
}: {
  collapsed: boolean;
  fileName: string;
  rows: any[];
  fields: string[];
  onRowsChange: (rows: any[]) => void;
  onReplaceFile: (file?: File) => void;
  onBack: () => void;
  onContinue: (nameField: string, phoneField: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [validationFilter, setValidationFilter] = useState<
    "all" | "valid" | "invalid" | "duplicate"
  >("all");
  const columns = fields;
  const [nameField, setNameField] = useState(
    columns.find((field) => /^(name|nama|nama_lengkap)$/i.test(field)) ??
      columns[0] ??
      "",
  );
  const [phoneField, setPhoneField] = useState(
    columns.find((field) =>
      /^(phone|nomor_hp|no_hp|nomor|number|nomor_whatsapp|whatsapp|wa)$/i.test(
        field,
      ),
    ) ?? "",
  );
  const [columnTypes, setColumnTypes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      columns.map((field) => [field, broadcastColumnType(field)]),
    ),
  );
  const [selectedInvalid, setSelectedInvalid] = useState<number[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [bulkField, setBulkField] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  useEffect(() => {
    const detectedName =
      columns.find((field) => /^(name|nama|nama_lengkap)$/i.test(field)) ??
      columns[0] ??
      "";
    const detectedPhone =
      columns.find((field) =>
        /^(phone|nomor_hp|no_hp|nomor|number|nomor_whatsapp|whatsapp|wa)$/i.test(
          field,
        ),
      ) ?? "";

    setNameField(detectedName);
    setPhoneField(detectedPhone);
    setColumnTypes(
      Object.fromEntries(
        columns.map((field) => [field, broadcastColumnType(field)]),
      ),
    );
    setSelectedInvalid([]);
  }, [columns.join("\u0000")]);
  const phoneCounts = rows.reduce((map: Record<string, number>, row) => {
    const phone = normalizeBroadcastPhone(row[phoneField]);
    if (phone) map[phone] = (map[phone] ?? 0) + 1;
    return map;
  }, {});
  const invalidIndexes = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !isValidBroadcastPhone(row[phoneField]))
    .map(({ index }) => index);
  const invalidCount = invalidIndexes.length;
  const duplicateCount = rows.filter(
    (row) => phoneCounts[normalizeBroadcastPhone(row[phoneField])] > 1,
  ).length;
  const validCount = Math.max(0, rows.length - invalidCount - duplicateCount);
  const filteredRows = rows
    .map((row, rowIndex) => ({ row, rowIndex }))
    .filter(({ row }) => {
      const matchesQuery = columns.some((column) =>
        String(row[column] ?? "")
          .toLowerCase()
          .includes(query.toLowerCase()),
      );
      if (!matchesQuery) return false;
      const phone = normalizeBroadcastPhone(row[phoneField]);
      const invalid = !isValidBroadcastPhone(row[phoneField]);
      const duplicate = Boolean(phone && phoneCounts[phone] > 1);
      if (validationFilter === "invalid") return invalid;
      if (validationFilter === "duplicate") return !invalid && duplicate;
      if (validationFilter === "valid") return !invalid && !duplicate;
      return true;
    });
  const visibleRows = filteredRows.slice(0, 10);
  function updateUploadCell(rowIndex: number, field: string, value: string) {
    const dataType = columnTypes[field] ?? broadcastColumnType(field);
    const sanitizedValue = sanitizeBroadcastValue(value, dataType);
    onRowsChange(
      rows.map((row, index) =>
        index === rowIndex ? { ...row, [field]: sanitizedValue } : row,
      ),
    );
  }
  function autoCorrectSelected() {
    if (!selectedInvalid.length) return;
    onRowsChange(
      rows.map((row, index) =>
        selectedInvalid.includes(index)
          ? { ...row, [phoneField]: normalizeBroadcastPhone(row[phoneField]) }
          : row,
      ),
    );
    setSelectedInvalid([]);
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Format nomor terpilih sudah dikoreksi",
      showConfirmButton: false,
      timer: 2200,
    });
  }
  function applyUploadBulk(scope: "selected" | "filtered") {
    if (!bulkField) return;
    const indexes =
      scope === "selected"
        ? new Set(selectedRows)
        : new Set(filteredRows.map(({ rowIndex }) => rowIndex));
    if (!indexes.size) return;
    const type = columnTypes[bulkField] ?? broadcastColumnType(bulkField);
    const value =
      type === "Tanggal" ? bulkValue : sanitizeBroadcastValue(bulkValue, type);
    onRowsChange(
      rows.map((row, index) =>
        indexes.has(index) ? { ...row, [bulkField]: value } : row,
      ),
    );
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `Nilai diterapkan ke ${indexes.size} baris`,
      showConfirmButton: false,
      timer: 1800,
    });
  }
  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-[#f7f9fc] px-6 py-7 transition-all`}
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Broadcast WhatsApp
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Kirim broadcast menggunakan data penerima dari Excel atau CSV.
            </p>
          </div>
          <div className="flex min-w-[650px] items-start">
            {[
              { title: "Data Sheet", sub: "Upload data penerima" },
              { title: "Mapping Data", sub: "Atur kolom dan variabel" },
              { title: "Tulis Pesan", sub: "Buat pesan broadcast" },
              { title: "Preview & Kirim", sub: "Cek dan kirim pesan" },
            ].map((item, index) => (
              <div key={item.title} className="flex flex-1 items-start">
                <div>
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${index === 0 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p
                    className={`mt-1 text-xs font-semibold ${index === 0 ? "text-emerald-700" : "text-slate-600"}`}
                  >
                    {item.title}
                  </p>
                  <p className="text-[10px] text-slate-400">{item.sub}</p>
                </div>
                {index < 3 && (
                  <span className="mt-4 h-px flex-1 bg-slate-200" />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="mb-4 flex items-center gap-4">
          <img src="/excel-file.svg" alt="" className="h-14 w-14" />
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              Upload Data Sheet
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload file Excel atau CSV yang berisi data penerima dan variabel
              pesan.
            </p>
          </div>
        </div>
        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-2">
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-5 text-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onClick={(event) => {
                event.currentTarget.value = "";
              }}
              onChange={(event) => onReplaceFile(event.target.files?.[0])}
            />
            <img src="/excel-file.svg" alt="" className="h-14 w-14" />
            <p className="mt-3 font-semibold text-slate-900">
              Drag & drop file di sini
            </p>
            <p className="mt-1 text-sm text-slate-500">
              atau pilih file dari komputer
            </p>
            <span className="mt-3 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white">
              Pilih File
            </span>
          </label>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-700">
              File berhasil di-upload
            </p>
            <div className="mt-3 flex items-center gap-4 rounded-xl border border-emerald-100 bg-white p-4">
              <img src="/excel-file.svg" alt="" className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">
                  {fileName}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {rows.length} record terbaca
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Berhasil dibaca
              </span>
            </div>
            <div className="mt-3 flex justify-center gap-2">
              <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onClick={(event) => {
                    event.currentTarget.value = "";
                  }}
                  onChange={(event) => onReplaceFile(event.target.files?.[0])}
                />
                Ganti File
              </label>
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm text-rose-600"
              >
                Kosongkan data
              </button>
            </div>
          </div>
        </section>
        <section className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-bold text-slate-900">Deteksi Kolom Otomatis</h3>
            <p className="mt-1 text-xs text-slate-500">
              Sistem mendeteksi kolom dan mengenali jenis datanya.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {columns.map((column) => (
                <div
                  key={column}
                  className={`min-w-28 rounded-lg border p-3 ${column === phoneField ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
                >
                  <p className="text-xs font-semibold text-slate-700">
                    {column}
                  </p>
                  <select
                    value={columnTypes[column] ?? "Teks"}
                    onChange={(event) => {
                      const nextType = event.target.value;
                      setColumnTypes((current) => ({
                        ...current,
                        [column]: nextType,
                      }));
                      onRowsChange(
                        rows.map((row) => ({
                          ...row,
                          [column]: convertBroadcastValue(
                            row[column],
                            nextType,
                          ),
                        })),
                      );
                    }}
                    className={`mt-2 rounded-full border-0 px-2 py-1 text-[10px] font-semibold outline-none ${columnTypes[column] === "Nomor" ? "bg-emerald-100 text-emerald-700" : columnTypes[column] === "Tanggal" ? "bg-violet-100 text-violet-700" : columnTypes[column] === "Angka" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}
                  >
                    {[
                      "Teks",
                      "Nomor",
                      "Tanggal",
                      "Angka",
                      "Rupiah",
                      "Dollar",
                    ].map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-bold text-slate-900">Pemetaan Field Utama</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-500">
                Kolom nama
                <select
                  value={nameField}
                  onChange={(event) => setNameField(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                >
                  {columns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-500">
                Kolom nomor
                <select
                  value={phoneField}
                  onChange={(event) => setPhoneField(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                >
                  {columns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <h3 className="font-bold text-slate-900">Kolom Nomor WhatsApp</h3>
            <p className="mt-1 text-xs text-slate-500">
              Pilih kolom tujuan pengiriman pesan.
            </p>
            <select
              value={phoneField}
              onChange={(event) => setPhoneField(event.target.value)}
              className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-lg font-bold text-emerald-600">
                  {Math.max(0, validCount)}
                </p>
                <p className="text-[10px] text-emerald-700">valid</p>
              </div>
              <div className="rounded-lg bg-rose-50 p-3 text-center">
                <p className="text-lg font-bold text-rose-600">
                  {invalidCount}
                </p>
                <p className="text-[10px] text-rose-700">tidak valid</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-center">
                <p className="text-lg font-bold text-amber-600">
                  {duplicateCount}
                </p>
                <p className="text-[10px] text-amber-700">duplikat</p>
              </div>
            </div>
            {invalidCount > 0 && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-rose-700">
                    {invalidCount} nomor perlu diperbaiki
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedInvalid(invalidIndexes)}
                    className="text-xs font-semibold text-rose-700"
                  >
                    Pilih semua
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!selectedInvalid.length}
                  onClick={autoCorrectSelected}
                  className="mt-3 w-full rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Auto-correct {selectedInvalid.length} nomor terpilih
                </button>
              </div>
            )}
          </div>
        </section>
        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-slate-900">Preview Data</h3>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                {rows.length} record
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {columns.length} kolom
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={validationFilter}
                onChange={(event) =>
                  setValidationFilter(
                    event.target.value as typeof validationFilter,
                  )
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">Semua status</option>
                <option value="valid">Valid ({validCount})</option>
                <option value="invalid">Tidak valid ({invalidCount})</option>
                <option value="duplicate">Duplikat ({duplicateCount})</option>
              </select>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari data..."
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <label className="min-w-44 flex-1 text-xs font-semibold text-slate-600">
              Bulk isi kolom
              <select
                value={bulkField}
                onChange={(event) => {
                  setBulkField(event.target.value);
                  setBulkValue("");
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"
              >
                <option value="">Pilih kolom</option>
                {columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-56 flex-[2] text-xs font-semibold text-slate-600">
              Nilai seragam
              <input
                type={
                  (columnTypes[bulkField] ?? broadcastColumnType(bulkField)) ===
                  "Tanggal"
                    ? "date"
                    : "text"
                }
                inputMode={
                  ["Nomor", "Angka", "Rupiah", "Dollar"].includes(
                    columnTypes[bulkField] ?? broadcastColumnType(bulkField),
                  )
                    ? "numeric"
                    : undefined
                }
                value={bulkValue}
                disabled={!bulkField}
                onChange={(event) =>
                  setBulkValue(
                    sanitizeBroadcastValue(
                      event.target.value,
                      columnTypes[bulkField] ?? broadcastColumnType(bulkField),
                    ),
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal disabled:bg-slate-100"
              />
            </label>
            <button
              type="button"
              disabled={!bulkField || !selectedRows.length}
              onClick={() => applyUploadBulk("selected")}
              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-600 disabled:opacity-40"
            >
              Terapkan ke dipilih ({selectedRows.length})
            </button>
            <button
              type="button"
              disabled={!bulkField || !filteredRows.length}
              onClick={() => applyUploadBulk("filtered")}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              Terapkan ke semua hasil
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={
                        !!visibleRows.length &&
                        visibleRows.every(({ rowIndex }) =>
                          selectedRows.includes(rowIndex),
                        )
                      }
                      onChange={(event) =>
                        setSelectedRows(
                          event.target.checked
                            ? visibleRows.map(({ rowIndex }) => rowIndex)
                            : [],
                        )
                      }
                      aria-label="Pilih semua baris"
                    />
                  </th>
                  <th className="px-3 py-3">No</th>
                  {columns.map((column) => (
                    <th key={column} className="px-3 py-3">
                      {column}
                    </th>
                  ))}
                  <th className="w-20 px-3 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(({ row, rowIndex }) => (
                  <tr key={rowIndex} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(rowIndex)}
                        onChange={(event) =>
                          setSelectedRows((current) =>
                            event.target.checked
                              ? [...current, rowIndex]
                              : current.filter((item) => item !== rowIndex),
                          )
                        }
                        aria-label={`Pilih baris ${rowIndex + 1}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      <span className="flex items-center gap-2">
                        {!isValidBroadcastPhone(row[phoneField]) && (
                          <input
                            type="checkbox"
                            checked={selectedInvalid.includes(rowIndex)}
                            onChange={() => {
                              setSelectedInvalid((current) =>
                                current.includes(rowIndex)
                                  ? current.filter((item) => item !== rowIndex)
                                  : [...current, rowIndex],
                              );
                            }}
                            className="accent-rose-600"
                          />
                        )}
                        {rowIndex + 1}
                      </span>
                    </td>
                    {columns.map((column) => (
                      <td key={column} className="p-1.5">
                        <input
                          type={
                            (columnTypes[column] ??
                              broadcastColumnType(column)) === "Tanggal"
                              ? "date"
                              : "text"
                          }
                          inputMode={
                            (columnTypes[column] ??
                              broadcastColumnType(column)) === "Nomor"
                              ? "numeric"
                              : ["Angka", "Rupiah", "Dollar"].includes(
                                    columnTypes[column] ??
                                      broadcastColumnType(column),
                                  )
                                ? "decimal"
                                : undefined
                          }
                          value={
                            (columnTypes[column] ??
                              broadcastColumnType(column)) === "Tanggal"
                              ? broadcastDateValue(row[column])
                              : String(row[column] ?? "")
                          }
                          onChange={(event) =>
                            updateUploadCell(
                              rowIndex,
                              column,
                              event.target.value,
                            )
                          }
                          aria-invalid={
                            column === phoneField &&
                            !isValidBroadcastPhone(row[phoneField])
                          }
                          className={`w-full min-w-32 rounded-md border px-2 py-1.5 outline-none ${column === phoneField && !isValidBroadcastPhone(row[phoneField]) ? "border-rose-300 bg-rose-50 font-semibold text-rose-600" : "border-slate-200 text-slate-700 focus:border-blue-500"}`}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Duplikat baris"
                          aria-label="Duplikat baris"
                          onClick={() =>
                            onRowsChange([
                              ...rows.slice(0, rowIndex + 1),
                              { ...row },
                              ...rows.slice(rowIndex + 1),
                            ])
                          }
                          className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <RowActionIcon type="copy" />
                        </button>
                        <button
                          type="button"
                          title="Hapus baris"
                          aria-label="Hapus baris"
                          onClick={() =>
                            onRowsChange(
                              rows.filter((_, index) => index !== rowIndex),
                            )
                          }
                          className="grid size-8 place-items-center rounded-md text-rose-500 hover:bg-rose-50"
                        >
                          <RowActionIcon type="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 p-4">
            <DynamicVariableCallout fields={columns} />
          </div>
        </section>
        <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div>
            <p className="font-bold text-emerald-800">
              Data berhasil di-upload
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              File berhasil dibaca dan siap untuk langkah selanjutnya.
            </p>
          </div>
          <div className="flex items-center gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{rows.length}</p>
              <p className="text-xs text-slate-500">record</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {columns.length}
              </p>
              <p className="text-xs text-slate-500">kolom</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">
                {Math.max(0, validCount)}
              </p>
              <p className="text-xs text-slate-500">siap dikirim</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">
                {invalidCount + duplicateCount}
              </p>
              <p className="text-xs text-slate-500">perlu diperiksa</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm"
            >
              Kembali
            </button>
            <button
              type="button"
              disabled={
                !validCount ||
                invalidCount > 0 ||
                duplicateCount > 0 ||
                !nameField ||
                !phoneField
              }
              onClick={() => onContinue(nameField, phoneField)}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              Lanjutkan ke Tulis Pesan →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function MappingDataPage({
  collapsed,
  token,
  rows,
  fields,
  contacts,
  instances,
  initialSource,
  onRowsChange,
  onFieldsChange,
  onBack,
  onContinue,
}: {
  collapsed: boolean;
  token: string;
  rows: any[];
  fields: string[];
  contacts: any[];
  instances: any[];
  initialSource: "contacts" | "groups" | "api" | "saved";
  onRowsChange: (rows: any[]) => void;
  onFieldsChange: (fields: string[]) => void;
  onBack: () => void;
  onContinue: (rows: any[], fields: string[]) => void;
}) {
  const [source, setSource] = useState<"contacts" | "groups" | "api" | "saved">(
    initialSource,
  );
  const [instanceId, setInstanceId] = useState(instances[0]?.id ?? "");
  const [savedSheets, setSavedSheets] = useState<any[]>([]);
  const [savedSheetId, setSavedSheetId] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiMethod, setApiMethod] = useState("GET");
  const [apiDataPath, setApiDataPath] = useState("");
  const [apiHeaders, setApiHeaders] = useState("{}");
  const [apiBody, setApiBody] = useState("{}");
  const [query, setQuery] = useState("");
  const [validationFilter, setValidationFilter] = useState<
    "all" | "valid" | "invalid" | "duplicate"
  >("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [bulkField, setBulkField] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const columns = Array.from(
    new Set([...fields, ...Object.keys(rows[0] ?? {})]),
  );
  const [nameField, setNameField] = useState("");
  const [phoneField, setPhoneField] = useState("");
  const [columnTypes, setColumnTypes] = useState<Record<string, string>>({});
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    request<any[]>("/data-sheets", {}, token)
      .then(setSavedSheets)
      .catch(() => setSavedSheets([]));
  }, [token]);

  useEffect(() => {
    setNameField((current) =>
      columns.includes(current)
        ? current
        : (columns.find((field) => /^(name|nama|nama_lengkap)$/i.test(field)) ??
          columns[0] ??
          ""),
    );
    setPhoneField((current) =>
      columns.includes(current)
        ? current
        : (columns.find((field) =>
            /^(phone|nomor_hp|no_hp|nomor|nomor_whatsapp|whatsapp|wa)$/i.test(
              field,
            ),
          ) ?? ""),
    );
    setColumnTypes(
      Object.fromEntries(
        columns.map((field) => [field, broadcastColumnType(field)]),
      ),
    );
    setFieldMappings((current) =>
      Object.fromEntries(
        columns.map((field) => [
          field,
          columns.includes(current[field]) ? current[field] : field,
        ]),
      ),
    );
  }, [columns.join("\u0000")]);

  const phoneCounts = rows.reduce((result: Record<string, number>, row) => {
    const phone = normalizeBroadcastPhone(row[phoneField]);
    if (phone) result[phone] = (result[phone] ?? 0) + 1;
    return result;
  }, {});
  const invalidCount = phoneField
    ? rows.filter((row) => !isValidBroadcastPhone(row[phoneField])).length
    : rows.length;
  const duplicateCount = phoneField
    ? rows.filter(
        (row) => phoneCounts[normalizeBroadcastPhone(row[phoneField])] > 1,
      ).length
    : 0;
  const validCount = Math.max(0, rows.length - invalidCount - duplicateCount);
  const filteredRows = rows
    .map((row, rowIndex) => ({ row, rowIndex }))
    .filter(({ row }) => {
      const matchesSearch = columns.some((field) =>
        String(row[field] ?? "")
          .toLowerCase()
          .includes(query.toLowerCase()),
      );
      if (!matchesSearch) return false;
      const phone = normalizeBroadcastPhone(row[phoneField]);
      const isInvalid = !isValidBroadcastPhone(row[phoneField]);
      const isDuplicate = Boolean(phone && phoneCounts[phone] > 1);
      if (validationFilter === "invalid") return isInvalid;
      if (validationFilter === "duplicate") return !isInvalid && isDuplicate;
      if (validationFilter === "valid") return !isInvalid && !isDuplicate;
      return true;
    });
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * pageSize;
  const visibleRows = filteredRows.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize, validationFilter]);

  function applyRows(nextRows: any[], nextFields?: string[]) {
    const detectedFields =
      nextFields ??
      Array.from(new Set(nextRows.flatMap((row) => Object.keys(row ?? {}))));
    onRowsChange(nextRows);
    onFieldsChange(detectedFields);
    setPage(1);
    setSelectedRows([]);
  }

  async function clearMappingData() {
    if (!rows.length && !fields.length) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Kosongkan data mapping?",
      text: "Preview data dan seluruh kolom aktif akan dihapus dari proses broadcast ini. Data sheet yang sudah tersimpan tidak ikut terhapus.",
      showCancelButton: true,
      confirmButtonText: "Kosongkan data",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    onRowsChange([]);
    onFieldsChange([]);
    setSelectedRows([]);
    setQuery("");
    setValidationFilter("all");
    setPage(1);
  }

  function updateMappingCell(rowIndex: number, field: string, value: string) {
    const dataType = columnTypes[field] ?? broadcastColumnType(field);
    const nextValue =
      dataType === "Tanggal" ? value : sanitizeBroadcastValue(value, dataType);
    onRowsChange(
      rows.map((row, index) =>
        index === rowIndex ? { ...row, [field]: nextValue } : row,
      ),
    );
  }

  function applyBulkValue(scope: "selected" | "filtered") {
    if (!bulkField) return;
    const targets =
      scope === "selected"
        ? new Set(selectedRows)
        : new Set(filteredRows.map(({ rowIndex }) => rowIndex));
    if (!targets.size) return;
    const dataType = columnTypes[bulkField] ?? broadcastColumnType(bulkField);
    const value =
      dataType === "Tanggal"
        ? bulkValue
        : sanitizeBroadcastValue(bulkValue, dataType);
    onRowsChange(
      rows.map((row, index) =>
        targets.has(index) ? { ...row, [bulkField]: value } : row,
      ),
    );
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `Nilai diterapkan ke ${targets.size} baris`,
      showConfirmButton: false,
      timer: 1800,
    });
  }

  async function autoCorrectInvalidPhones() {
    if (!phoneField) return;
    const candidates = rows
      .map((row, rowIndex) => ({
        rowIndex,
        before: String(row[phoneField] ?? ""),
        after: normalizeBroadcastPhone(row[phoneField]),
      }))
      .filter(
        (item) =>
          !isValidBroadcastPhone(item.before) &&
          item.after !== item.before &&
          isValidBroadcastPhone(item.after),
      );
    if (!candidates.length) {
      await Swal.fire({
        icon: "info",
        title: "Tidak ada nomor yang dapat dikoreksi otomatis",
        text: "Gunakan filter Tidak valid lalu koreksi manual pada tabel bila formatnya memang berbeda.",
      });
      return;
    }
    const preview = candidates
      .slice(0, 5)
      .map((item) => `${item.before || "(kosong)"} → ${item.after}`)
      .join("<br>");
    const result = await Swal.fire({
      icon: "question",
      title: `Koreksi ${candidates.length} nomor?`,
      html: `<div class="text-left text-sm">Nomor berikut akan dinormalisasi ke format 62xxxxxxxxxx:<br><br>${preview}${candidates.length > 5 ? "<br>…" : ""}</div>`,
      showCancelButton: true,
      confirmButtonText: "Koreksi sekarang",
      cancelButtonText: "Batal",
    });
    if (!result.isConfirmed) return;
    const replacements = new Map(
      candidates.map((item) => [item.rowIndex, item.after]),
    );
    onRowsChange(
      rows.map((row, rowIndex) =>
        replacements.has(rowIndex)
          ? { ...row, [phoneField]: replacements.get(rowIndex) }
          : row,
      ),
    );
    setValidationFilter("all");
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `${candidates.length} nomor berhasil dikoreksi`,
      showConfirmButton: false,
      timer: 2000,
    });
  }

  async function deleteSelectedDuplicates() {
    const removable = selectedRows.filter((rowIndex) => {
      const phone = normalizeBroadcastPhone(rows[rowIndex]?.[phoneField]);
      return Boolean(phone && phoneCounts[phone] > 1);
    });
    if (!removable.length) {
      await Swal.fire({
        icon: "info",
        title: "Pilih data yang ingin dihapus",
        text: "Pilih satu atau beberapa baris duplikat terlebih dahulu. Sisakan baris yang datanya paling benar.",
      });
      return;
    }
    const details = removable
      .slice(0, 6)
      .map((rowIndex) => {
        const row = rows[rowIndex] ?? {};
        return `${row[nameField] || "Tanpa nama"} — ${row[phoneField] || ""}`;
      })
      .join("<br>");
    const result = await Swal.fire({
      icon: "warning",
      title: `Hapus ${removable.length} data terpilih?`,
      html: `<div class="text-left text-sm">Pastikan Anda sudah menyisakan data yang benar.<br><br>${details}${removable.length > 6 ? "<br>…" : ""}</div>`,
      showCancelButton: true,
      confirmButtonText: "Hapus data terpilih",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    const targets = new Set(removable);
    onRowsChange(rows.filter((_, rowIndex) => !targets.has(rowIndex)));
    setSelectedRows([]);
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `${removable.length} data duplikat dihapus`,
      showConfirmButton: false,
      timer: 1800,
    });
  }

  async function addMappingColumn() {
    const result = await Swal.fire({
      title: "Tambah kolom custom",
      input: "text",
      inputLabel: "Nama kolom",
      inputPlaceholder: "Contoh: jabatan",
      showCancelButton: true,
      confirmButtonText: "Tambahkan",
      cancelButtonText: "Batal",
      inputValidator: (value) => {
        const field = normalizeDatasetField(value);
        if (!field) return "Nama kolom wajib diisi.";
        if (columns.includes(field)) return "Kolom tersebut sudah tersedia.";
        return undefined;
      },
    });
    if (!result.isConfirmed) return;
    const field = normalizeDatasetField(String(result.value));
    onFieldsChange([...columns, field]);
    onRowsChange(rows.map((row) => ({ ...row, [field]: "" })));
  }

  async function renameMappingColumn(field: string) {
    const result = await Swal.fire({
      title: "Edit nama kolom",
      input: "text",
      inputValue: field.replaceAll("_", " "),
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      inputValidator: (value) => {
        const nextField = normalizeDatasetField(value);
        if (!nextField) return "Nama kolom wajib diisi.";
        if (nextField !== field && columns.includes(nextField))
          return "Kolom tersebut sudah tersedia.";
        return undefined;
      },
    });
    if (!result.isConfirmed) return;
    const nextField = normalizeDatasetField(String(result.value));
    if (nextField === field) return;
    onFieldsChange(columns.map((item) => (item === field ? nextField : item)));
    onRowsChange(
      rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key === field ? nextField : key,
            value,
          ]),
        ),
      ),
    );
    if (nameField === field) setNameField(nextField);
    if (phoneField === field) setPhoneField(nextField);
  }

  async function removeMappingColumn(field: string) {
    if (field === nameField || field === phoneField) {
      await Swal.fire({
        icon: "warning",
        title: "Kolom sedang digunakan",
        text: "Ganti pemetaan nama atau nomor WhatsApp sebelum menghapus kolom ini.",
      });
      return;
    }
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus kolom?",
      text: `Data pada kolom ${field} akan ikut dihapus.`,
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    onFieldsChange(columns.filter((item) => item !== field));
    onRowsChange(
      rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).filter(([key]) => key !== field),
        ),
      ),
    );
  }

  function useSystemContacts() {
    const nextRows = contacts.map((contact) => ({
      name: contact.name,
      phone: contact.phone,
      email: contact.email ?? "",
      company: contact.company ?? "",
      ...(contact.customFields ?? {}),
    }));
    applyRows(nextRows);
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `${nextRows.length} kontak sistem dimuat`,
      showConfirmButton: false,
      timer: 1800,
    });
  }

  async function syncWhatsapp(kind: "contacts" | "groups") {
    if (!instanceId) {
      await Swal.fire({
        icon: "warning",
        title: "Pilih instance",
        text: "Pilih perangkat WhatsApp yang akan disinkronkan.",
      });
      return;
    }
    void Swal.fire({
      title:
        kind === "contacts"
          ? "Sinkronisasi kontak"
          : "Sinkronisasi anggota grup",
      text: "Data sedang dibaca dari perangkat WhatsApp.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      const result = await request<any>(
        `/contacts/import/${instanceId}/preview`,
        { method: "POST", body: JSON.stringify({ source: kind }) },
        token,
      );
      const nextRows = (result.contacts ?? []).map((contact: any) => ({
        name: contact.name ?? contact.phone,
        phone: contact.phone,
        ...(kind === "groups"
          ? {
              group_name: contact.groupName ?? "",
              group_id: contact.groupId ?? "",
            }
          : {}),
      }));
      applyRows(nextRows);
      await Swal.fire({
        icon: "success",
        title: "Sinkronisasi selesai",
        text: `${nextRows.length} data berhasil dibaca.`,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Sinkronisasi gagal",
        text:
          error instanceof Error ? error.message : "Provider tidak merespons.",
      });
    }
  }

  async function loadSavedSheet(id: string) {
    setSavedSheetId(id);
    if (!id) return;
    try {
      const sheet = await request<any>(`/data-sheets/${id}`, {}, token);
      applyRows(
        Array.isArray(sheet.rows) ? sheet.rows : [],
        Array.isArray(sheet.fields) ? sheet.fields : [],
      );
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Data sheet gagal dimuat",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    }
  }

  async function connectExternalApi() {
    if (!apiUrl.trim()) return;
    let headers: Record<string, string> = {};
    let body: unknown = {};
    try {
      headers = JSON.parse(apiHeaders || "{}");
      body = JSON.parse(apiBody || "{}");
    } catch {
      await Swal.fire({
        icon: "error",
        title: "JSON tidak valid",
        text: "Periksa header atau body API.",
      });
      return;
    }
    void Swal.fire({
      title: "Menghubungkan API",
      text: "Mengambil dan membaca struktur data.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      const result = await request<any>(
        "/data-sheets/external/preview",
        {
          method: "POST",
          body: JSON.stringify({
            url: apiUrl,
            method: apiMethod,
            headers,
            body,
            dataPath: apiDataPath,
          }),
        },
        token,
      );
      applyRows(result.rows ?? [], result.fields ?? []);
      await Swal.fire({
        icon: "success",
        title: "API terhubung",
        text: `${result.total ?? 0} record berhasil dibaca.`,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "API gagal dihubungkan",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    }
  }

  function continueMapping() {
    if (!nameField || !phoneField || invalidCount || duplicateCount) return;
    const customFields = columns.filter(
      (field) => field !== nameField && field !== phoneField,
    );
    const mappedRows = rows.map((row) => ({
      name: String(row[nameField] ?? "").trim(),
      phone: normalizeBroadcastPhone(row[phoneField]),
      ...Object.fromEntries(
        customFields.map((field) => [
          field,
          row[fieldMappings[field] ?? field] ?? "",
        ]),
      ),
    }));
    onContinue(mappedRows, customFields);
  }

  const sourceCards = [
    {
      id: "contacts" as const,
      title: "Kontak",
      description: "Gunakan kontak sistem atau sinkronkan dari WhatsApp.",
      color: "blue",
    },
    {
      id: "groups" as const,
      title: "Grup WhatsApp",
      description: "Ambil anggota dari grup pada instance terpilih.",
      color: "violet",
    },
    {
      id: "api" as const,
      title: "API Eksternal",
      description: "Ambil data JSON dari endpoint aplikasi lain.",
      color: "blue",
    },
    {
      id: "saved" as const,
      title: "Data Sheet Tersimpan",
      description: "Gunakan kembali data yang pernah dipakai.",
      color: "emerald",
    },
  ];

  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-[#f7f9fc] px-5 py-6 transition-all`}
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Broadcast WhatsApp
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Petakan sumber data dan field sebelum menulis pesan.
            </p>
          </div>
          <BroadcastWizardStepper current={1} />
        </div>
        <div className="mb-4 flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-xl bg-emerald-600 text-white">
            <svg
              viewBox="0 0 24 24"
              className="size-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <ellipse cx="12" cy="5" rx="8" ry="3" />
              <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
            </svg>
          </span>
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Mapping Data</h2>
            <p className="text-sm text-slate-500">
              Petakan sumber data ke field broadcast agar siap digunakan.
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-bold">Sumber Data</h3>
          <p className="text-sm text-slate-500">
            Pilih sumber data yang akan digunakan untuk broadcast.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {sourceCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setSource(card.id)}
                className={`rounded-xl border-2 p-4 text-left transition ${source === card.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}
              >
                <span
                  className={`grid size-11 place-items-center rounded-full ${card.color === "emerald" ? "bg-emerald-100 text-emerald-600" : card.color === "violet" ? "bg-violet-100 text-violet-600" : "bg-blue-100 text-blue-600"}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    {card.id === "api" ? (
                      <path d="M9 15l6-6M7.5 12.5l-2 2a3.5 3.5 0 0 0 5 5l2-2M16.5 11.5l2-2a3.5 3.5 0 0 0-5-5l-2 2" />
                    ) : card.id === "saved" ? (
                      <>
                        <path d="M5 4h11l3 3v13H5z" />
                        <path d="M8 4v6h8V4M8 16h8" />
                      </>
                    ) : (
                      <>
                        <circle cx="9" cy="8" r="3" />
                        <circle cx="17" cy="9" r="2" />
                        <path d="M3 20c0-4 2.5-7 6-7s6 3 6 7M15 14c3 0 5 2.2 5 5" />
                      </>
                    )}
                  </svg>
                </span>
                <p className="mt-3 font-bold text-slate-900">{card.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {card.description}
                </p>
              </button>
            ))}
          </div>

          {(source === "contacts" || source === "groups") && (
            <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-4">
              <label className="min-w-64 flex-1 text-sm font-semibold">
                Instance WhatsApp
                <select
                  value={instanceId}
                  onChange={(event) => setInstanceId(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal"
                >
                  <option value="">Pilih instance</option>
                  {instances.map((instance) => (
                    <option key={instance.id} value={instance.id}>
                      {instance.name} · {instance.engine}
                    </option>
                  ))}
                </select>
              </label>
              {source === "contacts" && (
                <button
                  type="button"
                  onClick={useSystemContacts}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
                >
                  Gunakan kontak sistem
                </button>
              )}
              <button
                type="button"
                onClick={() => syncWhatsapp(source)}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                {source === "contacts"
                  ? "Sinkron kontak WhatsApp"
                  : "Sinkron anggota grup"}
              </button>
            </div>
          )}

          {source === "saved" && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <label className="text-sm font-semibold">
                Pilih Data Sheet
                <select
                  value={savedSheetId}
                  onChange={(event) => loadSavedSheet(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal"
                >
                  <option value="">Pilih data sheet tersimpan</option>
                  {savedSheets.map((sheet) => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.name} · {sheet.recordCount} record
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {source === "api" && (
            <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[120px_1fr_180px]">
              <label className="text-xs font-semibold">
                Method
                <select
                  value={apiMethod}
                  onChange={(event) => setApiMethod(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"
                >
                  <option>GET</option>
                  <option>POST</option>
                </select>
              </label>
              <label className="text-xs font-semibold">
                Endpoint URL
                <input
                  value={apiUrl}
                  onChange={(event) => setApiUrl(event.target.value)}
                  placeholder="https://api.example.com/contacts"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold">
                Data path
                <input
                  value={apiDataPath}
                  onChange={(event) => setApiDataPath(event.target.value)}
                  placeholder="data.contacts"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold md:col-span-1">
                Headers JSON
                <textarea
                  value={apiHeaders}
                  onChange={(event) => setApiHeaders(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-normal"
                />
              </label>
              <label className="text-xs font-semibold md:col-span-1">
                Body JSON
                <textarea
                  value={apiBody}
                  onChange={(event) => setApiBody(event.target.value)}
                  rows={3}
                  disabled={apiMethod === "GET"}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-normal disabled:bg-slate-100"
                />
              </label>
              <button
                type="button"
                onClick={connectExternalApi}
                className="self-end rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Tes dan ambil data
              </button>
            </div>
          )}
        </section>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div>
                  <h3 className="text-lg font-bold">Preview Data</h3>
                  <p className="text-xs text-slate-500">
                    {rows.length} record · {columns.length} kolom
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!rows.length}
                    onClick={clearMappingData}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 disabled:opacity-40"
                  >
                    Kosongkan data
                  </button>
                  <select
                    value={validationFilter}
                    onChange={(event) =>
                      setValidationFilter(
                        event.target.value as typeof validationFilter,
                      )
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    aria-label="Filter validasi nomor"
                  >
                    <option value="all">Semua status</option>
                    <option value="valid">Valid ({validCount})</option>
                    <option value="invalid">
                      Tidak valid ({invalidCount})
                    </option>
                    <option value="duplicate">
                      Duplikat ({duplicateCount})
                    </option>
                  </select>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari data..."
                    className="w-56 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <select
                    value={pageSize}
                    onChange={(event) =>
                      setPageSize(Number(event.target.value))
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value={10}>10 baris</option>
                    <option value={25}>25 baris</option>
                    <option value={50}>50 baris</option>
                    <option value={100}>100 baris</option>
                  </select>
                </div>
              </div>
              {validationFilter === "invalid" && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5">
                  <p className="text-xs text-amber-800">
                    Periksa nomor yang ditandai merah sebelum koreksi. Anda
                    tetap dapat mengubahnya satu per satu atau memakai bulk isi
                    kolom.
                  </p>
                  <button
                    type="button"
                    onClick={autoCorrectInvalidPhones}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800"
                  >
                    Auto-correct nomor yang bisa diperbaiki
                  </button>
                </div>
              )}
              {validationFilter === "duplicate" && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200 bg-rose-50 px-4 py-2.5">
                  <p className="text-xs text-rose-800">
                    Bandingkan nama dan data setiap nomor. Centang hanya data
                    duplikat yang ingin dihapus, lalu sisakan satu data yang
                    benar.
                  </p>
                  <button
                    type="button"
                    disabled={!selectedRows.length}
                    onClick={deleteSelectedDuplicates}
                    className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-40"
                  >
                    Hapus duplikat terpilih ({selectedRows.length})
                  </button>
                </div>
              )}
              <div className="flex flex-wrap items-end gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <label className="min-w-44 flex-1 text-xs font-semibold text-slate-600">
                  Bulk isi kolom
                  <select
                    value={bulkField}
                    onChange={(event) => {
                      setBulkField(event.target.value);
                      setBulkValue("");
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
                  >
                    <option value="">Pilih kolom</option>
                    {columns.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="min-w-56 flex-[2] text-xs font-semibold text-slate-600">
                  Nilai yang diterapkan
                  <input
                    type={
                      (columnTypes[bulkField] ??
                        broadcastColumnType(bulkField)) === "Tanggal"
                        ? "date"
                        : "text"
                    }
                    inputMode={
                      ["Nomor", "Angka", "Rupiah", "Dollar"].includes(
                        columnTypes[bulkField] ??
                          broadcastColumnType(bulkField),
                      )
                        ? "numeric"
                        : undefined
                    }
                    value={bulkValue}
                    disabled={!bulkField}
                    onChange={(event) =>
                      setBulkValue(
                        sanitizeBroadcastValue(
                          event.target.value,
                          columnTypes[bulkField] ??
                            broadcastColumnType(bulkField),
                        ),
                      )
                    }
                    placeholder="Isi nilai yang sama untuk banyak baris"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 disabled:bg-slate-100"
                  />
                </label>
                <button
                  type="button"
                  disabled={!bulkField || !selectedRows.length}
                  onClick={() => applyBulkValue("selected")}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-600 disabled:opacity-40"
                >
                  Terapkan ke dipilih ({selectedRows.length})
                </button>
                <button
                  type="button"
                  disabled={!bulkField || !filteredRows.length}
                  onClick={() => applyBulkValue("filtered")}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Terapkan ke semua hasil
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-left text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="w-11 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={
                            !!visibleRows.length &&
                            visibleRows.every(({ rowIndex }) =>
                              selectedRows.includes(rowIndex),
                            )
                          }
                          onChange={(event) =>
                            setSelectedRows((current) => {
                              const pageIndexes = visibleRows.map(
                                ({ rowIndex }) => rowIndex,
                              );
                              return event.target.checked
                                ? Array.from(
                                    new Set([...current, ...pageIndexes]),
                                  )
                                : current.filter(
                                    (index) => !pageIndexes.includes(index),
                                  );
                            })
                          }
                          aria-label="Pilih semua baris pada halaman"
                        />
                      </th>
                      <th className="px-3 py-3">No</th>
                      {columns.map((field) => (
                        <th key={field} className="px-3 py-3">
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map(({ row, rowIndex }, index) => (
                      <tr key={rowIndex} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(rowIndex)}
                            onChange={(event) =>
                              setSelectedRows((current) =>
                                event.target.checked
                                  ? [...current, rowIndex]
                                  : current.filter((item) => item !== rowIndex),
                              )
                            }
                            aria-label={`Pilih baris ${rowIndex + 1}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-400">
                          {pageStart + index + 1}
                        </td>
                        {columns.map((field) => (
                          <td key={field} className="p-1.5">
                            <input
                              type={
                                (columnTypes[field] ??
                                  broadcastColumnType(field)) === "Tanggal"
                                  ? "date"
                                  : "text"
                              }
                              inputMode={
                                ["Nomor", "Angka", "Rupiah", "Dollar"].includes(
                                  columnTypes[field] ??
                                    broadcastColumnType(field),
                                )
                                  ? "numeric"
                                  : undefined
                              }
                              value={
                                (columnTypes[field] ??
                                  broadcastColumnType(field)) === "Tanggal"
                                  ? broadcastDateValue(row[field])
                                  : String(row[field] ?? "")
                              }
                              onChange={(event) =>
                                updateMappingCell(
                                  rowIndex,
                                  field,
                                  event.target.value,
                                )
                              }
                              aria-invalid={
                                field === phoneField &&
                                !isValidBroadcastPhone(row[field])
                              }
                              className={`min-w-32 w-full rounded-md border px-2 py-1.5 outline-none ${field === phoneField && !isValidBroadcastPhone(row[field]) ? "border-red-300 bg-red-50 text-red-600" : "border-slate-200 bg-white text-slate-700 focus:border-blue-500"}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-500">
                  Menampilkan {filteredRows.length ? pageStart + 1 : 0}–
                  {Math.min(pageStart + pageSize, filteredRows.length)} dari{" "}
                  {filteredRows.length} data
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safePage === 1}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    className="grid size-8 place-items-center rounded-md border border-slate-200 text-sm disabled:opacity-30"
                    aria-label="Halaman sebelumnya"
                  >
                    ‹
                  </button>
                  {Array.from(
                    { length: Math.min(5, pageCount) },
                    (_, index) => {
                      const start = Math.min(
                        Math.max(1, safePage - 2),
                        Math.max(1, pageCount - 4),
                      );
                      return start + index;
                    },
                  ).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`grid size-8 place-items-center rounded-md border text-xs font-semibold ${safePage === pageNumber ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-600"}`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={safePage === pageCount}
                    onClick={() =>
                      setPage((current) => Math.min(pageCount, current + 1))
                    }
                    className="grid size-8 place-items-center rounded-md border border-slate-200 text-sm disabled:opacity-30"
                    aria-label="Halaman berikutnya"
                  >
                    ›
                  </button>
                </div>
              </div>
            </section>
            <div className="mt-4">
              <DynamicVariableCallout fields={columns} />
            </div>
            <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-emerald-600 text-white">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m6 12 4 4 8-9" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">
                    Ringkasan Mapping
                  </h3>
                  <p className="text-xs text-slate-500">
                    Periksa kembali data sebelum melanjutkan.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  {
                    value: rows.length,
                    label: "record dipetakan",
                    tone: "blue",
                  },
                  {
                    value: columns.length,
                    label: "kolom terhubung",
                    tone: "slate",
                  },
                  {
                    value: validCount,
                    label: "siap dikirim",
                    tone: "emerald",
                  },
                  {
                    value: invalidCount,
                    label: "nomor tidak valid",
                    tone: "red",
                  },
                  {
                    value: duplicateCount,
                    label: "duplikat",
                    tone: "amber",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-xl border p-3 ${item.tone === "emerald" ? "border-emerald-200 bg-emerald-50" : item.tone === "red" ? "border-red-200 bg-red-50" : item.tone === "amber" ? "border-amber-200 bg-amber-50" : item.tone === "blue" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
                  >
                    <strong
                      className={`block text-2xl ${item.tone === "emerald" ? "text-emerald-600" : item.tone === "red" ? "text-red-600" : item.tone === "amber" ? "text-amber-600" : item.tone === "blue" ? "text-blue-600" : "text-slate-700"}`}
                    >
                      {item.value}
                    </strong>
                    <span className="text-xs text-slate-600">{item.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </main>
          <aside className="flex h-fit flex-col gap-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 font-bold">
                    <svg
                      viewBox="0 0 24 24"
                      className="size-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Zm14-1 .8 2.2 2.2.8-2.2.8L19 19l-.8-2.2L16 16l2.2-.8L19 13Z" />
                    </svg>
                    Deteksi Otomatis Kolom
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Sistem mengenali jenis setiap kolom.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addMappingColumn}
                  className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                >
                  Tambah kolom
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {columns.map((field) => (
                  <div
                    key={field}
                    className={`rounded-lg border p-2 ${field === phoneField ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-xs font-semibold">{field}</p>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          title="Edit kolom"
                          aria-label={`Edit kolom ${field}`}
                          onClick={() => renameMappingColumn(field)}
                          className="grid size-6 place-items-center rounded text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="size-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
                            <path d="m13.8 7.4 3 3" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          title="Hapus kolom"
                          aria-label={`Hapus kolom ${field}`}
                          onClick={() => removeMappingColumn(field)}
                          className="grid size-6 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <RowActionIcon type="trash" />
                        </button>
                      </div>
                    </div>
                    <select
                      value={columnTypes[field] ?? broadcastColumnType(field)}
                      onChange={(event) =>
                        setColumnTypes((current) => ({
                          ...current,
                          [field]: event.target.value,
                        }))
                      }
                      className={`mt-2 w-full rounded-full border-0 px-2 py-1 text-[10px] font-semibold ${field === phoneField ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-600"}`}
                    >
                      <option>Teks</option>
                      <option>Nomor</option>
                      <option>Tanggal</option>
                      <option>Angka</option>
                      <option>Rupiah</option>
                      <option>Dollar</option>
                    </select>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold">
                <svg
                  viewBox="0 0 24 24"
                  className="size-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M9 15l6-6M7.5 12.5l-2 2a3.5 3.5 0 0 0 5 5l2-2M16.5 11.5l2-2a3.5 3.5 0 0 0-5-5l-2 2" />
                </svg>
                Pemetaan Field Broadcast
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Petakan kolom sumber ke field yang sesuai.
              </p>
              <div className="mt-4 flex flex-col gap-2.5">
                <div className="grid grid-cols-[105px_1fr_20px] items-center gap-2">
                  <span className="text-xs font-medium text-slate-700">
                    Nama Penerima
                  </span>
                  <select
                    value={nameField}
                    onChange={(event) => setNameField(event.target.value)}
                    className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                  >
                    <option value="">Pilih kolom</option>
                    {columns.map((field) => (
                      <option key={field}>{field}</option>
                    ))}
                  </select>
                  <span
                    className={`grid size-5 place-items-center rounded-full ${nameField ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="size-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="m6 12 4 4 8-9" />
                    </svg>
                  </span>
                </div>
                <div className="grid grid-cols-[105px_1fr_20px] items-center gap-2">
                  <span className="text-xs font-medium text-slate-700">
                    Nomor WhatsApp
                  </span>
                  <select
                    value={phoneField}
                    onChange={(event) => setPhoneField(event.target.value)}
                    className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                  >
                    <option value="">Pilih kolom</option>
                    {columns.map((field) => (
                      <option key={field}>{field}</option>
                    ))}
                  </select>
                  <span
                    className={`grid size-5 place-items-center rounded-full ${phoneField ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="size-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="m6 12 4 4 8-9" />
                    </svg>
                  </span>
                </div>
                {columns
                  .filter(
                    (field) => field !== nameField && field !== phoneField,
                  )
                  .map((field) => (
                    <div
                      key={field}
                      className="grid grid-cols-[105px_1fr_20px] items-center gap-2"
                    >
                      <span
                        className="truncate text-xs font-medium capitalize text-slate-700"
                        title={field}
                      >
                        {field.replaceAll("_", " ")}
                      </span>
                      <select
                        value={fieldMappings[field] ?? field}
                        onChange={(event) =>
                          setFieldMappings((current) => ({
                            ...current,
                            [field]: event.target.value,
                          }))
                        }
                        className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                      >
                        <option value="">Tidak dipetakan</option>
                        {columns.map((sourceField) => (
                          <option key={sourceField}>{sourceField}</option>
                        ))}
                      </select>
                      <span
                        className={`grid size-5 place-items-center rounded-full ${fieldMappings[field] ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"}`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="size-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path d="m6 12 4 4 8-9" />
                        </svg>
                      </span>
                    </div>
                  ))}
              </div>
            </section>
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  className="size-5 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M7 4c1 5 6 10 11 12l2-3-4-2-2 2c-2-1-4-3-5-5l2-2-2-4-2 2Z" />
                </svg>
                <h3 className="font-bold text-emerald-900">
                  Kolom Nomor WhatsApp
                </h3>
              </div>
              <select
                value={phoneField}
                onChange={(event) => setPhoneField(event.target.value)}
                className="mt-3 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Pilih kolom nomor</option>
                {columns.map((field) => (
                  <option key={field}>{field}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-emerald-700">
                Kolom ini digunakan sebagai tujuan pengiriman pesan.
              </p>
            </section>
          </aside>
        </div>
        <div className="mt-4 flex justify-end gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold"
          >
            Kembali
          </button>
          <button
            type="button"
            disabled={
              !rows.length ||
              !nameField ||
              !phoneField ||
              invalidCount > 0 ||
              duplicateCount > 0
            }
            onClick={continueMapping}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            Lanjutkan ke Tulis Pesan
          </button>
        </div>
      </div>
    </div>
  );
}

function BroadcastCampaignWizardReference({
  collapsed,
  token,
  onBack,
}: {
  collapsed: boolean;
  token: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [source, setSource] = useState<"upload" | "manual" | "database">(
    "upload",
  );
  const [rows, setRows] = useState<any[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [instances, setInstances] = useState<any[]>([]);
  const [instanceId, setInstanceId] = useState("");
  const [body, setBody] = useState("");
  const [campaignName, setCampaignName] = useState("Campaign baru");
  const [savedTemplates, setSavedTemplates] = useState<
    { name: string; body: string }[]
  >([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [delayMs, setDelayMs] = useState(5000);
  const [batchSize, setBatchSize] = useState(20);
  const [manualOpen, setManualOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadReview, setUploadReview] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mappingSource, setMappingSource] = useState<
    "contacts" | "groups" | "api" | "saved"
  >("contacts");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [includeSenderName, setIncludeSenderName] = useState(true);
  const [includeAttachment, setIncludeAttachment] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentMode, setAttachmentMode] = useState<"caption" | "separate">(
    "caption",
  );
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [reviewQuery, setReviewQuery] = useState("");
  const [sendGradually, setSendGradually] = useState(true);
  const [onlyValidNumbers, setOnlyValidNumbers] = useState(true);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState("");
  useEffect(() => {
    Promise.all([
      request<any[]>("/contacts", {}, token),
      request<any[]>("/instances", {}, token),
    ])
      .then(([contactData, instanceData]) => {
        setContacts(contactData);
        setInstances(instanceData);
        if (instanceData[0]) setInstanceId(instanceData[0].id);
      })
      .catch(() => undefined);
  }, [token]);
  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("gateway_message_templates") ?? "[]",
      );
      if (Array.isArray(stored)) setSavedTemplates(stored);
    } catch {
      setSavedTemplates([]);
    }
  }, []);
  useEffect(() => {
    document.body.dataset.broadcastFields = fields.join(",");
    window.dispatchEvent(new CustomEvent("broadcast-fields"));
    return () => {
      delete document.body.dataset.broadcastFields;
    };
  }, [fields]);
  useEffect(() => {
    if (!attachmentFile?.type.startsWith("image/")) {
      setAttachmentPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(attachmentFile);
    setAttachmentPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [attachmentFile]);
  function chooseAttachment(
    file: File | undefined,
    mode: "caption" | "separate",
  ) {
    if (!file) return;
    setAttachmentFile(file);
    setAttachmentName(file.name);
    setAttachmentMode(mode);
    setIncludeAttachment(true);
  }
  function clearAttachment() {
    setAttachmentFile(null);
    setAttachmentName("");
    setAttachmentPreviewUrl("");
    setIncludeAttachment(false);
  }
  const validRows = rows.filter(
    (row) => String(row.name ?? "").trim() && String(row.phone ?? "").trim(),
  );
  const invalidRowCount = Math.max(0, rows.length - validRows.length);
  const reviewRows = validRows.filter((row) => {
    const query = reviewQuery.trim().toLowerCase();
    if (!query) return true;
    return Object.values(row).some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(query),
    );
  });
  const previewRecipient =
    validRows[Math.min(previewIndex, Math.max(0, validRows.length - 1))] ?? {};
  const escapePreviewValue = (value: unknown) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  function renderPreviewMessage(value: string) {
    return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (token, rawField) => {
      const field = normalizeDatasetField(String(rawField));
      if (field === "name" || field === "nama")
        return escapePreviewValue(previewRecipient.name);
      if (/^(phone|nomor_hp|nomor|no_hp)$/.test(field))
        return escapePreviewValue(previewRecipient.phone);
      return field in previewRecipient
        ? escapePreviewValue(previewRecipient[field])
        : token;
    });
  }
  async function parseFile(file?: File) {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
      });
      const raw: any[] = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]],
        {
          raw: false,
          dateNF: "dd/mm/yyyy",
        },
      );
      const normalized = raw.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            normalizeDatasetField(key),
            value,
          ]),
        ),
      );
      const headers = Object.keys(normalized[0] ?? {});
      setFields(headers);
      setRows(normalized);
      setFileName(file.name);
      setSource("upload");
      setUploadReview(true);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "File tidak dapat dibaca",
        text: error instanceof Error ? error.message : "Periksa file Excel.",
      });
    }
  }
  function chooseDatabase() {
    setSource("database");
    setRows(
      contacts.map((contact) => ({
        name: contact.name,
        phone: contact.phone,
        ...(contact.customFields ?? {}),
      })),
    );
    setFields(
      Array.from(
        new Set(
          contacts.flatMap((contact) =>
            Object.keys(contact.customFields ?? {}),
          ),
        ),
      ),
    );
    setMappingSource("contacts");
    setMappingOpen(true);
  }
  function chooseManual() {
    setSource("manual");
    if (!rows.length || source !== "manual") {
      setRows([{ name: "", phone: "" }]);
      setFields([]);
    }
    setManualOpen(true);
  }
  async function persistDataSheet(
    name: string,
    sheetSource: string,
    sheetRows: any[],
    customFields: string[],
  ) {
    try {
      await request(
        "/data-sheets",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            source: sheetSource,
            fields: ["name", "phone", ...customFields],
            rows: sheetRows,
          }),
        },
        token,
      );
    } catch (error) {
      void Swal.fire({
        toast: true,
        position: "top-end",
        icon: "warning",
        title: "Data digunakan, tetapi gagal disimpan sebagai data sheet",
        showConfirmButton: false,
        timer: 2600,
      });
    }
  }
  async function submit() {
    if (!instanceId || !body.trim() || !validRows.length) return;
    setSaving(true);
    try {
      const imported = await request<any>(
        "/contacts/bulk",
        {
          method: "POST",
          body: JSON.stringify({
            contacts: validRows.map((row) => ({
              name: row.name,
              phone: row.phone,
              customFields: Object.fromEntries(
                fields.map((field) => [field, row[field] ?? ""]),
              ),
            })),
          }),
        },
        token,
      );
      const campaign = await request<any>(
        "/campaigns",
        {
          method: "POST",
          body: JSON.stringify({
            name: campaignName,
            instanceId,
            body: body
              .replaceAll("[NAMA]", "{{name}}")
              .replaceAll("[NOMOR_HP]", "{{phone}}"),
            scheduledAt: scheduledAt || undefined,
            delayMs: sendGradually ? delayMs : 0,
            batchSize,
            contactIds: imported.contacts.map((contact: any) => contact.id),
          }),
        },
        token,
      );
      await request(
        `/campaigns/${campaign.id}/queue`,
        { method: "POST" },
        token,
      );
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Campaign masuk ke antrean",
        showConfirmButton: false,
        timer: 2200,
      });
      onBack();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Campaign gagal dibuat",
        text: error instanceof Error ? error.message : "Terjadi kesalahan.",
      });
    } finally {
      setSaving(false);
    }
  }
  if (uploadReview)
    return (
      <UploadDataReviewPage
        collapsed={collapsed}
        fileName={fileName}
        rows={rows}
        fields={fields}
        onRowsChange={setRows}
        onReplaceFile={parseFile}
        onBack={() => {
          setUploadReview(false);
          setFileName("");
          setRows([]);
        }}
        onContinue={async (nameField, phoneField) => {
          const customFields = fields.filter(
            (field) => field !== nameField && field !== phoneField,
          );
          const mappedRows = rows.map((row) => ({
            name: String(row[nameField] ?? "").trim(),
            phone: normalizeBroadcastPhone(row[phoneField]),
            ...Object.fromEntries(
              customFields.map((field) => [field, row[field] ?? ""]),
            ),
          }));
          setRows(mappedRows);
          setFields(customFields);
          await persistDataSheet(
            fileName || `${campaignName} - Upload`,
            "upload",
            mappedRows,
            customFields,
          );
          setUploadReview(false);
          setStep(2);
        }}
      />
    );
  if (manualOpen)
    return (
      <ManualDataEntryPage
        collapsed={collapsed}
        rows={rows}
        fields={fields}
        onRowsChange={setRows}
        onFieldsChange={setFields}
        onBack={() => setManualOpen(false)}
        onContinue={async () => {
          await persistDataSheet(
            `${campaignName} - Manual`,
            "manual",
            rows,
            fields,
          );
          setManualOpen(false);
          setStep(2);
        }}
      />
    );
  if (mappingOpen)
    return (
      <MappingDataPage
        collapsed={collapsed}
        token={token}
        rows={rows}
        fields={fields}
        contacts={contacts}
        instances={instances}
        initialSource={mappingSource}
        onRowsChange={setRows}
        onFieldsChange={setFields}
        onBack={() => setMappingOpen(false)}
        onContinue={async (mappedRows, customFields) => {
          setRows(mappedRows);
          setFields(customFields);
          await persistDataSheet(
            `${campaignName} - Mapping`,
            "mapping",
            mappedRows,
            customFields,
          );
          setMappingOpen(false);
          setStep(2);
        }}
      />
    );
  const wizardSteps = [
    { title: "Data Sheet", sub: "Input data penerima" },
    { title: "Tulis Pesan", sub: "Buat pesan broadcast" },
    { title: "Kirim", sub: "Jadwal dan antrean" },
  ];
  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-[#f7f9fc] px-6 py-8 transition-all`}
    >
      <div className="mx-auto max-w-[1240px]">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 text-sm font-semibold text-indigo-600"
        >
          Kembali ke campaign
        </button>
        <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Broadcast WhatsApp
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Kirim pesan ke banyak kontak dengan mudah. Mulai dengan memilih
              sumber data kontak Anda.
            </p>
          </div>
          <div className="flex min-w-[520px] items-start">
            {wizardSteps.map((item, index) => (
              <div key={item.title} className="flex flex-1 items-start">
                <div className="text-center">
                  <span
                    className={`mx-auto grid h-8 w-8 place-items-center rounded-full border-2 text-sm font-bold ${step === index + 1 ? "border-blue-600 bg-blue-600 text-white" : step > index + 1 ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-300 bg-white text-slate-600"}`}
                  >
                    {index + 1}
                  </span>
                  <p
                    className={`mt-2 text-xs font-semibold ${step === index + 1 ? "text-blue-600" : "text-slate-500"}`}
                  >
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {item.sub}
                  </p>
                </div>
                {index < 2 && (
                  <span
                    className={`mt-4 h-0.5 flex-1 ${step > index + 1 ? "bg-blue-600" : "bg-slate-200"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        {step === 1 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-8 flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <WizardSourceIcon type="contacts" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Pilih Data</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tentukan dari mana Anda ingin mengambil data kontak penerima
                  broadcast.
                </p>
              </div>
            </div>
            <label className="mb-6 block text-sm font-semibold text-slate-800">
              Nama campaign
              <input
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                placeholder="Contoh: Promo pelanggan Oktober"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 font-normal outline-none focus:border-blue-500"
              />
            </label>
            <div className="grid gap-5 lg:grid-cols-3">
              <label
                onClick={() => setSource("upload")}
                className={`cursor-pointer rounded-xl border-2 p-5 transition ${source === "upload" ? "border-blue-600 shadow-sm" : "border-slate-200 hover:border-blue-300"}`}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(event) => parseFile(event.target.files?.[0])}
                />
                <div className="flex items-start justify-between">
                  <span
                    className={`h-5 w-5 rounded-full border-2 ${source === "upload" ? "border-blue-600 bg-blue-600 shadow-[inset_0_0_0_4px_white]" : "border-slate-300"}`}
                  />
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-600">
                    <WizardSourceIcon type="upload" />
                  </span>
                  <span className="w-5" />
                </div>
                <h3 className="mt-4 text-center text-lg font-bold text-slate-900">
                  Upload File
                </h3>
                <p className="mx-auto mt-2 max-w-[250px] text-center text-sm leading-6 text-slate-500">
                  Unggah file berisi data kontak. File yang didukung: .xlsx,
                  .xls, .csv
                </p>
                <div className="mt-5 rounded-xl border-2 border-dashed border-blue-200 p-5 text-center text-sm font-semibold text-blue-600">
                  Klik untuk upload atau drag & drop
                  <span className="mt-1 block text-xs font-normal text-slate-400">
                    Maks. 10 MB
                  </span>
                </div>
                {fileName && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <img src="/excel-file.svg" alt="" className="h-9 w-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {fileName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {validRows.length} data terbaca
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        setFileName("");
                        setRows([]);
                      }}
                      className="text-slate-400"
                    >
                      ×
                    </button>
                  </div>
                )}
              </label>
              <div
                className={`rounded-xl border-2 p-5 transition ${source === "manual" ? "border-blue-600" : "border-slate-200"}`}
              >
                <div className="flex items-start justify-between">
                  <button
                    type="button"
                    onClick={chooseManual}
                    className={`h-5 w-5 rounded-full border-2 ${source === "manual" ? "border-blue-600 bg-blue-600 shadow-[inset_0_0_0_4px_white]" : "border-slate-300"}`}
                    aria-label="Pilih input manual"
                  />
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-violet-50 text-violet-600">
                    <WizardSourceIcon type="manual" />
                  </span>
                  <span className="w-5" />
                </div>
                <h3 className="mt-4 text-center text-lg font-bold">
                  Input Manual
                </h3>
                <p className="mx-auto mt-2 max-w-[250px] text-center text-sm leading-6 text-slate-500">
                  Masukkan data kontak satu per satu atau paste dari
                  spreadsheet.
                </p>
                <button
                  type="button"
                  onClick={chooseManual}
                  className="mt-10 w-full rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-600"
                >
                  + Tambah Kontak
                </button>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Format: Nama, Nomor WhatsApp
                  <br />
                  Contoh: Andi, 6281234567890
                </p>
              </div>
              <div
                className={`rounded-xl border-2 p-5 transition ${source === "database" ? "border-blue-600" : "border-slate-200"}`}
              >
                <div className="flex items-start justify-between">
                  <button
                    type="button"
                    onClick={chooseDatabase}
                    className={`h-5 w-5 rounded-full border-2 ${source === "database" ? "border-blue-600 bg-blue-600 shadow-[inset_0_0_0_4px_white]" : "border-slate-300"}`}
                    aria-label="Pilih data sistem"
                  />
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <WizardSourceIcon type="database" />
                  </span>
                  <span className="w-5" />
                </div>
                <h3 className="mt-4 text-center text-lg font-bold">
                  Mapping Data
                </h3>
                <p className="mx-auto mt-2 max-w-[250px] text-center text-sm leading-6 text-slate-500">
                  Ambil data dari sumber yang sudah ada di sistem Anda.
                </p>
                <select
                  onChange={(event) => event.target.value && chooseDatabase()}
                  className="mt-7 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500"
                >
                  <option value="">Pilih Data Source</option>
                  <option value="contacts">
                    Kontak sistem ({contacts.length})
                  </option>
                </select>
                <button
                  type="button"
                  onClick={chooseDatabase}
                  className="mt-3 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
                >
                  Lihat Detail Mapping
                </button>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between rounded-xl bg-blue-50/70 px-5 py-4">
              <div className="flex items-center gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-blue-100 text-blue-600">
                  <WizardSourceIcon type="contacts" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Kontak yang akan dikirim
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {validRows.length} kontak
                  </p>
                </div>
              </div>
              <p className="max-w-[260px] text-right text-xs leading-5 text-slate-500">
                Pastikan data yang Anda pilih sudah sesuai dan tidak ada
                duplikat.
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!validRows.length}
                onClick={() => {
                  if (source === "database") {
                    setMappingSource("contacts");
                    setMappingOpen(true);
                  } else {
                    setStep(3);
                  }
                }}
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                Lanjutkan →
              </button>
            </div>
          </section>
        )}
        {step === 2 && (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,.95fr)]">
            <main className="min-w-0 space-y-4">
              <div className="flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-xl bg-emerald-600 text-white">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                  >
                    <path d="M5 5h14v10H9l-4 4V5Z" />
                    <path d="M8 9h8M8 12h5" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">
                    Tulis Pesan
                  </h2>
                  <p className="text-sm text-slate-500">
                    Buat template WhatsApp menggunakan variabel dari data
                    penerima.
                  </p>
                </div>
              </div>
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="grid size-8 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    i
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900">
                      Informasi Broadcast
                    </h3>
                    <p className="text-xs text-slate-500">
                      Informasi dasar campaign yang akan dikirim.
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-[1fr_170px_210px]">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-xs font-semibold text-slate-500">
                          Nama Broadcast
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                          {campaignName}
                        </p>
                      </div>
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                        <p className="text-2xl font-bold text-emerald-600">
                          {validRows.length}
                        </p>
                        <p className="text-xs text-emerald-700">
                          penerima siap dikirim
                        </p>
                      </div>
                      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                        <p className="text-xs font-semibold text-slate-700">
                          Sumber Data
                        </p>
                        <p className="mt-1 truncate text-xs text-blue-700">
                          {fileName ||
                            (source === "manual"
                              ? "Input manual"
                              : "Data sistem")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
                    <svg
                      viewBox="0 0 24 24"
                      className="size-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="m4 16 .3 3.7L8 20l11-11-4-4L4 16Z" />
                      <path d="m13 7 4 4" />
                    </svg>
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">Editor Pesan</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Klik variabel untuk menyisipkannya ke pesan. Nilainya
                      diganti saat pengiriman.
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <WysiwygEditor
                    value={body}
                    onChange={setBody}
                    variables={["name", "phone", ...fields]}
                    onAttachFile={(file) => chooseAttachment(file, "caption")}
                  />
                </div>
                <div className="mt-4">
                  <DynamicVariableCallout
                    fields={["name", "phone", ...fields]}
                  />
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Template Siap Pakai
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pilih template lalu sesuaikan pesan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/templates")}
                    className="text-xs font-semibold text-blue-600"
                  >
                    Lihat semua template
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {savedTemplates.length ? (
                    savedTemplates.slice(0, 4).map((template) => (
                      <button
                        key={template.name}
                        type="button"
                        onClick={() => setBody(template.body)}
                        className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-600">
                          <FileText className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-700">
                            {template.name}
                          </span>
                          <span className="mt-1 block line-clamp-2 text-xs text-slate-500">
                            {template.body.replace(/<[^>]*>/g, " ")}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5">
                      <FileText className="size-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          Belum ada template tersimpan
                        </p>
                        <p className="text-xs text-slate-500">
                          Buat template dari modul Template Pesan.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
                    <svg
                      viewBox="0 0 24 24"
                      className="size-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M12 17V3m0 0L7 8m5-5 5 5M5 14v5h14v-5" />
                    </svg>
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">Lampiran</h3>
                    <p className="text-xs text-slate-500">
                      PDF, JPG, PNG hingga 10 MB.
                    </p>
                  </div>
                </div>
                <label
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    chooseAttachment(event.dataTransfer.files?.[0], "separate");
                  }}
                  className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 px-4 py-6 text-center"
                >
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(event) => {
                      chooseAttachment(event.target.files?.[0], "separate");
                      event.currentTarget.value = "";
                    }}
                  />
                  <span className="grid size-11 place-items-center rounded-full bg-white text-blue-600 shadow-sm">
                    <svg
                      viewBox="0 0 24 24"
                      className="size-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M12 16V4m0 0L8 8m4-4 4 4M5 15v4h14v-4" />
                    </svg>
                  </span>
                  <p className="mt-2 text-sm font-semibold text-blue-700">
                    Kirim file sebagai pesan terpisah
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Format PDF, JPG, PNG
                  </p>
                </label>
                {attachmentFile && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50">
                    <div className="flex items-center gap-3 p-3">
                      {attachmentPreviewUrl ? (
                        <img
                          src={attachmentPreviewUrl}
                          alt={attachmentName}
                          className="size-14 rounded-lg border border-emerald-200 object-cover"
                        />
                      ) : (
                        <span className="grid size-14 place-items-center rounded-lg bg-white text-emerald-600">
                          <svg
                            viewBox="0 0 24 24"
                            className="size-7"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="M6 3h9l3 3v15H6z" />
                            <path d="M9 12h6M9 16h5" />
                          </svg>
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-emerald-900">
                          {attachmentName}
                        </p>
                        <p className="mt-0.5 text-xs text-emerald-700">
                          {attachmentMode === "caption"
                            ? "Dikirim bersama caption editor"
                            : "Dikirim sebagai pesan terpisah"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 border-t border-emerald-200 bg-white/70 px-3 py-2">
                      <label className="cursor-pointer rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(event) => {
                            chooseAttachment(
                              event.target.files?.[0],
                              attachmentMode,
                            );
                            event.currentTarget.value = "";
                          }}
                        />
                        Ganti file
                      </label>
                      <button
                        type="button"
                        onClick={clearAttachment}
                        className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600"
                      >
                        Hapus file
                      </button>
                    </div>
                  </div>
                )}
              </section>
              <div className="flex justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-slate-200 px-5 py-3 text-sm"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={!body.trim()}
                  onClick={() => setStep(3)}
                  className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Lanjutkan
                </button>
              </div>
            </main>
            <aside className="space-y-4">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">Preview Pesan</h3>
                    <p className="text-xs text-slate-500">
                      Contoh pesan berdasarkan penerima.
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewIndex((current) => Math.max(0, current - 1))
                      }
                      className="grid size-8 place-items-center rounded-lg border border-slate-200"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewIndex((current) =>
                          Math.min(
                            Math.max(0, validRows.length - 1),
                            current + 1,
                          ),
                        )
                      }
                      className="grid size-8 place-items-center rounded-lg border border-slate-200"
                    >
                      ›
                    </button>
                  </div>
                </div>
                <select
                  value={Math.min(
                    previewIndex,
                    Math.max(0, validRows.length - 1),
                  )}
                  onChange={(event) =>
                    setPreviewIndex(Number(event.target.value))
                  }
                  className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {validRows.map((row, index) => (
                    <option key={index} value={index}>
                      {row.name || row.phone}
                    </option>
                  ))}
                </select>
                <div className="mt-3 mx-auto max-w-[330px] overflow-hidden rounded-[28px] border-[7px] border-slate-900 bg-[#efeae2] shadow-xl">
                  <div className="flex items-center gap-2 bg-[#075e54] px-3 py-3 text-xs text-white">
                    <span className="grid size-7 place-items-center rounded-full bg-white/80 text-[#075e54]">
                      W
                    </span>
                    <div>
                      <p className="font-semibold">
                        {previewRecipient.name || "Penerima"}
                      </p>
                      <p className="text-[10px] text-white/70">
                        terakhir dilihat hari ini
                      </p>
                    </div>
                  </div>
                  <div
                    className="min-h-72 p-3"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(239,234,226,.68), rgba(239,234,226,.68)), url('/bg-wa.png')",
                      backgroundSize: "cover",
                    }}
                  >
                    {attachmentFile && attachmentMode === "separate" && (
                      <div className="mt-5 w-4/5 rounded-xl rounded-tl-sm bg-white p-2 shadow-sm">
                        {attachmentPreviewUrl ? (
                          <img
                            src={attachmentPreviewUrl}
                            alt={attachmentName}
                            className="h-28 w-full rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                            <span className="grid size-8 place-items-center rounded-md bg-rose-100 font-bold text-rose-600">
                              FILE
                            </span>
                            <span className="truncate font-medium">
                              {attachmentName}
                            </span>
                          </div>
                        )}
                        <p className="mt-1 truncate text-[10px] text-slate-500">
                          {attachmentName}
                        </p>
                      </div>
                    )}
                    <div className="mt-8 rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-3 text-sm leading-6">
                      {attachmentFile && attachmentMode === "caption" && (
                        <>
                          {attachmentPreviewUrl ? (
                            <img
                              src={attachmentPreviewUrl}
                              alt={attachmentName}
                              className="mb-2 h-32 w-full rounded-lg object-cover"
                            />
                          ) : (
                            <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/70 p-2 text-xs text-slate-700">
                              <span className="grid size-8 place-items-center rounded-md bg-rose-100 font-bold text-rose-600">
                                FILE
                              </span>
                              <span className="truncate font-medium">
                                {attachmentName}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      <div
                        className="whitespace-pre-wrap [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                        dangerouslySetInnerHTML={{
                          __html: body
                            ? renderPreviewMessage(body)
                            : "Tulis pesan untuk melihat preview...",
                        }}
                      />
                      <p className="mt-2 text-right text-[10px] text-slate-500">
                        10:24 ✓✓
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="font-bold text-slate-900">Opsi Pengiriman</h3>
                <p className="text-xs text-slate-500">
                  Atur opsi tambahan untuk pesan broadcast.
                </p>
                {[
                  {
                    label: "Tambahkan nama pengirim",
                    value: includeSenderName,
                    set: setIncludeSenderName,
                  },
                  {
                    label: "Kirim lampiran",
                    value: includeAttachment,
                    set: setIncludeAttachment,
                  },
                  {
                    label: "Simpan sebagai template",
                    value: saveAsTemplate,
                    set: setSaveAsTemplate,
                  },
                ].map((option) => (
                  <div
                    key={option.label}
                    className="mt-3 flex items-center justify-between gap-3 text-sm"
                  >
                    <span>{option.label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={option.value}
                      onClick={() => option.set(!option.value)}
                      className={`relative h-6 w-11 rounded-full transition ${option.value ? "bg-emerald-600" : "bg-slate-300"}`}
                    >
                      <span
                        className={`absolute top-1 size-4 rounded-full bg-white shadow transition ${option.value ? "left-6" : "left-1"}`}
                      />
                    </button>
                  </div>
                ))}
              </section>
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="font-bold text-emerald-900">Validasi Pesan</h3>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-white p-2">
                    <b className="block text-lg text-emerald-600">
                      {fields.length + 2}
                    </b>
                    variabel
                  </div>
                  <div className="rounded-lg bg-white p-2">
                    <b className="block text-lg text-emerald-600">
                      {attachmentName ? 1 : 0}
                    </b>
                    lampiran
                  </div>
                  <div className="rounded-lg bg-white p-2">
                    <b className="block text-lg text-emerald-600">Siap</b>
                    preview
                  </div>
                </div>
              </section>
            </aside>
          </section>
        )}
        {step === 3 && (
          <section className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-emerald-600">
                  Tahap terakhir
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Preview & Kirim
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Periksa pesan, penerima, dan pengaturan sebelum broadcast
                  dijalankan.
                </p>
              </div>
              <span className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700">
                Siap dikirim
              </span>
            </div>
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(310px,.75fr)]">
              <main className="min-w-0 space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                        <FileText className="size-5" />
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Ringkasan Broadcast
                        </h3>
                        <p className="text-xs text-slate-500">
                          Pastikan semua informasi sudah sesuai sebelum dikirim.
                        </p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="size-3.5" />
                      Siap dikirim
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      ["Nama broadcast", campaignName],
                      [
                        "Sumber data",
                        fileName ||
                          (source === "manual"
                            ? "Input manual"
                            : "Kontak sistem"),
                      ],
                      ["Template / Pesan", "Pesan broadcast personalisasi"],
                      [
                        "Total penerima",
                        `${validRows.length} kontak siap dikirim`,
                      ],
                      [
                        "Variabel digunakan",
                        `${new Set(body.match(/\{\{\s*[^}]+\s*\}\}/g) ?? []).size} variabel`,
                      ],
                      ["Lampiran", attachmentName || "Tanpa lampiran"],
                    ].map(([label, value], index) => {
                      const SummaryIcon = [
                        FileText,
                        Database,
                        MessageSquareText,
                        Users,
                        Braces,
                        Paperclip,
                      ][index];
                      return (
                        <div
                          key={label}
                          className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
                            <SummaryIcon className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-500">
                              {label}
                            </p>
                            <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                              {value}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
                        <Eye className="size-5" />
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Preview Pesan
                        </h3>
                        <p className="text-xs text-slate-500">
                          Lihat pesan hasil personalisasi untuk setiap penerima.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Penerima sebelumnya"
                        onClick={() =>
                          setPreviewIndex((current) => Math.max(0, current - 1))
                        }
                        className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <select
                        value={Math.min(
                          previewIndex,
                          Math.max(0, validRows.length - 1),
                        )}
                        onChange={(event) =>
                          setPreviewIndex(Number(event.target.value))
                        }
                        className="max-w-52 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                      >
                        {validRows.map((row, index) => (
                          <option key={index} value={index}>
                            {row.name || row.phone} ({index + 1} dari{" "}
                            {validRows.length})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        aria-label="Penerima berikutnya"
                        onClick={() =>
                          setPreviewIndex((current) =>
                            Math.min(
                              Math.max(0, validRows.length - 1),
                              current + 1,
                            ),
                          )
                        }
                        className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div
                    className="mt-3 max-h-[420px] overflow-hidden rounded-xl p-4"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(239,234,226,.7), rgba(239,234,226,.7)), url('/bg-wa.png')",
                      backgroundSize: "cover",
                    }}
                  >
                    <div className="mx-auto max-w-[350px] overflow-hidden rounded-[28px] border-[7px] border-slate-900 bg-[#efeae2] shadow-xl">
                      <div className="flex items-center gap-2 bg-[#075e54] px-4 py-3 text-sm text-white">
                        <span className="grid size-8 place-items-center rounded-full bg-white/20">
                          <Smartphone className="size-4" />
                        </span>
                        <div>
                          <b>{previewRecipient.name || "Penerima"}</b>
                          <p className="text-[10px] text-white/70">
                            terakhir dilihat hari ini
                          </p>
                        </div>
                      </div>
                      <div className="min-h-72 p-4">
                        {attachmentFile && attachmentMode === "separate" && (
                          <div className="mb-3 w-[82%] rounded-xl rounded-tl-sm bg-white p-2 text-xs shadow-sm">
                            {attachmentPreviewUrl ? (
                              <img
                                src={attachmentPreviewUrl}
                                alt={attachmentName}
                                className="h-24 w-full rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
                                <FileText className="size-5 text-rose-500" />
                                <span className="truncate font-semibold">
                                  {attachmentName}
                                </span>
                              </div>
                            )}
                            <p className="mt-1 truncate text-[10px] text-slate-500">
                              {attachmentName}
                            </p>
                          </div>
                        )}
                        <div className="ml-auto w-[90%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-3 text-sm leading-6">
                          {attachmentFile &&
                            attachmentMode === "caption" &&
                            (attachmentPreviewUrl ? (
                              <img
                                src={attachmentPreviewUrl}
                                alt={attachmentName}
                                className="mb-2 h-28 w-full rounded object-cover"
                              />
                            ) : (
                              <p className="mb-2 rounded bg-white/70 p-2 text-xs">
                                {attachmentName}
                              </p>
                            ))}
                          <div
                            className="whitespace-pre-wrap [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                            dangerouslySetInnerHTML={{
                              __html: body
                                ? renderPreviewMessage(body)
                                : "Tulis pesan untuk melihat preview...",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
                        <Users className="size-5" />
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Daftar Penerima Siap Kirim
                        </h3>
                        <p className="text-xs text-slate-500">
                          Daftar penerima valid yang akan masuk ke antrean.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {validRows.length} data
                      </span>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                        <Search className="size-4" />
                        <input
                          value={reviewQuery}
                          onChange={(event) =>
                            setReviewQuery(event.target.value)
                          }
                          placeholder="Cari penerima..."
                          className="w-32 bg-transparent text-slate-800 outline-none"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="max-h-64 max-w-full overflow-auto">
                    <table className="min-w-[760px] text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-2">No</th>
                          <th className="min-w-36 px-3 py-2">Nama</th>
                          <th className="min-w-36 px-3 py-2">Nomor WhatsApp</th>
                          {fields
                            .filter(
                              (field) => !["name", "phone"].includes(field),
                            )
                            .slice(0, 2)
                            .map((field) => (
                              <th
                                key={field}
                                className="min-w-32 px-3 py-2 capitalize"
                              >
                                {field.replaceAll("_", " ")}
                              </th>
                            ))}
                          <th className="min-w-28 px-3 py-2">Status</th>
                          <th className="min-w-28 px-3 py-2">Preview Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviewRows.slice(0, 100).map((row, index) => (
                          <tr key={index} className="border-t border-slate-100">
                            <td className="px-4 py-2">{index + 1}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">
                              {row.name}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {row.phone}
                            </td>
                            {fields
                              .filter(
                                (field) => !["name", "phone"].includes(field),
                              )
                              .slice(0, 2)
                              .map((field) => (
                                <td
                                  key={field}
                                  className="max-w-40 truncate px-3 py-2 text-slate-600"
                                >
                                  {String(row[field] ?? "-")}
                                </td>
                              ))}
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                                <CheckCircle2 className="size-3" />
                                Valid
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                                Siap dikirim
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {reviewRows.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      Tidak ada penerima yang cocok dengan pencarian.
                    </div>
                  )}
                </section>
              </main>
              <aside className="min-w-0 space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
                      <CalendarClock className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Opsi Pengiriman
                      </h3>
                      <p className="text-xs text-slate-500">
                        Atur waktu dan pengiriman bertahap.
                      </p>
                    </div>
                  </div>
                  <label className="mt-4 block text-sm font-semibold text-slate-700">
                    Instance pengirim
                    <select
                      value={instanceId}
                      onChange={(event) => setInstanceId(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3"
                    >
                      <option value="">Pilih instance</option>
                      {instances.map((instance) => (
                        <option key={instance.id} value={instance.id}>
                          {instance.name} · {instance.engine}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSendMode("now");
                        setScheduledAt("");
                      }}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left ${sendMode === "now" ? "border-blue-300 bg-blue-50/70" : "border-slate-200"}`}
                    >
                      <span
                        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 ${sendMode === "now" ? "border-blue-600" : "border-slate-300"}`}
                      >
                        {sendMode === "now" && (
                          <span className="size-2.5 rounded-full bg-blue-600" />
                        )}
                      </span>
                      <span>
                        <b className="block text-sm text-slate-900">
                          Kirim Sekarang
                        </b>
                        <small className="mt-0.5 block text-xs text-slate-500">
                          Pesan masuk ke antrean setelah tombol kirim ditekan.
                        </small>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendMode("schedule")}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left ${sendMode === "schedule" ? "border-blue-300 bg-blue-50/70" : "border-slate-200"}`}
                    >
                      <span
                        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 ${sendMode === "schedule" ? "border-blue-600" : "border-slate-300"}`}
                      >
                        {sendMode === "schedule" && (
                          <span className="size-2.5 rounded-full bg-blue-600" />
                        )}
                      </span>
                      <span>
                        <b className="block text-sm text-slate-900">
                          Jadwalkan Pengiriman
                        </b>
                        <small className="mt-0.5 block text-xs text-slate-500">
                          Atur tanggal dan waktu broadcast mulai dikirim.
                        </small>
                      </span>
                    </button>
                    {sendMode === "schedule" && (
                      <div className="grid grid-cols-2 gap-2 pl-8">
                        <input
                          type="date"
                          value={scheduledAt.split("T")[0] ?? ""}
                          onChange={(event) =>
                            setScheduledAt(
                              `${event.target.value}T${scheduledAt.split("T")[1]?.slice(0, 5) || "10:00"}`,
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs"
                        />
                        <input
                          type="time"
                          value={
                            scheduledAt.split("T")[1]?.slice(0, 5) || "10:00"
                          }
                          onChange={(event) =>
                            setScheduledAt(
                              `${scheduledAt.split("T")[0] || new Date().toISOString().slice(0, 10)}T${event.target.value}`,
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs"
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setSendGradually((current) => !current)}
                      className="flex w-full items-start justify-between gap-3 text-left"
                    >
                      <span>
                        <b className="block text-sm text-slate-900">
                          Kirim bertahap untuk menghindari spam
                        </b>
                        <small className="mt-0.5 block text-xs leading-5 text-slate-500">
                          Pesan diberi jeda agar pengiriman tidak berlangsung
                          sekaligus.
                        </small>
                      </span>
                      <span
                        className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition ${sendGradually ? "bg-emerald-500" : "bg-slate-300"}`}
                      >
                        <span
                          className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition ${sendGradually ? "left-[22px]" : "left-0.5"}`}
                        />
                      </span>
                    </button>
                    {sendGradually && (
                      <label className="mt-3 flex items-center justify-between gap-3 pl-3 text-xs font-semibold text-slate-700">
                        Jeda antar pesan
                        <select
                          value={delayMs}
                          onChange={(event) =>
                            setDelayMs(Number(event.target.value))
                          }
                          className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        >
                          <option value={1000}>1 detik</option>
                          <option value={3000}>3 detik</option>
                          <option value={5000}>5 detik</option>
                          <option value={10000}>10 detik</option>
                          <option value={15000}>15 detik</option>
                        </select>
                      </label>
                    )}
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setOnlyValidNumbers((current) => !current)}
                      className="flex w-full items-start justify-between gap-3 text-left"
                    >
                      <span>
                        <b className="block text-sm text-slate-900">
                          Kirim hanya ke nomor valid
                        </b>
                        <small className="mt-0.5 block text-xs leading-5 text-slate-500">
                          Data tidak lengkap atau nomor tidak valid otomatis
                          dilewati.
                        </small>
                      </span>
                      <span
                        className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition ${onlyValidNumbers ? "bg-emerald-500" : "bg-slate-300"}`}
                      >
                        <span
                          className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition ${onlyValidNumbers ? "left-[22px]" : "left-0.5"}`}
                        />
                      </span>
                    </button>
                  </div>
                  <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-500">
                    Sistem memproses maksimal {batchSize} penerima per kelompok
                    antrean. Pengaturan ini dikelola otomatis agar server tetap
                    stabil.
                  </p>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
                      <ClipboardCheck className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-800">
                        Checklist Sebelum Kirim
                      </h3>
                      <p className="text-xs text-slate-500">
                        Pastikan semua persyaratan terpenuhi.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    {[
                      [Boolean(body.trim()), "Pesan sudah dipreview"],
                      [Boolean(instanceId), "Instance pengirim dipilih"],
                      [validRows.length > 0, "Nomor WhatsApp valid"],
                      [
                        !attachmentFile || Boolean(attachmentName),
                        "Lampiran siap dikirim",
                      ],
                    ].map(([valid, label]) => (
                      <div
                        key={String(label)}
                        className="flex items-center gap-2"
                      >
                        <span
                          className={
                            valid ? "text-emerald-600" : "text-amber-500"
                          }
                        >
                          {valid ? (
                            <CheckCircle2 className="size-5" />
                          ) : (
                            <AlertTriangle className="size-5" />
                          )}
                        </span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
                      <BarChart3 className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-800">
                        Ringkasan Validasi
                      </h3>
                      <p className="text-xs text-slate-500">
                        Hasil validasi data penerima.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-emerald-50 p-2">
                      <b className="block text-lg text-emerald-600">
                        {validRows.length}
                      </b>
                      siap dikirim
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2">
                      <b className="block text-lg text-amber-600">
                        {invalidRowCount}
                      </b>
                      perlu diperiksa
                    </div>
                  </div>
                </section>
              </aside>
            </div>
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                <ChevronLeft className="size-4" /> Kembali
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    Swal.fire({
                      icon: "info",
                      title: "Kirim tes",
                      text: "Preview sudah memakai data penerima yang dipilih. Pengiriman tes ke nomor khusus akan ditambahkan pada tahap berikutnya.",
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-5 py-3 text-sm font-semibold text-blue-700"
                >
                  <Radio className="size-4" /> Kirim Tes
                </button>
                <button
                  type="button"
                  disabled={
                    saving ||
                    !instanceId ||
                    !body.trim() ||
                    !validRows.length ||
                    (sendMode === "schedule" && !scheduledAt)
                  }
                  onClick={submit}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Send className="size-4" />
                  {saving
                    ? "Memproses..."
                    : sendMode === "schedule"
                      ? "Jadwalkan Broadcast"
                      : "Kirim Broadcast Sekarang"}
                </button>
              </div>
            </div>
          </section>
        )}
        {manualOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Input Manual</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Isi nama dan nomor WhatsApp penerima.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setManualOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  Tutup
                </button>
              </div>
              <div className="mt-5 max-h-80 overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-3">Nama</th>
                      <th className="px-3 py-3">Nomor WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index} className="border-t border-slate-100">
                        <td className="p-2">
                          <input
                            value={row.name ?? ""}
                            onChange={(event) =>
                              setRows((current) =>
                                current.map((item, rowIndex) =>
                                  rowIndex === index
                                    ? { ...item, name: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={row.phone ?? ""}
                            onChange={(event) =>
                              setRows((current) =>
                                current.map((item, rowIndex) =>
                                  rowIndex === index
                                    ? { ...item, phone: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setRows((current) => [...current, { name: "", phone: "" }])
                  }
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
                >
                  Tambah baris
                </button>
                <button
                  type="button"
                  disabled={!validRows.length}
                  onClick={() => setManualOpen(false)}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Gunakan {validRows.length} kontak
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type BroadcastMonitorRecipient = {
  id: string;
  name: string;
  phone: string;
  status: "PENDING" | "QUEUED" | "SENT" | "FAILED" | "SKIPPED";
  error?: string | null;
  queuedAt?: string | null;
  sentAt?: string | null;
  messageStatus?: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED" | null;
  messageCreatedAt?: string | null;
};

type BroadcastMonitorCampaign = {
  id: string;
  name: string;
  body: string;
  status: "DRAFT" | "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  delayMs: number;
  batchSize: number;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  error?: string | null;
  instance: { id: string; name: string; engine?: string; status?: string };
  recipients: BroadcastMonitorRecipient[];
};

function monitorDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function monitorPercent(value: number, total: number) {
  return total ? Math.round((value / total) * 1000) / 10 : 0;
}

function recipientFailureLabel(error?: string | null) {
  if (!error) return "Alasan kegagalan belum tersedia.";
  if (/tidak terdaftar|tidak aktif/i.test(error))
    return "Nomor tidak terdaftar di WhatsApp atau sudah tidak aktif.";
  if (/ECONNREFUSED|tidak merespons/i.test(error))
    return "Provider pengiriman sedang tidak dapat dihubungi.";
  if (/status code 500|HTTP 500/i.test(error))
    return "Provider gagal memproses nomor. Validasi nomor lalu coba kembali.";
  return error;
}

function BroadcastMonitoringPanel({
  collapsed,
  token,
  campaignId,
  onBack,
}: {
  collapsed: boolean;
  token: string;
  campaignId: string;
  onBack: () => void;
}) {
  const [campaign, setCampaign] = useState<BroadcastMonitorCampaign | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<
    "retry" | "cancel" | "refresh" | null
  >(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  async function loadCampaign(silent = false) {
    if (!silent) setLoading(true);
    try {
      setCampaign(
        await request<BroadcastMonitorCampaign>(
          `/campaigns/${campaignId}`,
          {},
          token,
        ),
      );
    } catch (error) {
      if (!silent) {
        await Swal.fire({
          icon: "error",
          title: "Monitoring gagal dimuat",
          text:
            error instanceof Error
              ? error.message
              : "Campaign tidak ditemukan.",
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void loadCampaign();
    const timer = window.setInterval(() => void loadCampaign(true), 4000);
    return () => window.clearInterval(timer);
  }, [campaignId, token]);

  useEffect(() => setPage(1), [query, statusFilter]);

  if (loading)
    return (
      <div
        className={`${collapsed ? "md:ml-20" : "md:ml-64"} grid min-h-[70vh] place-items-center transition-all`}
      >
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
          <RefreshCw className="size-5 animate-spin" />
          Memuat monitoring campaign...
        </div>
      </div>
    );

  if (!campaign)
    return (
      <div
        className={`${collapsed ? "md:ml-20" : "md:ml-64"} grid min-h-[70vh] place-items-center px-6 transition-all`}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <AlertTriangle className="mx-auto size-10 text-amber-500" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Campaign tidak tersedia
          </h2>
          <button
            type="button"
            onClick={onBack}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Kembali ke daftar
          </button>
        </div>
      </div>
    );

  const recipients = campaign.recipients ?? [];
  const total = recipients.length;
  const failed = recipients.filter((item) => item.status === "FAILED").length;
  const invalidNumbers = recipients.filter(
    (item) =>
      item.status === "FAILED" &&
      /tidak terdaftar|tidak aktif/i.test(item.error ?? ""),
  ).length;
  const retryableFailed = Math.max(0, failed - invalidNumbers);
  const pending = recipients.filter((item) =>
    ["PENDING", "QUEUED"].includes(item.status),
  ).length;
  const read = recipients.filter(
    (item) => item.messageStatus === "READ",
  ).length;
  const delivered = recipients.filter((item) =>
    ["DELIVERED", "READ"].includes(item.messageStatus ?? ""),
  ).length;
  const sent = recipients.filter((item) => item.status === "SENT").length;
  const sendProgress = monitorPercent(sent, total);
  const isActive = ["QUEUED", "RUNNING"].includes(campaign.status);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = recipients.filter((recipient) => {
    const status =
      recipient.messageStatus === "READ" ? "READ" : recipient.status;
    return (
      (statusFilter === "ALL" || status === statusFilter) &&
      (!normalizedQuery ||
        recipient.name.toLowerCase().includes(normalizedQuery) ||
        recipient.phone.includes(normalizedQuery) ||
        (recipient.error ?? "").toLowerCase().includes(normalizedQuery))
    );
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleRecipients = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  const activities = [...recipients]
    .filter((item) => item.sentAt || item.queuedAt || item.error)
    .sort(
      (a, b) =>
        new Date(b.sentAt ?? b.queuedAt ?? 0).getTime() -
        new Date(a.sentAt ?? a.queuedAt ?? 0).getTime(),
    )
    .slice(0, 5);
  const trendBuckets = new Map<
    string,
    { sent: number; failed: number; read: number }
  >();
  for (const recipient of recipients) {
    const value = recipient.sentAt ?? recipient.queuedAt;
    if (!value) continue;
    const label = new Date(value).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const bucket = trendBuckets.get(label) ?? { sent: 0, failed: 0, read: 0 };
    if (recipient.status === "FAILED") bucket.failed += 1;
    else bucket.sent += 1;
    if (recipient.messageStatus === "READ") bucket.read += 1;
    trendBuckets.set(label, bucket);
  }
  const trends = Array.from(trendBuckets.entries()).slice(-10);
  const trendMax = Math.max(
    1,
    ...trends.flatMap(([, item]) => [item.sent, item.failed, item.read]),
  );
  const readShare = monitorPercent(read, total);
  const sentOnlyShare = monitorPercent(Math.max(0, sent - read), total);
  const failedShare = monitorPercent(failed, total);
  const donut = total
    ? `conic-gradient(#16a34a 0 ${readShare}%, #86efac ${readShare}% ${readShare + sentOnlyShare}%, #ef4444 ${readShare + sentOnlyShare}% ${readShare + sentOnlyShare + failedShare}%, #f59e0b ${readShare + sentOnlyShare + failedShare}% 100%)`
    : "conic-gradient(#e2e8f0 0 100%)";
  const statusLabel: Record<string, string> = {
    DRAFT: "Draft",
    QUEUED: "Dalam antrean",
    RUNNING: "Sedang berjalan",
    COMPLETED: "Selesai",
    FAILED: "Selesai dengan kegagalan",
    CANCELLED: "Dihentikan",
  };
  const kpis = [
    {
      label: "Total Penerima",
      value: total,
      detail: "kontak dalam daftar",
      icon: Users,
      tone: "blue",
    },
    {
      label: "Terkirim",
      value: sent,
      detail: `${monitorPercent(sent, total)}% dari total`,
      icon: Send,
      tone: "green",
    },
    {
      label: "Dibaca",
      value: read,
      detail: `${monitorPercent(read, total)}% dari total`,
      icon: Eye,
      tone: "emerald",
    },
    {
      label: "Gagal",
      value: failed,
      detail: `${monitorPercent(failed, total)}% dari total`,
      icon: AlertTriangle,
      tone: "red",
    },
    {
      label: "Pending",
      value: pending,
      detail: `${monitorPercent(pending, total)}% dari total`,
      icon: Timer,
      tone: "amber",
    },
    {
      label: "Perlu Retry",
      value: retryableFailed,
      detail: retryableFailed ? "siap dikirim ulang" : "tidak ada antrean",
      icon: RotateCcw,
      tone: "yellow",
    },
  ];
  const tones: Record<string, string> = {
    blue: "border-blue-100 bg-blue-50/40 text-blue-600",
    green: "border-emerald-100 bg-emerald-50/40 text-emerald-600",
    emerald: "border-teal-100 bg-teal-50/40 text-teal-600",
    red: "border-rose-200 bg-rose-50/60 text-rose-600",
    amber: "border-amber-200 bg-amber-50/60 text-amber-600",
    yellow: "border-yellow-200 bg-yellow-50/60 text-yellow-600",
  };

  function exportReport() {
    const escape = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [
      [
        "Nama",
        "Nomor WhatsApp",
        "Status",
        "Status Pesan",
        "Waktu Kirim",
        "Error",
      ],
      ...recipients.map((item) => [
        item.name,
        item.phone,
        item.status,
        item.messageStatus ?? "-",
        item.sentAt ?? "-",
        item.error ? recipientFailureLabel(item.error) : "",
      ]),
    ]
      .map((row) => row.map(escape).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${campaign!.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function retryFailed() {
    if (!retryableFailed) return;
    const answer = await Swal.fire({
      icon: "question",
      title: "Kirim ulang pesan gagal?",
      text: `${retryableFailed} penerima akan dimasukkan kembali ke antrean. Nomor yang tidak terdaftar tidak akan dicoba lagi.`,
      showCancelButton: true,
      confirmButtonText: "Kirim ulang",
      cancelButtonText: "Batal",
    });
    if (!answer.isConfirmed) return;
    setActionLoading("retry");
    try {
      await request(
        `/campaigns/${campaign!.id}/retry`,
        { method: "POST" },
        token,
      );
      await loadCampaign(true);
      await Swal.fire({
        icon: "success",
        title: "Retry dijadwalkan",
        text: `${retryableFailed} pesan diproses ulang.`,
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Retry gagal",
        text: error instanceof Error ? error.message : "Permintaan gagal.",
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function refreshCampaign() {
    setActionLoading("refresh");
    try {
      await loadCampaign(true);
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Data monitoring diperbarui",
        showConfirmButton: false,
        timer: 1400,
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function cancelCampaign() {
    const answer = await Swal.fire({
      icon: "warning",
      title: "Hentikan broadcast?",
      text: "Penerima yang belum diproses tidak akan dikirim.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Hentikan",
      cancelButtonText: "Batal",
    });
    if (!answer.isConfirmed) return;
    setActionLoading("cancel");
    try {
      await request(
        `/campaigns/${campaign!.id}/cancel`,
        { method: "POST" },
        token,
      );
      await loadCampaign(true);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal menghentikan",
        text: error instanceof Error ? error.message : "Permintaan gagal.",
      });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-slate-50 px-4 py-7 transition-all lg:px-6`}
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <ChevronLeft className="size-4" /> Kembali ke campaign
            </button>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Monitoring Broadcast
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Pantau status pengiriman, keterbacaan, dan performa broadcast
              secara real-time.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshCampaign}
            disabled={actionLoading === "refresh"}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 active:scale-[.98] disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw
              className={`size-4 ${actionLoading === "refresh" ? "animate-spin" : ""}`}
            />{" "}
            {actionLoading === "refresh" ? "Memperbarui..." : "Refresh data"}
          </button>
        </div>

        <section className="mb-3 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[1.45fr_.55fr_.55fr_.65fr_auto] xl:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <FileText className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Campaign Broadcast</p>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold text-slate-950">
                  {campaign.name}
                </h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${campaign.status === "RUNNING" ? "bg-emerald-100 text-emerald-700" : campaign.status === "FAILED" ? "bg-rose-100 text-rose-700" : "bg-blue-50 text-blue-700"}`}
                >
                  {statusLabel[campaign.status]}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">
                {campaign.error ??
                  "Pengiriman campaign melalui antrean gateway."}
              </p>
            </div>
          </div>
          <div className="border-slate-100 xl:border-l xl:pl-4">
            <p className="text-xs text-slate-400">Waktu mulai</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {monitorDate(
                campaign.startedAt ??
                  campaign.scheduledAt ??
                  campaign.createdAt,
              )}
            </p>
          </div>
          <div className="border-slate-100 xl:border-l xl:pl-4">
            <p className="text-xs text-slate-400">Akun pengirim</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {campaign.instance.name}
            </p>
            <p className="text-xs text-slate-400">
              {campaign.instance.engine ?? "Gateway"}
            </p>
          </div>
          <div className="border-slate-100 xl:border-l xl:pl-4">
            <p className="text-xs text-slate-400">Pengaturan kirim</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {campaign.delayMs
                ? `${campaign.delayMs / 1000} detik`
                : "Tanpa jeda"}
            </p>
            <p className="text-xs text-slate-400">
              Batch {campaign.batchSize} penerima
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              Swal.fire({
                title: campaign.name,
                text: campaign.body,
                confirmButtonText: "Tutup",
              })
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-600"
          >
            <Eye className="size-4" /> Lihat detail
          </button>
        </section>

        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((item) => {
            const Icon = item.icon;
            return (
              <section
                key={item.label}
                className={`rounded-xl border p-4 ${tones[item.tone]}`}
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-white/70">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      {item.label}
                    </p>
                    <p className="text-2xl font-bold text-slate-950">
                      {item.value}
                    </p>
                    <p className="text-xs font-semibold">{item.detail}</p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.65fr_1fr]">
          <main className="flex min-w-0 flex-col gap-3">
            <div className="grid gap-3 lg:grid-cols-[1.7fr_1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="size-5 text-emerald-600" />
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Progress Pengiriman
                      </h3>
                      <p className="text-xs text-slate-500">
                        {sent} dari {total} pesan berhasil dikirim.
                      </p>
                    </div>
                  </div>
                  <strong className="text-2xl text-emerald-600">
                    {sendProgress}%
                  </strong>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all"
                    style={{ width: `${sendProgress}%` }}
                  />
                </div>
                <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-slate-400">Waktu mulai</dt>
                    <dd className="font-medium text-slate-700">
                      {monitorDate(campaign.startedAt ?? campaign.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Waktu selesai</dt>
                    <dd className="font-medium text-slate-700">
                      {monitorDate(campaign.completedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Akun pengirim</dt>
                    <dd className="font-medium text-slate-700">
                      {campaign.instance.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Kecepatan</dt>
                    <dd className="font-medium text-slate-700">
                      {campaign.delayMs
                        ? `Jeda ${campaign.delayMs / 1000} detik`
                        : "Tanpa jeda tambahan"}
                    </dd>
                  </div>
                </dl>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="font-bold text-slate-900">
                  Distribusi Status Pengiriman
                </h3>
                <div className="mt-4 flex items-center gap-5">
                  <div
                    className="relative size-32 shrink-0 rounded-full"
                    style={{ background: donut }}
                  >
                    <div className="absolute inset-5 grid place-items-center rounded-full bg-white text-center">
                      <div>
                        <strong className="text-xl text-slate-900">
                          {total}
                        </strong>
                        <p className="text-xs text-slate-400">Total</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 text-xs">
                    <p className="flex justify-between gap-4">
                      <span className="text-slate-500">Terkirim</span>
                      <strong>{sent}</strong>
                    </p>
                    <p className="flex justify-between gap-4">
                      <span className="text-slate-500">Dibaca</span>
                      <strong>{read}</strong>
                    </p>
                    <p className="flex justify-between gap-4">
                      <span className="text-slate-500">Gagal</span>
                      <strong>{failed}</strong>
                    </p>
                    <p className="flex justify-between gap-4">
                      <span className="text-slate-500">Pending</span>
                      <strong>{pending}</strong>
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.7fr_1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="size-5 text-blue-600" />
                    <h3 className="font-bold text-slate-900">
                      Tren Pengiriman
                    </h3>
                  </div>
                  <div className="flex gap-3 text-[11px] text-slate-500">
                    <span>Terkirim</span>
                    <span>Dibaca</span>
                    <span>Gagal</span>
                  </div>
                </div>
                {trends.length ? (
                  <div className="mt-5 flex h-44 items-end gap-3 border-b border-l border-slate-200 px-3 pt-4">
                    {trends.map(([label, item]) => (
                      <div
                        key={label}
                        className="flex h-full min-w-0 flex-1 flex-col justify-end"
                      >
                        <div className="flex h-[130px] items-end justify-center gap-1">
                          <div
                            className="w-2 rounded-t bg-emerald-500"
                            style={{
                              height: `${Math.max(3, (item.sent / trendMax) * 100)}%`,
                            }}
                          />
                          <div
                            className="w-2 rounded-t bg-emerald-200"
                            style={{
                              height: `${Math.max(3, (item.read / trendMax) * 100)}%`,
                            }}
                          />
                          <div
                            className="w-2 rounded-t bg-rose-500"
                            style={{
                              height: `${Math.max(3, (item.failed / trendMax) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="mt-2 truncate text-center text-[10px] text-slate-400">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid h-44 place-items-center text-sm text-slate-400">
                    Data tren akan muncul saat pengiriman dimulai.
                  </div>
                )}
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900">
                    Ringkasan Performa
                  </h3>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {[
                    {
                      label: "Deliverability Rate",
                      value: monitorPercent(delivered || sent, total),
                      count: delivered || sent,
                      icon: Gauge,
                    },
                    {
                      label: "Read Rate",
                      value: monitorPercent(read, total),
                      count: read,
                      icon: Eye,
                    },
                    {
                      label: "Failure Rate",
                      value: monitorPercent(failed, total),
                      count: failed,
                      icon: AlertTriangle,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                      >
                        <div className="grid size-9 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800">
                            {item.label}
                          </p>
                          <p className="text-xs text-slate-400">
                            {item.count} dari {total}
                          </p>
                        </div>
                        <strong
                          className={
                            item.label === "Failure Rate"
                              ? "text-rose-600"
                              : "text-emerald-600"
                          }
                        >
                          {item.value}%
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900">
                    Daftar Penerima{" "}
                    <span className="font-normal text-slate-400">
                      ({total} kontak)
                    </span>
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <ListFilter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-sm"
                    >
                      <option value="ALL">Semua status</option>
                      <option value="SENT">Terkirim</option>
                      <option value="READ">Dibaca</option>
                      <option value="FAILED">Gagal</option>
                      <option value="PENDING">Pending</option>
                      <option value="QUEUED">Dalam antrean</option>
                    </select>
                  </div>
                  <div className="relative min-w-56 flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Cari nama, nomor, atau error..."
                      className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={exportReport}
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[.98]"
                  >
                    <Download className="size-4" /> Export
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3">No</th>
                      <th className="px-4 py-3">Nama</th>
                      <th className="px-4 py-3">Nomor WhatsApp</th>
                      <th className="px-4 py-3">Status Pengiriman</th>
                      <th className="px-4 py-3">Waktu Kirim</th>
                      <th className="px-4 py-3">Status Pesan</th>
                      <th className="px-4 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRecipients.map((recipient, index) => (
                      <tr
                        key={recipient.id}
                        className="border-t border-slate-100 text-slate-700"
                      >
                        <td className="px-4 py-3 text-slate-400">
                          {(safePage - 1) * pageSize + index + 1}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {recipient.name}
                        </td>
                        <td className="px-4 py-3">{recipient.phone}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 font-semibold ${recipient.status === "FAILED" ? "bg-rose-50 text-rose-600" : recipient.status === "SENT" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}
                          >
                            {recipient.status}
                          </span>
                          {recipient.status === "FAILED" && (
                            <p
                              title={recipientFailureLabel(recipient.error)}
                              className="mt-2 max-w-52 text-[11px] leading-4 text-rose-600"
                            >
                              {recipientFailureLabel(recipient.error)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {monitorDate(recipient.sentAt ?? recipient.queuedAt)}
                        </td>
                        <td className="px-4 py-3">
                          {recipient.messageStatus ?? "-"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              Swal.fire({
                                title: recipient.name,
                                html: `<div style=\"text-align:left\"><b>Nomor:</b> ${recipient.phone}<br/><b>Status:</b> ${recipient.status}<br/><b>Alasan:</b> ${recipientFailureLabel(recipient.error)}</div>`,
                                confirmButtonText: "Tutup",
                              })
                            }
                            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-slate-200 transition hover:border-blue-300 hover:bg-blue-50"
                          >
                            <MoreHorizontal className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!visibleRecipients.length && (
                  <p className="p-10 text-center text-sm text-slate-400">
                    Tidak ada penerima sesuai filter.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Menampilkan{" "}
                  {visibleRecipients.length ? (safePage - 1) * pageSize + 1 : 0}
                  -{Math.min(safePage * pageSize, filtered.length)} dari{" "}
                  {filtered.length} data
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40"
                  >
                    Sebelumnya
                  </button>
                  <span className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white">
                    {safePage}
                  </span>
                  <span className="px-2">dari {pageCount}</span>
                  <button
                    type="button"
                    disabled={safePage >= pageCount}
                    onClick={() =>
                      setPage((value) => Math.min(pageCount, value + 1))
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            </section>
          </main>

          <aside className="flex min-w-0 flex-col gap-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="size-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900">
                    Aktivitas Terbaru
                  </h3>
                </div>
                <span className="text-xs font-semibold text-blue-600">
                  Live
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-4">
                {activities.length ? (
                  activities.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div
                        className={`mt-1 size-2 shrink-0 rounded-full ${item.status === "FAILED" ? "bg-rose-500" : "bg-emerald-500"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">
                          {item.status === "FAILED"
                            ? `Gagal mengirim ke ${item.name}`
                            : `Pesan terkirim ke ${item.name}`}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {item.error ??
                            (item.messageStatus === "READ"
                              ? "Pesan telah dibaca penerima."
                              : "Pesan berhasil diproses gateway.")}
                        </p>
                      </div>
                      <time className="shrink-0 text-[10px] text-slate-400">
                        {new Date(
                          item.sentAt ?? item.queuedAt ?? 0,
                        ).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-slate-400">
                    Belum ada aktivitas pengiriman.
                  </p>
                )}
              </div>
            </section>
            {retryableFailed > 0 && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="size-5 shrink-0 text-amber-600" />
                  <div className="flex-1">
                    <p className="font-bold text-amber-800">
                      {retryableFailed} data perlu retry
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      Pesan akan dicoba ulang sesuai pengaturan campaign.
                    </p>
                    <button
                      type="button"
                      onClick={retryFailed}
                      disabled={actionLoading === "retry"}
                      className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100 active:scale-[.98] disabled:cursor-wait disabled:opacity-50"
                    >
                      <RotateCcw
                        className={`size-4 ${actionLoading === "retry" ? "animate-spin" : ""}`}
                      />{" "}
                      Kirim ulang sekarang
                    </button>
                  </div>
                </div>
              </section>
            )}
            {invalidNumbers > 0 && (
              <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="size-5 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-bold text-rose-800">
                      {invalidNumbers} nomor bermasalah
                    </p>
                    <p className="mt-1 text-xs leading-5 text-rose-700">
                      Nomor tidak terdaftar di WhatsApp atau sudah tidak aktif.
                      Data ini tidak akan dimasukkan ke retry otomatis.
                    </p>
                  </div>
                </div>
              </section>
            )}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <PlayCircle className="size-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">Aksi Cepat</h3>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={retryFailed}
                  disabled={!retryableFailed || actionLoading === "retry"}
                  className="flex cursor-pointer items-center gap-3 rounded-xl bg-blue-600 px-4 py-3 text-left text-white transition hover:bg-blue-700 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCcw className="size-5" />
                  <span>
                    <strong className="block text-sm">Kirim Ulang Gagal</strong>
                    <small>
                      Kirim ulang {retryableFailed} pesan yang dapat dicoba
                    </small>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={exportReport}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 active:scale-[.99]"
                >
                  <Download className="size-5 text-blue-600" />
                  <span>
                    <strong className="block text-sm">Export Laporan</strong>
                    <small className="text-slate-400">
                      Unduh data penerima dalam CSV
                    </small>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    Swal.fire({
                      title: campaign.name,
                      text: campaign.body,
                      confirmButtonText: "Tutup",
                    })
                  }
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 active:scale-[.99]"
                >
                  <FileText className="size-5 text-blue-600" />
                  <span>
                    <strong className="block text-sm">
                      Lihat Detail Campaign
                    </strong>
                    <small className="text-slate-400">
                      Informasi pesan dan pengaturan
                    </small>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={cancelCampaign}
                  disabled={!isActive || actionLoading === "cancel"}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-rose-600 transition hover:bg-rose-100 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <StopCircle className="size-5" />
                  <span>
                    <strong className="block text-sm">
                      Hentikan Broadcast
                    </strong>
                    <small>Hentikan pengiriman yang sedang berjalan</small>
                  </span>
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function BroadcastPanel({
  collapsed,
  token,
}: {
  collapsed: boolean;
  token: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const monitoringId = pathname.split("/")[2] || null;
  const [creating, setCreating] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  async function loadCampaigns() {
    setLoading(true);
    try {
      setCampaigns(await request<any[]>("/campaigns", {}, token));
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadCampaigns();
  }, [token]);
  useEffect(() => setPage(1), [query, statusFilter, dateFilter]);
  if (monitoringId)
    return (
      <BroadcastMonitoringPanel
        collapsed={collapsed}
        token={token}
        campaignId={monitoringId}
        onBack={() => router.push("/broadcast")}
      />
    );

  const campaignState = (campaign: any) => {
    if (
      campaign.status === "FAILED" &&
      (campaign.stats?.sent ?? 0) > 0 &&
      (campaign.stats?.failed ?? 0) > 0
    )
      return "PARTIAL";
    if (
      campaign.status === "QUEUED" &&
      campaign.scheduledAt &&
      new Date(campaign.scheduledAt).getTime() > Date.now()
    )
      return "SCHEDULED";
    return campaign.status;
  };
  const stateMeta: Record<string, { label: string; className: string }> = {
    DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600" },
    SCHEDULED: {
      label: "Dijadwalkan",
      className: "bg-amber-50 text-amber-700",
    },
    QUEUED: {
      label: "Dalam antrean",
      className: "bg-blue-50 text-blue-700",
    },
    RUNNING: {
      label: "Berlangsung",
      className: "bg-blue-50 text-blue-700",
    },
    COMPLETED: {
      label: "Selesai",
      className: "bg-emerald-50 text-emerald-700",
    },
    FAILED: { label: "Gagal", className: "bg-rose-50 text-rose-700" },
    PARTIAL: {
      label: "Selesai sebagian",
      className: "bg-amber-50 text-amber-700",
    },
    CANCELLED: {
      label: "Dihentikan",
      className: "bg-slate-100 text-slate-600",
    },
  };
  const countState = (state: string) =>
    campaigns.filter((campaign) => campaignState(campaign) === state).length;
  const totalRecipients = campaigns.reduce(
    (sum, campaign) => sum + (campaign.stats?.total ?? 0),
    0,
  );
  const totalSent = campaigns.reduce(
    (sum, campaign) => sum + (campaign.stats?.sent ?? 0),
    0,
  );
  const totalRead = campaigns.reduce(
    (sum, campaign) => sum + (campaign.stats?.read ?? 0),
    0,
  );
  const normalizedQuery = query.trim().toLowerCase();
  const now = Date.now();
  const filteredCampaigns = campaigns.filter((campaign) => {
    const state = campaignState(campaign);
    const createdAt = new Date(campaign.createdAt).getTime();
    const withinDate =
      dateFilter === "ALL" ||
      (dateFilter === "TODAY" && now - createdAt <= 86_400_000) ||
      (dateFilter === "7D" && now - createdAt <= 7 * 86_400_000) ||
      (dateFilter === "30D" && now - createdAt <= 30 * 86_400_000);
    return (
      (statusFilter === "ALL" || state === statusFilter) &&
      withinDate &&
      (!normalizedQuery ||
        campaign.name.toLowerCase().includes(normalizedQuery) ||
        (campaign.instance?.name ?? "").toLowerCase().includes(normalizedQuery))
    );
  });
  const pageCount = Math.max(1, Math.ceil(filteredCampaigns.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleCampaigns = filteredCampaigns.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  const tabs = [
    { value: "ALL", label: "Semua", count: campaigns.length },
    { value: "DRAFT", label: "Draft", count: countState("DRAFT") },
    {
      value: "SCHEDULED",
      label: "Dijadwalkan",
      count: countState("SCHEDULED"),
    },
    { value: "RUNNING", label: "Berlangsung", count: countState("RUNNING") },
    { value: "COMPLETED", label: "Selesai", count: countState("COMPLETED") },
    {
      value: "PARTIAL",
      label: "Sebagian",
      count: countState("PARTIAL"),
    },
    { value: "FAILED", label: "Gagal", count: countState("FAILED") },
  ];
  const summaryCards = [
    {
      label: "Total Campaign",
      value: campaigns.length,
      detail: "seluruh campaign",
      icon: Send,
      className: "border-blue-100 bg-blue-50/30 text-blue-600",
    },
    {
      label: "Draft",
      value: countState("DRAFT"),
      detail: `${monitorPercent(countState("DRAFT"), campaigns.length)}% dari total`,
      icon: FileText,
      className: "border-slate-200 bg-slate-50 text-slate-500",
    },
    {
      label: "Dijadwalkan",
      value: countState("SCHEDULED"),
      detail: `${monitorPercent(countState("SCHEDULED"), campaigns.length)}% dari total`,
      icon: CalendarClock,
      className: "border-amber-100 bg-amber-50/50 text-amber-600",
    },
    {
      label: "Berlangsung",
      value: countState("RUNNING"),
      detail: `${monitorPercent(countState("RUNNING"), campaigns.length)}% dari total`,
      icon: PlayCircle,
      className: "border-blue-100 bg-blue-50/50 text-blue-600",
    },
    {
      label: "Selesai",
      value: countState("COMPLETED"),
      detail: `${monitorPercent(countState("COMPLETED"), campaigns.length)}% dari total`,
      icon: CheckCircle2,
      className: "border-emerald-100 bg-emerald-50/50 text-emerald-600",
    },
    {
      label: "Perlu Perhatian",
      value: countState("FAILED") + countState("PARTIAL"),
      detail: `${monitorPercent(countState("FAILED") + countState("PARTIAL"), campaigns.length)}% dari total`,
      icon: AlertTriangle,
      className: "border-rose-200 bg-rose-50/50 text-rose-600",
    },
  ];

  function exportCampaigns() {
    const quote = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [
      [
        "Campaign",
        "Instance",
        "Engine",
        "Jadwal",
        "Penerima",
        "Terkirim",
        "Dibaca",
        "Gagal",
        "Status",
        "Terakhir diperbarui",
      ],
      ...filteredCampaigns.map((campaign) => [
        campaign.name,
        campaign.instance?.name,
        campaign.instance?.engine,
        campaign.scheduledAt ?? "",
        campaign.stats?.total ?? 0,
        campaign.stats?.sent ?? 0,
        campaign.stats?.read ?? 0,
        campaign.stats?.failed ?? 0,
        stateMeta[campaignState(campaign)]?.label ?? campaign.status,
        campaign.updatedAt,
      ]),
    ]
      .map((row) => row.map(quote).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "daftar-campaign.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (creating)
    return (
      <BroadcastCampaignWizardReference
        collapsed={collapsed}
        token={token}
        onBack={() => {
          setCreating(false);
          loadCampaigns();
        }}
      />
    );
  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-slate-50 px-4 py-7 transition-all lg:px-6`}
    >
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Daftar Campaign
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola seluruh campaign broadcast WhatsApp Anda dari satu halaman.
          </p>
        </header>

        <section className="mb-3 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[auto_1fr_220px_220px_auto]">
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[.99]"
          >
            <Send className="size-4" /> Buat Campaign Baru
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama campaign..."
              className="h-full min-h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700"
          >
            <option value="ALL">Semua status</option>
            {tabs.slice(1).map((tab) => (
              <option key={tab.value} value={tab.value}>
                {tab.label}
              </option>
            ))}
          </select>
          <select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="min-h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700"
          >
            <option value="ALL">Semua tanggal</option>
            <option value="TODAY">Hari ini</option>
            <option value="7D">7 hari terakhir</option>
            <option value="30D">30 hari terakhir</option>
          </select>
          <button
            type="button"
            onClick={exportCampaigns}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 px-5 py-3 text-sm font-bold text-blue-600 transition hover:bg-blue-50 active:scale-[.99]"
          >
            <Download className="size-4" /> Export
          </button>
        </section>

        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <section
                key={card.label}
                className={`rounded-xl border p-4 ${card.className}`}
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/70">
                    <Icon className="size-6" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">
                      {card.label}
                    </p>
                    <p className="text-2xl font-bold text-slate-950">
                      {card.value}
                    </p>
                    <p className="text-[11px] font-semibold">{card.detail}</p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,2.5fr)_minmax(300px,1fr)]">
          <main className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition ${statusFilter === tab.value ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <FileText className="size-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">
                  List Campaign Broadcast
                </h2>
                <p className="text-xs text-slate-500">
                  Daftar seluruh campaign WhatsApp yang telah dibuat.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500">
                <RefreshCw className="size-5 animate-spin" /> Memuat campaign...
              </div>
            ) : !visibleCampaigns.length ? (
              <div className="p-16 text-center">
                <FileText className="mx-auto size-10 text-slate-300" />
                <p className="mt-4 font-semibold text-slate-900">
                  Campaign tidak ditemukan
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Ubah filter atau buat campaign baru.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden border-y border-slate-100">
                <table className="w-full table-fixed text-left text-[11px]">
                  <colgroup>
                    <col className="w-[4%]" />
                    <col className="w-[18%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[8%]" />
                    <col className="w-[8%]" />
                    <col className="w-[7%]" />
                    <col className="w-[12%]" />
                    <col className="w-[13%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-2 py-3">No</th>
                      <th className="px-2 py-3">Nama Campaign</th>
                      <th className="px-2 py-3">Instance</th>
                      <th className="px-2 py-3">Jadwal Kirim</th>
                      <th className="px-2 py-3 text-center">Penerima</th>
                      <th className="px-2 py-3 text-center">Terkirim</th>
                      <th className="px-2 py-3 text-center">Dibaca</th>
                      <th className="px-2 py-3">Status</th>
                      <th className="px-2 py-3">Terakhir Update</th>
                      <th className="px-2 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCampaigns.map((campaign, index) => {
                      const state = campaignState(campaign);
                      const meta = stateMeta[state] ?? {
                        label: state,
                        className: "bg-slate-100 text-slate-600",
                      };
                      return (
                        <tr
                          key={campaign.id}
                          className="border-t border-slate-100 text-slate-700 hover:bg-slate-50/70"
                        >
                          <td className="px-2 py-3 text-slate-400">
                            {(safePage - 1) * pageSize + index + 1}
                          </td>
                          <td className="px-2 py-3">
                            <p className="break-words font-bold leading-4 text-slate-900">
                              {campaign.name}
                            </p>
                          </td>
                          <td className="px-2 py-3">
                            <p className="truncate font-semibold text-slate-800">
                              {campaign.instance?.name ?? "-"}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {campaign.instance?.engine ?? "-"}
                            </p>
                          </td>
                          <td className="px-2 py-3 leading-4">
                            {campaign.scheduledAt
                              ? monitorDate(campaign.scheduledAt)
                              : "Kirim langsung"}
                          </td>
                          <td className="px-2 py-3 text-center font-bold">
                            {campaign.stats?.total ?? 0}
                          </td>
                          <td className="px-2 py-3 text-center font-bold text-emerald-600">
                            {campaign.stats?.sent ?? 0}
                          </td>
                          <td className="px-2 py-3 text-center">
                            <p className="font-bold text-blue-600">
                              {campaign.stats?.read ?? 0}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {monitorPercent(
                                campaign.stats?.read ?? 0,
                                campaign.stats?.total ?? 0,
                              )}
                              %
                            </p>
                          </td>
                          <td className="px-2 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.className}`}
                            >
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-2 py-3 leading-4">
                            {new Date(campaign.updatedAt).toLocaleString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex justify-center gap-1">
                              <button
                                type="button"
                                title="Buka monitoring"
                                onClick={() =>
                                  router.push(`/broadcast/${campaign.id}`)
                                }
                                className="grid size-8 cursor-pointer place-items-center rounded-lg border border-blue-200 text-blue-600 transition hover:bg-blue-50"
                              >
                                <Eye className="size-4" />
                              </button>
                              <button
                                type="button"
                                title="Lihat detail"
                                onClick={() =>
                                  Swal.fire({
                                    title: campaign.name,
                                    html: `<div style=\"text-align:left\"><b>Instance:</b> ${campaign.instance?.name ?? "-"}<br/><b>Penerima:</b> ${campaign.stats?.total ?? 0}<br/><b>Terkirim:</b> ${campaign.stats?.sent ?? 0}<br/><b>Gagal:</b> ${campaign.stats?.failed ?? 0}</div>`,
                                    confirmButtonText: "Tutup",
                                  })
                                }
                                className="grid size-8 cursor-pointer place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                              >
                                <MoreHorizontal className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <footer className="flex flex-col gap-3 p-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Menampilkan{" "}
                {visibleCampaigns.length ? (safePage - 1) * pageSize + 1 : 0}-
                {Math.min(safePage * pageSize, filteredCampaigns.length)} dari{" "}
                {filteredCampaigns.length} campaign
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <span className="rounded-lg bg-blue-600 px-3 py-2 font-bold text-white">
                  {safePage}
                </span>
                <span className="px-2">dari {pageCount}</span>
                <button
                  type="button"
                  disabled={safePage >= pageCount}
                  onClick={() =>
                    setPage((value) => Math.min(pageCount, value + 1))
                  }
                  className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Selanjutnya
                </button>
              </div>
            </footer>
          </main>

          <aside className="flex min-w-0 flex-col gap-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-5 text-blue-600" />
                <div>
                  <h2 className="font-bold text-slate-900">Campaign Terbaru</h2>
                  <p className="text-xs text-slate-400">
                    Aktivitas terakhir campaign Anda.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-4">
                {campaigns.slice(0, 5).map((campaign) => {
                  const state = campaignState(campaign);
                  const Icon =
                    state === "FAILED" || state === "PARTIAL"
                      ? AlertTriangle
                      : state === "COMPLETED"
                        ? CheckCircle2
                        : state === "RUNNING"
                          ? PlayCircle
                          : CalendarClock;
                  const activityDetail =
                    state === "PARTIAL"
                      ? `${campaign.stats?.sent ?? 0} terkirim, ${campaign.stats?.failed ?? 0} nomor gagal`
                      : state === "FAILED"
                        ? `${campaign.stats?.failed ?? 0} nomor gagal dikirim`
                        : state === "COMPLETED"
                          ? `${campaign.stats?.sent ?? 0} pesan berhasil dikirim`
                          : state === "RUNNING"
                            ? `${campaign.stats?.sent ?? 0} dari ${campaign.stats?.total ?? 0} terkirim`
                            : (stateMeta[state]?.label ?? state);
                  return (
                    <div key={campaign.id} className="flex items-start gap-3">
                      <div
                        className={`grid size-8 shrink-0 place-items-center rounded-full ${state === "FAILED" ? "bg-rose-100 text-rose-600" : state === "PARTIAL" ? "bg-amber-100 text-amber-600" : state === "COMPLETED" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"}`}
                      >
                        <Icon className="size-4" />
                      </div>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm text-slate-800">
                          {campaign.name}
                        </strong>
                        <small
                          className={`block leading-4 ${state === "FAILED" ? "text-rose-600" : state === "PARTIAL" ? "text-amber-600" : "text-slate-400"}`}
                        >
                          {activityDetail}
                        </small>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <time className="text-[10px] text-slate-400">
                          {new Date(campaign.updatedAt).toLocaleDateString(
                            "id-ID",
                            {
                              day: "2-digit",
                              month: "short",
                            },
                          )}
                        </time>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/broadcast/${campaign.id}`)
                          }
                          className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                        >
                          Detail <ChevronRight className="size-3" />
                        </button>
                      </span>
                    </div>
                  );
                })}
                {!campaigns.length && (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Belum ada aktivitas.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-5 text-blue-600" />
                <h2 className="font-bold text-slate-900">
                  Ringkasan Performa Campaign
                </h2>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {[
                  {
                    label: "Tingkat Pengiriman",
                    value: `${monitorPercent(totalSent, totalRecipients)}%`,
                    detail: `${totalSent} dari ${totalRecipients} pesan`,
                    icon: Send,
                    tone: "text-emerald-600 bg-emerald-50",
                  },
                  {
                    label: "Tingkat Dibaca",
                    value: `${monitorPercent(totalRead, totalRecipients)}%`,
                    detail: `${totalRead} dari ${totalRecipients} pesan`,
                    icon: Eye,
                    tone: "text-emerald-600 bg-emerald-50",
                  },
                  {
                    label: "Campaign Selesai",
                    value: String(countState("COMPLETED")),
                    detail: `${monitorPercent(countState("COMPLETED"), campaigns.length)}% dari total`,
                    icon: CheckCircle2,
                    tone: "text-emerald-600 bg-emerald-50",
                  },
                  {
                    label: "Campaign Gagal",
                    value: String(countState("FAILED")),
                    detail: `${monitorPercent(countState("FAILED"), campaigns.length)}% dari total`,
                    icon: AlertTriangle,
                    tone: "text-rose-600 bg-rose-50",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                    >
                      <div
                        className={`grid size-10 place-items-center rounded-xl ${item.tone}`}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-400">{item.detail}</p>
                      </div>
                      <strong className={item.tone.split(" ")[0]}>
                        {item.value}
                      </strong>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ModulePanel({
  module,
  collapsed,
  token,
}: {
  module: string;
  collapsed: boolean;
  token: string;
}) {
  if (module === "inbox")
    return <InboxPanel collapsed={collapsed} token={token} />;
  if (module === "webhooks")
    return <WebhooksPanel collapsed={collapsed} token={token} />;
  if (module === "contacts")
    return <ContactsPanel collapsed={collapsed} token={token} />;
  if (module === "broadcast")
    return <BroadcastPanel collapsed={collapsed} token={token} />;
  if (module === "templates") return <TemplatesPanel collapsed={collapsed} />;
  if (module === "data-sheets")
    return <DataSheetsPanel collapsed={collapsed} token={token} />;
  if (module === "team")
    return <TeamRolesPanel collapsed={collapsed} token={token} />;
  if (module === "usage")
    return <UsageLogsPanel collapsed={collapsed} token={token} />;
  if (module === "settings") return <SettingsPanel collapsed={collapsed} />;
  if (module === "reports")
    return <ReportsPanel collapsed={collapsed} token={token} />;
  if (module === "api-console")
    return <ApiConsolePanel collapsed={collapsed} />;
  if (module === "api-keys")
    return <ApiKeysPanel collapsed={collapsed} token={token} />;
  if (module === "ai-providers")
    return <AiProvidersPanel collapsed={collapsed} token={token} />;
  if (module === "system-monitor")
    return <SystemMonitorPanel collapsed={collapsed} token={token} />;
  if (module === "automations")
    return <AutomationsPanel collapsed={collapsed} token={token} />;
  return (
    <GenericModulePanel module={module} collapsed={collapsed} token={token} />
  );
}

function TeamRolesPanel({
  collapsed,
  token,
}: {
  collapsed: boolean;
  token: string;
}) {
  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [memberData, roleData] = await Promise.all([
        request<any[]>("/members", {}, token),
        request<any[]>("/roles", {}, token),
      ]);
      setMembers(memberData);
      setRoles(roleData);
      if (!roleId && roleData[0]) setRoleId(roleData[0].id);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal memuat team",
        text:
          error instanceof Error
            ? error.message
            : "Data team tidak dapat dimuat.",
        confirmButtonText: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function addMember(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !roleId || saving) return;
    setSaving(true);
    try {
      await request(
        "/members",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), roleId }),
        },
        token,
      );
      setEmail("");
      await load();
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Anggota ditambahkan",
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal menambahkan anggota",
        text:
          error instanceof Error ? error.message : "Periksa email dan role.",
        confirmButtonText: "Tutup",
      });
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(member: any) {
    const nextStatus = member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const result = await Swal.fire({
      icon: nextStatus === "ACTIVE" ? "question" : "warning",
      title: nextStatus === "ACTIVE" ? "Aktifkan anggota?" : "Suspend anggota?",
      text: member.user?.email ?? "Anggota workspace",
      showCancelButton: true,
      confirmButtonText: nextStatus === "ACTIVE" ? "Aktifkan" : "Suspend",
      cancelButtonText: "Batal",
    });
    if (!result.isConfirmed) return;
    try {
      await request(
        `/members/${member.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        },
        token,
      );
      await load();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Status tidak berubah",
        text:
          error instanceof Error ? error.message : "Perubahan status gagal.",
        confirmButtonText: "Tutup",
      });
    }
  }

  async function createRole(event: FormEvent) {
    event.preventDefault();
    if (!roleName.trim() || !rolePermissions.length || saving) return;
    setSaving(true);
    try {
      await request(
        "/roles",
        {
          method: "POST",
          body: JSON.stringify({
            name: roleName.trim(),
            permissions: rolePermissions,
          }),
        },
        token,
      );
      setRoleName("");
      setRolePermissions([]);
      await load();
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Role dibuat",
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal membuat role",
        text:
          error instanceof Error ? error.message : "Role tidak dapat dibuat.",
        confirmButtonText: "Tutup",
      });
    } finally {
      setSaving(false);
    }
  }

  const permissionOptions = [
    ["member.read", "Lihat anggota"],
    ["member.create", "Tambah anggota"],
    ["member.update", "Ubah status anggota"],
    ["role.read", "Lihat role"],
    ["role.manage", "Kelola role"],
    ["message.read", "Lihat pesan"],
    ["message.send", "Kirim pesan"],
    ["contact.read", "Lihat kontak"],
    ["contact.manage", "Kelola kontak"],
    ["audit.read", "Lihat log"],
  ] as const;

  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-[#f7f9fc] px-6 py-7 transition-all`}
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-xl bg-blue-600 text-white">
            <Users className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Workspace module
            </p>
            <h1 className="text-3xl font-bold text-slate-900">Team & roles</h1>
            <p className="text-sm text-slate-500">
              Kelola anggota workspace dan akses berdasarkan role.
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">Anggota workspace</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {members.length} anggota terdaftar
                </p>
              </div>
              <Users className="size-5 text-blue-600" />
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
                <RefreshCw className="size-4 animate-spin" /> Memuat anggota...
              </div>
            ) : members.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">
                Belum ada anggota lain.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-50 font-bold text-blue-700">
                        {(member.user?.name ?? member.user?.email ?? "?")
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {member.user?.name ?? "Tanpa nama"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {member.user?.email ?? "-"}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(member.roles ?? []).map((item: any) => (
                            <span
                              key={item.roleId ?? item.role?.id}
                              className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700"
                            >
                              {item.role?.name ?? "Role"}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void changeStatus(member)}
                      className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-bold transition ${member.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
                    >
                      {member.status === "ACTIVE" ? "Aktif" : "Suspended"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="size-5 text-blue-600" />
                <h2 className="font-bold text-slate-900">Tambah anggota</h2>
              </div>
              <form onSubmit={addMember} className="mt-4 space-y-3">
                <label className="block text-sm font-semibold text-slate-700">
                  Email pengguna
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    placeholder="anggota@contoh.com"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Role
                  <select
                    value={roleId}
                    onChange={(event) => setRoleId(event.target.value)}
                    className="mt-2 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500"
                  >
                    <option value="">Pilih role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={saving || !email.trim() || !roleId}
                  className="w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? "Menyimpan..." : "Tambah anggota"}
                </button>
              </form>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="size-5 text-indigo-600" />
                <h2 className="font-bold text-slate-900">Role tersedia</h2>
              </div>
              <div className="mt-3 space-y-2">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-slate-800">
                      {role.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {role.permissions?.length ?? 0} permission
                    </p>
                  </div>
                ))}
                {!roles.length && (
                  <p className="text-sm text-slate-500">Belum ada role.</p>
                )}
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="size-5 text-indigo-600" />
                <h2 className="font-bold text-slate-900">Buat role baru</h2>
              </div>
              <form onSubmit={createRole} className="mt-4 space-y-3">
                <input
                  value={roleName}
                  onChange={(event) => setRoleName(event.target.value)}
                  placeholder="Contoh: Operator"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
                <div className="grid grid-cols-1 gap-2">
                  {permissionOptions.map(([key, label]) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 text-xs text-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={rolePermissions.includes(key)}
                        onChange={(event) =>
                          setRolePermissions((current) =>
                            event.target.checked
                              ? [...current, key]
                              : current.filter((item) => item !== key),
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={
                    saving || !roleName.trim() || !rolePermissions.length
                  }
                  className="w-full cursor-pointer rounded-lg border border-indigo-200 px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Simpan role
                </button>
              </form>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function TemplatesPanel({ collapsed }: { collapsed: boolean }) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [templates, setTemplates] = useState<{ name: string; body: string }[]>(
    [],
  );
  useEffect(() => {
    try {
      setTemplates(
        JSON.parse(localStorage.getItem("gateway_message_templates") ?? "[]"),
      );
    } catch {
      setTemplates([]);
    }
  }, []);
  function saveTemplate() {
    if (!name.trim() || !body.trim()) return;
    const next = [
      { name: name.trim(), body },
      ...templates.filter((item) => item.name !== name.trim()),
    ];
    setTemplates(next);
    localStorage.setItem("gateway_message_templates", JSON.stringify(next));
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Template disimpan",
      showConfirmButton: false,
      timer: 1800,
    });
  }
  function deleteTemplate(nameToDelete: string) {
    const next = templates.filter((item) => item.name !== nameToDelete);
    setTemplates(next);
    localStorage.setItem("gateway_message_templates", JSON.stringify(next));
    if (name === nameToDelete) {
      setName("");
      setBody("");
    }
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Template dihapus",
      showConfirmButton: false,
      timer: 1600,
    });
  }
  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-[#f7f9fc] px-6 py-7 transition-all`}
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-6 flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-xl bg-blue-600 text-lg font-bold text-white">
            T
          </span>
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Workspace module
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              Template Pesan
            </h1>
            <p className="text-sm text-slate-500">
              Buat dan gunakan ulang template WhatsApp dengan variabel dinamis.
            </p>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
          <main className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700">
              Nama template
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Undangan meeting"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
              />
            </label>
            <div className="mt-5">
              <h2 className="font-bold text-slate-900">Editor Pesan</h2>
              <p className="mt-1 text-xs text-slate-500">
                Gunakan variabel untuk personalisasi setiap pesan.
              </p>
              <div className="mt-3">
                <WysiwygEditor
                  value={body}
                  onChange={setBody}
                  variables={[
                    "NAMA",
                    "NOMOR_HP",
                    "INSTANSI",
                    "JABATAN",
                    "TANGGAL",
                  ]}
                />
              </div>
            </div>
            <DynamicVariableCallout
              fields={["name", "phone", "instansi", "jabatan", "tanggal"]}
            />
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={saveTemplate}
                disabled={!name.trim() || !body.trim()}
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                Simpan template
              </button>
            </div>
          </main>
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-bold text-slate-900">Template tersimpan</h2>
            <p className="mt-1 text-xs text-slate-500">
              {templates.length} template tersedia
            </p>
            <div className="mt-4 space-y-2">
              {templates.length ? (
                templates.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      setName(item.name);
                      setBody(item.body);
                    }}
                    className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-300"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800">
                          {item.name}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {item.body.replace(/<[^>]*>/g, " ")}
                        </p>
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        title="Hapus template"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteTemplate(item.name);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            deleteTemplate(item.name);
                          }
                        }}
                        className="cursor-pointer rounded-md px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
                      >
                        Hapus
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                  Belum ada template.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

type AutomationRule = {
  id: string;
  name: string;
  trigger: "contains" | "exact" | "any";
  keyword: string;
  response: string;
  enabled: boolean;
  instanceId?: string | null;
  instance?: { id: string; name: string; engine: string } | null;
  cooldownSeconds?: number;
};

function LegacyAutomationsPanel({
  collapsed,
  token,
}: {
  collapsed: boolean;
  token: string;
}) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<AutomationRule["trigger"]>("contains");
  const [keyword, setKeyword] = useState("");
  const [response, setResponse] = useState("");
  const [instanceId, setInstanceId] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [ruleData, instanceData] = await Promise.all([
        request<AutomationRule[]>("/automations", {}, token),
        request<Instance[]>("/instances", {}, token),
      ]);
      setRules(ruleData);
      setInstances(instanceData);
      if (!instanceId && instanceData.length) setInstanceId(instanceData[0].id);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Automation gagal dimuat",
        text: error instanceof Error ? error.message : "Permintaan gagal",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function addRule(event: FormEvent) {
    event.preventDefault();
    if (
      !name.trim() ||
      !response.trim() ||
      (trigger !== "any" && !keyword.trim()) ||
      !instanceId
    )
      return;
    setSaving(true);
    try {
      await request(
        "/automations",
        {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            trigger,
            keyword: trigger === "any" ? "" : keyword.trim(),
            response: response.trim(),
            instanceId,
            cooldownSeconds,
          }),
        },
        token,
      );
      setName("");
      setKeyword("");
      setResponse("");
      await load();
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Automation aktif di server",
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal menyimpan automation",
        text: error instanceof Error ? error.message : "Permintaan gagal",
      });
    } finally {
      setSaving(false);
    }
  }

  async function removeRule(id: string) {
    await request(`/automations/${id}`, { method: "DELETE" }, token);
    await load();
  }

  async function toggleRule(rule: AutomationRule) {
    await request(
      `/automations/${rule.id}`,
      { method: "PATCH", body: JSON.stringify({ enabled: !rule.enabled }) },
      token,
    );
    await load();
  }

  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-[#f7f9fc] px-6 py-7 transition-all`}
    >
      <div className="mx-auto max-w-[1250px]">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-xl bg-indigo-600 text-white">
            <Radio className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Workspace module
            </p>
            <h1 className="text-3xl font-bold text-slate-900">Automations</h1>
            <p className="text-sm text-slate-500">
              Buat balasan otomatis berdasarkan pesan masuk.
            </p>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">Rule aktif</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {rules.filter((rule) => rule.enabled).length} aktif dari{" "}
                  {rules.length} rule
                </p>
              </div>
              <Radio className="size-5 text-indigo-600" />
            </div>
            {loading && !rules.length ? (
              <div className="p-16 text-center text-sm text-slate-500">
                Memuat automation...
              </div>
            ) : !rules.length ? (
              <div className="p-16 text-center">
                <Radio className="mx-auto size-10 text-slate-300" />
                <p className="mt-3 font-semibold text-slate-700">
                  Belum ada automation
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Buat rule pertama di panel sebelah.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-start gap-4 px-5 py-4"
                  >
                    <div
                      className={`mt-1 grid size-9 shrink-0 place-items-center rounded-lg ${rule.enabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}
                    >
                      <MessageSquareText className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">
                        {rule.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {rule.trigger === "any"
                          ? "Semua pesan masuk"
                          : rule.trigger === "exact"
                            ? `Pesan sama dengan: ${rule.keyword}`
                            : `Pesan mengandung: ${rule.keyword}`}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-indigo-600">
                        Instance: {rule.instance?.name ?? "Semua instance"}
                        {rule.instance?.engine ? ` · ${rule.instance.engine}` : ""}
                        {` · Cooldown ${rule.cooldownSeconds ?? 5} detik`}
                      </p>
                      <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                        {rule.response}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleRule(rule)}
                        className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold ${rule.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {rule.enabled ? "Aktif" : "Nonaktif"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeRule(rule.id)}
                        className="cursor-pointer rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="size-5 text-indigo-600" />
              <h2 className="font-bold text-slate-900">Buat automation</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Rule tersimpan di server dan dijalankan saat webhook menerima pesan.
            </p>
            <form onSubmit={addRule} className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Instance penerima
                <select
                  value={instanceId}
                  onChange={(event) => setInstanceId(event.target.value)}
                  className="mt-2 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
                >
                  <option value="">Pilih instance</option>
                  {instances.map((instance) => (
                    <option key={instance.id} value={instance.id}>
                      {instance.name} · {instance.engine ?? "NOWEB"} · {instance.status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Nama rule
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Contoh: Balasan menu"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Kondisi pesan
                <select
                  value={trigger}
                  onChange={(event) =>
                    setTrigger(event.target.value as AutomationRule["trigger"])
                  }
                  className="mt-2 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
                >
                  <option value="contains">Mengandung kata</option>
                  <option value="exact">Sama persis</option>
                  <option value="any">Semua pesan</option>
                </select>
              </label>
              {trigger !== "any" && (
                <label className="block text-sm font-semibold text-slate-700">
                  Kata kunci
                  <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="menu"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
                  />
                </label>
              )}
              <label className="block text-sm font-semibold text-slate-700">
                Balasan otomatis
                <textarea
                  value={response}
                  onChange={(event) => setResponse(event.target.value)}
                  rows={5}
                  placeholder="Tulis balasan otomatis..."
                  className="mt-2 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Cooldown per percakapan
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={3600}
                    value={cooldownSeconds}
                    onChange={(event) =>
                      setCooldownSeconds(
                        Math.max(1, Math.min(3600, Number(event.target.value) || 1)),
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
                  />
                  <span className="text-sm text-slate-500">detik</span>
                </div>
                <span className="mt-1 block text-[11px] font-normal leading-4 text-slate-500">
                  Pesan dari chat yang sama tidak akan dibalas berulang selama jeda ini.
                </span>
              </label>
              <button
                type="submit"
                disabled={
                  !name.trim() ||
                  !response.trim() ||
                  !instanceId ||
                  (trigger !== "any" && !keyword.trim()) ||
                  saving
                }
                className="w-full cursor-pointer rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Menyimpan..." : "Simpan automation"}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ collapsed }: { collapsed: boolean }) {
  const [defaultEngine, setDefaultEngine] = useState<"NOWEB" | "GOWS">("NOWEB");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("gateway_workspace_settings") ?? "{}",
      );
      if (stored.defaultEngine === "GOWS" || stored.defaultEngine === "NOWEB")
        setDefaultEngine(stored.defaultEngine);
      if (stored.theme === "dark" || stored.theme === "light")
        setTheme(stored.theme);
      if (typeof stored.autoRefresh === "boolean")
        setAutoRefresh(stored.autoRefresh);
      if (typeof stored.notifications === "boolean")
        setNotifications(stored.notifications);
    } catch {
      // Use defaults when local settings are invalid.
    }
  }, []);

  function saveSettings(event: FormEvent) {
    event.preventDefault();
    localStorage.setItem(
      "gateway_workspace_settings",
      JSON.stringify({ defaultEngine, theme, autoRefresh, notifications }),
    );
    localStorage.setItem("gateway_dark_mode", String(theme === "dark"));
    setSaved(true);
    void Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Pengaturan disimpan",
      showConfirmButton: false,
      timer: 1800,
    });
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-[#f7f9fc] px-6 py-7 transition-all`}
    >
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-xl bg-slate-900 text-white">
            <Gauge className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Workspace module
            </p>
            <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500">
              Atur perilaku dashboard dan preferensi workspace.
            </p>
          </div>
        </div>

        <form
          onSubmit={saveSettings}
          className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]"
        >
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <Radio className="size-5 text-indigo-600" />
                <div>
                  <h2 className="font-bold text-slate-900">Gateway default</h2>
                  <p className="text-xs text-slate-500">
                    Nilai ini digunakan sebagai preferensi saat membuat instance
                    baru.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Provider default
                  <select
                    value={defaultEngine}
                    onChange={(event) =>
                      setDefaultEngine(event.target.value as "NOWEB" | "GOWS")
                    }
                    className="mt-2 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
                  >
                    <option value="NOWEB">NOWEB</option>
                    <option value="GOWS">GOWS</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Tema dashboard
                  <select
                    value={theme}
                    onChange={(event) =>
                      setTheme(event.target.value as "light" | "dark")
                    }
                    className="mt-2 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <RefreshCw className="size-5 text-indigo-600" />
                <div>
                  <h2 className="font-bold text-slate-900">
                    Perilaku dashboard
                  </h2>
                  <p className="text-xs text-slate-500">
                    Kontrol pembaruan status dan pemberitahuan sistem.
                  </p>
                </div>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                <label className="flex cursor-pointer items-center justify-between gap-4 py-4">
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      Refresh status otomatis
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Perbarui status instance dan campaign secara berkala.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(event) => setAutoRefresh(event.target.checked)}
                    className="size-5 cursor-pointer accent-indigo-600"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-4 py-4">
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      Notifikasi aksi
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Tampilkan notifikasi setelah aksi berhasil atau gagal.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={(event) => setNotifications(event.target.checked)}
                    className="size-5 cursor-pointer accent-indigo-600"
                  />
                </label>
              </div>
            </section>
          </div>
          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-slate-900">Status pengaturan</h2>
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">
                  Konfigurasi lokal aktif
                </p>
                <p className="mt-2 text-xs leading-5">
                  Pengaturan tersimpan di browser ini dan tidak mengubah
                  konfigurasi provider di server.
                </p>
              </div>
              <button
                type="submit"
                className="mt-4 w-full cursor-pointer rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
              >
                {saved ? "Tersimpan" : "Simpan pengaturan"}
              </button>
            </section>
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              <p className="font-bold">Catatan</p>
              <p className="mt-2 text-xs leading-5">
                Provider dan instance yang sudah dibuat tidak berubah.
                Pengaturan provider default hanya dipakai untuk pembuatan
                berikutnya.
              </p>
            </section>
          </aside>
        </form>
      </div>
    </div>
  );
}

function UsageLogsPanel({
  collapsed,
  token,
}: {
  collapsed: boolean;
  token: string;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setLogs(await request<any[]>("/audit-logs", {}, token));
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal memuat log",
        text:
          error instanceof Error
            ? error.message
            : "Audit log tidak dapat dimuat.",
        confirmButtonText: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  const actions = Array.from(
    new Set(logs.map((item) => item.action).filter(Boolean)),
  );
  const filteredLogs = logs.filter((item) => {
    const haystack =
      `${item.action ?? ""} ${item.resource ?? ""} ${JSON.stringify(item.metadata ?? {})}`.toLowerCase();
    return (
      (actionFilter === "ALL" || item.action === actionFilter) &&
      haystack.includes(query.toLowerCase())
    );
  });

  function exportLogs() {
    const rows = filteredLogs.map((item) => ({
      waktu: new Date(item.createdAt).toLocaleString("id-ID"),
      aksi: item.action ?? "",
      resource: item.resource ?? "",
      detail: JSON.stringify(item.metadata ?? {}),
    }));
    const csv = [
      "waktu,aksi,resource,detail",
      ...rows.map((row) =>
        Object.values(row)
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = "usage-logs.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-[#f7f9fc] px-6 py-7 transition-all`}
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-xl bg-indigo-600 text-white">
              <Activity className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-600">
                Workspace module
              </p>
              <h1 className="text-3xl font-bold text-slate-900">
                Usage & logs
              </h1>
              <p className="text-sm text-slate-500">
                Pantau aktivitas pengguna dan perubahan pada gateway.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="size-4" /> Refresh
            </button>
            <button
              type="button"
              onClick={exportLogs}
              disabled={!filteredLogs.length}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="size-4" /> Export
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Total aktivitas</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {logs.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Hasil filter</p>
            <p className="mt-1 text-2xl font-bold text-indigo-600">
              {filteredLogs.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Jenis aksi</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {actions.length}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari aksi, resource, atau detail..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="ALL">Semua aksi</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-16 text-sm text-slate-500">
              <RefreshCw className="size-4 animate-spin" /> Memuat log...
            </div>
          ) : !filteredLogs.length ? (
            <div className="p-16 text-center">
              <Activity className="mx-auto size-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">
                Tidak ada aktivitas
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Belum ada log yang cocok dengan filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLogs.map((item) => (
                <details key={item.id} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                      <Activity className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {item.action ?? "Aktivitas"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {item.resource ?? "Workspace"}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    <ChevronRight className="size-4 text-slate-400 transition group-open:rotate-90" />
                  </summary>
                  <pre className="ml-12 mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    {JSON.stringify(item.metadata ?? {}, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function DataSheetsPanel({
  collapsed,
  token,
}: {
  collapsed: boolean;
  token: string;
}) {
  const [sheets, setSheets] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");
  const [externalPath, setExternalPath] = useState("data");
  const [externalLoading, setExternalLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setSheets(await request<any[]>("/data-sheets", {}, token));
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal memuat data sheet",
        text:
          error instanceof Error
            ? error.message
            : "Data sheet tidak dapat dimuat.",
        confirmButtonText: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function readFile(file?: File) {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        firstSheet,
        { defval: "" },
      );
      const nextFields = Array.from(
        new Set(parsed.flatMap((row) => Object.keys(row))),
      );
      if (!nextFields.length || !parsed.length)
        throw new Error("File tidak memiliki baris data.");
      setName(file.name.replace(/\.(xlsx|xls|csv)$/i, ""));
      setFields(nextFields);
      setRows(parsed);
      setSelected(null);
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `${parsed.length} baris siap disimpan`,
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "File tidak dapat dibaca",
        text:
          error instanceof Error ? error.message : "Format file tidak valid.",
        confirmButtonText: "Tutup",
      });
    }
  }

  async function saveSheet(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !fields.length || !rows.length || saving) return;
    setSaving(true);
    try {
      await request(
        "/data-sheets",
        {
          method: "POST",
          body: JSON.stringify({ name, source: "excel", fields, rows }),
        },
        token,
      );
      await load();
      setFields([]);
      setRows([]);
      setName("");
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Data sheet disimpan",
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal menyimpan",
        text:
          error instanceof Error
            ? error.message
            : "Data sheet tidak dapat disimpan.",
        confirmButtonText: "Tutup",
      });
    } finally {
      setSaving(false);
    }
  }

  async function previewExternal(event: FormEvent) {
    event.preventDefault();
    if (!externalUrl.trim() || externalLoading) return;
    setExternalLoading(true);
    try {
      const result = await request<{
        fields: string[];
        rows: Record<string, unknown>[];
        total: number;
      }>(
        "/data-sheets/external/preview",
        {
          method: "POST",
          body: JSON.stringify({
            url: externalUrl.trim(),
            method: "GET",
            dataPath: externalPath.trim(),
          }),
        },
        token,
      );
      setName(new URL(externalUrl).hostname.replace(/^www\./, ""));
      setFields(result.fields);
      setRows(result.rows);
      setSelected(null);
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `${result.total} record dari API`,
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "API tidak dapat dibaca",
        text:
          error instanceof Error ? error.message : "Periksa URL dan path data.",
        confirmButtonText: "Tutup",
      });
    } finally {
      setExternalLoading(false);
    }
  }

  async function openSheet(id: string) {
    try {
      setSelected(await request<any>(`/data-sheets/${id}`, {}, token));
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal membuka data sheet",
        text:
          error instanceof Error
            ? error.message
            : "Data sheet tidak dapat dibuka.",
        confirmButtonText: "Tutup",
      });
    }
  }

  async function removeSheet(sheet: any) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus data sheet?",
      text: sheet.name,
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
    });
    if (!result.isConfirmed) return;
    try {
      await request(`/data-sheets/${sheet.id}`, { method: "DELETE" }, token);
      if (selected?.id === sheet.id) setSelected(null);
      await load();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal menghapus",
        text:
          error instanceof Error
            ? error.message
            : "Data sheet tidak dapat dihapus.",
        confirmButtonText: "Tutup",
      });
    }
  }

  const previewFields = selected?.fields ?? fields;
  const previewRows = selected?.rows ?? rows;
  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-[#f7f9fc] px-6 py-7 transition-all`}
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-xl bg-emerald-600 text-white">
            <Database className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-600">
              Workspace module
            </p>
            <h1 className="text-3xl font-bold text-slate-900">Data Sheets</h1>
            <p className="text-sm text-slate-500">
              Simpan data penerima dan variabel untuk dipakai ulang di campaign.
            </p>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">
                  Data sheet tersimpan
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {sheets.length} data sheet pada workspace ini
                </p>
              </div>
              <Database className="size-5 text-emerald-600" />
            </div>
            {loading ? (
              <div className="p-12 text-center text-sm text-slate-500">
                Memuat data sheet...
              </div>
            ) : !sheets.length ? (
              <div className="p-16 text-center text-sm text-slate-500">
                Belum ada data sheet tersimpan.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sheets.map((sheet) => (
                  <div
                    key={sheet.id}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">
                        {sheet.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {sheet.recordCount} record · {sheet.fields?.length ?? 0}{" "}
                        kolom · {sheet.source ?? "manual"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void openSheet(sheet.id)}
                      className="cursor-pointer rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      Buka
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeSheet(sheet)}
                      className="cursor-pointer rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Download className="size-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900">Import Excel</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Upload data untuk dipreview sebelum masuk ke database.
            </p>
            <label className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-8 text-center hover:bg-emerald-50">
              <Download className="size-8 text-emerald-600" />
              <span className="mt-3 text-sm font-semibold text-emerald-800">
                Pilih file Excel
              </span>
              <span className="mt-1 text-xs text-slate-500">
                .xlsx, .xls, atau .csv
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => void readFile(event.target.files?.[0])}
              />
            </label>
            <form onSubmit={saveSheet} className="mt-4 space-y-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nama data sheet"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
              <p className="text-xs text-slate-500">
                {rows.length
                  ? `${rows.length} baris · ${fields.length} kolom siap disimpan`
                  : "Belum ada file dipilih."}
              </p>
              <button
                type="submit"
                disabled={saving || !name.trim() || !rows.length}
                className="w-full cursor-pointer rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Menyimpan..." : "Simpan data sheet"}
              </button>
            </form>
            <div className="mt-5 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2">
                <Radio className="size-5 text-blue-600" />
                <h2 className="font-bold text-slate-900">API eksternal</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Preview JSON dari endpoint sebelum disimpan.
              </p>
              <form onSubmit={previewExternal} className="mt-3 space-y-3">
                <input
                  type="url"
                  required
                  value={externalUrl}
                  onChange={(event) => setExternalUrl(event.target.value)}
                  placeholder="https://api.contoh.com/contacts"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
                <input
                  value={externalPath}
                  onChange={(event) => setExternalPath(event.target.value)}
                  placeholder="Path data, contoh: data.items"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={externalLoading}
                  className="w-full cursor-pointer rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {externalLoading ? "Membaca API..." : "Preview API"}
                </button>
              </form>
            </div>
          </aside>
        </div>
        {(selected || rows.length > 0) && (
          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">Preview data</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selected?.name ?? name} · {previewRows.length} record ·{" "}
                  {previewFields.length} kolom
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Tutup preview
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    {previewFields.map((field: string) => (
                      <th key={field} className="px-4 py-3">
                        {field}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 20).map((row: any, index: number) => (
                    <tr key={index} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                      {previewFields.map((field: string) => (
                        <td
                          key={field}
                          className="max-w-[220px] truncate px-4 py-3 text-slate-700"
                        >
                          {String(row[field] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const API_KEY_PERMISSIONS = [
  ["instance.read", "Lihat instance"],
  ["instance.create", "Buat instance"],
  ["instance.control", "Start, stop, dan hapus instance"],
  ["message.read", "Baca percakapan dan pesan"],
  ["message.send", "Kirim dan retry pesan"],
  ["contact.read", "Lihat kontak dan data sheet"],
  ["contact.manage", "Kelola kontak dan data sheet"],
  ["member.read", "Lihat anggota tenant"],
  ["member.create", "Undang anggota tenant"],
  ["member.update", "Ubah anggota tenant"],
  ["role.read", "Lihat role"],
  ["role.manage", "Kelola role"],
  ["audit.read", "Lihat audit log"],
  ["api-key.read", "Lihat daftar API key"],
  ["api-key.manage", "Buat dan revoke API key"],
] as const;

type TenantApiKey = {
  id: string;
  name: string;
  prefix: string;
  permissions: string[];
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
};

function ApiKeysPanel({
  collapsed,
  token,
}: {
  collapsed: boolean;
  token: string;
}) {
  const [keys, setKeys] = useState<TenantApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("never");
  const [permissions, setPermissions] = useState<string[]>([
    "instance.read",
    "message.read",
    "message.send",
    "contact.read",
  ]);
  const [generatedKey, setGeneratedKey] = useState("");

  async function load() {
    setLoading(true);
    try {
      setKeys(await request<TenantApiKey[]>("/api-keys", {}, token));
    } catch (error) {
      void Swal.fire({
        icon: "error",
        title: "API key gagal dimuat",
        text: error instanceof Error ? error.message : "Permintaan gagal",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  function togglePermission(permission: string) {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  }

  async function createKey(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !permissions.length) {
      await Swal.fire({
        icon: "warning",
        title: "Data belum lengkap",
        text: "Isi nama key dan pilih minimal satu permission.",
      });
      return;
    }
    setSaving(true);
    try {
      const days = Number(expiry);
      const expiresAt = Number.isFinite(days)
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
      const created = await request<TenantApiKey & { plainKey: string }>(
        "/api-keys",
        {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), permissions, expiresAt }),
        },
        token,
      );
      setGeneratedKey(created.plainKey);
      setName("");
      await load();
      await Swal.fire({
        icon: "success",
        title: "API key berhasil dibuat",
        text: "Salin key dari panel yang muncul. Secret tidak dapat ditampilkan ulang.",
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal membuat API key",
        text: error instanceof Error ? error.message : "Permintaan gagal",
      });
    } finally {
      setSaving(false);
    }
  }

  async function copyKey(value: string, label = "API key") {
    await navigator.clipboard.writeText(value);
    await Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `${label} disalin`,
      showConfirmButton: false,
      timer: 1600,
    });
  }

  async function revokeKey(apiKey: TenantApiKey) {
    const answer = await Swal.fire({
      icon: "warning",
      title: "Revoke API key?",
      text: `${apiKey.name} langsung tidak dapat digunakan lagi.`,
      showCancelButton: true,
      confirmButtonText: "Revoke key",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
    });
    if (!answer.isConfirmed) return;
    try {
      await request(`/api-keys/${apiKey.id}`, { method: "DELETE" }, token);
      if (generatedKey.startsWith(apiKey.prefix)) setGeneratedKey("");
      await load();
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "API key telah direvoke",
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal revoke API key",
        text: error instanceof Error ? error.message : "Permintaan gagal",
      });
    }
  }

  const formatDate = (value?: string | null) =>
    value
      ? new Intl.DateTimeFormat("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : "Belum pernah";

  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-[#f7f9fc] px-6 py-7 transition-all`}
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-xl bg-indigo-600 text-white">
            <KeyRound className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-600">Developer access</p>
            <h1 className="text-3xl font-bold text-slate-900">API Keys</h1>
            <p className="text-sm text-slate-500">
              Kredensial tenant untuk server, bot, dan integrasi eksternal.
            </p>
          </div>
        </div>

        {generatedKey && (
          <section className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-emerald-900">Simpan secret ini sekarang</h2>
                <p className="mt-1 text-xs text-emerald-700">
                  Secret hanya ditampilkan satu kali. Jika hilang, buat key baru lalu revoke key lama.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-800">
                    {generatedKey}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyKey(generatedKey)}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    <Copy className="size-4" /> Salin key
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGeneratedKey("")}
                className="cursor-pointer text-xs font-semibold text-emerald-700 hover:text-emerald-900"
              >
                Tutup
              </button>
            </div>
          </section>
        )}

        <div className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
          <form
            onSubmit={createKey}
            className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <Plus className="size-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Buat API key</h2>
                <p className="text-xs text-slate-500">Batasi akses sesuai kebutuhan integrasi.</p>
              </div>
            </div>
            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Nama key
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Backend produksi"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
              />
            </label>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Masa berlaku
              <select
                value={expiry}
                onChange={(event) => setExpiry(event.target.value)}
                className="mt-2 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
              >
                <option value="never">Tidak kedaluwarsa</option>
                <option value="30">30 hari</option>
                <option value="90">90 hari</option>
                <option value="365">1 tahun</option>
              </select>
            </label>
            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Permission</p>
              <button
                type="button"
                onClick={() =>
                  setPermissions(
                    permissions.length === API_KEY_PERMISSIONS.length
                      ? []
                      : API_KEY_PERMISSIONS.map(([permission]) => permission),
                  )
                }
                className="cursor-pointer text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                {permissions.length === API_KEY_PERMISSIONS.length ? "Kosongkan" : "Pilih semua"}
              </button>
            </div>
            <div className="mt-2 max-h-[330px] space-y-1 overflow-y-auto pr-1">
              {API_KEY_PERMISSIONS.map(([permission, description]) => (
                <label
                  key={permission}
                  className="flex cursor-pointer items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={permissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className="mt-0.5 size-4 accent-indigo-600"
                  />
                  <span>
                    <span className="block text-xs font-bold text-slate-800">{permission}</span>
                    <span className="block text-[11px] text-slate-500">{description}</span>
                  </span>
                </label>
              ))}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
            >
              <KeyRound className="size-4" /> {saving ? "Membuat..." : "Generate API key"}
            </button>
          </form>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">Key tenant</h2>
                <p className="mt-1 text-xs text-slate-500">Secret disamarkan dan tidak disimpan dalam bentuk asli.</p>
              </div>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
            {loading && !keys.length ? (
              <div className="p-16 text-center text-sm text-slate-500">Memuat API key...</div>
            ) : !keys.length ? (
              <div className="p-16 text-center">
                <KeyRound className="mx-auto size-9 text-slate-300" />
                <p className="mt-3 font-semibold text-slate-700">Belum ada API key</p>
                <p className="mt-1 text-xs text-slate-500">Buat key pertama untuk mengakses API tanpa login user.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {keys.map((apiKey) => {
                  const expired = Boolean(apiKey.expiresAt && new Date(apiKey.expiresAt) <= new Date());
                  const inactive = Boolean(apiKey.revokedAt) || expired;
                  return (
                    <div key={apiKey.id} className="p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${inactive ? "bg-slate-100 text-slate-400" : "bg-emerald-50 text-emerald-600"}`}>
                          <KeyRound className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-900">{apiKey.name}</h3>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${inactive ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"}`}>
                              {apiKey.revokedAt ? "REVOKED" : expired ? "EXPIRED" : "ACTIVE"}
                            </span>
                          </div>
                          <code className="mt-1 block text-xs text-slate-500">{apiKey.prefix}••••••••••••</code>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {apiKey.permissions.map((permission) => (
                              <span key={permission} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                                {permission}
                              </span>
                            ))}
                          </div>
                          <div className="mt-3 grid gap-2 text-[11px] text-slate-500 sm:grid-cols-3">
                            <span>Dibuat: {formatDate(apiKey.createdAt)}</span>
                            <span>Dipakai: {formatDate(apiKey.lastUsedAt)}</span>
                            <span>Kedaluwarsa: {apiKey.expiresAt ? formatDate(apiKey.expiresAt) : "Tidak pernah"}</span>
                          </div>
                        </div>
                        {!apiKey.revokedAt && (
                          <button
                            type="button"
                            onClick={() => void revokeKey(apiKey)}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="size-4" /> Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <Braces className="mt-0.5 size-5 text-blue-600" />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-blue-900">Cara autentikasi request</h2>
              <p className="mt-1 text-xs text-blue-700">Kirim secret melalui header X-API-Key. Jangan simpan key di frontend atau repository.</p>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100"><code>{`curl ${API}/instances \\\n  -H "X-API-Key: wag_live_xxxxxxxxx"`}</code></pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

type ApiEndpointItem = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  permission?: string;
  module: string;
  href?: string;
};

function SystemMonitorPanel({
  collapsed,
  token,
}: {
  collapsed: boolean;
  token: string;
}) {
  const [health, setHealth] = useState<any | null>(null);
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [healthResponse, instanceData] = await Promise.all([
        fetch(`${API}/health`).then(async (response) => {
          if (!response.ok) throw new Error(`Health HTTP ${response.status}`);
          return response.json();
        }),
        request<any[]>("/instances", {}, token),
      ]);
      const statuses = await Promise.all(
        instanceData.map(async (instance) => {
          try {
            const status = await request<{ status?: string }>(
              `/instances/${instance.id}/status`,
              {},
              token,
            );
            return {
              ...instance,
              liveStatus: String(
                status.status ?? instance.status,
              ).toUpperCase(),
              reachable: true,
            };
          } catch (error) {
            return {
              ...instance,
              liveStatus: "UNREACHABLE",
              reachable: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Provider tidak merespons",
            };
          }
        }),
      );
      setHealth(healthResponse);
      setInstances(statuses);
      setLastChecked(new Date());
    } catch (error) {
      setHealth({
        status: "error",
        error: error instanceof Error ? error.message : "API tidak merespons",
      });
      setInstances([]);
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(timer);
  }, [token]);

  const working = instances.filter((item) =>
    ["WORKING", "CONNECTED"].includes(item.liveStatus),
  ).length;
  const pairing = instances.filter((item) =>
    ["STARTING", "SCAN_QR_CODE"].includes(item.liveStatus),
  ).length;
  const offline = instances.length - working - pairing;
  const statusTone = (status: string) =>
    ["WORKING", "CONNECTED"].includes(status)
      ? "bg-emerald-50 text-emerald-700"
      : ["STARTING", "SCAN_QR_CODE"].includes(status)
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-700";

  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-[#f7f9fc] px-6 py-7 transition-all`}
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-xl bg-emerald-600 text-white">
              <Activity className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-600">
                System operations
              </p>
              <h1 className="text-3xl font-bold text-slate-900">
                System Monitor
              </h1>
              <p className="text-sm text-slate-500">
                Pantau API, Redis, dan koneksi provider secara berkala.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />{" "}
            {loading ? "Memeriksa..." : "Refresh status"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Gateway API</p>
            <p
              className={`mt-2 text-lg font-bold ${health?.status === "ok" ? "text-emerald-600" : "text-rose-600"}`}
            >
              {health?.status === "ok"
                ? "Online"
                : loading
                  ? "Memeriksa"
                  : "Bermasalah"}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">{API}</p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Redis</p>
            <p
              className={`mt-2 text-lg font-bold ${health?.redis === "ok" ? "text-emerald-600" : "text-rose-600"}`}
            >
              {health?.redis === "ok" ? "Terhubung" : "Tidak terhubung"}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">queue dan cache</p>
          </section>
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs text-emerald-700">Terkoneksi</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {working}
            </p>
            <p className="mt-1 text-[11px] text-emerald-600">
              instance siap dipakai
            </p>
          </section>
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs text-amber-700">Menunggu pairing</p>
            <p className="mt-2 text-2xl font-bold text-amber-700">{pairing}</p>
            <p className="mt-1 text-[11px] text-amber-600">
              session belum terhubung
            </p>
          </section>
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs text-rose-700">Tidak aktif</p>
            <p className="mt-2 text-2xl font-bold text-rose-700">{offline}</p>
            <p className="mt-1 text-[11px] text-rose-600">
              stopped atau unreachable
            </p>
          </section>
        </div>

        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">Status provider</h2>
              <p className="mt-1 text-xs text-slate-500">
                Pemeriksaan terakhir{" "}
                {lastChecked ? lastChecked.toLocaleTimeString("id-ID") : "-"}
              </p>
            </div>
            <span className="text-xs text-slate-400">
              Refresh otomatis 15 detik
            </span>
          </div>
          {loading && !instances.length ? (
            <div className="p-16 text-center text-sm text-slate-500">
              Memeriksa semua provider...
            </div>
          ) : !instances.length ? (
            <div className="p-16 text-center text-sm text-slate-500">
              Belum ada instance yang dipantau.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {instances.map((instance) => (
                <div
                  key={instance.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div
                    className={`grid size-10 shrink-0 place-items-center rounded-xl ${statusTone(instance.liveStatus)}`}
                  >
                    <Smartphone className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">
                      {instance.name}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {instance.wahaSession}
                    </p>
                  </div>
                  <div className="sm:w-28">
                    <p className="text-xs text-slate-400">Provider</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {instance.engine ?? "NOWEB"}
                    </p>
                  </div>
                  <div className="sm:w-40">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusTone(instance.liveStatus)}`}
                    >
                      {instance.liveStatus}
                    </span>
                    {instance.error && (
                      <p className="mt-1 text-[10px] text-rose-600">
                        {instance.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {health?.error && (
          <section className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 text-rose-600" />
              <div>
                <p className="font-bold text-rose-800">
                  Gateway API bermasalah
                </p>
                <p className="mt-1 text-sm text-rose-700">{health.error}</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const API_ENDPOINTS: ApiEndpointItem[] = [
  {
    method: "GET",
    path: "/health",
    description: "Status API dan Redis",
    module: "System",
  },
  {
    method: "POST",
    path: "/auth/register",
    description: "Daftar user dan workspace",
    module: "Auth",
  },
  {
    method: "POST",
    path: "/auth/login",
    description: "Login dan mendapatkan token",
    module: "Auth",
  },
  {
    method: "POST",
    path: "/auth/refresh",
    description: "Perbarui access token",
    module: "Auth",
  },
  {
    method: "POST",
    path: "/auth/logout",
    description: "Cabut refresh token",
    module: "Auth",
  },
  {
    method: "GET",
    path: "/instances",
    description: "Daftar instance WhatsApp",
    permission: "instance.read",
    module: "Instances",
    href: "/overview",
  },
  {
    method: "POST",
    path: "/instances",
    description: "Buat instance baru",
    permission: "instance.create",
    module: "Instances",
    href: "/overview",
  },
  {
    method: "POST",
    path: "/instances/:id/start",
    description: "Mulai session",
    permission: "instance.control",
    module: "Instances",
    href: "/overview",
  },
  {
    method: "POST",
    path: "/instances/:id/stop",
    description: "Hentikan session tanpa logout",
    permission: "instance.control",
    module: "Instances",
    href: "/overview",
  },
  {
    method: "DELETE",
    path: "/instances/:id",
    description: "Hapus instance",
    permission: "instance.control",
    module: "Instances",
    href: "/overview",
  },
  {
    method: "GET",
    path: "/instances/:id/status",
    description: "Status koneksi provider",
    permission: "instance.read",
    module: "Instances",
    href: "/overview",
  },
  {
    method: "GET",
    path: "/instances/:id/qr",
    description: "QR pairing session",
    permission: "instance.read",
    module: "Instances",
    href: "/overview",
  },
  {
    method: "POST",
    path: "/instances/:instanceId/messages/text",
    description: "Kirim pesan teks",
    permission: "message.send",
    module: "Messaging",
    href: "/inbox",
  },
  {
    method: "POST",
    path: "/instances/:instanceId/messages/:messageId/retry",
    description: "Kirim ulang pesan gagal",
    permission: "message.send",
    module: "Messaging",
    href: "/inbox",
  },
  {
    method: "GET",
    path: "/conversations",
    description: "Daftar percakapan",
    permission: "message.read",
    module: "Messaging",
    href: "/inbox",
  },
  {
    method: "GET",
    path: "/conversations/:id/messages",
    description: "Riwayat pesan percakapan",
    permission: "message.read",
    module: "Messaging",
    href: "/inbox",
  },
  {
    method: "DELETE",
    path: "/conversations/:id",
    description: "Hapus percakapan lokal",
    permission: "message.read",
    module: "Messaging",
    href: "/inbox",
  },
  {
    method: "GET",
    path: "/ai-providers",
    description: "Daftar provider AI, koneksi, dan model",
    permission: "message.read",
    module: "AI",
    href: "/ai-providers",
  },
  {
    method: "POST",
    path: "/ai-providers",
    description: "Tambah OpenAI atau Anthropic compatible provider",
    permission: "message.send",
    module: "AI",
    href: "/ai-providers",
  },
  {
    method: "POST",
    path: "/ai-providers/:id/credentials",
    description: "Tambah API key provider terenkripsi",
    permission: "message.send",
    module: "AI",
    href: "/ai-providers",
  },
  {
    method: "POST",
    path: "/ai-providers/:id/models/import",
    description: "Impor model dari endpoint provider",
    permission: "message.send",
    module: "AI",
    href: "/ai-providers",
  },
  {
    method: "POST",
    path: "/ai-providers/chat/completions",
    description: "Jalankan chat melalui AI gateway internal",
    permission: "message.send",
    module: "AI",
    href: "/ai-providers",
  },
  {
    method: "GET",
    path: "/contacts",
    description: "Daftar dan pencarian kontak",
    permission: "contact.read",
    module: "Contacts",
    href: "/contacts",
  },
  {
    method: "POST",
    path: "/contacts",
    description: "Tambah kontak",
    permission: "contact.manage",
    module: "Contacts",
    href: "/contacts",
  },
  {
    method: "POST",
    path: "/contacts/bulk",
    description: "Tambah kontak secara bulk",
    permission: "contact.manage",
    module: "Contacts",
    href: "/contacts",
  },
  {
    method: "PATCH",
    path: "/contacts/:id",
    description: "Perbarui kontak",
    permission: "contact.manage",
    module: "Contacts",
    href: "/contacts",
  },
  {
    method: "DELETE",
    path: "/contacts/:id",
    description: "Hapus kontak",
    permission: "contact.manage",
    module: "Contacts",
    href: "/contacts",
  },
  {
    method: "POST",
    path: "/contacts/import/:instanceId",
    description: "Import kontak langsung dari provider",
    permission: "contact.manage",
    module: "Contacts",
    href: "/contacts",
  },
  {
    method: "POST",
    path: "/contacts/import/:instanceId/preview",
    description: "Preview kontak atau anggota grup",
    permission: "contact.manage",
    module: "Contacts",
    href: "/contacts",
  },
  {
    method: "POST",
    path: "/contacts/import/:instanceId/commit",
    description: "Simpan hasil preview kontak",
    permission: "contact.manage",
    module: "Contacts",
    href: "/contacts",
  },
  {
    method: "GET",
    path: "/contact-groups",
    description: "Daftar grouping kontak",
    permission: "contact.read",
    module: "Groups",
    href: "/contacts",
  },
  {
    method: "POST",
    path: "/contact-groups",
    description: "Buat grouping kontak",
    permission: "contact.manage",
    module: "Groups",
    href: "/contacts",
  },
  {
    method: "PUT",
    path: "/contact-groups/:id/members",
    description: "Atur anggota grouping",
    permission: "contact.manage",
    module: "Groups",
    href: "/contacts",
  },
  {
    method: "DELETE",
    path: "/contact-groups/:id",
    description: "Hapus grouping kontak",
    permission: "contact.manage",
    module: "Groups",
    href: "/contacts",
  },
  {
    method: "GET",
    path: "/campaigns",
    description: "Daftar campaign",
    permission: "message.read",
    module: "Campaigns",
    href: "/broadcast",
  },
  {
    method: "GET",
    path: "/campaigns/:id",
    description: "Monitoring detail campaign",
    permission: "message.read",
    module: "Campaigns",
    href: "/broadcast",
  },
  {
    method: "POST",
    path: "/campaigns/preview",
    description: "Hitung calon penerima",
    permission: "message.read",
    module: "Campaigns",
    href: "/broadcast",
  },
  {
    method: "POST",
    path: "/campaigns",
    description: "Buat campaign",
    permission: "message.send",
    module: "Campaigns",
    href: "/broadcast",
  },
  {
    method: "POST",
    path: "/campaigns/:id/queue",
    description: "Masukkan campaign ke antrean",
    permission: "message.send",
    module: "Campaigns",
    href: "/broadcast",
  },
  {
    method: "POST",
    path: "/campaigns/:id/retry",
    description: "Retry penerima gagal",
    permission: "message.send",
    module: "Campaigns",
    href: "/broadcast",
  },
  {
    method: "POST",
    path: "/campaigns/:id/cancel",
    description: "Batalkan campaign",
    permission: "message.send",
    module: "Campaigns",
    href: "/broadcast",
  },
  {
    method: "GET",
    path: "/data-sheets",
    description: "Daftar data sheet",
    permission: "contact.read",
    module: "Data Sheets",
    href: "/data-sheets",
  },
  {
    method: "POST",
    path: "/data-sheets",
    description: "Simpan data sheet",
    permission: "contact.manage",
    module: "Data Sheets",
    href: "/data-sheets",
  },
  {
    method: "POST",
    path: "/data-sheets/external/preview",
    description: "Preview JSON API eksternal",
    permission: "contact.manage",
    module: "Data Sheets",
    href: "/data-sheets",
  },
  {
    method: "GET",
    path: "/data-sheets/:id",
    description: "Detail data sheet",
    permission: "contact.read",
    module: "Data Sheets",
    href: "/data-sheets",
  },
  {
    method: "DELETE",
    path: "/data-sheets/:id",
    description: "Hapus data sheet",
    permission: "contact.manage",
    module: "Data Sheets",
    href: "/data-sheets",
  },
  {
    method: "GET",
    path: "/webhooks",
    description: "Daftar endpoint webhook",
    permission: "instance.read",
    module: "Webhooks",
    href: "/webhooks",
  },
  {
    method: "POST",
    path: "/webhooks",
    description: "Buat endpoint webhook",
    permission: "instance.control",
    module: "Webhooks",
    href: "/webhooks",
  },
  {
    method: "DELETE",
    path: "/webhooks/:id",
    description: "Hapus endpoint webhook",
    permission: "instance.control",
    module: "Webhooks",
    href: "/webhooks",
  },
  {
    method: "POST",
    path: "/webhooks/instances/:instanceId/assign",
    description: "Pasang webhook ke instance",
    permission: "instance.control",
    module: "Webhooks",
    href: "/webhooks",
  },
  {
    method: "POST",
    path: "/webhooks/waha",
    description: "Penerima event dari provider",
    module: "Webhooks",
    href: "/webhooks",
  },
  {
    method: "GET",
    path: "/members",
    description: "Daftar anggota tenant",
    permission: "member.read",
    module: "Access",
    href: "/team",
  },
  {
    method: "POST",
    path: "/members",
    description: "Tambah anggota tenant",
    permission: "member.create",
    module: "Access",
    href: "/team",
  },
  {
    method: "PATCH",
    path: "/members/:id/status",
    description: "Aktifkan atau suspend anggota",
    permission: "member.update",
    module: "Access",
    href: "/team",
  },
  {
    method: "GET",
    path: "/roles",
    description: "Daftar role dan permission",
    permission: "role.read",
    module: "Access",
    href: "/team",
  },
  {
    method: "POST",
    path: "/roles",
    description: "Buat role",
    permission: "role.manage",
    module: "Access",
    href: "/team",
  },
  {
    method: "GET",
    path: "/audit-logs",
    description: "Audit aktivitas tenant",
    permission: "audit.read",
    module: "Audit",
    href: "/usage",
  },
  {
    method: "GET",
    path: "/api-keys",
    description: "Daftar API key tenant",
    permission: "api-key.read",
    module: "Access",
    href: "/api-keys",
  },
  {
    method: "POST",
    path: "/api-keys",
    description: "Generate API key baru",
    permission: "api-key.manage",
    module: "Access",
    href: "/api-keys",
  },
  {
    method: "DELETE",
    path: "/api-keys/:id",
    description: "Revoke API key",
    permission: "api-key.manage",
    module: "Access",
    href: "/api-keys",
  },
];

function ApiConsolePanel({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("ALL");
  const [health, setHealth] = useState<"checking" | "online" | "offline">(
    "checking",
  );

  async function checkHealth() {
    setHealth("checking");
    try {
      const response = await fetch(`${API}/health`);
      setHealth(response.ok ? "online" : "offline");
    } catch {
      setHealth("offline");
    }
  }

  useEffect(() => {
    void checkHealth();
  }, []);

  const visible = API_ENDPOINTS.filter((endpoint) => {
    const text =
      `${endpoint.method} ${endpoint.path} ${endpoint.description} ${endpoint.module} ${endpoint.permission ?? ""}`.toLowerCase();
    return (
      (method === "ALL" || endpoint.method === method) &&
      text.includes(query.toLowerCase())
    );
  });
  const groups = Array.from(
    new Set(visible.map((endpoint) => endpoint.module)),
  );
  const methodClass: Record<string, string> = {
    GET: "bg-blue-50 text-blue-700",
    POST: "bg-emerald-50 text-emerald-700",
    PUT: "bg-amber-50 text-amber-700",
    PATCH: "bg-violet-50 text-violet-700",
    DELETE: "bg-rose-50 text-rose-700",
  };

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    await Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Endpoint disalin",
      showConfirmButton: false,
      timer: 1400,
    });
  }

  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-[#f7f9fc] px-6 py-7 transition-all`}
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-xl bg-slate-900 text-white">
              <Braces className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-600">
                Developer tools
              </p>
              <h1 className="text-3xl font-bold text-slate-900">API Console</h1>
              <p className="text-sm text-slate-500">
                Katalog endpoint gateway dan akses cepat ke modul operasional.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void checkHealth()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw
              className={`size-4 ${health === "checking" ? "animate-spin" : ""}`}
            />{" "}
            Cek server
          </button>
        </div>

        <section className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Base URL</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                {API}
              </code>
              <button
                type="button"
                onClick={() => void copy(API)}
                className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
              >
                Salin
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Endpoint terdeteksi</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {API_ENDPOINTS.length}
            </p>
            <p className="text-[11px] text-slate-400">
              dari controller backend
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Status API</p>
            <p
              className={`mt-1 text-lg font-bold ${health === "online" ? "text-emerald-600" : health === "offline" ? "text-rose-600" : "text-amber-600"}`}
            >
              {health === "online"
                ? "Online"
                : health === "offline"
                  ? "Tidak terhubung"
                  : "Memeriksa"}
            </p>
            <p className="text-[11px] text-slate-400">
              health dan koneksi Redis
            </p>
          </div>
        </section>

        <section className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 size-5 shrink-0 text-indigo-600" />
              <div>
                <h2 className="font-bold text-indigo-950">Autentikasi integrasi</h2>
                <p className="mt-1 text-sm text-indigo-800">
                  Gunakan tenant API key pada header <code className="rounded bg-white px-1.5 py-0.5 text-xs font-bold">X-API-Key</code>. JWT login hanya untuk sesi dashboard pengguna.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push("/api-keys")}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
            >
              <KeyRound className="size-4" /> Kelola API key
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari path, modul, permission..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700"
            >
              <option value="ALL">Semua method</option>
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-6 p-4">
            {groups.map((group) => (
              <section key={group}>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-bold text-slate-900">{group}</h2>
                  <span className="text-xs text-slate-400">
                    {visible.filter((item) => item.module === group).length}{" "}
                    endpoint
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  {visible
                    .filter((item) => item.module === group)
                    .map((endpoint) => (
                      <div
                        key={`${endpoint.method}-${endpoint.path}`}
                        className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 lg:flex-row lg:items-center"
                      >
                        <span
                          className={`w-16 shrink-0 rounded-md px-2 py-1 text-center text-[11px] font-black ${methodClass[endpoint.method]}`}
                        >
                          {endpoint.method}
                        </span>
                        <code className="min-w-0 flex-1 break-all text-xs font-semibold text-slate-800">
                          {endpoint.path}
                        </code>
                        <p className="text-xs text-slate-500 lg:w-64">
                          {endpoint.description}
                        </p>
                        <span className="text-[11px] text-slate-400 lg:w-32">
                          {endpoint.permission ?? "Public"}
                        </span>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => void copy(`${API}${endpoint.path}`)}
                            className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Salin
                          </button>
                          {endpoint.href && (
                            <button
                              type="button"
                              onClick={() => router.push(endpoint.href!)}
                              className="cursor-pointer rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                            >
                              Buka UI
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            ))}
            {!visible.length && (
              <div className="py-16 text-center text-sm text-slate-500">
                Endpoint tidak ditemukan.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ReportsPanel({
  collapsed,
  token,
}: {
  collapsed: boolean;
  token: string;
}) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    try {
      setCampaigns(await request<any[]>("/campaigns", {}, token));
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [token]);

  const visible = campaigns.filter((campaign) =>
    `${campaign.name} ${campaign.instance?.name ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const total = campaigns.reduce(
    (sum, item) => sum + Number(item.stats?.total ?? 0),
    0,
  );
  const sent = campaigns.reduce(
    (sum, item) => sum + Number(item.stats?.sent ?? 0),
    0,
  );
  const failed = campaigns.reduce(
    (sum, item) => sum + Number(item.stats?.failed ?? 0),
    0,
  );
  const read = campaigns.reduce(
    (sum, item) => sum + Number(item.stats?.read ?? 0),
    0,
  );
  const percent = (value: number) =>
    total ? `${Math.round((value / total) * 1000) / 10}%` : "0%";

  function exportReport() {
    const csv = [
      "campaign,instance,total,sent,read,failed,status",
      ...visible.map((item) =>
        [
          item.name,
          item.instance?.name ?? "",
          item.stats?.total ?? 0,
          item.stats?.sent ?? 0,
          item.stats?.read ?? 0,
          item.stats?.failed ?? 0,
          item.status ?? "",
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = "laporan-campaign.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-[#f7f9fc] px-6 py-7 transition-all`}
    >
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-xl bg-blue-600 text-white">
              <BarChart3 className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Workspace module
              </p>
              <h1 className="text-3xl font-bold text-slate-900">Laporan</h1>
              <p className="text-sm text-slate-500">
                Ringkasan performa campaign broadcast Anda.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="size-4" /> Refresh
            </button>
            <button
              type="button"
              onClick={exportReport}
              disabled={!visible.length}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="size-4" /> Export
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-slate-500">Total penerima</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{total}</p>
            <p className="mt-1 text-xs text-slate-400">semua campaign</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs text-emerald-700">Terkirim</p>
            <p className="mt-1 text-3xl font-bold text-emerald-700">{sent}</p>
            <p className="mt-1 text-xs text-emerald-600">
              {percent(sent)} dari total
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-xs text-blue-700">Dibaca</p>
            <p className="mt-1 text-3xl font-bold text-blue-700">{read}</p>
            <p className="mt-1 text-xs text-blue-600">
              {percent(read)} dari total
            </p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <p className="text-xs text-rose-700">Gagal</p>
            <p className="mt-1 text-3xl font-bold text-rose-700">{failed}</p>
            <p className="mt-1 text-xs text-rose-600">
              {percent(failed)} dari total
            </p>
          </div>
        </div>
        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Performa campaign</h2>
              <p className="mt-1 text-xs text-slate-500">
                {campaigns.length} campaign tersedia
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari campaign..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
          {loading ? (
            <div className="p-16 text-center text-sm text-slate-500">
              Memuat laporan...
            </div>
          ) : !visible.length ? (
            <div className="p-16 text-center text-sm text-slate-500">
              Belum ada data campaign.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Instance</th>
                    <th className="px-4 py-3 text-center">Penerima</th>
                    <th className="px-4 py-3 text-center">Terkirim</th>
                    <th className="px-4 py-3 text-center">Dibaca</th>
                    <th className="px-4 py-3 text-center">Gagal</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.instance?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">
                        {item.stats?.total ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-emerald-600">
                        {item.stats?.sent ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-blue-600">
                        {item.stats?.read ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-rose-600">
                        {item.stats?.failed ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                          {item.status ?? "DRAFT"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function GenericModulePanel({
  module,
  collapsed,
  token,
}: {
  module: string;
  collapsed: boolean;
  token: string;
}) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const path =
      module === "inbox"
        ? "/conversations"
        : module === "team"
          ? "/members"
          : module === "usage"
            ? "/audit-logs"
            : "";
    if (!path) {
      setData([]);
      setLoading(false);
      return;
    }
    request<any[]>(path, {}, token)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [module, token]);
  const meta: Record<string, [string, string]> = {
    inbox: ["Inbox", "Kelola percakapan WhatsApp dari semua instance."],
    contacts: ["Contacts", "Simpan dan kelola kontak pelanggan."],
    automations: [
      "Automations",
      "Bangun alur otomatis untuk pesan masuk dan keluar.",
    ],
    team: ["Team & roles", "Atur anggota workspace dan permission."],
    usage: ["Usage & logs", "Pantau aktivitas gateway dan audit log."],
    settings: ["Settings", "Konfigurasi workspace dan akses gateway."],
  };
  const [title, description] = meta[module] ?? meta.inbox;
  return (
    <div
      className={`${collapsed ? "md:ml-20" : "md:ml-64"} mx-auto max-w-5xl px-6 py-12 transition-all`}
    >
      <div className="mb-8">
        <p className="text-sm font-semibold text-indigo-600">
          Workspace module
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-slate-500">{description}</p>
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-500">
            {loading ? "Memuat data..." : `${data.length} record ditemukan`}
          </p>
        </div>
        {!loading && data.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Belum ada data untuk modul ini.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {item.user?.name ??
                      item.action ??
                      item.chatId ??
                      item.email ??
                      "Record"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.user?.email ??
                      item.resource ??
                      item.body ??
                      item.instance?.name ??
                      item.status ??
                      ""}
                  </p>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {item.status ?? item.action ?? "Active"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-300">
      {label}
      {children}
    </label>
  );
}
function Pill({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5">
      {text}
    </span>
  );
}
function statusColor(status: string) {
  const value = status.toUpperCase();
  if (value === "WORKING" || value === "CONNECTED")
    return "bg-emerald-400 shadow-lg shadow-emerald-400/50";
  if (
    value === "STARTING" ||
    value === "SCAN_QR_CODE" ||
    value === "AUTHENTICATING"
  )
    return "bg-amber-400 shadow-lg shadow-amber-400/40";
  return "bg-rose-500 shadow-lg shadow-rose-500/40";
}
function statusLabel(status: string) {
  const value = status.toUpperCase();
  if (value === "WORKING" || value === "CONNECTED") return "TERKONEKSI";
  if (
    value === "STARTING" ||
    value === "SCAN_QR_CODE" ||
    value === "AUTHENTICATING"
  )
    return "MENUNGGU PAIRING";
  return "TIDAK TERKONEKSI";
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
