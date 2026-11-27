# CLAUDE.md — Galeri CRM

Bu dosya, bu projede çalışan Claude (ve geliştiriciler) için kuralları, teknolojileri ve proje bağlamını tanımlar. Her oturumda önce bu dosyayı dikkate al.

---

## 1. Proje Özeti

**Galeri CRM**, oto galerilerinin farklı kanallardan gelen tüm müşteri adaylarını (lead) tek bir yerde toplayıp, takip edip satışa dönüştürmesi için geliştirilen bir web uygulamasıdır.

- **Hedef kullanıcı:** Türkiye'deki küçük ve orta ölçekli oto galerileri (1–30 çalışan).
- **Temel problem:** Lead'ler sahibinden, arabam.com, Instagram, Facebook, WhatsApp, telefon ve web sitesi gibi dağınık kanallardan gelir; takip edilmez, unutulur, satış kaçar.
- **Temel değer:** Hiçbir lead kaybolmasın, her lead'e hızlı dönüş yapılsın, hangi kanalın satış getirdiği görülsün.
- **Model:** Çok kiracılı (multi-tenant) SaaS. Her galeri ayrı bir "organization"dır ve verileri birbirinden tamamen izoledir.

## 2. Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Framework | **Next.js 15 (App Router)** + **TypeScript** (strict) |
| UI | **Tailwind CSS** + **shadcn/ui** (Radix tabanlı), ikonlar: **lucide-react** |
| Form & doğrulama | **React Hook Form** + **Zod** |
| Sunucu verisi | Server Components + **Server Actions**; istemci tarafı önbellek gerekirse **TanStack Query** |
| Veritabanı | **PostgreSQL** |
| ORM | **Prisma** |
| Kimlik doğrulama | **Auth.js (NextAuth v5)** — e-posta/şifre + Google |
| Arka plan işleri | **Inngest** veya **BullMQ + Redis** (hatırlatmalar, entegrasyon senkronu) |
| Dosya depolama | S3 uyumlu depolama (araç fotoğrafları, belgeler) |
| E-posta | **Resend** |
| Test | **Vitest** (unit), **Playwright** (e2e) |
| Kod kalitesi | **ESLint** + **Prettier** |
| Paket yöneticisi | **pnpm** |
| Dağıtım | Vercel (uygulama) + yönetilen PostgreSQL (Neon / Supabase) |

Yeni bir kütüphane eklemeden önce mevcut yığınla çözülüp çözülemeyeceğini kontrol et. Gerekiyorsa gerekçesini belirt.

## 3. Klasör Yapısı

```
src/
  app/
    (auth)/              # giriş, kayıt, şifre sıfırlama
    (dashboard)/         # giriş yapılmış alan
      leads/             # lead listesi, detay, kanban
      vehicles/          # araç stoğu
      customers/         # müşteri kartları
      tasks/             # görevler & hatırlatmalar
      reports/           # raporlar
      settings/          # galeri, kullanıcılar, entegrasyonlar
    api/
      webhooks/          # dış kaynaklardan lead alımı
  components/
    ui/                  # shadcn bileşenleri (elle düzenleme minimum)
    leads/ vehicles/ ... # alana özel bileşenler
  lib/
    db.ts                # Prisma client (tek instance)
    auth.ts              # Auth.js yapılandırması
    permissions.ts       # rol/yetki kontrolleri
    validations/         # Zod şemaları
  server/
    actions/             # Server Actions (alan bazlı dosyalar)
    services/            # iş mantığı (UI'dan bağımsız)
    integrations/        # lead kaynak entegrasyonları
prisma/
  schema.prisma
  seed.ts
tests/
  unit/ e2e/
```

## 4. Alan Modeli (Domain)

Ana varlıklar:

- **Organization** (Galeri): ad, logo, adres, abonelik bilgisi.
- **User**: bir galeriye bağlı; roller: `OWNER`, `MANAGER`, `SALES`.
- **Lead**: müşteri adayı. Alanlar: ad, telefon, e-posta, **kaynak** (`SAHIBINDEN`, `ARABAM`, `INSTAGRAM`, `FACEBOOK`, `WHATSAPP`, `PHONE`, `WEBSITE`, `WALK_IN`, `REFERRAL`, `OTHER`), ilgilendiği araç, bütçe, takas talebi, kredi talebi, atanan satışçı, durum, sıcaklık (`HOT`/`WARM`/`COLD`).
- **Lead durumu (pipeline):** `NEW` → `CONTACTED` → `APPOINTMENT` → `TEST_DRIVE` → `NEGOTIATION` → `WON` / `LOST` (kaybedilme nedeni zorunlu).
- **Vehicle** (Araç): marka, model, yıl, km, yakıt, vites, renk, plaka, şasi no, fiyat, durum (`AVAILABLE`, `RESERVED`, `SOLD`), fotoğraflar.
- **Activity**: lead üzerindeki her etkileşim (arama, mesaj, not, durum değişikliği). Zaman çizelgesi bundan üretilir.
- **Task**: hatırlatma/görev (ör. "Yarın 14:00'te ara"), bir lead'e ve kullanıcıya bağlı.
- **TradeIn** (Takas): müşterinin takasa vermek istediği araç bilgileri.
- **Customer**: satışa dönüşen lead'ler için müşteri kartı.

Aynı telefon numarasıyla gelen lead'ler **mükerrer** olarak tespit edilmeli ve birleştirme önerilmelidir.

## 5. Zorunlu Kurallar

### Güvenlik ve veri izolasyonu
- **Her veritabanı sorgusu `organizationId` ile filtrelenmelidir.** Bu kuralın istisnası yoktur. Kiracı filtresi servis katmanında merkezi olarak uygulanır.
- Her Server Action ve API route'unda önce oturum, sonra yetki (rol) kontrolü yapılır.
- `SALES` rolü varsayılan olarak yalnızca kendisine atanmış lead'leri görür; `MANAGER` ve `OWNER` tümünü görür.
- Kullanıcıdan gelen tüm girdiler sunucu tarafında **Zod** ile doğrulanır. İstemci tarafı doğrulama yalnızca kullanıcı deneyimi içindir.
- Webhook uçları imza/gizli anahtar ile doğrulanır.
- Gizli anahtarlar yalnızca `.env` dosyasında tutulur; asla koda veya commit'e girmez. `.env.example` güncel tutulur.

### KVKK
- Kişisel veriler (ad, telefon, e-posta) yalnızca gerekli yerlerde gösterilir ve loglara yazılmaz.
- Lead kaydında açık rıza / aydınlatma metni onayı bilgisi saklanır.
- Bir kişinin verilerini silme (anonimleştirme) ve dışa aktarma özelliği desteklenmelidir.

### Kod stili
- TypeScript `strict` modu açık; `any` kullanılmaz (zorunluysa gerekçeli yorum eklenir).
- **Kod, değişken, fonksiyon, veritabanı alanı ve commit mesajları İngilizce**; **kullanıcıya görünen tüm metinler Türkçe**.
- Arayüz metinleri doğrudan bileşenlere gömülmez; ileride çoklu dil için `messages/tr.json` üzerinden okunur.
- Varsayılan olarak Server Component kullan; `"use client"` yalnızca etkileşim gerektiğinde.
- İş mantığı `server/services/` içinde olur; bileşenler ve action'lar ince kalır.
- Bileşen dosyaları `kebab-case.tsx`, bileşen adları `PascalCase`.
- Küçük, tek amaçlı fonksiyonlar; tekrar eden mantık için önce mevcut bir yardımcı ara.

### Türkiye'ye özel biçimler
- Para birimi: `₺` / TRY, `Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })`.
- Tarih: `GG.AA.YYYY`, saat dilimi `Europe/Istanbul`.
- Telefon: `+90` formatında normalize edilerek saklanır (E.164), `0 (5xx) xxx xx xx` olarak gösterilir.
- Plaka formatı doğrulanır (ör. `34 ABC 123`).

### Arayüz
- **Mobil öncelikli** tasarım: satışçılar çoğunlukla telefondan kullanır.
- Lead kartında tek dokunuşla **ara** (`tel:`) ve **WhatsApp'ta yaz** (`https://wa.me/`) butonları bulunur.
- Açık ve koyu tema desteklenir.
- Erişilebilirlik: tüm etkileşimli öğeler klavye ile kullanılabilir, form alanlarının etiketi vardır.

### Veritabanı
- Şema değişiklikleri yalnızca **Prisma migration** ile yapılır (`prisma migrate dev`); üretim veritabanında elle değişiklik yapılmaz.
- Her tabloda `id` (cuid), `createdAt`, `updatedAt`; kiracıya ait tablolarda `organizationId` ve bunun üzerinde indeks bulunur.
- Silme işlemleri lead ve müşteri için **soft delete** (`deletedAt`) şeklindedir.

### Test
- Servis katmanındaki iş mantığı için unit test yazılır (özellikle yetki, kiracı izolasyonu, mükerrer lead tespiti).
- Kritik akışlar (giriş, lead oluşturma, durum değiştirme) için Playwright e2e testi bulunur.
- Bir özellik bitti denmeden önce `pnpm lint`, `pnpm typecheck` ve `pnpm test` hatasız geçmelidir.

## 6. Komutlar

```bash
pnpm install            # bağımlılıkları kur
pnpm dev                # geliştirme sunucusu (http://localhost:3000)
pnpm build              # üretim derlemesi
pnpm lint               # ESLint
pnpm typecheck          # tsc --noEmit
pnpm test               # Vitest
pnpm test:e2e           # Playwright
pnpm db:migrate         # prisma migrate dev
pnpm db:seed            # örnek galeri, kullanıcı, araç ve lead verisi
pnpm db:studio          # Prisma Studio
```

## 7. Claude İçin Çalışma Kuralları

- Büyük bir özelliğe başlamadan önce kısa bir plan sun, sonra uygula.
- Mevcut kodu okumadan değiştirme; mevcut desenleri ve bileşenleri yeniden kullan.
- İstenmeyen kapsam genişletmesi yapma; fark ettiğin ek iyileştirmeleri öneri olarak belirt.
- Veritabanı şemasını değiştirdiğinde migration oluştur ve seed verisini güncelle.
- Kiracı izolasyonu veya yetkiyle ilgili bir değişiklikte mutlaka test ekle.
- Dış entegrasyonlarda (sahibinden, arabam.com, Meta, WhatsApp) resmi API'nin varlığını ve kullanım şartlarını doğrulamadan kazıma (scraping) çözümü yazma.
- Commit mesajları Conventional Commits formatında ve İngilizce: `feat(leads): add kanban view`.
- Kullanıcıyla Türkçe iletişim kur.

## 8. Yol Haritası

Ayrıntılı plan için `PLAN.md` dosyasına bak.
