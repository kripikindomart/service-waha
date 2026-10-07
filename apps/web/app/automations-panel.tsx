"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import { Bot, ClipboardCheck, Globe2, MessageSquareText, Radio, Trash2 } from "lucide-react";
import type { AiProvider } from "./ai-providers-panel";

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

type Instance = { id: string; name: string; engine?: string; status: string };

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
  responseMode?: "STATIC" | "AI";
  aiProviderId?: string | null;
  aiProvider?: Pick<AiProvider, "id" | "name" | "prefix" | "protocol" | "defaultModel" | "enabled"> | null;
  aiModel?: string | null;
  systemPrompt?: string | null;
  temperature?: number;
  maxTokens?: number;
  historyLimit?: number;
};

export function AutomationsPanel({ collapsed, token }: { collapsed: boolean; token: string }) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<AutomationRule["trigger"]>("contains");
  const [keyword, setKeyword] = useState("");
  const [response, setResponse] = useState("");
  const [instanceId, setInstanceId] = useState("GLOBAL");
  const [responseMode, setResponseMode] = useState<"STATIC" | "AI">("STATIC");
  const [aiProviderId, setAiProviderId] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("Anda adalah asisten WhatsApp yang membantu, ringkas, dan menjawab dalam Bahasa Indonesia.");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(500);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [cooldownSeconds, setCooldownSeconds] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const selectedProvider = providers.find((provider) => provider.id === aiProviderId);

  async function load() {
    setLoading(true);
    try {
      const [ruleData, instanceData, providerData] = await Promise.all([
        api<AutomationRule[]>("/automations", {}, token),
        api<Instance[]>("/instances", {}, token),
        api<AiProvider[]>("/ai-providers", {}, token),
      ]);
      setRules(ruleData);
      setInstances(instanceData);
      setProviders(providerData);
      if (!aiProviderId && providerData[0]) {
        setAiProviderId(providerData[0].id);
        setAiModel(providerData[0].defaultModel || providerData[0].models[0]?.modelId || "");
      }
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
    const invalid = !name.trim()
      || (trigger !== "any" && !keyword.trim())
      || (responseMode === "STATIC" ? !response.trim() : !aiProviderId);
    if (invalid) return;
    setSaving(true);
    try {
      await api(
        "/automations",
        {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            trigger,
            keyword: trigger === "any" ? "" : keyword.trim(),
            response: response.trim(),
            instanceId: instanceId === "GLOBAL" ? null : instanceId,
            cooldownSeconds,
            responseMode,
            aiProviderId: responseMode === "AI" ? aiProviderId : null,
            aiModel: responseMode === "AI" ? aiModel : undefined,
            systemPrompt: responseMode === "AI" ? systemPrompt : undefined,
            temperature,
            maxTokens,
            historyLimit,
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
      await Swal.fire({ icon: "error", title: "Gagal menyimpan automation", text: error instanceof Error ? error.message : "Permintaan gagal" });
    } finally {
      setSaving(false);
    }
  }

  async function removeRule(id: string) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus automation?",
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
    });
    if (!result.isConfirmed) return;
    await api(`/automations/${id}`, { method: "DELETE" }, token);
    await load();
  }

  async function toggleRule(rule: AutomationRule) {
    await api(
      `/automations/${rule.id}`,
      { method: "PATCH", body: JSON.stringify({ enabled: !rule.enabled }) },
      token,
    );
    await load();
  }

  async function makeGlobal(rule: AutomationRule) {
    const result = await Swal.fire({
      icon: "question",
      title: "Terapkan ke semua instance?",
      text: `Rule ${rule.name} akan merespons pesan dari seluruh instance dalam tenant ini.`,
      showCancelButton: true,
      confirmButtonText: "Jadikan global",
      cancelButtonText: "Batal",
    });
    if (!result.isConfirmed) return;
    await api(
      `/automations/${rule.id}`,
      { method: "PATCH", body: JSON.stringify({ instanceId: null }) },
      token,
    );
    await load();
  }

  return (
    <div className={`${collapsed ? "md:ml-20" : "md:ml-64"} min-h-screen bg-[#f7f9fc] px-6 py-7 transition-all`}>
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-xl bg-indigo-600 text-white"><Radio className="size-6" /></div>
          <div><p className="text-sm font-semibold text-indigo-600">Workspace module</p><h1 className="text-3xl font-bold text-slate-900">Automations</h1><p className="text-sm text-slate-500">Balasan otomatis statis atau AI untuk satu maupun seluruh instance.</p></div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold text-slate-900">Rule automation</h2><p className="mt-1 text-xs text-slate-500">{rules.filter((rule) => rule.enabled).length} aktif dari {rules.length} rule</p></div><Radio className="size-5 text-indigo-600" /></div>
            {loading && !rules.length ? (
              <div className="p-16 text-center text-sm text-slate-500">Memuat automation...</div>
            ) : !rules.length ? (
              <div className="p-16 text-center"><Radio className="mx-auto size-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">Belum ada automation</p></div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-start gap-4 px-5 py-4">
                    <div className={`mt-1 grid size-10 shrink-0 place-items-center rounded-xl ${rule.enabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>{rule.responseMode === "AI" ? <Bot className="size-5" /> : <MessageSquareText className="size-5" />}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{rule.name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${rule.responseMode === "AI" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>{rule.responseMode === "AI" ? "AI" : "STATIS"}</span>{!rule.instanceId && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">GLOBAL</span>}</div>
                      <p className="mt-1 text-xs text-slate-500">{rule.trigger === "any" ? "Semua pesan masuk" : rule.trigger === "exact" ? `Pesan sama dengan: ${rule.keyword}` : `Pesan mengandung: ${rule.keyword}`}</p>
                      <p className="mt-1 text-[11px] font-semibold text-indigo-600">{rule.instance?.name ?? "Semua instance tenant"} · Cooldown {rule.cooldownSeconds ?? 5} detik</p>
                      {rule.responseMode === "AI" ? (
                        <div className="mt-2 rounded-lg border border-violet-100 bg-violet-50 p-3 text-sm text-violet-800"><p className="font-semibold">{rule.aiProvider?.name ?? "Provider tidak tersedia"} · {rule.aiModel || rule.aiProvider?.defaultModel || "Model default"}</p><p className="mt-1 line-clamp-2 text-xs text-violet-600">{rule.systemPrompt || "Tanpa system prompt"}</p></div>
                      ) : (
                        <div className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{rule.response}</div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">{rule.instanceId && <button type="button" title="Terapkan ke semua instance" onClick={() => void makeGlobal(rule)} className="grid size-8 cursor-pointer place-items-center rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50"><Globe2 className="size-4" /></button>}<button type="button" onClick={() => void toggleRule(rule)} className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold ${rule.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{rule.enabled ? "Aktif" : "Nonaktif"}</button><button type="button" title="Hapus rule" onClick={() => void removeRule(rule.id)} className="grid size-8 cursor-pointer place-items-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"><Trash2 className="size-4" /></button></div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><ClipboardCheck className="size-5 text-indigo-600" /><h2 className="font-bold text-slate-900">Buat automation</h2></div>
            <p className="mt-1 text-xs text-slate-500">Rule dijalankan oleh webhook setelah pesan masuk tervalidasi.</p>
            <form onSubmit={addRule} className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Instance penerima<select value={instanceId} onChange={(event) => setInstanceId(event.target.value)} className="mt-2 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-indigo-500"><option value="GLOBAL">Semua instance (global)</option>{instances.map((instance) => <option key={instance.id} value={instance.id}>{instance.name} · {instance.engine ?? "NOWEB"} · {instance.status}</option>)}</select><span className="mt-1 block text-[11px] font-normal text-slate-500">Mode global membuat rule berlaku pada setiap instance dalam tenant ini.</span></label>
              <label className="block text-sm font-semibold text-slate-700">Nama rule<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Asisten pelanggan" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-500" /></label>

              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setResponseMode("STATIC")} className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${responseMode === "STATIC" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}><MessageSquareText className="size-4" />Statis</button><button type="button" onClick={() => setResponseMode("AI")} className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${responseMode === "AI" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}><Bot className="size-4" />AI Provider</button></div>

              <label className="block text-sm font-semibold text-slate-700">Kondisi pesan<select value={trigger} onChange={(event) => setTrigger(event.target.value as AutomationRule["trigger"])} className="mt-2 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value="contains">Mengandung kata</option><option value="exact">Sama persis</option><option value="any">Semua pesan</option></select></label>
              {trigger !== "any" && <label className="block text-sm font-semibold text-slate-700">Kata kunci<input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="menu" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal" /></label>}

              {responseMode === "AI" ? (
                <div className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/50 p-3">
                  <div className="flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-bold text-violet-900"><Bot className="size-4" />Konfigurasi AI</p><Link href="/ai-providers" className="cursor-pointer text-xs font-bold text-violet-700 hover:underline">Kelola provider</Link></div>
                  <label className="block text-sm font-semibold text-slate-700">Provider<select value={aiProviderId} onChange={(event) => { const provider = providers.find((item) => item.id === event.target.value); setAiProviderId(event.target.value); setAiModel(provider?.defaultModel || provider?.models[0]?.modelId || ""); }} className="mt-2 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value="">Pilih provider</option>{providers.filter((provider) => provider.enabled).map((provider) => <option key={provider.id} value={provider.id}>{provider.name} · {provider.protocol}</option>)}</select></label>
                  <label className="block text-sm font-semibold text-slate-700">Model<select value={aiModel} onChange={(event) => setAiModel(event.target.value)} className="mt-2 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal"><option value="">Default provider</option>{selectedProvider?.models.map((model) => <option key={model.id} value={model.modelId}>{model.modelId}</option>)}</select></label>
                  <label className="block text-sm font-semibold text-slate-700">System prompt<textarea value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} rows={4} className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal" /><span className="mt-1 block text-[11px] font-normal text-slate-500">Variabel tersedia: {"{{message}}"} dan {"{{chat_id}}"}.</span></label>
                  <div className="grid grid-cols-3 gap-2"><label className="text-xs font-semibold text-slate-600">Temperature<input type="number" min={0} max={2} step={0.1} value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 font-normal" /></label><label className="text-xs font-semibold text-slate-600">Max token<input type="number" min={1} max={8192} value={maxTokens} onChange={(event) => setMaxTokens(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 font-normal" /></label><label className="text-xs font-semibold text-slate-600">Riwayat<input type="number" min={1} max={50} value={historyLimit} onChange={(event) => setHistoryLimit(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 font-normal" /></label></div>
                  <label className="block text-sm font-semibold text-slate-700">Fallback jika AI gagal<textarea value={response} onChange={(event) => setResponse(event.target.value)} rows={3} placeholder="Opsional, dikirim jika provider AI gagal" className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal" /></label>
                </div>
              ) : (
                <label className="block text-sm font-semibold text-slate-700">Balasan otomatis<textarea value={response} onChange={(event) => setResponse(event.target.value)} rows={5} placeholder="Tulis balasan otomatis..." className="mt-2 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 font-normal" /></label>
              )}

              <label className="block text-sm font-semibold text-slate-700">Cooldown per percakapan<div className="mt-2 flex items-center gap-2"><input type="number" min={1} max={3600} value={cooldownSeconds} onChange={(event) => setCooldownSeconds(Math.max(1, Math.min(3600, Number(event.target.value) || 1)))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal" /><span className="text-sm text-slate-500">detik</span></div><span className="mt-1 block text-[11px] font-normal text-slate-500">Mencegah balasan berulang dari event webhook ganda atau pesan cepat.</span></label>
              <button type="submit" disabled={!name.trim() || (trigger !== "any" && !keyword.trim()) || (responseMode === "STATIC" ? !response.trim() : !aiProviderId) || saving} className="w-full cursor-pointer rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Menyimpan..." : "Simpan automation"}</button>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
}
