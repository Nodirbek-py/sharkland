const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const Transaction = require('../models/Transaction');

// 1. Create and Register a New Client + NFC Card Link
router.post('/register', async (req, res) => {
    try {
        const { name, phone, nfcCardId, initialDeposit } = req.body;

        const existingCard = await Visitor.findOne({ where: { nfcCardId } });
        if (existingCard) {
            return res.status(400).json({ message: "Bu kartani egasi bor." });
        }

        const visitor = await Visitor.create({
            name,
            phone,
            nfcCardId,
            balance: initialDeposit || 0.00
        });

        // If they made an initial deposit, record a transaction log
        if (initialDeposit && initialDeposit > 0) {
            await Transaction.create({
                visitorId: visitor.id,
                type: 'topup',
                amount: initialDeposit,
                location: 'Reception Desk'
            });
        }

        res.status(201).json({ success: true, visitor });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const visitors = await Visitor.findAll({ order: [['createdAt', 'DESC']] });
        res.json(visitors);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Mijoz ma'lumotlarini tahrirlash va kartasini almashtirish (YANGILANDI)
router.put('/:id', async (req, res) => {
    try {
        const { name, phone, nfcCardId, balance, overrideCard } = req.body;
        const visitor = await Visitor.findByPk(req.params.id);
        if (!visitor) return res.status(404).json({ message: "Mijoz topilmadi." });

        // Agar karta ID o'zgargan bo'lsa
        if (nfcCardId && nfcCardId !== visitor.nfcCardId) {
            const existingCard = await Visitor.findOne({ where: { nfcCardId } });

            if (existingCard) {
                // Agar frontend tasdiqlash modalidan o'tmagan bo'lsa (overrideCard: false yoki yo'q bo'lsa)
                if (!overrideCard) {
                    return res.status(200).json({
                        success: false,
                        requiresConfirmation: true,
                        oldOwnerName: existingCard.name,
                        message: `Bu karta allaqachon "${existingCard.name}" ismli mijozga biriktirilgan. Kartani undan yechib olib, ushbu mijozga biriktirishni tasdiqlaysizmi?`
                    });
                } else {
                    // Agar receptionist modalda "Ha, tasdiqlayman" deb bossa (overrideCard: true kelsa)
                    // Eski egasidan kartani olib tashlaymiz (nfcCardId ni null qilamiz)
                    existingCard.nfcCardId = "KARTA YO'Q!";
                    await existingCard.save();
                }
            }
        }

        // Ma'lumotlarni yangilash
        visitor.name = name || visitor.name;
        visitor.phone = phone || visitor.phone;
        visitor.nfcCardId = nfcCardId === "" ? null : (nfcCardId || visitor.nfcCardId);
        visitor.balance = balance !== undefined ? balance : visitor.balance;

        await visitor.save();
        res.json({ success: true, visitor });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Mijozni tizimdan o'chirish (YANGI)
router.delete('/:id', async (req, res) => {
    try {
        const visitor = await Visitor.findByPk(req.params.id);
        if (!visitor) return res.status(404).json({ message: "Mijoz topilmadi." });
        await visitor.destroy();
        res.json({ success: true, message: "Mijoz muvaffaqiyatli o'chirildi." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Fetch Customer Info by Card Swipe
router.get('/scan/:nfcCardId', async (req, res) => {
    try {
        const visitor = await Visitor.findOne({ where: { nfcCardId: req.params.nfcCardId } });
        if (!visitor) return res.status(404).json({ message: "Visitor record not found." });
        res.json(visitor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Process Card Cash Refills (Top-ups)
router.post('/topup', async (req, res) => {
    try {
        const { nfcCardId, amount } = req.body;
        const visitor = await Visitor.findOne({ where: { nfcCardId } });

        if (!visitor) return res.status(404).json({ message: "Visitor not found." });

        visitor.balance = Number(visitor.balance) + Number(amount);
        await visitor.save();

        await Transaction.create({
            visitorId: visitor.id,
            type: 'topup',
            amount: amount,
            location: 'Reception Desk'
        });

        res.json({ success: true, updatedBalance: visitor.balance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Aquaparkka kirish uchun kartadan haq yechish (YANGI FEATURE)
router.post('/charge-entry', async (req, res) => {
    try {
        const { nfcCardId, entryFee } = req.body;

        // 1. Kartani bazadan qidiramiz
        const visitor = await Visitor.findOne({ where: { nfcCardId } });
        if (!visitor) {
            return res.status(404).json({ success: false, message: "Karta egasi topilmadi!" });
        }

        // 2. Mijozning balansi yetarli ekanligini tekshiramiz
        const currentBalance = Number(visitor.balance);
        const fee = Number(entryFee);

        if (currentBalance < fee) {
            return res.status(400).json({
                success: false,
                insufficient: true,
                message: `Mijoz balansida mablag' yetarli emas! Bilet: ${fee.toLocaleString()} so'm, joriy balans: ${currentBalance.toLocaleString()} so'm.`
            });
        }

        // 3. Balansdan pulni ayiramiz va saqlaymiz
        visitor.balance = currentBalance - fee;
        await visitor.save();

        // 4. Moliyaviy tranzaksiya logini yaratamiz
        await Transaction.create({
            visitorId: visitor.id,
            type: 'expense', // Tizim uchun kirim, lekin tashrif buyuruvchi kartasi uchun chiqim
            amount: fee,
            location: 'Main Aquapark Entrance'
        });

        res.json({
            success: true,
            message: "Kirish muvaffaqiyatli tasdiqlandi! Yo'lak ochildi.",
            visitorName: visitor.name,
            updatedBalance: visitor.balance
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;