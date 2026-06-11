const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const Transaction = require('../models/Transaction');

router.post('/', async (req, res) => {
    try {
        const { amount, nfcCardId } = req.body;

        if (!amount || !nfcCardId) {
            return res.status(400).send("amount va nfcCardId kiritilishi shart");
        }

        const visitor = await Visitor.findOne({ where: { nfcCardId } });
        if (!visitor) {
            return res.status(404).send("Karta egasi topilmadi");
        }

        const currentBalance = Number(visitor.balance);
        const chargeAmount = Number(amount);

        if (currentBalance < chargeAmount) {
            return res.status(400).send("Mablag' yetarli emas");
        }

        visitor.balance = currentBalance - chargeAmount;
        await visitor.save();

        await Transaction.create({
            visitorId: visitor.id,
            type: 'expense',
            amount: chargeAmount,
            location: 'Quick Charge'
        });

        res.status(200).send(`Mablag' yechib olindi, qoldi ${visitor.balance}`);

    } catch (err) {
        res.status(500).send(err.message);
    }
});

module.exports = router;
