### Frontend (Mobile App)
- **React Native** with Expo
- **TypeScript** 
- **React Navigation 6**
- **@expo/vector-icons** (Feather icons)
- **React Native Chart Kit** สำหรับกราฟ
- **DateTimePicker** สำหรับเลือกวันที่

### Backend (API Server)
- **Node.js** + **Express.js**
- **Prisma ORM** 
- **PostgreSQL** Database
- **JWT Authentication**
- **bcrypt** สำหรับ hash passwords

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Expo CLI
- npm

### 1. Clone Repository
```bash
git clone <repository-url>
cd miniProjecApp
```

### 2. ติดตั้ง Backend
```bash
cd backend
npm install

# สร้าง .env file
echo "DATABASE_URL=postgresql://username:password@localhost:5432/trackmoneydb" > .env
echo "JWT_SECRET=your-super-secret-key-here" >> .env

# รัน database migration
npx prisma migrate dev --name init

# เริ่มเซิร์ฟเวอร์
npm run dev
```

### 3. ติดตั้ง Frontend
```bash
cd ../client
npm install

# แก้ไข API URL ใน src/services/apiService.ts
# เปลี่ยน BASE_URL ให้ตรงกับ IP ของเครื่อง

# เริ่มแอป
npm start
```

### 4. เปิดแอปบนมือถือ
- ติดตั้ง **Expo Go** บนมือถือ
- สแกน QR Code ที่ปรากฏใน terminal
- หรือกด `a` เพื่อเปิดใน Android Emulator
