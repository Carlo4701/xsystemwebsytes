# XSYSTEM TRACKER

Konum ve Cihaz Bilgisi Takip Sistemi — XSYSTEM temasıyla.

---

## 📁 Klasör Yapısı

```
xsystem-tracker/
├── app.js                  ← Ana sunucu (Express + Socket.io + Redis)
├── package.json
└── public/
    ├── index.html          ← Ana panel (link oluşturma)
    ├── tracker.html        ← Hedef sayfası (kurban açar)
    ├── dashboard.html      ← Canlı izleme paneli
    └── expired.html        ← Süresi dolmuş link sayfası
```

---

## ⚡ Kurulum

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Redis Başlat

**macOS (Homebrew):**
```bash
brew install redis && brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt install redis-server && sudo systemctl start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 redis:alpine
```

### 3. Sunucuyu Çalıştır

```bash
npm start
# veya geliştirme için:
npm run dev
```

### 4. Tarayıcıda Aç

```
http://localhost:3000
```

---

## 🔧 Ortam Değişkenleri

| Değişken    | Varsayılan              | Açıklama          |
|-------------|-------------------------|-------------------|
| `PORT`      | `3000`                  | Sunucu portu      |
| `REDIS_URL` | `redis://localhost:6379` | Redis bağlantısı  |

---

## 🌊 İş Akışı

1. Ana sayfada **"TAKİP LİNKİ OLUŞTUR"** butonuna bas
2. Oluşan **Takip Linkini** hedefe gönder
3. **Dashboard Linkini** kendin aç → izlemeyi başlat
4. Hedef linke tıkladığında cihaz bilgileri anında gelir
5. Hedef konum iznini verirse → haritada canlı konum görürsün
6. **15 dakika** sonra oturum otomatik silinir

---

## 🛡️ Güvenlik Özellikleri

- Konsol açma engeli (F12, Ctrl+Shift+I)
- Sağ tık engeli
- Redis TTL ile otomatik veri silimi (15 dk)
- Konum verisi sadece o oturumda yaşar

---

## 📦 Kullanılan Paketler

| Paket       | Versiyon | Kullanım                    |
|-------------|----------|-----------------------------|
| express     | ^4.18    | HTTP sunucu                 |
| socket.io   | ^4.7     | WebSocket gerçek zamanlı    |
| redis       | ^4.6     | Oturum depolama (TTL)       |
| uuid        | ^9.0     | Benzersiz session ID        |
| leaflet     | CDN      | Harita (OpenStreetMap)      |

---

**XSYSTEM SOFTWARE © 2026**
