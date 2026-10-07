# AI Agent Implementation Tracker

Dokumen detail: [AI_AGENT_AUTOMATION_PLAN.md](./AI_AGENT_AUTOMATION_PLAN.md)

## Keputusan yang Sudah Disepakati

- [x] Automation statis dan AI Agent dipisahkan secara konsep.
- [x] Mode biasa berarti percakapan tidak dikendalikan AI.
- [x] AI dapat selalu aktif, diaktifkan dengan kata kunci, atau diaktifkan manual.
- [x] Setelah keyword aktivasi, pesan berikutnya diproses AI tanpa mengulang keyword.
- [x] Agent mendukung scope global, kontak khusus, dan group khusus.
- [x] Agent group hanya memakai group yang sudah disinkronkan.
- [x] Cheat sheet/custom data dapat dipasang ke semua jenis agent.
- [x] Satu inbound message hanya boleh menghasilkan satu automation response.
- [x] Agent khusus mengalahkan agent global.
- [x] Human handoff harus tersedia dari Inbox.
- [x] Pembuatan agent menyediakan brainstorming melalui Agent Builder.
- [x] Hasil brainstorming menjadi draft dan tidak langsung mengaktifkan agent.
- [x] Setiap agent memiliki Scope Contract terstruktur.
- [x] Memory, knowledge, session, dan vector namespace dipisahkan per tenant dan agent.
- [x] Template agent tidak membawa data pengguna dan selalu disalin menjadi agent tenant.
- [x] Obsidian tidak digunakan sebagai memory engine.
- [x] PostgreSQL, Redis, dan `pgvector` menjadi fondasi memory/retrieval awal.
- [x] Context Builder hanya mengirim data relevan sesuai token budget.

## Status Implementasi

Keterangan:

- `[ ]` belum dimulai
- `[~]` sedang dikerjakan
- `[x]` selesai dan sudah diuji

### Fase 0: Fondasi dan Migrasi

- [x] DB-01 Tambah model `AiAgent`.
- [x] DB-02 Tambah model instance assignment dan target agent.
- [x] DB-03 Tambah model session dan execution.
- [x] DB-04 Tambah model knowledge source dan relasinya.
- [x] DB-05 Tambah permission agent dan knowledge ke seed.
- [x] DB-06 Tambah feature flag AI Agent V2.
- [x] DB-07 Siapkan migrasi AI rule lama menjadi agent draft.
- [x] DB-08 Tambah Agent Draft, Builder Session, Evaluation Case, dan Agent Version.
- [x] SEC-01 Tetapkan tenant/agent namespace untuk DB, Redis, vector, dan file.
- [x] SEC-02 Tambah repository guard agar query agent selalu memakai tenant context.
- [ ] SEC-03 Siapkan desain PostgreSQL RLS dan test connection pooling.
- [x] QA-00 Verifikasi automation lama tetap berjalan saat feature flag off.

### Fase 1: Global Agent dan Keyword Session

- [x] BE-01 CRUD AI Agent.
- [x] BE-02 Validasi provider, model, prompt, dan instance.
- [x] BE-03 Keyword activation/deactivation matcher.
- [x] BE-04 Session state service.
- [x] BE-05 Agent router dan priority resolver.
- [~] BE-06 Redis session cache dan distributed lock. Lock selesai; cache session belum.
- [x] BE-07 AI execution queue/worker.
- [x] BE-08 Execution log dan sanitized error.
- [~] BE-08A Scope Contract validator dan input/output guard. Validator selesai; runtime input/output guard belum.
- [~] BE-08B Context Builder dan context budget dasar. History dan prompt assembly selesai; budget terukur belum.
- [ ] FE-01 Navigation Rules Statis dan AI Agents.
- [ ] FE-02 Daftar AI Agent.
- [ ] FE-03 Wizard agent global.
- [ ] FE-04 Test conversation sebelum aktivasi.
- [ ] FE-04A Agent Builder brainstorming wizard.
- [ ] FE-04B Review draft, test case, dan approval sebelum aktivasi.
- [x] QA-01 Test keyword takeover dan stop.
- [x] QA-02 Test duplicate webhook tidak membalas ganda.
- [ ] QA-03 Test provider failover dan fallback response.

### Fase 2: Kontak Khusus dan Human Handoff

- [ ] BE-09 Contact target resolver.
- [ ] BE-10 Canonical phone/chat identity.
- [ ] BE-11 Specific-over-global priority.
- [ ] BE-12 Pause, resume, handoff, close, dan reset memory.
- [ ] FE-05 Contact target selector.
- [ ] FE-06 Badge session di Inbox.
- [ ] FE-07 Kontrol AI dari Inbox.
- [ ] QA-04 Test isolasi sesi per kontak.
- [ ] QA-05 Test human handoff.

### Fase 3: Group Agent

- [ ] DB-08 Tambah model WhatsApp group dan participant yang kanonis.
- [ ] BE-13 Group sync preview dan commit.
- [ ] BE-14 Group target resolver.
- [ ] BE-15 Mention/reply/self-message detector.
- [ ] BE-16 Shared/per-member group memory.
- [ ] FE-08 Group sync UI.
- [ ] FE-09 Group selector dan informasi keanggotaan instance.
- [ ] FE-10 Konfigurasi all/mention/reply/keyword-only.
- [ ] QA-06 Test agent hanya bekerja di group terpilih.
- [ ] QA-07 Test group event duplication lintas engine.

### Fase 4: Knowledge / Cheat Sheet V1

- [ ] BE-17 CRUD text knowledge.
- [ ] BE-18 Data sheet knowledge adapter.
- [ ] BE-19 External JSON API adapter.
- [ ] BE-20 Secret encryption dan redaction.
- [ ] BE-21 Preview, test, sync, cache, dan fallback.
- [ ] BE-22 Context builder dan character/token budget.
- [ ] BE-23 Knowledge usage trace pada execution.
- [ ] BE-23A Retrieval wajib difilter tenant, agent, dan source allowlist.
- [ ] BE-23B Tambah `pgvector` dan indexing worker untuk semantic retrieval.
- [ ] FE-11 Knowledge source list.
- [ ] FE-12 Text/Markdown source editor.
- [ ] FE-13 Data sheet selector dan preview.
- [ ] FE-14 API JSON source editor dan mapping.
- [ ] FE-15 Attach knowledge ke agent.
- [ ] QA-08 Tenant isolation dan permission test.
- [ ] QA-09 Timeout, cache, dan SSRF test.

### Fase 5: Memory dan Monitoring

- [ ] BE-24 Conversation summary worker.
- [ ] BE-25 Token and context budget manager.
- [ ] BE-26 Usage aggregation.
- [ ] FE-16 Session monitor.
- [ ] FE-17 Execution detail.
- [ ] FE-18 Usage, latency, provider, dan error dashboard.
- [ ] QA-10 Redis restart recovery.
- [ ] QA-11 Load test minimal 100 pengguna.

### Fase 6: Dokumen dan Retrieval Lanjut

- [ ] BE-27 PDF/text extraction.
- [ ] BE-28 Chunking dan versioning.
- [ ] BE-29 Embedding dan vector retrieval.
- [ ] FE-19 Document upload dan indexing status.
- [ ] QA-12 Retrieval relevance dan data isolation test.

## Gate Sebelum Pindah Fase

Fase berikutnya tidak dimulai sebelum gate fase aktif terpenuhi:

- Migration berhasil dan dapat di-rollback secara aman.
- TypeScript API dan web lulus.
- Unit test resolver dan state transition lulus.
- Integration test webhook lulus.
- Tidak ada balasan ganda.
- Tidak ada secret mentah pada response atau log.
- Tenant isolation terverifikasi.

## Titik Mulai Implementasi Berikutnya

Mulai dari Fase 0 dengan urutan:

1. Tambah enum dan model database.
2. Tambah permission seed.
3. Tambah feature flag.
4. Generate Prisma Client dan push/migrate schema.
5. Bangun service session dan test state transition sebelum UI.

## Catatan Implementasi 7 Oktober 2026

- Riwayat migration development dinormalisasi tanpa reset database melalui baseline migration.
- Migration `20261007051000_ai_agent_v2_foundation` diterapkan dan Prisma diff menghasilkan `No difference detected`.
- Delapan permission AI Agent/Knowledge ditambahkan ke core permission dan default owner seed.
- Automation AI lama disalin menjadi `AgentDraft`; rule lama tidak diubah atau dinonaktifkan.
- CRUD agent, target, version snapshot, duplicate, enable/disable, dan test provider telah diuji.
- Tenant isolation diuji: tenant lain menerima `404` saat meminta agent yang bukan miliknya.
- Keyword activation, duplicate webhook, dan keyword deactivation diuji melalui endpoint webhook nyata.
- Router memastikan automation statis hanya berjalan jika tidak ada AI Agent yang menang.
