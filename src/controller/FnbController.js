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

    static async orderGet(req, res, next){
        // Klien akan mengirim ?date=YYYY-MM-DD
        // (misal: "2025-11-15")
        const { date } = req.query; 

        if (!date) {
            return res.status(400).json({ message: "Parameter 'date' (YYYY-MM-DD) diperlukan" });
        }

        // --- INI ADALAH PERBAIKANNYA ---
        // Kita tidak bisa hanya membandingkan DATE(date) = date
        // Kita harus mengonversi 'date' (yang UTC) ke '+07:00' (WIB) SEBELUM
        // mengekstrak tanggalnya.
        const options = { 
            where: {
                order_type: 'fnb', // Filter tipe
                [Op.and]: [
                    // Bandingkan string 'YYYY-MM-DD' dari query
                    // dengan hasil konversi 'date' di database
                    Sequelize.where(
                        Sequelize.fn('DATE', Sequelize.fn('CONVERT_TZ', Sequelize.col('date'), '+00:00', '+07:00')), 
                        '=', 
                        date
                    )
                ]
            }
        };
        // ---------------------------------

        try {
            // Panggil service generik 'getAllOrders'
            const data = await OrderService.getAllOrders(req, options); 
            data.sort((a, b) => b.order_num - a.order_num); // Urutkan
            res.json(data);
        } catch (err) {
            // Tangani jika 'getAllOrders' gagal (termasuk '404 Data not found')
            if (err.message && err.message.includes('Data not found')) {
                res.json([]); // Kembalikan array kosong, bukan error
            } else {
                LogError(__dirname, 'fnb/api/v1/fnb/orderGet', err.message);
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

    static async orderDelete(req, res, next){
        try{
            // Panggil service generik
            const deleted = await OrderService.deleteOrderByOptions(req, {where: {
                order_type: 'fnb', // Filter tipe
                // ... (logika 'date')
            }});
            res.json(deleted)
        }catch (err){
            // ...
        }
    }
}

module.exports = FnbController;