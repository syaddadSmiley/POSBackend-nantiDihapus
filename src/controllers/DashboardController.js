// file: src/controllers/DashboardController.js (BACKEND)
const { Op } = require('sequelize');
const { LogError } = require('../utils');
const moment = require('moment'); // Pastikan moment sudah terinstall

class DashboardController {

    static async getStats(req, res) {
        try {
            const db = req.app.get('db');
            
            // Tentukan rentang waktu "Hari Ini" (00:00 - 23:59 WIB)
            // Backend biasanya UTC, jadi kita harus hati-hati. 
            // Cara aman: Gunakan raw query atau filter berdasarkan string tanggal YYYY-MM-DD
            
            const today = moment().format('YYYY-MM-DD');

            // 1. Hitung Total Omzet & Total Transaksi Hari Ini
            // Kita hitung dari tabel 'orders' yang statusnya != 'cancelled'
            const salesData = await db.orders.findAll({
                attributes: [
                    [db.sequelize.fn('SUM', db.sequelize.col('total')), 'total_revenue'],
                    [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total_transactions']
                ],
                where: {
                    // Filter tanggal hari ini
                    [Op.and]: [
                        db.sequelize.where(
                            db.sequelize.fn('DATE', db.sequelize.fn('CONVERT_TZ', db.sequelize.col('date'), '+00:00', '+07:00')),
                            today
                        ),
                        { status: { [Op.ne]: 'cancelled' } } // Jangan hitung yang batal
                    ]
                },
                raw: true
            });

            const totalRevenue = salesData[0].total_revenue || 0;
            const totalTransactions = salesData[0].total_transactions || 0;

            // 2. Cek Shift Aktif
            // Cari user yang punya shift dengan status 'open'
            const activeShift = await db.shifts.findOne({
                where: { status: 'open' },
                include: [{ model: db.users, as: 'user', attributes: ['name'] }],
                order: [['createdAt', 'DESC']]
            });

            // 3. Produk Terlaris Hari Ini (Query agak kompleks, opsional dulu)
            // Untuk sekarang kita hardcode dulu atau buat query order_items
            // Kita skip dulu agar endpoint cepat selesai, atau Anda mau sekalian?
            
            res.json({
                revenue: parseInt(totalRevenue),
                transactions: parseInt(totalTransactions),
                active_shift: activeShift ? activeShift.user.name : "Tidak ada",
                top_product: "Kopi Susu" // Placeholder dulu
            });

        } catch (error) {
            LogError(__dirname, 'DashboardController.getStats', error.message);
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = DashboardController;