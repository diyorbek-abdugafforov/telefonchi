# Telefon Savdosi va Ombor Hisobini Avtomatlashtirish Tizimi (POS & ERP)

Ushbu tizim O'zbekiston telefon bozori (Malika, Abu Saxiy, viloyat savdo majmualari) standartlari hamda taqdim etilgan **Texnik Topshiriq (TZ v1.0)** talablari asosida to'liq ishlab chiqilgan.

---

## 🚀 Tizimni Ishga Tushirish

### 1. Barcha modullarni o'rnatish va ishlab chiqarish versiyasini yaratish (Frontend Build):
```bash
# Asosiy papkada dependencies o'rnatilgan bo'lsa:
npm start
```
Tizim avtomatik tarzda `http://localhost:5000` manzilida ishga tushadi.

Agar dasturni ishlab chiqish (Development) rejimida ishga tushirmoqchi bo'lsangiz:
```bash
# Backend serverni ishga tushirish (Port: 5000)
npm run server

# Alohida terminalda Vite Frontendni ishga tushirish (Port: 5173)
npm run client
```

---

## 🔑 Tizim Foydalanuvchilari va Rollar (Demo ma'lumotlar)

Yuqori o'ng burchakdagi **"Demo: Rolni almashtirish"** menyusi orqali bir marta bosish bilan istalgan rolga o'tishingiz mumkin:

| Rol | Foydalanuvchi | Login | Parol | Ruxsatlar va Cheklovlar |
|---|---|---|---|---|
| **Admin (Do'kon Egasi)** | Azizbek Karimov | `admin` | `admin123` | Barcha modullar, tannarx va sof foydani ko'rish, xodimlarni boshqarish |
| **Menejer** | Bobur Aliyev | `manager` | `manager123` | Savdo, ombor, mijozlar va P&L hisoboti |
| **Sotuvchi (POS)** | Jasur Mirzayev | `seller` | `seller123` | Faqat POS savdo, ombor qoldig'i, mijozlar (Tannarx va foyda yashirilgan) |
| **Kassir** | Dilnoza Umarova | `cashier` | `cashier123` | Kassa, smena ochish/yopish, nasiya to'lovlarini qabul qilish |
| **Omborchi** | Sarvar Norov | `warehouse` | `warehouse123` | Mahsulot qabul qilish, filiallararo o'tkazma, inventarizatsiya |
| **Usta (Servis)** | Alisher Usta | `technician` | `technician123` | Ta'mirlash buyurtmalari, ehtiyot qismlar, kafolat tekshiruvi |

---

## 📱 Amalga Oshirilgan Asosiy Funksiyalar (TZ bo'yicha)

1. **Rollar va Xavfsizlik (RBAC & Audit)**:
   - Sotuvchi va kassirlarga telefonlarning **tannarxi (`cost_price`)** va do'konning sof foydasi backend va frontend darajasida yashirilgan.
   - Ishdan bo'shatilgan xodimlar bazadan o'chirilmaydi (**Never Delete**), uning seanslari majburan yopiladi va barcha savdo/kafolat tarixlari saqlanadi.
   - Faol seanslarni real vaqtda kuzatish va bir tugma bilan **"Majburan yopish"** imkoniyati.
   - Ish vaqtidan (09:00 - 20:00) tashqarida kirishlar bo'yicha xavfsizlik ogohlantirishlari.

2. **Telefon Kartochkasi va 15 xonali Luhn Algoritmi**:
   - Yangi va B/U (Ishlatilgan) telefonlar hisobi.
   - 15 xonali IMEI kodini Luhn algoritmi orqali avtomatik tekshirish.
   - Batareya holati (`battery_pct`), tashqi holat bahosi (Ideal, A+, A, B, C) va nuqsonlar ro'yxati.
   - Shtrix-kod va QR-kod yorliqlarini 58mm/80mm termal printerlar uchun chop etish.

3. **Keltirib Sotish (Skupka) va Ta'minotchilar**:
   - Jismoniy shaxslardan telefon sotib olishda pasport ma'lumotlari va o'g'irlanmaganlik tekshiruvi.
   - Avtomatik yuridik kuchga ega **"Telefon qabul qilish dalolatnomasi" (A4 formatda)**.
   - Ta'minotchilardan partiyalab qabul qilish va yuk xarajatlarini har bir telefonga mutanosib taqsimlash.

4. **Kassa (POS) va Savdo Jarayoni**:
   - IMEI va shtrix-kod orqali bir zumda savdoga qo'shish.
   - Bir vaqtning o'zida bir nechta sotuvchi bir xil telefonni sotib yubormasligi uchun ACID tranzaksiya va zaxiralash qulfi.
   - Minimal ruxsat etilgan narx (`min_price`) tekshiruvi bilan chegirma berish.
   - Aralash to'lovlar (Naqd so'm, Naqd USD, Karta, Bank o'tkazmasi).
   - **Trade-in**: Mijozning eski telefonini baholab, yangi telefon narxidan ayirib tashlash va eski telefonni avtomatik omborga qabul qilish.
   - **Nasiya (Muddatli to'lov)**: Boshlang'ich to'lov, ustama foizi va oylik to'lovlar jadvalini avtomatik shakllantirish.
   - 80mm termal kassa cheki va A4 formatdagi kafolat shartnomasini chop etish.

5. **Kassa, Smenalar va Moliya**:
   - Ko'p hisobli kassalar (Asosiy kassa UZS, Valyuta kassasi USD, Bank kartalari, Hisob raqam).
   - Kassir smenasini ochish va yopishda kassa qoldig'ini avtomatik hisoblash (`ortiqcha / kamomad`).
   - Xarajatlar (Ijara, Oyliklar, Reklama, Kommunal) hisobi.

6. **Servis va Ta'mirlash Markazi**:
   - Mijoz telefonlari va ombordagi nuqsonli telefonlar ta'miri.
   - Ombordagi telefon ta'mirlab topshirilgach, unga ketgan ehtiyot qismlar va usta haqi avtomatik ravishda uning **tannarxiga** qo'shiladi va telefon yana omborga sotuvga chiqariladi.
   - 15 xonali IMEI orqali do'kondan sotilgan telefonning kafolat muddatini soniyalarda tekshirish.

7. **Tahlil, P&L va Eksport**:
   - Yalpi savdo, tannarx (COGS), yalpi foyda, operatsion xarajatlar va Sof foyda (Net Profit).
   - Sotuvchilarning savdo hajmi va shaxsiy KPI bo'yicha mukofot hisoboti.
   - Yangi va B/U telefonlarning rentabellik taqqoslamasi.
   - Har oqshom do'kon egasi uchun tayyorlangan **Telegram hisoboti matni**.
   - Barcha ma'lumotlarni Excel (`.xlsx`) formatida yuklab olish.
