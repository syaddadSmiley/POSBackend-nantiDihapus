// file: src/services/ReportService.js
const { Op } = require('sequelize');
const moment = require('moment');
const { LogError } = require('../utils');

class ReportService {

    static async getSalesReport(req) {
        const db = req.app.get('db');
        let { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            startDate = moment().format('YYYY-MM-DD');
            endDate = moment().format('YYYY-MM-DD');
        }

        const start = moment(startDate).startOf('day').toDate();
        const end = moment(endDate).endOf('day').toDate();

        try {
            // 1. Ambil Summary (Total Omzet & Transaksi)
            // PERBAIKAN: Ganti 'completed' menjadi 'paid'
            const summary = await db.orders.findAll({
                attributes: [
                    [db.sequelize.fn('SUM', db.sequelize.col('total')), 'totalRevenue'],
                    [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalTransactions']
                ],
                where: {
                    createdAt: { [Op.between]: [start, end] },
                    status: 'paid' // <--- HANYA YANG SUDAH LUNAS
                },
                raw: true
            });

            // 2. Ambil Data Grafik (Group by Date)
            // PERBAIKAN: Ganti 'completed' menjadi 'paid'
            const chartData = await db.orders.findAll({
                attributes: [
                    [db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'date'],
                    [db.sequelize.fn('SUM', db.sequelize.col('total')), 'revenue']
                ],
                where: {
                    createdAt: { [Op.between]: [start, end] },
                    status: 'paid' // <--- HANYA YANG SUDAH LUNAS
                },
                group: [db.sequelize.fn('DATE', db.sequelize.col('createdAt'))],
                order: [[db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'ASC']],
                raw: true
            });

            // 3. Ambil Detail Transaksi (Untuk Tabel)
            // PERBAIKAN: Ganti 'completed' menjadi 'paid'
            const transactions = await db.orders.findAll({
                where: {
                    createdAt: { [Op.between]: [start, end] },
                    status: 'paid' // <--- HANYA YANG SUDAH LUNAS
                },
                order: [['createdAt', 'DESC']],
                include: [
                    { model: db.users, as: 'cashier', attributes: ['name'] } 
                ],
                limit: 100 
            });

            return {
                summary: {
                    revenue: parseInt(summary[0].totalRevenue || 0),
                    transactions: parseInt(summary[0].totalTransactions || 0),
                },
                chart: chartData,
                transactions: transactions
            };

        } catch (error) {
            LogError(__dirname, 'ReportService.getSalesReport', error);
            throw error;
        }
    }
}

module.exports = ReportService;