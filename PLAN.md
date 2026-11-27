# Galeri CRM — Geliştirme Planı

## Faz 0 — Hazırlık
- [x] Node.js (LTS), pnpm ve Git kurulumu
- [ ] PostgreSQL (yerel Docker veya Neon/Supabase)
- [x] Next.js + TypeScript + Tailwind + shadcn/ui projesinin oluşturulması
- [x] ESLint, Prettier, Vitest, Playwright ayarları
- [x] Prisma şemasının ilk sürümü ve seed verisi (migration veritabanı kurulunca)

## Faz 1 — Temel (MVP çekirdeği)
- [ ] Kayıt / giriş (Auth.js), galeri (organization) oluşturma
- [ ] Kullanıcı davet etme ve roller (Sahip, Yönetici, Satışçı)
- [ ] Kiracı izolasyonu ve yetki katmanı (+ testleri)
- [ ] Uygulama iskeleti: kenar menü, üst bar, mobil menü, tema

## Faz 2 — Lead Yönetimi (MVP'nin kalbi)
- [ ] Elle lead ekleme (hızlı form: ad, telefon, kaynak, ilgilendiği araç)
- [ ] Lead listesi: arama, filtre (kaynak, durum, satışçı, tarih), sıralama
- [ ] Kanban görünümü (sürükle-bırak ile durum değişikliği)
- [ ] Lead detay sayfası: bilgiler, zaman çizelgesi, notlar
- [ ] Tek dokunuşla ara / WhatsApp butonları
- [ ] Satışçıya atama (elle ve sıralı otomatik dağıtım)
- [ ] Mükerrer lead tespiti (telefon numarasına göre) ve birleştirme
- [ ] Kaybedilen lead için neden seçimi

## Faz 3 — Araç Stoğu
- [ ] Araç ekleme/düzenleme (marka, model, yıl, km, fiyat, fotoğraflar)
- [ ] Araç durumu: Satışta / Rezerve / Satıldı
- [ ] Lead ↔ araç ilişkilendirme; araç sayfasında ilgilenen lead'ler
- [ ] Takas aracı bilgisi girişi

## Faz 4 — Takip ve Hatırlatmalar
- [ ] Görev / hatırlatma oluşturma ("Yarın ara")
- [ ] Bugünün görevleri ve gecikmiş görevler ekranı
- [ ] Yeni lead ve geciken takip için bildirim (uygulama içi + e-posta)
- [ ] "İlk yanıt süresi" takibi (lead geldikten sonra ilk temasa kadar geçen süre)

## Faz 5 — Lead Toplama Entegrasyonları
- [ ] Galeri web sitesi için gömülebilir lead formu + webhook
- [ ] Meta (Facebook/Instagram) Lead Ads entegrasyonu (resmi API)
- [ ] WhatsApp Business Platform entegrasyonu (resmi API)
- [ ] sahibinden / arabam.com: resmi entegrasyon imkânının araştırılması; yoksa bildirim e-postalarının ayrıştırılması veya hızlı elle giriş
- [ ] CSV / Excel ile toplu lead içe aktarma

## Faz 6 — Raporlar ve Panel
- [ ] Ana panel: bugünkü yeni lead'ler, bekleyen görevler, aylık satış
- [ ] Kaynak bazlı dönüşüm oranı (hangi kanal satış getiriyor?)
- [ ] Satışçı performansı (lead sayısı, dönüşüm, ortalama yanıt süresi)
- [ ] Pipeline hunisi ve kayıp nedenleri dağılımı
- [ ] Excel'e dışa aktarma

## Faz 7 — Yayına Hazırlık
- [ ] KVKK: aydınlatma metni, rıza kaydı, veri silme/dışa aktarma
- [ ] Hata izleme ve loglama
- [ ] Yedekleme stratejisi
- [ ] Üretime dağıtım (Vercel + yönetilen PostgreSQL)
- [ ] Pilot galeri ile test ve geri bildirim

## Sonraki Aşamalar (MVP sonrası)
- Abonelik ve ödeme (iyzico / Stripe)
- PWA / mobil bildirimler
- SMS gönderimi
- Kredi başvurusu takibi
- Yapay zekâ destekli lead önceliklendirme ve mesaj önerileri
