// file: src/services/ReportService.js
const { Op, Sequelize } = require('sequelize'); // FIX: Tambahkan Sequelize di sini
const moment = require('moment');
const { LogError } = require('../utils');

class ReportService {

    // --- FITUR 1: LAPORAN PENJUALAN BULANAN (SALES REPORT) ---
    static async getSalesReport(req) {
        const db = req.app.get('db');
        let { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            startDate = moment().format('YYYY-MM-DD');
            endDate = moment().format('YYYY-MM-DD');
        }

        // Konversi ke Date object untuk query 'between'
        const start = moment(startDate).startOf('day').toDate();
        const end = moment(endDate).endOf('day').toDate();

        try {
            // 1. Summary (Total Omzet & Transaksi)
            const summary = await db.orders.findAll({
                attributes: [
                    [Sequelize.fn('SUM', Sequelize.col('total')), 'totalRevenue'],
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalTransactions']
                ],
                where: {
                    createdAt: { [Op.between]: [start, end] },
                    status: 'paid' 
                },
                raw: true
            });

            // 2. Data Grafik (Group by Date)
            const chartData = await db.orders.findAll({
                attributes: [
                    [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
                    [Sequelize.fn('SUM', Sequelize.col('total')), 'revenue']
                ],
                where: {
                    createdAt: { [Op.between]: [start, end] },
                    status: 'paid'
                },
                group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))],
                order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']],
                raw: true
            });

            // 3. Detail Transaksi
            const transactions = await db.orders.findAll({
                where: {
                    createdAt: { [Op.between]: [start, end] },
                    status: 'paid'
                },
                order: [['createdAt', 'DESC']],
                include: [
                    { model: db.users, as: 'cashier', attributes: ['name'] } 
                ],
                limit: 100 
            });

            return {
                summary: {
                    revenue: parseInt(summary[0]?.totalRevenue || 0),
                    transactions: parseInt(summary[0]?.totalTransactions || 0),
                },
                chart: chartData,
                transactions: transactions
            };

        } catch (error) {
            LogError(__dirname, 'ReportService.getSalesReport', error.message);
            throw error;
        }
    }

    // --- FITUR 2: DASHBOARD STATS HARIAN (GRAFIK PER JAM) ---
    static async getTodayStats(req) {
        const db = req.app.get('db');
        
        // Tentukan "HARI INI" format YYYY-MM-DD
        const todayStr = moment().format('YYYY-MM-DD');

        try {
            // A. QUERY RINGKASAN (KARTU ATAS)
            // Menggunakan CONVERT_TZ untuk memastikan zona waktu WIB (+07:00)
            const summaryData = await db.orders.findOne({
                attributes: [
                    [Sequelize.fn('SUM', Sequelize.col('total')), 'revenue'],
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'transactions']
                ],
                where: {
                    status: 'paid',
                    [Op.and]: [
                        Sequelize.where(
                            Sequelize.fn('DATE', Sequelize.fn('CONVERT_TZ', Sequelize.col('date'), '+00:00', '+07:00')),
                            '=',
                            todayStr
                        )
                    ]
                },
                raw: true
            });

            // B. QUERY GRAFIK PER JAM (BAR CHART)
            const hourlyResults = await db.orders.findAll({
                attributes: [
                    // Ambil Jam (0-23) dari kolom date yang sudah dikonversi ke WIB
                    [Sequelize.fn('HOUR', Sequelize.fn('CONVERT_TZ', Sequelize.col('date'), '+00:00', '+07:00')), 'hour'],
                    [Sequelize.fn('SUM', Sequelize.col('total')), 'sales']
                ],
                where: {
                    status: 'paid',
                    [Op.and]: [
                        Sequelize.where(
                            Sequelize.fn('DATE', Sequelize.fn('CONVERT_TZ', Sequelize.col('date'), '+00:00', '+07:00')),
                            '=',
                            todayStr
                        )
                    ]
                },
                group: [Sequelize.fn('HOUR', Sequelize.fn('CONVERT_TZ', Sequelize.col('date'), '+00:00', '+07:00'))],
                order: [[Sequelize.literal('hour'), 'ASC']],
                raw: true
            });

            // C. NORMALISASI DATA (Isi jam kosong dengan 0)
            const fullChartData = [];
            for (let i = 0; i < 24; i++) {
                const hourLabel = `${i.toString().padStart(2, '0')}:00`;
                const found = hourlyResults.find(r => r.hour === i);
                
                fullChartData.push({
                    time: hourLabel,
                    sales: found ? parseInt(found.sales) : 0
                });
            }

            // D. ACTIVE SHIFT & TOP PRODUCT (Opsional / Placeholder)
            // Logic Shift: Cari shift user yang masih 'open'
            let activeShiftCount = 0;
            if (db.shifts) { // Cek jika tabel shifts ada
                 activeShiftCount = await db.shifts.count({ where: { status: 'open' } });
            }

            return {
                revenue: parseInt(summaryData?.revenue || 0),
                transactions: parseInt(summaryData?.transactions || 0),
                active_shift: activeShiftCount, 
                top_product: "Kopi Susu (Mock)", // Bisa diupdate nanti dengan query order_items
                chart: fullChartData // <-- Data Grafik Per Jam
            };

        } catch (error) {
            LogError(__dirname, 'ReportService.getTodayStats', error.message);
            throw error;
        }
    }
}

module.exports = ReportService;