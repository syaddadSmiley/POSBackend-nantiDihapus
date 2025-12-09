// file: controller/CarwashController.js

const _ = require('lodash');
const OrderService = require('../services/OrderService'); // <-- GANTI INI
const async = require('async');
const {LogError, LogAny} = require('../utils');
const email = require('../utils/email');
const { Op, Sequelize } = require('sequelize');
const { jsPDF } = require('jspdf');
const fs = require('fs');
const moment = require('moment');

// HAPUS 'extends CarwashService'
class CarwashController {
    
    static async orderPost(req, res, next){
        const payload = req.body;
        try {
            // GANTI: Panggil createOrder, BUKAN createOrUpdateOrder
            // (Kita asumsikan 'order_type: carwash' dan 'member_id' sudah ada di payload)
            
            // --- Logika untuk mengambil member_id (dari createOrUpdateOrder) ---
            const db = req.app.get('db');
            const getMemberId = await BaseRepository.getDataByOptions(req, 'members', {where: {plat_mobil : payload.plat_mobil}})
            if (_.isUndefined(getMemberId)) {
                throw new Error('Member not found for plat_mobil: ' + payload.plat_mobil);
            }
            let memberId = '';
            if (Array.isArray(getMemberId) && getMemberId.length > 0) {
                memberId = getMemberId[0].member_id;
            } else if (getMemberId.member_id) {
                memberId = getMemberId.member_id;
            } else {
                throw new Error('Member ID not found for plat_mobil: ' + payload.plat_mobil);
            }
            payload.member_id = memberId;
            // -----------------------------------------------------------
            
            const result = await OrderService.createOrder(req, payload);

            res.json(result);

        } catch (err) {
            LogError(__dirname, 'carwash/api/v1/carwash/order', err.message);
            
            if (err.message.includes('Stok') || err.message.includes('Member')) {
                res.status(400).json({ message: err.message });
            } else {
                res.status(500).json({ message: err.message || 'Failed to create order' });
            }
            return;
        }
    };

    static async orderGet(req, res, next){
        // Klien akan mengirim ?date=YYYY-MM-DD
        const { date } = req.query; 

        if (!date) {
            return res.status(400).json({ message: "Parameter 'date' (YYYY-MM-DD) diperlukan" });
        }

        const options = { 
            where: {
                order_type: 'carwash', // <-- Filter 'carwash'
                [Op.and]: [
                    // Logika CONVERT_TZ yang sama
                    Sequelize.where(
                        Sequelize.fn('DATE', Sequelize.fn('CONVERT_TZ', Sequelize.col('date'), '+00:00', '+07:00')), 
                        '=', 
                        date
                    )
                ]
            }
        };
        
        try {
            // Panggil service generik 'getAllOrders'
            const data = await OrderService.getAllOrders(req, options); 
            data.sort((a, b) => a.order_num - b.order_num); // Urutkan
            res.json(data);
        } catch (err) {
            if (err.message && err.message.includes('Data not found')) {
                res.json([]); // Kembalikan array kosong
            } else {
                LogError(__dirname, 'carwash/api/v1/carwash/orderGet', err.message);
                res.status(500).json({ message: err.message });
            }
        }
    };

    static async orderPut(req, res, next){
        const payload  = req.body;
        var updated = null;
        try {
            payload.order_type = 'carwash'; // Pastikan tipe diset
            updated = await OrderService.updateOrder(req, payload); // Panggil service generik
        } catch (err) {
            LogError(__dirname, 'carwash/api/v1/carwash/order', 'Failed to update order \n'+err);
            res.status(400).json({ message: err.message });
            return;
        }
        res.json({message: "success"});
    };

    static async orderReport(req, res, next){
        // ... (Logika Anda)
        try {
            // Panggil service generik
            const orderByMonth = await OrderService.getAllOrders(req, { 
                where: {
                    order_type: 'carwash', // Filter tipe
                    // ... (logika 'date')
                }
            });
            // ... (Sisa logika laporan Anda)
            res.json({ message: 'Email sent' });
        } catch(err) {
            // ...
        }
    };

    static async orderPay(req, res, next) {
        try {
            const { order_id } = req.params; 
            const { amount, payment_method, note, reference_id } = req.body; 

            if (!payment_method) {
                return res.status(400).json({ message: 'Metode pembayaran diperlukan.' });
            }
            if (!amount || amount <= 0) {
                return res.status(400).json({ message: 'Jumlah pembayaran harus lebih dari 0.' });
            }

            const payload = {
                order_id,
                amount,
                payment_method,
                note,
                reference_id
            };

            const result = await OrderService.addPayment(req, payload);
            res.json(result);

        } catch (err) {
            LogError(__dirname, 'carwash/api/v1/carwash/orderPay', err.message);
            res.status(400).json({ message: err.message });
        }
    }

    static async report(req, res, next){
        const { startDate, endDate } = req.body;
        // ...
        try {
            // Panggil service generik
            reportData = await OrderService.generateReport(req, startDate, /* ... */ 'carwash');
        } catch (err) {
            // ...
        }
        res.json(reportData);
    };
}

module.exports = CarwashController;