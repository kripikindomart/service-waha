"use client";

import { FormEvent, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  BadgeCheck,
  Bot,
  Cable,
  Cpu,
  Download,
  FlaskConical,
  KeyRound,
  LockKeyhole,
  Plus,
  Power,
  Server,
  Trash2,
  X,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8081";

async function api<T>(path: string, options: RequestInit, token: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event("service-waha-auth-expired"));
    throw new Error(`Request failed (${response.status}): ${data.message ?? data.error ?? "Permintaan gagal"}`);
  }
  return data;
}

export type AiProviderCredential = {
  id: string;
  label: string;
  keyHint: string;
  enabled: boolean;
  lastStatus: string;
  lastError?: string | null;
  lastLatencyMs?: number | null;
  lastCheckedAt?: string | null;
};

export type AiProviderModel = {
  id: string;
  modelId: string;
  label?: string | null;
  enabled: boolean;
};

export type AiProvider = {
  id: string;
  name: string;
  prefix: string;
  protocol: "OPENAI" | "ANTHROPIC";
  baseUrl: string;
  defaultModel?: string | null;
  enabled: boolean;
  roundRobin: boolean;
  credentials: AiProviderCredential[];
  models: AiProviderModel[];
  _count?: { automationRules: number };
};

const emptyForm = {
  name: "",
  prefix: "",
  protocol: "OPENAI" as "OPENAI" | "ANTHROPIC",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  modelId: "",
};

export function AiProvidersPanel({ collapsed, token }: { collapsed: boolean; token: string }) {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [credentialForm, setCredentialForm] = useState({ label: "", apiKey: "" });
  const [newModel, setNewModel] = useState("");
  const [form, setForm] = useState(emptyForm);
  const selected = providers.find((provider) => provider.id === selectedId) ?? providers[0];

  async function load(preferredId?: string) {
    setLoading(true);
    try {
      const data = await api<AiProvider[]>("/ai-providers", {}, token);
      setProviders(data);
      const next = preferredId && data.some((item) => item.id === preferredId)
        ? preferredId
        : selectedId && data.some((item) => item.id === selectedId)
          ? selectedId
          : data[0]?.id ?? "";
      setSelectedId(next);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Provider AI gagal dimuat",
        text: error instanceof Error ? error.message : "Permintaan gagal",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  function openCreate(protocol: "OPENAI" | "ANTHROPIC") {
    setForm({
      ...emptyForm,
      protocol,
      baseUrl: protocol === "OPENAI" ? "https://api.openai.com/v1" : "https://api.anthropic.com/v1",
    });
    setShowCreate(true);
  }

  async function checkDraft() {
    if (!form.apiKey.trim() || !form.baseUrl.trim()) return;
    setChecking(true);
    try {
      const result = await api<{ latencyMs: number; modelCount?: number }>(
        "/ai-providers/check/draft",
        {
          method: "POST",
          body: JSON.stringify({
            protocol: form.protocol,
            baseUrl: form.baseUrl,
            apiKey: form.apiKey,
            modelId: form.modelId || undefined,
          }),
        },
        token,
      );
      await Swal.fire({
        icon: "success",
        title: "Koneksi berhasil",
        text: `Provider merespons dalam ${result.latencyMs} ms${result.modelCount === undefined ? "" : ` dan menyediakan ${result.modelCount} model`}.`,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Koneksi gagal",
        text: error instanceof Error ? error.message : "Provider tidak merespons",
      });
    } finally {
      setChecking(false);
    }
  }

  async function createProvider(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await api<AiProvider>(
        "/ai-providers",
        { method: "POST", body: JSON.stringify(form) },
        token,
      );
      setShowCreate(false);
      setForm(emptyForm);
      await load(created.id);
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Provider AI ditambahkan",
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Provider gagal ditambahkan",
        text: error instanceof Error ? error.message : "Permintaan gagal",
      });
    } finally {
      setSaving(false);
    }
  }

  async function patchProvider(data: Record<string, unknown>) {
    if (!selected) return;
    try {
      await api(`/ai-providers/${selected.id}`, { method: "PATCH", body: JSON.stringify(data) }, token);
      await load(selected.id);
    } catch (error) {
      await Swal.fire({ icon: "error", title: "Perubahan gagal disimpan", text: error instanceof Error ? error.message : "Permintaan gagal" });
    }
  }

  async function deleteProvider() {
    if (!selected) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus provider?",
      text: "Seluruh API key dan model provider akan ikut dihapus.",
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
    });
    if (!result.isConfirmed) return;
    try {
      await api(`/ai-providers/${selected.id}`, { method: "DELETE" }, token);
      await load();
    } catch (error) {
      await Swal.fire({ icon: "error", title: "Provider gagal dihapus", text: error instanceof Error ? error.message : "Permintaan gagal" });
    }
  }

  async function addCredential(event: FormEvent) {
    event.preventDefault();
    if (!selected || !credentialForm.apiKey.trim()) return;
    try {
      await api(
        `/ai-providers/${selected.id}/credentials`,
        { method: "POST", body: JSON.stringify(credentialForm) },
        token,
      );
      setCredentialForm({ label: "", apiKey: "" });
      await load(selected.id);
    } catch (error) {
      await Swal.fire({ icon: "error", title: "API key gagal ditambahkan", text: error instanceof Error ? error.message : "Permintaan gagal" });
    }
  }

  async function testCredential(credential: AiProviderCredential) {
    if (!selected) return;
    setChecking(true);
    try {
      const result = await api<{ latencyMs: number }>(
        `/ai-providers/${selected.id}/credentials/${credential.id}/test`,
        {
          method: "POST",
          body: JSON.stringify({ modelId: selected.defaultModel || selected.models[0]?.modelId || undefined }),
        },
        token,
      );
      await load(selected.id);
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `Koneksi aktif, ${result.latencyMs} ms`,
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (error) {
      await load(selected.id);
      await Swal.fire({ icon: "error", title: "Uji koneksi gagal", text: error instanceof Error ? error.message : "Provider tidak merespons" });
    } finally {
      setChecking(false);
    }
  }

  async function toggleCredential(credential: AiProviderCredential) {
    if (!selected) return;
    await api(
      `/ai-providers/${selected.id}/credentials/${credential.id}`,
      { method: "PATCH", body: JSON.stringify({ enabled: !credential.enabled }) },
      token,
    );
    await load(selected.id);
  }

  async function removeCredential(credential: AiProviderCredential) {
    if (!selected) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus API key?",
      text: credential.label,
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
    });
    if (!result.isConfirmed) return;
    await api(`/ai-providers/${selected.id}/credentials/${credential.id}`, { method: "DELETE" }, token);
    await load(selected.id);
  }

  async function addModel(event: FormEvent) {
    event.preventDefault();
    if (!selected || !newModel.trim()) return;
    await api(
      `/ai-providers/${selected.id}/models`,
      { method: "POST", body: JSON.stringify({ modelId: newModel.trim() }) },
      token,
    );
    setNewModel("");
    await load(selected.id);
  }

  async function importModels() {
    if (!selected) return;
    setChecking(true);
    try {
      await api(`/ai-providers/${selected.id}/models/import`, { method: "POST", body: "{}" }, token);
      await load(selected.id);
      await Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Daftar model diperbarui", showConfirmButton: false, timer: 1800 });
    } catch (error) {
      await Swal.fire({ icon: "error", title: "Model gagal diimpor", text: error instanceof Error ? error.message : "Permintaan gagal" });
    } finally {
      setChecking(false);
    }
  }

  async function removeModel(model: AiProviderModel) {
    if (!selected) return;
    await api(`/ai-providers/${selected.id}/models/${model.id}`, { method: "DELETE" }, token);
    await load(selected.id);
  }

  return (
    <div className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-[#f7f9fc] px-6 py-7 transition-all`}>
      <div className="mx-auto max-w-[1320px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-xl bg-indigo-600 text-white"><Server className="size-6" /></div>
            <div>
              <p className="text-sm font-semibold text-indigo-600">AI gateway</p>
              <h1 className="text-3xl font-bold text-slate-900">AI Providers</h1>
              <p className="text-sm text-slate-500">Kelola koneksi OpenAI-compatible dan Anthropic-compatible.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openCreate("ANTHROPIC")} className="flex cursor-pointer items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50"><Plus className="size-4" />Anthropic compatible</button>
            <button type="button" onClick={() => openCreate("OPENAI")} className="flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"><Plus className="size-4" />OpenAI compatible</button>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div><h2 className="font-bold text-slate-900">Custom providers</h2><p className="text-xs text-slate-500">Satu provider dapat memiliki beberapa API key dan model.</p></div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{providers.length} provider</span>
          </div>
          {loading && !providers.length ? (
            <div className="py-12 text-center text-sm text-slate-500">Memuat provider...</div>
          ) : !providers.length ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center"><Bot className="mx-auto size-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">Belum ada AI provider</p><p className="mt-1 text-sm text-slate-500">Tambahkan koneksi pertama untuk dipakai automation.</p></div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {providers.map((provider) => {
                const connected = provider.credentials.filter((item) => item.enabled && item.lastStatus === "CONNECTED").length;
                return (
                  <button type="button" key={provider.id} onClick={() => setSelectedId(provider.id)} className={`cursor-pointer rounded-xl border p-4 text-left transition ${selected?.id === provider.id ? "border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-100" : "border-slate-200 hover:border-indigo-300"}`}>
                    <div className="flex items-start gap-3"><div className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white"><Bot className="size-5" /></div><div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-900">{provider.name}</p><p className="truncate text-xs text-slate-500">{provider.prefix} · {provider.protocol}</p><div className="mt-2 flex flex-wrap gap-2"><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{connected} connected</span><span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700">{provider.models.length} model</span></div></div></div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selected && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
            <main className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><div className="flex items-center gap-2"><Cable className="size-5 text-indigo-600" /><h2 className="text-xl font-bold text-slate-900">{selected.name}</h2></div><p className="mt-1 text-sm text-slate-500">{selected.baseUrl}</p></div>
                  <div className="flex gap-2"><button type="button" onClick={() => void patchProvider({ enabled: !selected.enabled })} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"><Power className="size-4" />{selected.enabled ? "Nonaktifkan" : "Aktifkan"}</button><button type="button" onClick={() => void deleteProvider()} className="flex cursor-pointer items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600"><Trash2 className="size-4" />Hapus</button></div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">Default model<select value={selected.defaultModel ?? ""} onChange={(event) => void patchProvider({ defaultModel: event.target.value })} className="mt-2 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value="">Pilih model</option>{selected.models.map((model) => <option key={model.id} value={model.modelId}>{model.modelId}</option>)}</select></label>
                  <label className="text-sm font-semibold text-slate-700">Distribusi API key<select value={selected.roundRobin ? "round-robin" : "primary"} onChange={(event) => void patchProvider({ roundRobin: event.target.value === "round-robin" })} className="mt-2 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value="round-robin">Round robin</option><option value="primary">Selalu key utama</option></select></label>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><div><h3 className="flex items-center gap-2 font-bold text-slate-900"><KeyRound className="size-5 text-indigo-600" />Connections</h3><p className="mt-1 text-xs text-slate-500">Kunci dienkripsi dan tidak dikirim kembali ke browser.</p></div><span className="text-xs font-semibold text-slate-500">{selected.credentials.length} API key</span></div>
                <form onSubmit={addCredential} className="mt-4 grid gap-2 md:grid-cols-[180px_minmax(0,1fr)_auto]"><input value={credentialForm.label} onChange={(event) => setCredentialForm({ ...credentialForm, label: event.target.value })} placeholder="Label key" className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /><input type="password" value={credentialForm.apiKey} onChange={(event) => setCredentialForm({ ...credentialForm, apiKey: event.target.value })} placeholder="API key baru" className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /><button disabled={!credentialForm.apiKey.trim()} className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Plus className="size-4" />Tambah key</button></form>
                <div className="mt-4 divide-y divide-slate-100">
                  {selected.credentials.map((credential, index) => (
                    <div key={credential.id} className="flex flex-wrap items-center gap-3 py-3"><div className={`grid size-9 place-items-center rounded-lg ${credential.lastStatus === "CONNECTED" ? "bg-emerald-50 text-emerald-600" : credential.lastStatus === "FAILED" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"}`}><LockKeyhole className="size-4" /></div><div className="min-w-0 flex-1"><p className="font-semibold text-slate-800">{credential.label || `API Key #${index + 1}`}</p><p className="text-xs text-slate-500">{credential.keyHint} · {credential.lastStatus.toLowerCase()}{credential.lastLatencyMs ? ` · ${credential.lastLatencyMs} ms` : ""}</p>{credential.lastError && <p className="mt-1 truncate text-xs text-rose-600" title={credential.lastError}>{credential.lastError}</p>}</div><button type="button" onClick={() => void testCredential(credential)} disabled={checking} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><FlaskConical className="size-3.5" />Test</button><button type="button" onClick={() => void toggleCredential(credential)} className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold ${credential.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{credential.enabled ? "Aktif" : "Nonaktif"}</button><button type="button" title="Hapus API key" onClick={() => void removeCredential(credential)} className="grid size-8 cursor-pointer place-items-center rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="size-4" /></button></div>
                  ))}
                </div>
              </section>
            </main>

            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between"><div><h3 className="flex items-center gap-2 font-bold text-slate-900"><Cpu className="size-5 text-indigo-600" />Available models</h3><p className="mt-1 text-xs text-slate-500">Model untuk automation AI.</p></div><button type="button" onClick={() => void importModels()} disabled={checking || !selected.credentials.length} title="Import dari endpoint models" className="grid size-9 cursor-pointer place-items-center rounded-lg border border-slate-200 text-indigo-600 disabled:opacity-40"><Download className="size-4" /></button></div>
              <form onSubmit={addModel} className="mt-4 flex gap-2"><input value={newModel} onChange={(event) => setNewModel(event.target.value)} placeholder="Model ID" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" /><button disabled={!newModel.trim()} className="grid size-9 cursor-pointer place-items-center rounded-lg bg-indigo-600 text-white disabled:opacity-40"><Plus className="size-4" /></button></form>
              <div className="mt-4 max-h-[470px] space-y-2 overflow-y-auto">
                {selected.models.length ? selected.models.map((model) => (
                  <div key={model.id} className="flex items-center gap-2 rounded-lg border border-slate-100 p-3"><Bot className="size-4 shrink-0 text-indigo-600" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{model.modelId}</p><p className="truncate text-[11px] text-slate-400">{selected.prefix}/{model.modelId}</p></div><button type="button" title="Jadikan default" onClick={() => void patchProvider({ defaultModel: model.modelId })} className={`grid size-7 cursor-pointer place-items-center rounded-md ${selected.defaultModel === model.modelId ? "bg-emerald-100 text-emerald-700" : "text-slate-400 hover:bg-slate-100"}`}><BadgeCheck className="size-4" /></button><button type="button" title="Hapus model" onClick={() => void removeModel(model)} className="grid size-7 cursor-pointer place-items-center rounded-md text-rose-500 hover:bg-rose-50"><Trash2 className="size-4" /></button></div>
                )) : <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">Tambahkan model manual atau impor dari endpoint provider.</div>}
              </div>
            </aside>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <form onSubmit={createProvider} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between"><div><h2 className="text-xl font-bold text-slate-900">Tambah {form.protocol === "OPENAI" ? "OpenAI" : "Anthropic"} compatible</h2><p className="mt-1 text-sm text-slate-500">Hubungkan endpoint AI kustom ke gateway.</p></div><button type="button" onClick={() => setShowCreate(false)} className="grid size-9 cursor-pointer place-items-center rounded-lg border border-slate-200"><X className="size-4" /></button></div>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Provider production" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal" /></label>
              <label className="block text-sm font-semibold text-slate-700">Prefix<input value={form.prefix} onChange={(event) => setForm({ ...form, prefix: event.target.value })} placeholder="provider-prod" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal" /><span className="mt-1 block text-xs font-normal text-slate-500">Identitas model yang unik dalam tenant.</span></label>
              <label className="block text-sm font-semibold text-slate-700">Base URL<input value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal" /><span className="mt-1 block text-xs font-normal text-slate-500">Gunakan base URL yang berakhir dengan versi API, misalnya /v1.</span></label>
              <label className="block text-sm font-semibold text-slate-700">API Key<input type="password" value={form.apiKey} onChange={(event) => setForm({ ...form, apiKey: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal" /></label>
              <label className="block text-sm font-semibold text-slate-700">Model ID <span className="font-normal text-slate-400">(opsional)</span><input value={form.modelId} onChange={(event) => setForm({ ...form, modelId: event.target.value })} placeholder="Isi untuk menguji chat langsung" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal" /></label>
            </div>
            <div className="mt-6 flex justify-between gap-3"><button type="button" onClick={() => void checkDraft()} disabled={checking || !form.apiKey.trim() || !form.baseUrl.trim()} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-40"><FlaskConical className="size-4" />{checking ? "Memeriksa..." : "Check"}</button><div className="flex gap-2"><button type="button" onClick={() => setShowCreate(false)} className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-bold text-slate-500">Batal</button><button disabled={saving || !form.name.trim() || !form.prefix.trim() || !form.baseUrl.trim() || !form.apiKey.trim()} className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">{saving ? "Menyimpan..." : "Buat provider"}</button></div></div>
          </form>
        </div>
      )}
    </div>
  );
}
