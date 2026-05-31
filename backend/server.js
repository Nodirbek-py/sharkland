const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const { connectDB } = require('./config/db');

dotenv.config();

// 1. Eng birinchi bo'lib ma'lumotlar bazasini ulaymiz va modellarni yuklaymiz
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io sozlamalari
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Agar ofitsiant/vendor porti boshqa bo'lsa, uni ham qo'shing
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use('/api/auth', require('./routes/AuthRoutes'));
app.use('/api/visitors', require('./routes/VisitorRoutes'));
app.use('/api/vendors', require('./routes/VendorRoutes'));
app.use('/api/storekeeper', require('./routes/StoreKeeper'));
app.use('/api/admin', require('./routes/AdminRoutes'));

// Socket.io ulanishi
io.on('connection', (socket) => {
    console.log('Foydalanuvchi websocketga ulandi:', socket.id);
    socket.on('disconnect', () => {
        console.log('Foydalanuvchi tarmoqdan uzildi');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server ${PORT}-portda muvaffaqiyatli ishlamoqda`));