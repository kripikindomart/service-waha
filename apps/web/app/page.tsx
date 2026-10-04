"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Swal from "sweetalert2";

// Keep the gateway module bundle invalidated after local dev server restarts.

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
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [qrInstanceId, setQrInstanceId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeModule, setActiveModule] = useState("overview");
  const pathname = usePathname();
  const router = useRouter();
  useEffect(
    () => setActiveModule(pathname.split("/")[1] || "overview"),
    [pathname],
  );
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
              : label?.includes("automations")
                ? "automations"
                : label?.includes("webhook")
                  ? "webhooks"
                  : label?.includes("team")
                    ? "team"
                    : label?.includes("usage")
                      ? "usage"
                      : label?.includes("settings")
                        ? "settings"
                        : "overview";
          setActiveModule(module);
          router.push(module === "overview" ? "/overview" : `/${module}`);
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
            <span className="flex items-center gap-3 rounded-xl bg-indigo-50 px-3 py-2.5 font-semibold text-indigo-700">
              ▦ <span>Overview</span>
            </span>
            <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 hover:bg-slate-50">
              ☷ <span>Inbox</span>
            </span>
            <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 hover:bg-slate-50">
              ◉ <span>Contacts</span>
            </span>
            <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 hover:bg-slate-50">
              ⌁ <span>Automations</span>
            </span>
          </div>
          <div className="space-y-1">
            <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 hover:bg-slate-50">
              <span className="text-indigo-500">Webhook</span>
              <span>Webhooks</span>
            </span>
          </div>
          <p className="px-3 pb-2 pt-8 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Manage
          </p>
          <div className="space-y-1">
            <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 hover:bg-slate-50">
              ▣ <span>Team & roles</span>
            </span>
            <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 hover:bg-slate-50">
              ◌ <span>Usage & logs</span>
            </span>
            <span className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 hover:bg-slate-50">
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
      {activeModule !== "overview" && (
        <ModulePanel
          module={activeModule}
          collapsed={sidebarCollapsed}
          token={token}
        />
      )}
      <div
        className={`${activeModule !== "overview" ? "hidden" : ""} ${sidebarCollapsed ? "md:ml-20 max-w-none" : "md:ml-64 max-w-7xl"} mx-0 px-6 py-10 transition-all`}
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
                      className={
                        instance.status === "WORKING"
                          ? "rounded-lg bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700"
                          : "rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-500"
                      }
                    >
                      {instance.status === "WORKING" ? "Connected" : "Start"}
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
  async function openConversation(conversation: any) {
    setSelected(conversation);
    setChatId(conversation.chatId);
    setInstanceId(conversation.instanceId);
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
            <p className="font-semibold text-slate-900">Conversations</p>
            <p className="mt-1 text-xs text-slate-500">
              {conversations.length} conversation
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => openConversation(conversation)}
                className={`block w-full px-5 py-4 text-left hover:bg-indigo-50 ${selected?.id === conversation.id ? "bg-indigo-50" : ""}`}
              >
                <p className="font-semibold text-slate-900">
                  {conversation.title || conversation.chatId}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {conversation.messages?.[0]?.body || "Belum ada pesan"}
                </p>
                <p className="mt-2 text-[11px] text-indigo-600">
                  {conversation.instance?.name}
                </p>
              </button>
            ))}
            {conversations.length === 0 && (
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
              onChange={(event) => setInstanceId(event.target.value)}
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
  }, [token, query]);
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
  return (
    <GenericModulePanel module={module} collapsed={collapsed} token={token} />
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
