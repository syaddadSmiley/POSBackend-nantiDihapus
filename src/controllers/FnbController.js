// file: controller/FnbController.js

const _ = require('lodash');
const OrderService = require('../services/OrderService'); // <-- GANTI INI
const async = require('async');
const { LogError, LogAny } = require('../utils');
const email = require('../utils/email');
const { Op, Sequelize, fn, col } = require('sequelize');
const moment = require('moment');

// HAPUS 'extends FnbService'
class FnbController {

    static async orderPost(req, res, next){
        const payload  = req.body;
        try {
            // GANTI: Panggil createOrder, BUKAN createOrUpdateOrder
            const result = await OrderService.createOrder(req, payload);

            res.json(result);

        } catch (err) {
            LogError(__dirname, 'fnb/api/v1/fnb/orderPost', err.message);
            
            // Tambahkan penanganan error stok
            if (err.message.includes('Stok')) {
                res.status(400).json({ message: err.message });
            } else {
                res.status(500).json({ message: err.message || 'Failed to create order' });
            }
            return;
        }
    }

   static async orderGet(req, res, next) {
        // 1. Ambil semua kemungkinan parameter dari query
        const { date, startDate, endDate, status } = req.query; 
        const { Op } = require('sequelize'); // Pastikan Op di-import (atau sudah ada di atas file)

        // 2. Validasi: Harus ada minimal satu jenis filter tanggal
        if (!date && (!startDate || !endDate)) {
            return res.status(400).json({ message: "Parameter tanggal (date atau startDate & endDate) diperlukan" });
        }

        // Setup filter dasar (Wajib FNB)
        const whereClause = {
            order_type: 'fnb'
        };

        // 3. LOGIKA DATE FILTER
        // Kita gunakan CONVERT_TZ agar sesuai dengan jam lokal (+07:00) seperti logic asli Anda
        const dateCol = Sequelize.fn('DATE', Sequelize.fn('CONVERT_TZ', Sequelize.col('date'), '+00:00', '+07:00'));

        if (startDate && endDate) {
            // A. JIKA RANGE (Dipakai oleh Frontend Baru)
            whereClause[Op.and] = [
                Sequelize.where(dateCol, {
                    [Op.between]: [startDate, endDate] // Mencari data DI ANTARA dua tanggal
                })
            ];
        } else if (date) {
            // B. JIKA SINGLE DATE (Logic Lama / Fallback)
            whereClause[Op.and] = [
                Sequelize.where(dateCol, '=', date)
            ];
        }

        // 4. Tambahkan filter status jika ada
        if (status) {
            whereClause.status = status; 
        }

        const options = { 
            where: whereClause
        };

        try {
            const data = await OrderService.getAllOrders(req, options); 
            // Sorting descending (Terbaru diatas)
            data.sort((a, b) => b.order_num - a.order_num); 
            res.json(data);
        } catch (err) {
            if (err.message && err.message.includes('Data not found')) {
                res.json([]); 
            } else {
                // Pastikan LogError terdefinisi atau ganti dengan console.error
                if (typeof LogError !== 'undefined') {
                    LogError(__dirname, 'fnb/api/v1/fnb/orderGet', err.message);
                } else {
                    console.error(err);
                }
                res.status(500).json({ message: err.message });
            }
        }
    };

    static async orderPut(req, res, next){
        const payload = req.body;
        var updated = null;
        try {
            payload.order_type = 'fnb'; // Pastikan tipe diset
            updated = await OrderService.updateOrder(req, payload); // Panggil service generik
        } catch (err) {
            LogError(__dirname, 'fnb/api/v1/fnb/order', 'Failed to update order \n'+err);
            res.status(400).json({ message: err.message });
            return;
        }
        res.json({message: "success"});
    };

    static async orderPay(req, res, next) {
        try {
            const { order_id } = req.params; 
            const { amount, payment_method, note, reference_id } = req.body; 

            // 1. Validasi Input yang lebih ketat
            if (!payment_method) {
                return res.status(400).json({ message: 'Metode pembayaran (payment_method) diperlukan.' });
            }
            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'Jumlah pembayaran (amount) harus lebih dari 0.' });
            }

            // 2. Panggil fungsi addPayment baru di OrderService
            const payload = {
                order_id,
                amount,
                payment_method,
                note,
                reference_id
            };

            const result = await OrderService.addPayment(req, payload);
            
            // 3. Kembalikan detail status (Sisa tagihan, kembalian, dll)
            res.json(result);

        } catch (err) {
            LogError(__dirname, 'fnb/api/v1/fnb/orderPay', err.message);
            res.status(400).json({ message: err.message });
        }
    }

    static async orderGetById(req, res, next) {
        try {
            const { order_id } = req.params; // Ambil ID dari URL

            const options = { 
                where: {
                    order_id: order_id,
                    order_type: 'fnb' // Pastikan tipenya benar
                }
            };
            
            // Kita gunakan ulang 'getAllOrders' karena sudah punya 'include' yang benar
            const data = await OrderService.getAllOrders(req, options);
            
            if (!data || data.length === 0) {
                return res.status(404).json({ message: "Pesanan tidak ditemukan" });
            }

            res.json(data[0]); // Kembalikan objek pesanan pertama (dan satu-satunya)

        } catch (err) {
            if (err.message && err.message.includes('Data not found')) {
                res.status(404).json({ message: "Pesanan tidak ditemukan" });
            } else {
                LogError(__dirname, 'fnb/api/v1/fnb/orderGetById', err.message);
                res.status(500).json({ message: err.message });
            }
        }
    }

    static async orderReport(req, res, next){
        // ... (Logika Anda)
        try {
            // Panggil service generik
            const orderByMonth = await OrderService.getAllOrders(req, { 
                where: {
                    order_type: 'fnb', // Filter tipe
                    // ... (logika 'date')
                }
            });
            // ... (Sisa logika laporan Anda)
            res.json({ message: 'Email sent' });
        } catch(err) {
            // ...
        }
    };

    static async report(req, res, next){
        const { startDate, endDate } = req.body;
        // ...
        try {
            // Panggil service generik
            reportData = await OrderService.generateReport(req, startDate, /* ... */ 'fnb');
        } catch (err) {
            // ...
        }
        res.status(200).json(reportData);
    };

    static async orderDelete(req, res, next) {
        try {
            // 1. Ambil order_id dari parameter URL (misal: /fnb/order/fnb-12122025-1)
            const { order_id } = req.params;

            if (!order_id) {
                return res.status(400).json({ message: "Order ID is required" });
            }

            // 2. Panggil Service dengan filter spesifik
            // Service ini sudah memiliki logika Inventory Restoration (IN) di dalamnya
            const deleted = await OrderService.deleteOrderByOptions(req, {
                where: {
                    order_id: order_id,
                    order_type: 'fnb' // Safety check: Pastikan hanya menghapus tipe FNB
                }
            });

            // 3. Cek hasil
            if (deleted === 0) {
                return res.status(404).json({ message: "Order not found or already deleted" });
            }

            res.json({ message: "Order deleted and stock restored successfully" });

        } catch (err) {
            LogError(__dirname, 'fnb/api/v1/fnb/orderDelete', err.message);
            // Handle error spesifik, misal jika order sudah 'paid' dan tidak boleh dihapus
            res.status(500).json({ message: err.message });
        }
    }
}

module.exports = FnbController;