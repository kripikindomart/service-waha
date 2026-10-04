"use client";

import { FormEvent, useEffect, useState } from "react";
import Swal from "sweetalert2";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8081";
type Instance = {
  id: string;
  name: string;
  wahaSession: string;
  status: string;
  createdAt: string;
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
  if (!response.ok)
    throw new Error(
      data.message ?? data.error ?? `Request failed (${response.status})`,
    );
  return data;
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setToken(localStorage.getItem("service_waha_access_token"));
    setHydrated(true);
  }, []);
  if (!hydrated)
    return (
      <main className="grid min-h-screen place-items-center bg-[#080d1b] text-cyan-300">
        <div className="text-sm font-bold tracking-[.24em]">WHATSAPP GATEWAY</div>
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
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [qrInstanceId, setQrInstanceId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => setDarkMode(localStorage.getItem("gateway_dark_mode") === "true"), []);
  async function load() {
    setLoading(true);
    try {
      setInstances(await request<Instance[]>("/instances", {}, token));
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
          return instance;
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
  async function create(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setNotice("Menghubungkan instance ke WAHA...");
    try {
      await request(
        "/instances",
        { method: "POST", body: JSON.stringify({ name: name.trim() }) },
        token,
      );
      setName("");
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
          title: "Session gagal dimulai",
          text: "Cek koneksi WAHA atau log server.",
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
    } catch (e) {
      await Swal.fire({
        icon: "error",
        title: "QR belum tersedia",
        text: e instanceof Error ? e.message : "Start session dulu.",
      });
    }
  }
  return (
    <main className={`${darkMode ? "gateway-dark" : ""} min-h-screen bg-[#f6f8fc] text-slate-900`}>
      <header className="border-b border-slate-200 bg-white">
        <div className={`${sidebarCollapsed ? "md:ml-20" : "md:ml-64"} flex items-center justify-between px-6 py-5 transition-all`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? "Buka sidebar" : "Ciutkan sidebar"} aria-label={sidebarCollapsed ? "Buka sidebar" : "Ciutkan sidebar"} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><span className="sidebar-toggle-icon" /></button>
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
            <button onClick={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem("gateway_dark_mode", String(next)); }} title={darkMode ? "Light mode" : "Dark mode"} aria-label={darkMode ? "Light mode" : "Dark mode"} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"><span className={darkMode ? "theme-icon theme-icon-sun" : "theme-icon theme-icon-moon"} /></button>
            <button onClick={onLogout} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50">Keluar</button>
          </div>
        </div>
      </header>
      <nav data-collapsed={sidebarCollapsed} className={`${sidebarCollapsed ? "w-20" : "w-64"} fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white transition-all md:block`}>
        <div className="flex h-full flex-col px-4 py-6 text-sm">
          <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} gap-3 px-3 pb-8`}>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 font-black text-white">W</div>
            {!sidebarCollapsed && <div><p className="font-bold tracking-tight text-slate-900">WhatsApp Gateway</p><p className="text-xs text-slate-400">Workspace admin</p></div>}
          </div>
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Workspace</p>
          <div className="space-y-1">
            <span className="flex items-center gap-3 rounded-xl bg-indigo-50 px-3 py-2.5 font-semibold text-indigo-700">▦ <span>Overview</span></span>
            <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 hover:bg-slate-50">☷ <span>Inbox</span></span>
            <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 hover:bg-slate-50">◉ <span>Contacts</span></span>
            <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 hover:bg-slate-50">⌁ <span>Automations</span></span>
          </div>
          <p className="px-3 pb-2 pt-8 text-[11px] font-bold uppercase tracking-wider text-slate-400">Manage</p>
          <div className="space-y-1">
            <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 hover:bg-slate-50">▣ <span>Team & roles</span></span>
            <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 hover:bg-slate-50">◌ <span>Usage & logs</span></span>
            <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 hover:bg-slate-50">⚙ <span>Settings</span></span>
          </div>
          <div className="mt-auto rounded-2xl bg-slate-50 p-4 text-xs text-slate-500"><p className="font-semibold text-slate-700">Gateway status</p><p className="mt-2 flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-500" />All systems operational</p></div>
        </div>
      </nav>
      <div className={`${sidebarCollapsed ? "md:ml-20 max-w-none" : "md:ml-64 max-w-7xl"} mx-0 px-6 py-10 transition-all`}>
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
          <form onSubmit={create} className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-60 rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none ring-indigo-400 placeholder:text-slate-400 focus:ring-2"
              placeholder="Nama instance"
            />
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Menghubungkan..." : "Tambah"}
            </button>
          </form>
        </div>
        {notice && (
          <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            {notice}
          </div>
        )}
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
                        {statusLabel(instance.status)} · {instance.wahaSession}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={instance.status === "WORKING"}
                      onClick={() => action(instance, "start")}
                      className={instance.status === "WORKING" ? "rounded-lg bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700" : "rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-500"}
                    >
                      {instance.status === "WORKING" ? "Connected" : "Start"}
                    </button>
                    <button
                      onClick={() => showQr(instance)}
                      className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                    >
                      QR
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
      {qr && (
        <div className="fixed inset-0 grid place-items-center bg-black/70 p-6 backdrop-blur-sm">
          <div className="rounded-2xl bg-white p-5 text-center text-slate-900 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold">Scan QR WhatsApp</h2>
            <img src={qr} alt="WhatsApp QR" className="h-80 w-80" />
            <button
              onClick={() => {
                URL.revokeObjectURL(qr);
                setQrInstanceId(null);
                setQr(null);
              }}
              className="mt-4 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </main>
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
