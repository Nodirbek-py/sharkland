const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');
const Store = require("../models/Store");
const InventoryLog = require('../models/InventoryLog');
const { Op } = require('sequelize');

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 0. Tarixni olish
router.get('/inventory/logs', async (req, res) => {
    try {
        const logs = await InventoryLog.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
router.post('/inventory', upload.single('image'), async (req, res) => {
    const { name, price, netPrice, stock, unitType, category, storeId, username } = req.body;
    try {
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
        
        const newProduct = await Product.create({
            name,
            price: Number(price),
            netPrice: netPrice !== undefined && netPrice !== '' ? Number(netPrice) : Number(price),
            stock,
            unitType,
            category,
            storeId,
            imageUrl
        });

        await InventoryLog.create({
            storekeeperUsername: username || 'Noma\'lum',
            actionType: 'Yaratildi',
            productName: name,
            details: `Yangi mahsulot qo'shildi. Dastlabki soni: ${stock} ${unitType}`
        });

        res.status(201).json(newProduct);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Mahsulotni yangilash
router.put('/inventory/:id', upload.single('image'), async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ message: "Mahsulot topilmadi" });

        const oldStock = Number(product.stock);
        const { username, ...updateData } = req.body;
        
        if (req.file) {
            updateData.imageUrl = `/uploads/${req.file.filename}`;
        }
        
        await product.update(updateData);
        
        const newStock = Number(product.stock);
        
        let details = [];
        if (oldStock !== newStock) {
            const diff = newStock - oldStock;
            if (diff > 0) details.push(`Soni ${diff} taga ko'paytirildi`);
            else details.push(`Soni ${Math.abs(diff)} taga kamaytirildi`);
        }
        
        if (updateData.price !== undefined && Number(product.price) !== Number(updateData.price)) {
            details.push(`Narxi o'zgardi`);
        }
        if (updateData.netPrice !== undefined && Number(product.netPrice) !== Number(updateData.netPrice)) {
            details.push(`Tan narxi o'zgardi`);
        }
        
        if (details.length > 0) {
            await InventoryLog.create({
                storekeeperUsername: username || 'Noma\'lum',
                actionType: 'Yangilandi',
                productName: product.name,
                details: details.join(', ')
            });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Mahsulotni o'chirish
router.delete('/inventory/:id', async (req, res) => {
    try {
        const { username } = req.query;
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ message: "Mahsulot topilmadi" });

        await InventoryLog.create({
            storekeeperUsername: username || 'Noma\'lum',
            actionType: 'O\'chirildi',
            productName: product.name,
            details: `Mahsulot o'chirildi. Qoldiq soni: ${product.stock} ${product.unitType}`
        });

        await product.destroy();
        res.json({ message: "Mahsulot muvaffaqiyatli o'chirildi" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;