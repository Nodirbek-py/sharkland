const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Store = require("../models/Store")
const { Op } = require('sequelize');

// 1. Barcha do'konlardagi barcha mahsulotlarni olish
router.get('/inventory', async (req, res) => {
    try {
        const products = await Product.findAll({
            order: [['storeId', 'ASC'], ['name', 'ASC']]
        });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Kam qolgan mahsulotlarni olish (stock <= 5)
router.get('/inventory/alerts', async (req, res) => {
    try {
        const lowStockProducts = await Product.findAll({
            where: {
                stock: { [Op.lte]: 5 }
            },
            order: [['stock', 'ASC']]
        });
        res.json(lowStockProducts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Yangi mahsulot qo'shish
router.post('/inventory', async (req, res) => {
    const { name, price, stock, unitType, category, storeId } = req.body;
    try {
        const newProduct = await Product.create({
            name,
            price,
            stock,
            unitType,
            category,
            storeId,
            vendorUsername: 'storekeeper' // model talabiga ko'ra default qiymat
        });
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Mahsulotni yangilash
router.put('/inventory/:id', async (req, res) => {
    try {
        const [updated] = await Product.update(req.body, {
            where: { id: req.params.id }
        });
        if (!updated) return res.status(404).json({ message: "Mahsulot topilmadi" });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;