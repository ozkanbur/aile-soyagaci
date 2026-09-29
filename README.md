# 🌳 PROFESYONEL DİJİTAL AİLE SOYAĞACI (Digital Family Tree)

> **"Geçmişimizden Geleceğimize..."**  
> Nesiller boyu kullanılabilecek, tamamen ücretsiz altyapı üzerinde çalışan, mobil uyumlu, yüksek performanslı ve premium tasarımlı dijital aile arşivi web uygulaması.

---

## 🌟 Öne Çıkan Özellikler

- 🏆 **Futbolcu Koleksiyon Kartı Estetiği**: Birey kartları fotoğraf odaklı, kuşak rozetli, yaş/vefat indicators içeren altın yaldız detaylı koleksiyon kartı formatında gösterilir.
- 🌳 **Dinamik İnteraktif Soyağacı Motoru**: Tüm aile ağacı SVG üzerinde yüksek performansla çizilir.
- 🔍 **Zoom & Pan (Yakınlaştır & Sürükle)**: Fare tekerleği, dokunmatik pinch-zoom ve sürükleme desteği.
- 🎯 **Merkez Kişi Odaklanması**: Ağaçtaki her kişiye tıklanarak "Merkez Kişi" yapılabilir.
- 📱 **Mobil & Android Uyumlu**: Mobil cihazlarda alt navigasyon barı (`🌳 Soyağacı | 🔎 Ara | 👨‍👩‍👧 Ailem | 🔐 Yönetim`), dokunmatik butonlar ve responsive tasarım.
- 👶 **"Yeni Çocuk" Hızlı İş Akışı**: Anne ve baba seçilerek çocuk kaydedildiğinde, ebeveyn-çocuk ilişkileri otomatik kurulur.
- 🔐 **Çift Seviyeli Yetkilendirme**: Misafirler salt okuma yapar; Yönetici kişi ekleyebilir, düzenleyebilir, silebilir ve ilişki yönetebilir.
- 🖨 **Özel Çerçeveli Yazdırma**: `@media print` desteği ve özel altın yaldızlı A4/A3 baskı çerçevesi.
- 💾 **JSON Veri Yedeği**: Tek tıkla verileri indirip geri yükleme imkanı.
- ⚡ **Demo Modu & Canlı Firebase Modu**: Firebase bilgileri girilmemişse otomatik olarak zengin örnek veri setiyle çalışır.

---

## 📁 Dosya ve Klasör Mimarisi

```text
family-tree/
├── index.html                  # Ana Uygulama (Ağaç Görünümü, Arama, Modal Ekranlar)
├── login.html                  # Yönetici Giriş Ekranı
├── css/
│   ├── variables.css           # Tasarım sistemi renk ve font değişkenleri
│   ├── global.css              # Reset ve temel stiller
│   ├── header.css              # Üst menü ve istatistik çubuğu
│   ├── tree.css                # SVG ağaç çizim ve zoom/pan kontrolleri
│   ├── person-card.css         # Futbolcu kartı tasarımı
│   ├── modal.css               # Kişi detay ve form pencereleri
│   ├── admin.css               # Yönetici araç çubuğu
│   ├── mobile.css              # Mobil alt menü ve responsive ayarlar
│   └── print.css               # Yazdırma ve dekoratif aile çerçevesi
├── js/
│   ├── config.js               # Uygulama ve Firebase yapılandırma ayarları
│   ├── utils.js                # Tarih ve Türkçe metin araçları
│   ├── photos.js               # Google Drive resim dönüştürücü ve profil resmi üreteci
│   ├── database.js             # Firebase & Demo modu veri katmanı
│   ├── auth.js                 # Giriş yetki kontrolü
│   ├── people.js               # Kişi veri modeli ve doğrulamalar
│   ├── relationships.js        # Akrabalık hesaplama motoru (Anne/Baba, Eş, Çocuk, Kardeş)
│   ├── tree.js                 # SVG Dinamik Ağaç Çizim Motoru
│   ├── search.js               # Anlık Türkçe arama motoru
│   ├── admin.js                # Yönetici formları ve "Yeni Çocuk" akışı
│   ├── backup.js               # JSON dışa/içe aktarma
│   ├── print.js                # Yazdırma kontrolörü
│   └── app.js                  # Uygulama başlatıcı (Bootstrap)
├── data/
│   └── demo-data.json          # Örnek 4 kuşaklık aile verisi
├── database.rules.json         # Firebase Realtime Database Güvenlik Kuralları
└── README.md                   # Kurulum rehberi
```

---

## 🚀 GİTHUB PAGES & FIREBASE KURULUM REHBERİ (ADIM ADIM)

Bu uygulamayı tamamen **ÜCRETSİZ** olarak GitHub Pages üzerinde yayınlamak ve verilerinizi Firebase üzerinde saklamak için aşağıdaki adımları sırasıyla uygulayabilirsiniz:

### 1️⃣ Adım: GitHub Repository Oluşturma ve Yükleme
1. [GitHub.com](https://github.com) sitesine ücretsiz üye olun ve **New Repository** butonuna tıklayın.
2. Repository adını `family-tree` veya `aile-soyagaci` yapın ve **Public** olarak işaretleyin.
3. Proje klasöründeki tüm dosyaları GitHub repository'nize yükleyin (veya Git komutlarıyla push edin).
4. GitHub repository sayfanızda **Settings > Pages** sekmesine gidin.
5. **Source** kısmında `Deploy from a branch` ve branch olarak `main` (veya `master`) `/ (root)` seçip **Save** butonuna basın.
6. Birkaç dakika sonra siteniz `https://kullaniciadiniz.github.io/family-tree/` adresinde yayına girecektir!

---

### 2️⃣ Adım: Firebase Projesi Oluşturma
1. [Firebase Console](https://console.firebase.google.com/) adresine Google hesabınızla giriş yapın.
2. **"Project add" (Proje Ekle)** butonuna tıklayın. Proje adını `Aile-Soyagaci` yazıp projeyi oluşturun.
3. Proje ana sayfasında **Web (`</>`)** simgesine tıklayarak yeni bir web uygulaması ekleyin.
4. Size verilen `firebaseConfig` kod parçasını kopyalayın.

---

### 3️⃣ Adım: Firebase Authentication (Giriş Sistemi) Aktifleştirme
1. Firebase konsolunda sol menüden **Build > Authentication** sekmesine gidin.
2. **Get Started** butonuna tıklayın.
3. **Sign-in method** sekmesinden **Email/Password** seçeneğini etkinleştirin ve kaydedin.
4. **Users** sekmesine gelip **Add user (Kullanıcı Ekle)** butonuna basın. Kendi e-postanızı ve güvenli yönetici şifrenizi girerek admin hesabınızı oluşturun.

---

### 4️⃣ Adım: Firebase Realtime Database & Güvenlik Kuralları
1. Sol menüden **Build > Realtime Database** sekmesine gidin.
2. **Create Database (Veritabanı Oluştur)** butonuna basın. Konum olarak size yakın bir bölge seçin.
3. **Rules (Kurallar)** sekmesine gelin ve projedeki `database.rules.json` dosyasının içeriğini buraya yapıştırıp **Publish** butonuna basın:

```json
{
  "rules": {
    ".read": true,
    "people": {
      ".read": true,
      ".write": "auth != null"
    },
    "relationships": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```
*Bu kural sayesinde aile bireyleri ve misafirler soyağacını şifresiz görüntüleyebilir, ancak yalnızca siz (Admin) giriş yaptığınızda veri ekleyebilir, düzenleyebilir veya silebilirsiniz.*

---

### 5️⃣ Adım: Yapılandırma Bilgilerini `js/config.js` Dosyasına Ekleme
1. Projenizdeki `js/config.js` dosyasını açın.
2. Firebase'den aldığınız bilgileri ve aile adınızı ilgili alanlara yazın:

```javascript
const CONFIG = {
  APP_NAME: "Dijital Aile Soyağacı",
  FAMILY_NAME: "Kanbur Ailesi", // Kendi soyadınızı yazın
  DEMO_MODE: false, // Canlı Firebase için false yapın

  FIREBASE_CONFIG: {
    apiKey: "AIzaSy...",
    authDomain: "projeniz.firebaseapp.com",
    databaseURL: "https://projeniz-default-rtdb.firebaseio.com",
    projectId: "projeniz",
    storageBucket: "projeniz.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef"
  }
};
```
3. Değişikliği kaydedip GitHub'a yükleyin. Artık canlı Firebase veritabanınız aktif!

---

## 📷 Fotoğraf Yükleme (Google Drive Ücretsiz Yöntem)

Fotoğrafları veritabanını şişirmemek için doğrudan bağlantı veya Google Drive üzerinden ekleyebilirsiniz:

1. Fotoğrafı **Google Drive**'a yükleyin.
2. Fotoğrafa sağ tıklayıp **Paylaş > Bağlantıya sahip olan herkes görüntüleyebilir** seçeneğini ayarlayın.
3. Bağlantıyı kopyalayın (Örn: `https://drive.google.com/file/d/1ABC...xyz/view?usp=sharing`).
4. Kişi ekleme formundaki **Fotoğraf URL** alanına bu bağlantıyı doğrudan yapıştırın. Uygulama otomatik olarak bu bağlantıyı yüksek performanslı resim formatına çevirecektir!

---

## 📄 Yazdırma & Çerçeve
Yönetici panelindeki **🖨 Soyağacını Yazdır** butonuna bastığınızda, tarayıcınız A4 veya A3 kağıdına uygun, altın filigranlı özel aile çerçevesi ile çıktıyı hazırlar.

---

## ⚙️ Lisans & Telif
Bu proje açık kaynaklı olup, aile arşivinizi korumak ve nesiller boyu yaşatmak amacıyla geliştirilmiştir.
