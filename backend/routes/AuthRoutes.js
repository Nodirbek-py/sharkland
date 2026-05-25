const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Test foydalanuvchilarini yaratish (Seed)
router.post('/seed', async (req, res) => {
    try {
        const count = await User.count();
        if (count === 0) {
            const hashedSharedPassword = await bcrypt.hash('125', 10);

            await User.bulkCreate([
                { username: 'admin', password: hashedSharedPassword, role: 'superadmin' },
                { username: 'recept', password: hashedSharedPassword, role: 'receptionist' },
                { username: 'waiter', password: hashedSharedPassword, role: 'waiter' },
                { username: 'bar', password: hashedSharedPassword, role: 'barman' }
            ]);
            return res.json({ success: true, message: "Xavfsiz foydalanuvchilar (parol: 125) yaratildi!" });
        }
        res.json({ message: "Foydalanuvchilar allaqachon mavjud." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Xavfsiz Login eshigi
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(401).json({ success: false, message: "Foydalanuvchi nomi yoki parol xato!" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(401).json({ success: false, message: "Foydalanuvchi nomi yoki parol xato!" });
        }

        res.json({
            success: true,
            user: { username: user.username, role: user.role, storeId: user.storeId }
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;