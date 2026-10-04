'use client';

import { FormEvent, useState } from 'react';

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!email || !password) return setError('Email dan password wajib diisi.');
    setError('');
    setLoggedIn(true);
  }

  if (loggedIn) return <Dashboard onLogout={() => setLoggedIn(false)} />;
  return <main className="grid min-h-screen place-items-center px-6"><section className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/90 p-8 shadow-2xl shadow-black/30"><div className="mb-8"><div className="mb-4 inline-flex rounded-xl bg-blue-500/15 px-3 py-2 text-sm font-semibold text-blue-300">SERVICE WAHA</div><h1 className="text-3xl font-bold tracking-tight">Kelola WhatsApp lebih mudah</h1><p className="mt-2 text-slate-400">Masuk ke workspace gateway kamu.</p></div><form onSubmit={submit} className="space-y-5"><label className="block text-sm text-slate-300">Email<input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none ring-blue-500 focus:ring-2" type="email" placeholder="admin@contoh.com" /></label><label className="block text-sm text-slate-300">Password<input value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none ring-blue-500 focus:ring-2" type="password" placeholder="••••••••" /></label>{error && <p className="text-sm text-red-300">{error}</p>}<button className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold transition hover:bg-blue-500">Masuk</button></form></section></main>;
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  return <main className="min-h-screen"><header className="border-b border-slate-800 bg-slate-950/80"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><div><p className="text-sm font-semibold text-blue-300">SERVICE WAHA</p><h1 className="text-xl font-bold">Dashboard</h1></div><button onClick={onLogout} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Keluar</button></div></header><div className="mx-auto max-w-7xl px-6 py-8"><div className="grid gap-5 md:grid-cols-3"><Stat label="Workspace aktif" value="1" /><Stat label="WhatsApp instance" value="0" /><Stat label="Pesan hari ini" value="0" /></div><section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-lg font-semibold">WhatsApp instances</h2><p className="mt-2 text-sm text-slate-400">Instance, QR pairing, member, dan permission akan tampil di sini.</p><button className="mt-6 rounded-xl bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500">Tambah instance</button></section></div></main>;
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-3 text-3xl font-bold">{value}</p></div>; }
