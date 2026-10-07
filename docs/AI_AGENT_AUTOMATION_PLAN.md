# Rencana Pengembangan Automation dan AI Agent

Status dokumen: rancangan implementasi  
Terakhir diperbarui: 6 Oktober 2026  
Repository: `service-waha`

## 1. Tujuan

Mengembangkan modul Automation menjadi dua kemampuan yang jelas dan tidak saling tumpang tindih:

1. **Automation statis** untuk merespons pesan berdasarkan kondisi dan kata kunci.
2. **AI Agent** untuk mengambil alih percakapan secara kontekstual berdasarkan scope, sesi, prompt, provider AI, dan sumber pengetahuan.

AI Agent harus mendukung:

- Selalu aktif untuk semua pesan pada scope tertentu.
- Diaktifkan menggunakan kata kunci, lalu tetap aktif sampai dinonaktifkan atau sesi kedaluwarsa.
- Diaktifkan dan dinonaktifkan manual oleh operator.
- Berlaku global, khusus kontak, atau khusus group WhatsApp.
- Menggunakan knowledge atau cheat sheet dari teks, data sheet, spreadsheet, dan API JSON.
- Menjamin satu pesan masuk hanya ditangani satu rule atau satu agent.

## 2. Kondisi Sistem Saat Ini

Fitur yang sudah tersedia dan akan dipakai kembali:

- Multi-tenant, role, dan permission.
- Multi-instance WhatsApp dengan engine NOWEB dan GOWS.
- Penyimpanan conversation dan message.
- Deduplication webhook dan message ID.
- Automation rule statis dan AI sederhana.
- AI provider OpenAI-compatible dan Anthropic-compatible.
- Multi API key, failover, model list, dan test connection.
- Data sheet tersimpan.
- Sinkronisasi kontak dan peserta group dari WhatsApp.
- Redis dan BullMQ.

Keterbatasan automation saat ini:

- AI masih ditempatkan sebagai variasi respons dari `AutomationRule`.
- Belum ada sesi AI aktif per kontak atau group.
- Belum ada keyword aktivasi dan keyword deaktivasi sebagai state transition.
- Belum ada target kontak atau group khusus.
- Belum ada human handoff.
- Belum ada knowledge source yang dapat dikaitkan ke agent.
- History masih langsung diambil dari conversation tanpa ringkasan atau isolasi sesi.
- Belum ada kebijakan konflik yang lengkap antara agent global, kontak, group, dan rule statis.

## 3. Istilah Utama

| Istilah | Arti |
|---|---|
| Automation statis | Rule kondisi pesan yang menghasilkan balasan tetap tanpa AI. |
| AI Agent | Konfigurasi AI yang memiliki role, prompt, scope, provider, target, dan knowledge. |
| Scope | Batas agent: global, kontak tertentu, atau group tertentu. |
| Activation mode | Cara agent aktif: selalu aktif, kata kunci, atau manual. |
| Agent session | Status takeover AI pada sebuah percakapan. |
| Mode biasa | Percakapan tidak sedang dikendalikan AI; operator dan automation statis tetap dapat bekerja. |
| Human handoff | Operator mengambil alih sehingga AI berhenti menjawab. |
| Knowledge source | Data tambahan yang boleh digunakan agent sebagai rujukan. |
| Cheat sheet | Nama sederhana untuk kumpulan petunjuk atau knowledge yang dipasangkan ke agent. |

## 4. Jenis Agent

### 4.1 AI Agent Global

Menangani seluruh percakapan yang masuk pada semua instance atau instance terpilih.

Pilihan aktivasi:

- `ALWAYS`: langsung menangani semua pesan.
- `KEYWORD`: hanya aktif setelah kata kunci diterima.
- `MANUAL`: hanya aktif setelah operator menekan tombol aktivasi.

### 4.2 AI Agent Kontak Khusus

Menangani satu atau beberapa nomor tertentu. Target disimpan berdasarkan identitas kanonis, bukan hanya teks nomor yang terlihat.

Kegunaan:

- Asisten pribadi per nomor.
- Pelayanan pelanggan tertentu.
- Role berbeda untuk pelanggan atau staf berbeda.

### 4.3 AI Agent Group

Menangani group WhatsApp yang telah disinkronkan dari instance.

Syarat:

- Instance dalam keadaan benar-benar `WORKING` dari provider.
- Nomor WhatsApp instance sudah menjadi anggota group.
- Group telah disinkronkan dan dipilih pada konfigurasi agent.

Perilaku group:

- Jawab semua pesan.
- Jawab hanya saat nomor agent disebut.
- Jawab hanya saat pesan me-reply pesan agent.
- Jawab saat menggunakan kata kunci aktivasi.
- Abaikan pesan dari nomor tertentu.
- Abaikan pesan yang dikirim oleh nomor instance sendiri.

Scope memory group dapat dipilih:

- Satu memory untuk seluruh group.
- Memory terpisah per anggota di dalam group.

### 4.4 Custom Data Agent

Custom data bukan jenis agent tersendiri. Custom data adalah knowledge source yang dapat dipasangkan ke agent global, kontak, maupun group.

## 5. Mode Aktivasi dan State Percakapan

### 5.1 State Utama

| State | Penjelasan |
|---|---|
| `NORMAL` | AI tidak mengendalikan percakapan. |
| `ACTIVE` | AI Agent mengendalikan pesan berikutnya. |
| `PAUSED` | AI dihentikan sementara oleh operator. |
| `HANDED_OFF` | Percakapan telah diambil alih operator. |
| `EXPIRED` | Sesi berakhir karena timeout. |
| `CLOSED` | Sesi ditutup dengan kata kunci, tombol, atau aturan sistem. |

### 5.2 Alur Keyword Takeover

```text
NORMAL
  -> pesan cocok dengan keyword aktivasi
ACTIVE
  -> semua pesan berikutnya diproses AI
  -> keyword deaktivasi / timeout / human handoff
NORMAL atau HANDED_OFF
```

Konfigurasi keyword:

- Satu atau lebih keyword aktivasi.
- Satu atau lebih keyword deaktivasi.
- Pencocokan `EXACT`, `CONTAINS`, atau `REGEX`.
- Case-sensitive opsional; default tidak case-sensitive.
- Opsi apakah pesan aktivasi ikut dikirim ke AI.
- Pesan konfirmasi saat sesi aktif.
- Pesan konfirmasi saat sesi ditutup.
- TTL sesi dalam menit.
- Perpanjangan TTL setiap ada pesan baru.

### 5.3 Mode Selalu Aktif

Agent tidak membutuhkan keyword. Setiap pesan yang cocok dengan scope langsung diproses AI, kecuali:

- Agent dinonaktifkan.
- Percakapan sedang `PAUSED` atau `HANDED_OFF`.
- Pesan berasal dari nomor sendiri.
- Pesan merupakan event duplikat.
- Batas keamanan atau rate limit terlampaui.

### 5.4 Mode Manual

Operator dapat mengaktifkan AI dari Inbox untuk percakapan tertentu. Tombol yang dibutuhkan:

- Aktifkan agent.
- Jeda agent.
- Ambil alih manual.
- Kembalikan ke AI.
- Tutup sesi.
- Reset memory.

## 6. Prompt Agent

Form agent menggunakan bidang berikut:

- **System prompt**: identitas, aturan utama, batasan, dan persona agent.
- **Instruksi agent**: tujuan operasional atau pekerjaan khusus agent.
- **Opening message**: pesan konfirmasi ketika sesi aktif.
- **Closing message**: pesan ketika sesi ditutup.
- **Fallback response**: respons jika semua provider gagal.

Pesan WhatsApp yang masuk otomatis menjadi user prompt. Pengguna tidak perlu membuat user prompt statis untuk setiap pesan.

Template variabel minimum:

- `{{message}}`
- `{{chat_id}}`
- `{{phone}}`
- `{{contact_name}}`
- `{{instance_name}}`
- `{{group_id}}`
- `{{group_name}}`
- `{{sender_phone}}`
- `{{sender_name}}`
- `{{current_time}}`
- `{{knowledge_context}}`

## 7. Prioritas dan Resolusi Konflik

Satu inbound message hanya boleh menghasilkan satu jalur utama pemrosesan.

Urutan resolusi:

1. Validasi tenant, instance, status provider, dan payload.
2. Tolak pesan dari nomor instance sendiri.
3. Deduplicate berdasarkan event key dan message ID.
4. Cari sesi AI aktif untuk conversation atau sender.
5. Jika pesan adalah keyword deaktivasi, tutup sesi dan jangan panggil AI.
6. Cari agent target khusus group.
7. Cari agent target khusus kontak.
8. Cari agent global untuk instance.
9. Evaluasi keyword aktivasi kandidat agent.
10. Evaluasi agent `ALWAYS`.
11. Jika tidak ada AI yang menang, evaluasi automation statis.
12. Jika tidak ada rule yang menang, simpan ke Inbox tanpa balasan otomatis.

Aturan tambahan:

- Agent spesifik mengalahkan agent global.
- Priority lebih kecil dievaluasi lebih dahulu.
- Hanya satu agent yang boleh menang.
- `AutomationExecution` atau `AgentExecution` wajib memiliki idempotency key unik.
- Cooldown tidak menggantikan deduplication; keduanya tetap digunakan.

## 8. Knowledge dan Cheat Sheet

### 8.1 Jenis Sumber

| Jenis | Versi awal | Catatan |
|---|---:|---|
| Teks/Markdown | Ya | Cocok untuk petunjuk pendek dan SOP. |
| Data sheet tersimpan | Ya | Memakai modul `DataSheet` yang sudah ada. |
| Excel/CSV | Ya | Diimpor menjadi data sheet sebelum digunakan. |
| API JSON | Ya | Mendukung GET/POST, header, body, dan data path. |
| Kontak sistem | Ya | Query terbatas berdasarkan tenant. |
| Data peserta group | Ya | Hanya group yang telah disinkronkan. |
| PDF/dokumen | Tahap lanjut | Perlu ekstraksi, chunking, dan indexing. |
| Vector database | Tahap lanjut | Dipakai saat ukuran knowledge bertambah besar. |

### 8.2 Cara Memasukkan Knowledge ke AI

Untuk sumber kecil:

- Konten dapat dimasukkan langsung ke prompt dengan batas ukuran.

Untuk data besar:

- Query hanya data relevan.
- Batasi jumlah row dan ukuran karakter.
- Masukkan hasil ke `{{knowledge_context}}`.
- Catat sumber yang digunakan pada execution log.

Untuk API JSON:

- Secret header dan token wajib terenkripsi.
- Terapkan allowlist protocol HTTP/HTTPS.
- Cegah akses ke localhost, metadata cloud, dan jaringan internal tanpa izin khusus.
- Timeout, batas response, cache, retry, dan circuit breaker wajib tersedia.
- Dukung mapping parameter dari pesan atau identitas kontak.

### 8.3 Refresh dan Cache

- Sumber statis tidak perlu refresh otomatis.
- API dapat memakai TTL cache.
- Spreadsheet/API terjadwal dapat disinkronkan melalui worker.
- Agent selalu menggunakan versi knowledge terakhir yang sukses.
- Kegagalan refresh tidak boleh menghapus versi lama yang masih valid.

## 9. Usulan Model Data

`AutomationRule` tetap digunakan untuk automation statis. AI Agent dipisahkan agar state dan target tidak membebani model rule lama.

### 9.1 `AiAgent`

Kolom utama:

- `id`, `tenantId`, `name`, `description`.
- `scope`: `GLOBAL`, `CONTACT`, `GROUP`.
- `activationMode`: `ALWAYS`, `KEYWORD`, `MANUAL`.
- `enabled`, `priority`.
- `aiProviderId`, `aiModel`.
- `systemPrompt`, `agentPrompt`, `fallbackResponse`.
- `temperature`, `maxTokens`, `historyLimit`.
- `sessionTtlSeconds`, `extendSessionOnMessage`.
- `activationMatchType`, `activationKeywords`.
- `deactivationMatchType`, `deactivationKeywords`.
- `consumeActivationMessage`.
- `openingMessage`, `closingMessage`.
- `groupResponseMode`: `ALL`, `MENTION_ONLY`, `REPLY_ONLY`, `KEYWORD_ONLY`.
- `groupMemoryMode`: `SHARED`, `PER_MEMBER`.
- `createdAt`, `updatedAt`.

### 9.2 `AiAgentInstance`

Join table untuk menghubungkan satu agent ke satu atau banyak instance. Tidak ada row berarti semua instance tenant jika `allInstances=true`.

### 9.3 `AiAgentTarget`

Target khusus agent:

- `targetType`: `CONTACT` atau `GROUP`.
- `targetKey`: canonical chat ID atau canonical phone.
- `instanceId` untuk mencegah benturan ID lintas provider.
- Metadata tampilan seperti nama kontak/group.

### 9.4 `AiAgentSession`

- `agentId`, `tenantId`, `instanceId`.
- `chatId`, `participantId` opsional untuk group per anggota.
- `scopeKey` sebagai identitas unik sesi.
- `status`.
- `activatedBy`: `ALWAYS`, `KEYWORD`, `MANUAL`, `API`.
- `activatedAt`, `lastActivityAt`, `expiresAt`, `closedAt`.
- `handoffUserId` dan `handoffAt`.
- `memorySummary` untuk ringkasan history panjang.

Unique index: `[agentId, instanceId, scopeKey, status-active]` diterapkan melalui logika transaksi karena partial unique index tidak langsung tersedia di Prisma schema standar.

### 9.5 `AgentKnowledgeSource`

- `name`, `type`, `enabled`.
- `config` JSON untuk mapping non-secret.
- `encryptedSecret`, `encryptionIv`, `authTag` untuk credential.
- `refreshMode`, `refreshIntervalSeconds`.
- `lastStatus`, `lastError`, `lastSyncedAt`.
- `cachedContent` atau relasi ke versi sumber.

### 9.6 `AiAgentKnowledge`

Join table agent ke knowledge source dengan:

- `priority`.
- `maxRows`.
- `maxCharacters`.
- `filterTemplate`.

### 9.7 `AiAgentExecution`

- Referensi agent dan session.
- Inbound dan outbound message ID.
- Status: `PROCESSING`, `QUEUED`, `COMPLETED`, `FALLBACK`, `SKIPPED`, `FAILED`.
- Provider, model, credential hint.
- Token input/output jika provider menyediakan usage.
- Latency.
- Knowledge source yang digunakan.
- Error code dan error message yang sudah disanitasi.
- Idempotency key unik.

## 10. Redis dan Queue

Redis dipakai untuk state cepat, bukan satu-satunya source of truth.

Usulan key:

- `agent:session:{tenantId}:{instanceId}:{scopeKey}`
- `agent:lock:{tenantId}:{inboundMessageId}`
- `agent:cooldown:{agentId}:{scopeKey}`
- `agent:rate:{agentId}:{scopeKey}`
- `knowledge:cache:{sourceId}:{version}`

Queue baru:

- `ai-agent-execution`
- `knowledge-sync`
- `conversation-summary`

Database tetap menyimpan sesi, execution log, dan status penting agar restart Redis tidak menghilangkan state permanen.

## 11. API yang Direncanakan

### Agent

- `GET /ai-agents`
- `POST /ai-agents`
- `GET /ai-agents/:id`
- `PATCH /ai-agents/:id`
- `DELETE /ai-agents/:id`
- `POST /ai-agents/:id/duplicate`
- `POST /ai-agents/:id/test`
- `POST /ai-agents/:id/enable`
- `POST /ai-agents/:id/disable`

### Target dan Group

- `GET /ai-agents/:id/targets`
- `PUT /ai-agents/:id/targets`
- `GET /instances/:id/groups/sync-preview`
- `POST /instances/:id/groups/sync`
- `GET /instances/:id/groups`

### Session dan Handoff

- `GET /ai-agent-sessions`
- `GET /ai-agent-sessions/:id`
- `POST /ai-agent-sessions/:id/pause`
- `POST /ai-agent-sessions/:id/resume`
- `POST /ai-agent-sessions/:id/handoff`
- `POST /ai-agent-sessions/:id/close`
- `POST /ai-agent-sessions/:id/reset-memory`
- `POST /conversations/:id/activate-agent`

### Knowledge

- `GET /agent-knowledge-sources`
- `POST /agent-knowledge-sources`
- `GET /agent-knowledge-sources/:id`
- `PATCH /agent-knowledge-sources/:id`
- `DELETE /agent-knowledge-sources/:id`
- `POST /agent-knowledge-sources/:id/test`
- `POST /agent-knowledge-sources/:id/sync`
- `GET /agent-knowledge-sources/:id/preview`
- `PUT /ai-agents/:id/knowledge-sources`

### Monitoring

- `GET /ai-agent-executions`
- `GET /ai-agent-executions/:id`
- `GET /ai-agent-usage/summary`

## 12. UI dan Navigasi

Modul Automation dibagi menjadi tab atau sub-route:

1. **Rules Statis**
2. **AI Agents**
3. **Knowledge / Cheat Sheet**
4. **Sessions**
5. **Execution Logs**

### 12.1 Daftar AI Agent

Menampilkan:

- Nama dan status.
- Scope.
- Mode aktivasi.
- Instance.
- Provider dan model.
- Jumlah target.
- Jumlah sesi aktif.
- Error terakhir.
- Aksi test, edit, duplicate, enable/disable, dan delete.

### 12.2 Wizard AI Agent

Tahapan:

1. Identitas dan scope.
2. Pilih instance dan target.
3. Atur aktivasi dan sesi.
4. Pilih provider/model.
5. System prompt dan instruksi agent.
6. Hubungkan knowledge.
7. Guardrail dan fallback.
8. Test conversation dan aktifkan.

Pada mode AI `ALWAYS` atau `MANUAL`, field keyword disembunyikan. Pada mode `KEYWORD`, field aktivasi dan deaktivasi muncul.

### 12.3 Inbox

Inbox menampilkan status berikut:

- Mode biasa.
- AI aktif beserta nama agent.
- AI dijeda.
- Diambil alih operator.
- Sisa waktu sesi.

Aksi Inbox:

- Aktifkan agent.
- Pause/resume.
- Ambil alih manual.
- Tutup sesi.
- Reset memory.
- Lihat execution log terakhir.

### 12.4 Knowledge Source

Form sesuai tipe sumber:

- Teks: editor Markdown.
- Data sheet: pilih data sheet dan preview field.
- API JSON: URL, method, header, body, data path, parameter mapping, dan test response.
- Kontak/group: pilih instance, filter, dan field yang diizinkan.

UI tidak pernah menampilkan secret yang sudah disimpan. Secret hanya dapat diganti.

## 13. Pipeline Pesan Masuk

Pipeline target:

1. Webhook menerima event.
2. Verifikasi signature dan instance.
3. Normalisasi event engine NOWEB/GOWS.
4. Normalisasi `@lid`, `@c.us`, group ID, dan participant ID.
5. Deduplicate webhook dan message.
6. Simpan inbound message.
7. Jalankan Agent Router.
8. Router menentukan sesi aktif atau kandidat agent.
9. Jika AI terpilih, buat execution record dan queue job.
10. Worker mengambil history, memory summary, prompt, dan knowledge.
11. Worker memanggil provider dengan failover credential.
12. Format output menjadi WhatsApp text.
13. Queue outbound message.
14. Simpan usage, latency, error, dan hasil execution.

Pemanggilan AI dipindahkan ke worker agar webhook cepat selesai dan tidak timeout.

## 14. Memory dan Riwayat

Versi awal:

- Ambil pesan terakhir berdasarkan `historyLimit`.
- Isolasi history berdasarkan session scope.
- Jangan ikutkan pesan sebelum sesi aktif kecuali opsi `includePreviousContext` aktif.

Versi lanjut:

- Ringkas percakapan saat melebihi token budget.
- Simpan `memorySummary` pada session.
- Pertahankan fakta penting yang diizinkan.
- Sediakan reset memory dan retention policy.

## 15. Keamanan dan Guardrail

- Credential AI dan API knowledge dienkripsi AES-256-GCM.
- Secret tidak pernah dikirim kembali ke browser.
- Permission terpisah: `agent.read`, `agent.manage`, `agent.session.control`, `knowledge.manage`, `agent.logs.read`.
- Semua query wajib difilter dengan `tenantId`.
- Batasi prompt, response, history, dan knowledge context.
- Sanitasi error provider sebelum ditampilkan.
- Proteksi prompt injection dari knowledge yang tidak tepercaya.
- Allowlist tool/action; AI tidak boleh menjalankan aksi eksternal secara bebas.
- Rate limit per tenant, agent, contact, dan group.
- Circuit breaker provider saat error berulang.
- Audit log untuk create/update/delete/enable/handoff/reset.
- Redaksi data sensitif pada log.

## 16. Observability

Dashboard minimal:

- Sesi aktif.
- Pesan diproses AI.
- Balasan sukses/gagal/fallback.
- Latensi rata-rata dan persentil.
- Token input/output.
- Provider/model yang digunakan.
- Knowledge source yang digunakan.
- Top error.
- Agent paling aktif.

Execution detail harus menjelaskan:

- Agent yang menang dan alasan pemilihannya.
- Rule lain yang dilewati dan alasannya.
- Sesi sebelum/sesudah pemrosesan.
- Provider/model.
- Sumber knowledge.
- Error yang dapat ditindaklanjuti.

## 17. Tahapan Implementasi

### Fase 0: Kontrak dan Migrasi Aman

- Bekukan definisi enum dan prioritas routing.
- Tambahkan feature flag `AI_AGENT_V2_ENABLED`.
- Buat migration model agent tanpa menghapus `AutomationRule` lama.
- Tambahkan permission baru ke seed.
- Buat script migrasi rule AI lama menjadi draft agent.

Kriteria selesai:

- Prisma generate dan migration berhasil.
- Data automation lama tidak hilang.
- Feature flag off mempertahankan perilaku lama.

### Fase 1: Agent Global dan Session Keyword

- CRUD AI Agent.
- Scope global/all instance/selected instance.
- Mode `ALWAYS`, `KEYWORD`, dan `MANUAL`.
- Keyword aktivasi/deaktivasi.
- Session persistence dan Redis cache.
- Router prioritas dan idempotency.
- AI worker dan execution log.
- UI daftar dan wizard dasar.

Kriteria selesai:

- Keyword mengaktifkan satu sesi.
- Pesan berikutnya dijawab AI tanpa keyword ulang.
- Keyword stop menutup sesi tanpa diproses AI.
- Event webhook ganda tidak menghasilkan balasan ganda.
- Mode biasa tetap dapat memakai automation statis.

### Fase 2: Agent Kontak Khusus dan Human Handoff

- Target satu/banyak kontak.
- Canonical identity mapping.
- Specific-over-global precedence.
- Inbox badge dan kontrol session.
- Pause, resume, handoff, close, reset memory.

Kriteria selesai:

- Hanya nomor terpilih yang dapat mengaktifkan agent kontak.
- Agent kontak mengalahkan agent global.
- Setelah handoff, AI tidak menjawab sampai di-resume.

### Fase 3: Agent Group

- Model penyimpanan WhatsApp group terpisah dari contact tag.
- Preview dan commit sinkronisasi group.
- Target group agent.
- Deteksi mention/reply/sender.
- Shared memory dan per-member memory.
- Informasi keanggotaan instance pada UI.

Kriteria selesai:

- Agent hanya aktif di group terpilih.
- Pesan dari nomor sendiri diabaikan.
- Mention-only dan reply-only bekerja.
- Duplikasi event GOWS/NOWEB tidak menggandakan respons.

### Fase 4: Knowledge / Cheat Sheet V1

- CRUD sumber teks, data sheet, dan API JSON.
- Secret terenkripsi.
- Preview dan test source.
- Attach source ke agent.
- Query/filter dan context budget.
- Cache dan execution trace.

Kriteria selesai:

- Agent dapat menjawab berdasarkan data sheet/API terpilih.
- Agent tidak dapat membaca source tenant lain.
- API timeout menggunakan versi cache terakhir atau fallback.
- Execution log menunjukkan source yang dipakai.

### Fase 5: Memory, Ringkasan, dan Monitoring

- Conversation summary worker.
- Token budget.
- Usage dashboard.
- Error dashboard.
- Session explorer.
- Export log.

### Fase 6: Knowledge Dokumen dan Retrieval Lanjut

- Upload PDF/text.
- Parsing dan chunking.
- Embedding dan vector search.
- Citation/source trace internal.
- Re-index dan versioning.

## 18. Breakdown Ticket Teknis

### Database

- DB-01: Tambah enum dan model AI Agent.
- DB-02: Tambah target, instance join, session, execution.
- DB-03: Tambah knowledge source dan relasi agent.
- DB-04: Tambah permission seed.
- DB-05: Migrasi AI rule lama menjadi agent draft.

### Backend

- BE-01: Agent CRUD dan validator.
- BE-02: Target resolver kontak/group/global.
- BE-03: Session service dan state transition.
- BE-04: Agent router dengan deterministic precedence.
- BE-05: AI execution queue dan worker.
- BE-06: Prompt builder dan context budget.
- BE-07: Human handoff API.
- BE-08: Group sync dan canonical identity.
- BE-09: Knowledge CRUD, preview, sync, dan cache.
- BE-10: Execution/usage logs.
- BE-11: Rate limit dan circuit breaker.

### Frontend

- FE-01: Pisahkan navigation Rules, Agents, Knowledge, Sessions, Logs.
- FE-02: Agent list.
- FE-03: Agent wizard.
- FE-04: Target contact selector.
- FE-05: Group sync dan group selector.
- FE-06: Prompt editor dan test console.
- FE-07: Knowledge source manager.
- FE-08: Inbox session controls.
- FE-09: Session monitor.
- FE-10: Execution detail dan usage dashboard.

### Quality Assurance

- QA-01: Unit test keyword matcher dan session transition.
- QA-02: Unit test router priority.
- QA-03: Integration test webhook duplicate.
- QA-04: Integration test AI provider failover.
- QA-05: Integration test handoff.
- QA-06: Integration test group mention/reply.
- QA-07: Tenant isolation and permission test.
- QA-08: SSRF and secret redaction test.
- QA-09: Load test 100 pengguna dan banyak sesi bersamaan.

## 19. Test Matrix Minimum

| Skenario | Hasil yang diharapkan |
|---|---|
| Keyword aktivasi diterima | Satu sesi aktif dan satu opening response. |
| Keyword aktivasi dikirim ulang | Tidak membuat sesi ganda. |
| Dua event webhook identik | Hanya satu execution dan satu outbound. |
| Pesan biasa saat state NORMAL | Tidak diproses AI. |
| Pesan biasa saat state ACTIVE | Diproses agent yang memiliki sesi. |
| Keyword deaktivasi | Sesi ditutup dan AI tidak dipanggil. |
| Agent kontak dan global sama-sama cocok | Agent kontak menang. |
| Agent group mention-only tanpa mention | Tidak menjawab. |
| Operator melakukan handoff | AI berhenti menjawab. |
| Provider utama gagal | Credential/provider fallback digunakan. |
| Semua provider gagal | Fallback response atau mode manual. |
| Knowledge API timeout | Cache terakhir atau fallback digunakan. |
| Pesan dari nomor sendiri | Diabaikan. |
| Redis restart | Sesi dapat dipulihkan dari database. |

## 20. Keputusan Default

Default yang dipakai jika belum diubah:

- Agent baru dalam keadaan nonaktif.
- Activation mode: `KEYWORD`.
- Match type keyword: `EXACT`.
- Deactivation keyword: `/stop-ai`.
- Session TTL: 30 menit.
- Extend session on message: aktif.
- History limit: 10 pesan.
- Group response mode: `MENTION_ONLY`.
- Group memory mode: `PER_MEMBER`.
- Fallback: jangan mengirim error teknis ke pengguna; arahkan ke operator.
- Satu chat hanya boleh memiliki satu sesi AI aktif.
- Static automation hanya dievaluasi jika AI tidak menang.

## 21. Hal yang Tidak Dikerjakan pada Fase Awal

- AI menjalankan transaksi bisnis tanpa approval.
- Browser automation atau shell tools dari agent.
- Voice call agent.
- Training/fine-tuning model.
- Vector database sebelum knowledge V1 stabil.
- Agent-to-agent orchestration.

## 22. Urutan Eksekusi yang Disarankan

Urutan kerja paling aman:

1. Fase 0: schema, permission, dan feature flag.
2. Fase 1: agent global dan keyword session sampai stabil.
3. Fase 2: kontak khusus dan handoff Inbox.
4. Fase 3: group agent.
5. Fase 4: cheat sheet dan custom data.
6. Fase 5: monitoring dan memory lanjutan.
7. Fase 6: dokumen dan retrieval vector.

Jangan mengerjakan group, knowledge besar, dan agent global sekaligus sebelum session router dan idempotency pada Fase 1 lulus pengujian.

## 23. Agent Builder dan Proses Brainstorming

Pembuatan agent tidak langsung dimulai dari form system prompt kosong. Sistem menyediakan dua jalur:

1. **Buat dengan AI** melalui proses brainstorming terpandu.
2. **Konfigurasi manual** untuk pengguna yang memahami seluruh parameter agent.

### 23.1 Alur Agent Builder

1. Pengguna menjelaskan agent yang ingin dibuat dengan bahasa biasa.
2. Agent Builder mengajukan pertanyaan lanjutan secara bertahap.
3. Pengguna dan Agent Builder menyamakan tujuan, ruang lingkup, batasan, data, dan tindakan agent.
4. Agent Builder membuat draft konfigurasi terstruktur.
5. Pengguna meninjau dan mengubah draft.
6. Sistem membuat contoh percakapan dan test case.
7. Agent diuji dalam sandbox menggunakan data contoh.
8. Pengguna menyetujui konfigurasi.
9. Agent disimpan sebagai draft atau diaktifkan secara eksplisit.

Agent Builder tidak boleh langsung mengaktifkan agent tanpa persetujuan pengguna.

### 23.2 Pertanyaan Brainstorming Minimum

- Apa tugas utama agent?
- Siapa yang akan berinteraksi dengan agent?
- Masalah apa yang boleh dan tidak boleh ditangani?
- Kapan percakapan harus diserahkan kepada operator?
- Gaya bahasa apa yang digunakan?
- Informasi apa yang harus dikumpulkan?
- Knowledge apa yang dibutuhkan?
- Tools atau API apa yang boleh dijalankan?
- Apakah agent boleh menyimpan memory jangka panjang?
- Kapan sesi dianggap selesai?
- Apa contoh jawaban yang benar dan salah?

### 23.3 Hasil Brainstorming

Agent Builder menghasilkan draft terstruktur:

- Nama, deskripsi, role, dan tujuan agent.
- Scope contract.
- System prompt dan instruksi agent.
- Scope instance, kontak, atau group.
- Activation mode dan keyword.
- Knowledge source dan tools yang diperlukan.
- Memory dan human handoff policy.
- Guardrail dan fallback.
- Contoh percakapan, test case, dan indikator keberhasilan.

Draft disimpan sebagai konfigurasi terstruktur agar setiap bagian dapat diedit tanpa membongkar satu prompt panjang.

### 23.4 Data Brainstorming

Tambahkan struktur berikut:

- `AgentDraft`: konfigurasi yang belum aktif.
- `AgentBuilderSession`: sesi brainstorming pembuat agent.
- `AgentBuilderMessage`: riwayat diskusi pembentukan agent.
- `AgentEvaluationCase`: input, expected behavior, dan hasil pengujian.
- `AgentVersion`: snapshot konfigurasi yang pernah diaktifkan.

Riwayat brainstorming hanya dapat diakses tenant pemilik dan tidak otomatis dimasukkan ke memory operasional agent.

## 24. Scope Contract dan Batasan Ketat

System prompt saja tidak cukup untuk menjaga agent tetap di dalam ruang lingkup. Setiap agent memiliki `Scope Contract` terstruktur.

```json
{
  "allowedTopics": ["produk perusahaan", "status pesanan", "cara pembayaran"],
  "blockedTopics": ["politik", "kesehatan", "nasihat hukum"],
  "outOfScopeAction": "HANDOFF",
  "allowedTools": ["search_product", "check_order"]
}
```

Lapisan enforcement:

1. **Router guard** memastikan scope target agent cocok.
2. **Input scope guard** mengklasifikasikan pertanyaan sebelum model utama dipanggil.
3. **Knowledge allowlist** membatasi sumber yang dapat dibaca agent.
4. **Tool allowlist** membatasi aksi dan API yang dapat dijalankan.
5. **Output guard** memeriksa hasil sebelum dikirim ke WhatsApp.
6. **Handoff policy** menangani pertanyaan di luar scope atau berisiko.

Pilihan `outOfScopeAction`:

- `REJECT`: berikan jawaban penolakan yang ditentukan.
- `HANDOFF`: serahkan kepada operator.
- `STATIC_RESPONSE`: gunakan respons aman yang ditentukan.
- `IGNORE`: simpan pesan tanpa balasan otomatis.

Untuk scope ketat, classifier kecil dapat digunakan sebelum model utama dan menghasilkan output terstruktur:

```json
{
  "withinScope": false,
  "reason": "Pertanyaan tidak terkait layanan agent",
  "action": "HANDOFF"
}
```

Classifier dapat dinonaktifkan untuk agent sederhana agar penggunaan token lebih hemat.

## 25. Isolasi Tenant, Agent, dan Akun Pengguna

Template agent boleh sama, tetapi agent operasional tidak boleh dipakai bersama secara langsung oleh tenant berbeda.

- `AgentTemplate` hanya berisi struktur umum dan tidak menyimpan data pelanggan.
- Sistem membuat `AiAgent` baru milik tenant saat template digunakan.
- Knowledge, memory, target, session, dan execution selalu merujuk `tenantId` dan `agentId` hasil salinan.
- Perubahan agent tenant A tidak memengaruhi agent tenant B.

### 25.1 Application dan Database Layer

Semua query agent harus menyertakan tenant:

```ts
where: {
  id: agentId,
  tenantId: user.tenantId
}
```

Client tidak boleh menentukan `tenantId` yang dipercaya server. Tenant selalu diambil dari authentication context.

- Semua tabel agent memiliki ownership tenant yang dapat diverifikasi.
- Gunakan composite unique/index yang memasukkan tenant jika diperlukan.
- Pertimbangkan PostgreSQL Row-Level Security sebagai defense-in-depth setelah pola transaksi Prisma disiapkan.

### 25.2 Redis, Vector, dan File Namespace

```text
agent:session:{tenantId}:{agentId}:{instanceId}:{scopeKey}
agent:memory:{tenantId}:{agentId}:{sessionId}
agent:lock:{tenantId}:{inboundMessageId}
knowledge:cache:{tenantId}:{sourceId}:{version}
```

Semantic retrieval wajib memiliki filter minimum `tenantId`, `agentId`, dan `knowledgeSourceIds`. Query vector tanpa filter tenant harus ditolak.

File knowledge disimpan menggunakan struktur:

```text
tenants/{tenantId}/agents/{agentId}/knowledge/{fileId}
```

## 26. Pemisahan Memory dan Knowledge

Memory dan knowledge memiliki fungsi berbeda.

| Komponen | Fungsi | Scope default |
|---|---|---|
| System prompt | Identitas dan aturan permanen | Per agent/version |
| Knowledge | Fakta, SOP, produk, sheet, dan API | Per tenant dan agent |
| Short-term memory | Pesan terakhir | Per session |
| Conversation summary | Ringkasan history panjang | Per session |
| Long-term memory | Fakta pengguna yang diizinkan | Per tenant, agent, dan contact |
| Execution log | Catatan teknis pemrosesan | Per tenant dan execution |

Aturan default:

- Agent tidak dapat membaca memory agent lain.
- Agent tidak dapat membaca knowledge yang belum dipasangkan.
- Sharing knowledge harus eksplisit melalui relasi dan permission.
- Long-term memory dinonaktifkan secara default.
- Pengguna dapat melihat, memperbaiki, dan menghapus long-term memory.
- Brainstorming Agent Builder tidak menjadi memory operasional agent.
- Memory group tidak boleh tercampur dengan percakapan pribadi.

Agent dengan nama atau template sama pada dua tenant tetap memiliki ID, source, memory, session, dan vector namespace berbeda.

## 27. Context Builder dan Efisiensi Token

Obsidian tidak digunakan sebagai memory engine. Obsidian dapat menjadi sumber dokumen Markdown, tetapi tidak menggantikan retrieval, memory, dan context management.

Komponen penyimpanan yang disarankan:

- PostgreSQL untuk konfigurasi, metadata, session, dan structured memory.
- Redis untuk cache, lock, cooldown, rate limit, dan state cepat.
- `pgvector` untuk semantic retrieval pada tahap awal.
- S3/MinIO untuk file saat volume bertambah.
- BullMQ untuk indexing, sync, summary, dan AI execution.

### 27.1 Context Assembly

```text
System prompt dan scope contract
+ instruksi agent
+ conversation summary
+ beberapa pesan terakhir
+ knowledge paling relevan
+ pesan terbaru pengguna
```

Model AI tidak diberi akses langsung ke seluruh database atau seluruh knowledge tenant.

### 27.2 Strategi Hemat Token

- Ambil pesan terakhir sesuai `historyLimit`.
- Ringkas history lama menjadi `memorySummary`.
- Retrieval hanya mengambil top-k potongan relevan.
- Batasi ukuran chunk dan total context.
- Jangan memasukkan field yang tidak relevan.
- Cache retrieval yang aman untuk pertanyaan berulang.
- Gunakan classifier kecil hanya jika diperlukan.
- Gunakan prompt caching jika provider mendukungnya.
- Simpan fakta sebagai structured memory, bukan seluruh percakapan.

Contoh pembagian context budget:

- 15% system prompt, scope, dan guardrail.
- 15% conversation summary.
- 20% pesan terbaru.
- 35% knowledge relevan.
- 15% ruang output.

### 27.3 Context Trace

Execution detail mencatat metadata tanpa membocorkan secret:

- Agent version dan scope decision.
- Session ID.
- Knowledge source dan chunk ID.
- Jumlah history dan estimasi token per bagian.
- Provider/model.
- Output guard result.

## 28. Pipeline Agent yang Diperbarui

```text
Inbound WhatsApp
  -> tenant dan instance validation
  -> identity normalization
  -> event/message deduplication
  -> deterministic agent routing
  -> session resolution
  -> scope classification
  -> memory isolation lookup
  -> knowledge retrieval dengan tenant/agent filter
  -> context budget assembly
  -> AI provider execution
  -> output guard
  -> outbound queue
  -> memory dan execution log
```

Pipeline bersifat fail-closed: jika ownership, scope, atau permission tidak dapat dipastikan, data tersebut tidak boleh dimasukkan ke context AI.
