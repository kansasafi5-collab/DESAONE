# DESAONE — Arsitektur Teknis Sistem

**Versi Dokumen:** 1.0.0  
**Tanggal:** November 2026  
**Project:** Sendang Duwur Smart Village & Heritage Ecosystem

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DESAONE SYSTEM ARCHITECTURE                     │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        CLIENT LAYER                              │   │
│  │   Browser (Next.js SSR/SSG)  │  Mobile Browser  │  QR Scanner   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                          HTTPS / TLS 1.3                               │
│                                    │                                    │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    NEXT.JS 14 APPLICATION LAYER                  │   │
│  │                                                                  │   │
│  │  ┌─────────────────┐   ┌─────────────────┐   ┌───────────────┐  │   │
│  │  │   App Router    │   │   API Routes    │   │  Middleware   │  │   │
│  │  │  (RSC + Client) │   │  (REST Endpoints│   │  (Auth Guard) │  │   │
│  │  └─────────────────┘   └─────────────────┘   └───────────────┘  │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────┐ │   │
│  │  │                    Business Logic Layer                     │ │   │
│  │  │  Services │ Repositories │ Validators │ Transformers        │ │   │
│  │  └─────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│            │                    │                    │                   │
│     ┌──────▼──────┐    ┌───────▼───────┐   ┌───────▼───────┐           │
│     │  MySQL DB   │    │  Google       │   │   External    │           │
│     │  (Prisma)   │    │  Gemini AI    │   │   Services    │           │
│     │             │    │  (RAG + Chat) │   │  (Maps, CDN)  │           │
│     └─────────────┘    └───────────────┘   └───────────────┘           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack Justification

### Next.js 14 (App Router)
**Mengapa:** Framework full-stack terpadu yang memungkinkan Server-Side Rendering (SSR), Static Site Generation (SSG), dan API Routes dalam satu proyek. App Router memberikan performa optimal dengan React Server Components, streaming, dan partial rendering. Cocok untuk aplikasi desa yang membutuhkan SEO baik sekaligus interaktivitas tinggi.

### TypeScript
**Mengapa:** Type safety mengurangi bug runtime, meningkatkan developer experience, dan memudahkan onboarding developer baru. Sangat krusial untuk proyek skala menengah-besar seperti DESAONE yang memiliki banyak entitas dan relasi kompleks.

### Tailwind CSS
**Mengapa:** Utility-first CSS framework yang memungkinkan pengembangan UI cepat tanpa meninggalkan HTML. Bundle size optimal dengan PurgeCSS bawaan. Konsistensi desain lebih mudah dijaga.

### MySQL + Prisma ORM
**Mengapa MySQL:** Relational database yang mature, reliable, dan familier di ekosistem Indonesia. Dukungan komunitas luas, hosting mudah (cPanel, shared hosting).
**Mengapa Prisma:** Type-safe database access, auto-generated types dari schema, migrations yang bersih, dan Prisma Studio untuk inspeksi data visual.

### NextAuth.js v4
**Mengapa:** Solusi autentikasi battle-tested untuk Next.js. Mendukung multi-provider, session management, JWT, dan mudah dikonfigurasi untuk multi-role access control.

### Google Gemini AI
**Mengapa:** Model AI paling canggih dari Google dengan kemampuan multimodal (teks, gambar). Gratis untuk tier developer. Cocok untuk RAG (Retrieval-Augmented Generation) pada konteks heritage desa.

### Leaflet + OpenStreetMap
**Mengapa:** Alternatif open-source dari Google Maps. Gratis tanpa batas, dapat digunakan offline, dan data OpenStreetMap sudah cukup detail untuk area desa di Indonesia.

### Recharts
**Mengapa:** Library charts yang dibangun di atas D3.js, namun dengan API React-friendly. Ringan, customizable, dan mendukung responsive design.

---

## 3. Folder Structure Lengkap

```
c:\Users\HP\Downloads\desaku\
│
├── app/                                    # Next.js 14 App Router
│   │
│   ├── (auth)/                             # Route group: Authentication
│   │   ├── layout.tsx                      # Auth layout (centered)
│   │   ├── login/
│   │   │   └── page.tsx                    # Login page
│   │   └── register/
│   │       └── page.tsx                    # Register page
│   │
│   ├── (public)/                           # Route group: Public pages
│   │   ├── layout.tsx                      # Public layout (navbar + footer)
│   │   ├── page.tsx                        # Landing / Home page
│   │   ├── tentang/
│   │   │   └── page.tsx                    # Tentang Desa Sendang Duwur
│   │   ├── wisata/
│   │   │   ├── page.tsx                    # List destinasi wisata
│   │   │   └── [slug]/
│   │   │       └── page.tsx                # Detail destinasi
│   │   ├── heritage/
│   │   │   ├── page.tsx                    # Arsip warisan budaya
│   │   │   ├── timeline/
│   │   │   │   └── page.tsx                # Timeline sejarah
│   │   │   └── [slug]/
│   │   │       └── page.tsx                # Detail heritage
│   │   ├── batik/
│   │   │   ├── page.tsx                    # Daftar pengrajin & motif
│   │   │   ├── pengrajin/
│   │   │   │   └── [slug]/page.tsx         # Profil pengrajin
│   │   │   └── motif/
│   │   │       └── [slug]/page.tsx         # Detail motif batik
│   │   ├── umkm/
│   │   │   ├── page.tsx                    # Daftar UMKM
│   │   │   └── [slug]/
│   │   │       └── page.tsx                # Profil UMKM
│   │   ├── produk/
│   │   │   ├── page.tsx                    # Katalog produk
│   │   │   └── [slug]/
│   │   │       └── page.tsx                # Detail produk
│   │   ├── acara/
│   │   │   ├── page.tsx                    # List acara & festival
│   │   │   └── [slug]/
│   │   │       └── page.tsx                # Detail acara
│   │   ├── paket-wisata/
│   │   │   ├── page.tsx                    # Paket wisata
│   │   │   └── [slug]/
│   │   │       └── page.tsx                # Detail paket
│   │   ├── layanan/
│   │   │   ├── page.tsx                    # Layanan publik
│   │   │   └── [id]/
│   │   │       └── page.tsx                # Form layanan
│   │   ├── pelatihan/
│   │   │   ├── page.tsx                    # Program pelatihan
│   │   │   └── [id]/
│   │   │       └── page.tsx                # Detail pelatihan
│   │   ├── peta/
│   │   │   └── page.tsx                    # Peta interaktif
│   │   ├── koneksi-ekonomi/
│   │   │   └── page.tsx                    # Village economic connection
│   │   └── qr/
│   │       └── [code]/
│   │           └── page.tsx                # QR Code landing page
│   │
│   ├── (dashboard)/                        # Route group: Protected dashboards
│   │   ├── layout.tsx                      # Dashboard layout (sidebar)
│   │   ├── dashboard/
│   │   │   └── page.tsx                    # Main dashboard (role-based)
│   │   ├── profil/
│   │   │   └── page.tsx                    # User profile
│   │   ├── keranjang/
│   │   │   └── page.tsx                    # Shopping cart
│   │   ├── pesanan/
│   │   │   ├── page.tsx                    # Order list
│   │   │   └── [id]/page.tsx              # Order detail
│   │   ├── pengaduan/
│   │   │   ├── page.tsx                    # Complaint list
│   │   │   └── baru/page.tsx              # New complaint
│   │   ├── permohonan/
│   │   │   ├── page.tsx                    # Service requests
│   │   │   └── [id]/page.tsx              # Request detail
│   │   ├── notifikasi/
│   │   │   └── page.tsx                    # Notifications
│   │   │
│   │   ├── admin/                          # Admin Desa area
│   │   │   ├── destinasi/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── baru/page.tsx
│   │   │   │   └── [id]/edit/page.tsx
│   │   │   ├── heritage/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── baru/page.tsx
│   │   │   │   └── [id]/edit/page.tsx
│   │   │   ├── layanan/
│   │   │   │   └── page.tsx
│   │   │   ├── pengaduan/
│   │   │   │   └── page.tsx
│   │   │   ├── proyek/
│   │   │   │   └── page.tsx
│   │   │   └── laporan/
│   │   │       └── page.tsx
│   │   │
│   │   └── super-admin/                    # Super Admin area
│   │       ├── pengguna/
│   │       │   └── page.tsx
│   │       ├── pengaturan/
│   │       │   └── page.tsx
│   │       └── audit-log/
│   │           └── page.tsx
│   │
│   ├── api/                                # API Routes
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts               # NextAuth handler
│   │   ├── destinations/
│   │   │   ├── route.ts                   # GET list, POST create
│   │   │   └── [id]/
│   │   │       ├── route.ts               # GET, PUT, DELETE
│   │   │       └── reviews/
│   │   │           └── route.ts           # Reviews CRUD
│   │   ├── heritage/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── batik/
│   │   │   ├── artisans/route.ts
│   │   │   └── motifs/route.ts
│   │   ├── umkm/
│   │   │   └── route.ts
│   │   ├── products/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── cart/
│   │   │   └── route.ts
│   │   ├── orders/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── events/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── register/route.ts
│   │   ├── tourism-packages/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── bookings/
│   │   │   └── route.ts
│   │   ├── services/
│   │   │   ├── route.ts
│   │   │   └── requests/route.ts
│   │   ├── complaints/
│   │   │   └── route.ts
│   │   ├── trainings/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── map/
│   │   │   └── route.ts
│   │   ├── qr/
│   │   │   └── [code]/route.ts
│   │   ├── ai/
│   │   │   ├── chat/route.ts              # Gemini chat endpoint
│   │   │   └── heritage-guide/route.ts   # Heritage AI guide
│   │   ├── analytics/
│   │   │   └── route.ts
│   │   ├── upload/
│   │   │   └── route.ts
│   │   └── village-profile/
│   │       └── route.ts
│   │
│   ├── error.tsx                          # Error boundary
│   ├── not-found.tsx                      # 404 page
│   ├── loading.tsx                        # Global loading
│   ├── globals.css                        # Global styles
│   └── layout.tsx                         # Root layout
│
├── components/
│   ├── ui/                                # Base UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   ├── accordion.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── skeleton.tsx
│   │   └── separator.tsx
│   │
│   ├── layout/
│   │   ├── Navbar.tsx                     # Public navbar
│   │   ├── Footer.tsx                     # Footer
│   │   ├── Sidebar.tsx                    # Dashboard sidebar
│   │   ├── DashboardHeader.tsx
│   │   └── MobileNav.tsx
│   │
│   ├── maps/
│   │   ├── InteractiveMap.tsx             # Main Leaflet map
│   │   ├── MapMarker.tsx                  # Custom markers
│   │   ├── MapPopup.tsx                   # Marker popups
│   │   └── MapFilter.tsx                 # Layer filters
│   │
│   ├── charts/
│   │   ├── VisitorChart.tsx
│   │   ├── EconomicChart.tsx
│   │   └── StatCard.tsx
│   │
│   ├── ai/
│   │   ├── AiChatbot.tsx                  # DEWA chatbot widget
│   │   ├── AiChatMessage.tsx
│   │   └── HeritageGuide.tsx             # AI heritage guide
│   │
│   ├── heritage/
│   │   ├── HeritageCard.tsx
│   │   ├── TimelineItem.tsx
│   │   └── QrCodeDisplay.tsx
│   │
│   ├── tourism/
│   │   ├── DestinationCard.tsx
│   │   ├── PackageCard.tsx
│   │   ├── ReviewCard.tsx
│   │   └── BookingForm.tsx
│   │
│   ├── marketplace/
│   │   ├── ProductCard.tsx
│   │   ├── CartItem.tsx
│   │   └── OrderCard.tsx
│   │
│   └── forms/
│       ├── LoginForm.tsx
│       ├── RegisterForm.tsx
│       ├── ServiceRequestForm.tsx
│       └── ComplaintForm.tsx
│
├── lib/
│   ├── prisma.ts                          # Prisma client singleton
│   ├── auth.ts                            # NextAuth configuration
│   ├── gemini.ts                          # Gemini AI client & helpers
│   ├── utils.ts                           # cn(), formatters, helpers
│   ├── constants.ts                       # App constants
│   └── validations/
│       ├── auth.ts                        # Auth Zod schemas
│       ├── destination.ts
│       ├── product.ts
│       ├── event.ts
│       └── service.ts
│
├── hooks/
│   ├── useAuth.ts                         # Auth hook
│   ├── useCart.ts                         # Cart state
│   ├── useMap.ts                          # Map interactions
│   └── useAiChat.ts                       # AI chat state
│
├── types/
│   ├── index.ts                           # Main type exports
│   ├── auth.ts                            # Auth types
│   ├── api.ts                             # API response types
│   └── next-auth.d.ts                     # NextAuth type augmentation
│
├── prisma/
│   ├── schema.prisma                      # Prisma schema
│   └── seed.ts                            # Seed data
│
├── public/
│   ├── images/
│   │   ├── hero/
│   │   ├── destinations/
│   │   └── batik/
│   ├── icons/
│   └── fonts/
│
├── uploads/                               # User uploads (gitignored)
│
├── .env.example
├── .env.local
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.js
└── package.json
```

---

## 4. API Routes Design

### Konvensi
- **Base URL:** `/api/`
- **Format Response:** JSON `{ success: boolean, data?: T, error?: string, message?: string }`
- **Auth:** Bearer token via NextAuth session cookie
- **Pagination:** `?page=1&limit=10`
- **Filter:** Query params sesuai entity

### Endpoint Utama

```
# Public Endpoints (no auth)
GET    /api/village-profile              # Info desa
GET    /api/destinations                 # List destinasi (+ filter, sort, search)
GET    /api/destinations/:id             # Detail destinasi
GET    /api/destinations/:id/reviews     # Reviews destinasi
GET    /api/heritage                     # List warisan budaya
GET    /api/heritage/:id                 # Detail heritage
GET    /api/batik/artisans               # List pengrajin batik
GET    /api/batik/motifs                 # List motif batik
GET    /api/umkm                         # List UMKM
GET    /api/products                     # Katalog produk
GET    /api/products/:id                 # Detail produk
GET    /api/events                       # List acara
GET    /api/events/:id                   # Detail acara
GET    /api/tourism-packages             # List paket wisata
GET    /api/map                          # Data peta (semua lokasi)
GET    /api/qr/:code                     # QR code lookup

# Protected Endpoints (require auth)
POST   /api/destinations/:id/reviews     # Tambah review (WISATAWAN)
POST   /api/events/:id/register          # Daftar acara (MASYARAKAT)
POST   /api/bookings                     # Booking paket wisata
GET    /api/cart                         # Get cart
POST   /api/cart                         # Add to cart
DELETE /api/cart/:itemId                 # Remove from cart
POST   /api/orders                       # Create order
GET    /api/orders                       # List orders user
GET    /api/orders/:id                   # Detail order
POST   /api/services/requests            # Submit layanan
GET    /api/services/requests            # List permohonan user
POST   /api/complaints                   # Submit pengaduan
GET    /api/complaints                   # List pengaduan user
POST   /api/ai/chat                      # Chat dengan AI
POST   /api/ai/heritage-guide            # AI heritage guide

# Admin Endpoints (require ADMIN role)
POST   /api/destinations                 # Create destinasi
PUT    /api/destinations/:id             # Update destinasi
DELETE /api/destinations/:id             # Delete destinasi
POST   /api/heritage                     # Create heritage
PUT    /api/heritage/:id                 # Update heritage
GET    /api/analytics                    # Analytics data
GET    /api/services/requests (admin)    # Semua permohonan
PATCH  /api/services/requests/:id        # Update status
GET    /api/complaints (admin)           # Semua pengaduan
PATCH  /api/complaints/:id               # Proses pengaduan

# Upload
POST   /api/upload                       # File upload (multipart)
```

---

## 5. Authentication Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                        │
│                                                              │
│  1. User akses halaman protected                            │
│         │                                                    │
│         ▼                                                    │
│  2. Middleware cek session (NextAuth JWT)                   │
│         │                                                    │
│    ┌────┴────┐                                               │
│    │ Session │                                               │
│    │  Valid? │                                               │
│    └────┬────┘                                               │
│    YES  │  NO                                                │
│         │   └──► Redirect ke /login                         │
│         ▼                                                    │
│  3. Cek Role Authorization                                  │
│         │                                                    │
│    ┌────┴────────────┐                                       │
│    │ Role Authorized?│                                       │
│    └────┬────────────┘                                       │
│    YES  │  NO                                                │
│         │   └──► 403 Forbidden / Redirect                   │
│         ▼                                                    │
│  4. Render halaman / Return API response                    │
│                                                              │
│  ─────────────────────────────────────────────────          │
│                                                              │
│  LOGIN FLOW:                                                 │
│  User submit form → POST /api/auth/signin                   │
│      → NextAuth CredentialsProvider                         │
│      → Query DB (Prisma) → bcrypt compare                   │
│      → Generate JWT Session                                  │
│      → Set HttpOnly Cookie                                   │
│      → Redirect ke dashboard                                 │
└──────────────────────────────────────────────────────────────┘

Role Hierarchy:
SUPER_ADMIN > ADMIN_DESA > ADMIN_WISATA > [spesifik roles] > MASYARAKAT
```

### Role Access Matrix

| Fitur | SUPER_ADMIN | ADMIN_DESA | ADMIN_WISATA | UMKM/PENGRAJIN | MASYARAKAT | WISATAWAN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Kelola Pengguna | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Kelola Destinasi | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Kelola Heritage | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Kelola Produk | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Layanan Publik | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Pengaduan | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Booking Wisata | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Review Destinasi | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Audit Log | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 6. Database ER Diagram (Text-Based)

```
┌─────────────┐    ┌──────────────────┐    ┌──────────────────┐
│    User     │    │   Destination    │    │  HeritageArchive │
│─────────────│    │──────────────────│    │──────────────────│
│ id (PK)     │    │ id (PK)          │    │ id (PK)          │
│ name        │    │ name             │    │ title            │
│ email       │◄───┤ createdById (FK) │    │ type             │
│ password    │    │ slug             │    │ content          │
│ role        │    │ category         │    │ authorId (FK)────┤
│ phone       │    │ latitude         │    │ isVerified       │
│ address     │    │ longitude        │    └──────────────────┘
│ avatar      │    │ ticketPrice      │
│ isActive    │    │ isPublished      │    ┌──────────────────┐
└──────┬──────┘    └────────┬─────────┘    │ DestinationReview│
       │                    │              │──────────────────│
       │           ┌────────▼─────────┐    │ id (PK)          │
       │           │ DestinationReview│    │ destinationId(FK)│
       │           └──────────────────┘    │ userId (FK)      │
       │                                   │ rating           │
       │           ┌──────────────────┐    │ comment          │
       ├──────────►│  BatikArtisan    │    └──────────────────┘
       │           │──────────────────│
       │           │ id (PK)          │    ┌──────────────────┐
       │           │ userId (FK)      │    │   BatikMotif     │
       │           │ name             │    │──────────────────│
       │           │ workshopName     │◄───┤ artisanId (FK)   │
       │           │ specialties      │    │ name             │
       │           └──────────────────┘    │ philosophy       │
       │                                   │ category         │
       │           ┌──────────────────┐    └──────────────────┘
       ├──────────►│      Umkm        │
       │           │──────────────────│    ┌──────────────────┐
       │           │ id (PK)          │    │    Product       │
       │           │ userId (FK)      │    │──────────────────│
       │           │ name             │◄───┤ umkmId (FK)      │
       │           │ category         │    │ artisanId (FK)   │
       │           └──────────────────┘    │ name, price      │
       │                                   │ stock, images    │
       │           ┌──────────────────┐    └──────────┬───────┘
       ├──────────►│      Cart        │               │
       │           │──────────────────│    ┌──────────▼───────┐
       │           │ id (PK)          │    │    CartItem      │
       │           │ userId (FK)      │◄───┤ cartId (FK)      │
       │           └──────────────────┘    │ productId (FK)   │
       │                                   │ quantity         │
       │           ┌──────────────────┐    └──────────────────┘
       ├──────────►│      Order       │
       │           │──────────────────│    ┌──────────────────┐
       │           │ id (PK)          │    │   OrderItem      │
       │           │ userId (FK)      │◄───┤ orderId (FK)     │
       │           │ orderNumber      │    │ productId (FK)   │
       │           │ status           │    │ quantity, price  │
       │           └──────────────────┘    └──────────────────┘
       │
       │           ┌──────────────────┐    ┌──────────────────┐
       ├──────────►│  CulturalEvent   │    │EventRegistration │
       │           │──────────────────│    │──────────────────│
       │           │ id (PK)          │◄───┤ eventId (FK)     │
       │           │ organizerId (FK) │    │ userId (FK)      │
       │           │ name             │    │ registrationCode │
       │           └──────────────────┘    │ qrCode           │
       │                                   └──────────────────┘
       │           ┌──────────────────┐
       ├──────────►│  TourismPackage  │    ┌──────────────────┐
       │           │──────────────────│    │ TourismBooking   │
       │           │ id (PK)          │◄───┤ packageId (FK)   │
       │           │ managerId (FK)   │    │ userId (FK)      │
       │           │ name, price      │    │ bookingCode      │
       │           └──────────────────┘    └──────────────────┘
       │
       │           ┌──────────────────┐    ┌──────────────────┐
       ├──────────►│  PublicService   │    │ ServiceRequest   │
       │           │──────────────────│    │──────────────────│
       │           │ id (PK)          │◄───┤ serviceId (FK)   │
       │           │ name, category   │    │ userId (FK)      │
       │           └──────────────────┘    │ requestNumber    │
       │                                   └──────────────────┘
       │           ┌──────────────────┐
       ├──────────►│   Complaint      │
       │           │──────────────────│
       │           │ userId (FK)      │
       │           │ category, status │
       │           └──────────────────┘
       │
       │           ┌──────────────────┐    ┌──────────────────┐
       ├──────────►│    Training      │    │TrainingParticipant│
       │           │──────────────────│    │──────────────────│
       │           │ id (PK)          │◄───┤ trainingId (FK)  │
       │           │ title, category  │    │ userId (FK)      │
       │           └──────────────────┘    │ score, certUrl   │
       │                                   └──────────────────┘
       │           ┌──────────────────┐
       ├──────────►│  Notification    │
       │           │──────────────────│
       │           │ userId (FK)      │
       │           │ title, message   │
       │           │ isRead           │
       │           └──────────────────┘
       │
       └──────────►│  AiInteraction  │
                   │──────────────────│
                   │ userId (FK)      │
                   │ userMessage      │
                   │ aiResponse       │
                   └──────────────────┘
```

---

## 7. AI Integration Architecture (RAG Approach)

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEWA AI (RAG Architecture)                    │
│                                                                  │
│  User Query                                                      │
│      │                                                           │
│      ▼                                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Query Preprocessing                         │    │
│  │  - Normalize bahasa (Indonesia/Jawa/Inggris)            │    │
│  │  - Extract intent (wisata/heritage/produk/layanan)      │    │
│  │  - Extract entities (nama tempat, produk, dll)          │    │
│  └─────────────────┬───────────────────────────────────────┘    │
│                    │                                             │
│                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Context Retrieval (dari MySQL)              │    │
│  │                                                          │    │
│  │  Query relevan:                                          │    │
│  │  - Destination data (nama, deskripsi, jam buka, harga)  │    │
│  │  - Heritage data (sejarah, budaya, tokoh)               │    │
│  │  - BatikMotif (nama, filosofi, pengrajin)               │    │
│  │  - Umkm & Products (nama, deskripsi, harga)             │    │
│  │  - CulturalEvent (nama, tanggal, lokasi)                │    │
│  │  - VillageProfile (profil desa)                         │    │
│  └─────────────────┬───────────────────────────────────────┘    │
│                    │                                             │
│                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Prompt Construction                         │    │
│  │                                                          │    │
│  │  System Prompt:                                          │    │
│  │  "Kamu adalah DEWA (Desa Wawasan AI), asisten digital   │    │
│  │  Desa Sendang Duwur. Jawab pertanyaan wisatawan dan     │    │
│  │  masyarakat tentang desa, wisata, budaya, dan layanan  │    │
│  │  berdasarkan konteks berikut..."                         │    │
│  │                                                          │    │
│  │  + Retrieved context (JSON)                              │    │
│  │  + Conversation history                                  │    │
│  │  + User query                                            │    │
│  └─────────────────┬───────────────────────────────────────┘    │
│                    │                                             │
│                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           Google Gemini AI API                           │    │
│  │           (gemini-1.5-flash model)                       │    │
│  └─────────────────┬───────────────────────────────────────┘    │
│                    │                                             │
│                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Response Processing                         │    │
│  │  - Format Markdown → HTML                               │    │
│  │  - Extract recommended destinations/products            │    │
│  │  - Log interaction ke AiInteraction table               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                    │                                             │
│                    ▼                                             │
│              Streaming Response                                  │
│              (Server-Sent Events)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Security Architecture

### Authentication & Authorization
- **JWT Sessions** via NextAuth dengan HttpOnly cookie
- **Password Hashing:** bcrypt dengan salt rounds 12
- **Role-Based Access Control (RBAC):** Middleware + API level
- **CSRF Protection:** Built-in NextAuth

### Input Validation
- **Server-side:** Zod schema validation di semua API routes
- **Client-side:** React Hook Form + Zod
- **SQL Injection:** Prevented by Prisma ORM (parameterized queries)
- **XSS:** Next.js auto-escaping + CSP headers

### File Upload Security
- Whitelisted MIME types (images only: jpg, png, webp)
- Max file size: 5MB
- Rename file dengan UUID (tidak expose original name)
- Store di `/uploads` (luar webroot untuk non-public files)

### API Security
- Rate limiting per IP (middleware)
- Input sanitization
- Proper HTTP status codes
- Error messages tidak expose stack trace di production

### Headers Security (next.config.js)
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=()
```

---

## 9. Deployment Architecture

### Development
```
Local Machine
├── Next.js dev server (port 3000)
├── MySQL local (port 3306)
└── Prisma Studio (port 5555)
```

### Production (Recommended)

```
┌─────────────────────────────────────────────────┐
│                  PRODUCTION                      │
│                                                  │
│  ┌─────────────────┐    ┌─────────────────────┐  │
│  │   Vercel / VPS  │    │   PlanetScale /      │  │
│  │   (Next.js)     │───►│   MySQL on VPS       │  │
│  └─────────────────┘    └─────────────────────┘  │
│         │                                        │
│         │                                        │
│  ┌─────────────────┐    ┌─────────────────────┐  │
│  │   Cloudinary    │    │   Google AI API      │  │
│  │   (Images CDN)  │    │   (Gemini)           │  │
│  └─────────────────┘    └─────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Environment Variables per Environment

| Variable | Development | Production |
|---|---|---|
| `DATABASE_URL` | `mysql://root:@localhost/desaone_db` | PlanetScale/MySQL URL |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://desaone.id` |
| `NEXTAUTH_SECRET` | dev-secret-key | Kuat, random 32+ chars |
| `GEMINI_API_KEY` | API key dari AI Studio | Production API key |

---

*Dokumen ini merupakan bagian dari TAHAP 1: System Planning DESAONE.*  
*Versi: 1.0.0 | Dibuat: November 2026*
