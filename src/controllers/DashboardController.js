// file: src/controllers/DashboardController.js

const DashboardService = require('../services/DashboardService');
const { LogError } = require('../utils');
const moment = require('moment');

class DashboardController {

    static async getStats(req, res) {
        try {
            // 1. Ambil Parameter Tanggal
            // Default: Hari ini jika tidak ada parameter
            let { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                startDate = moment().startOf('day').format('YYYY-MM-DD HH:mm:ss');
                endDate = moment().endOf('day').format('YYYY-MM-DD HH:mm:ss');
            } else {
                // Pastikan format jam mencakup seluruh hari (00:00:00 - 23:59:59)
                startDate = moment(startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss');
                endDate = moment(endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss');
            }

            // 2. Panggil Service
            const data = await DashboardService.getDashboardStats(req, startDate, endDate);

            // 3. Response
            res.json(data);

        } catch (err) {
            LogError(__dirname, 'dashboard/getStats', err.message);
            res.status(500).json({ message: 'Gagal memuat data dashboard' });
        }
    }
}

module.exports = DashboardController;