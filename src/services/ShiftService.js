// file: src/services/ShiftService.js

const { BaseRepository } = require('../db');
const { LogError } = require('../utils');
const { Op } = require('sequelize');

class ShiftService {

    /**
     * Cek apakah user sedang dalam shift aktif
     */
    static async getCurrentShift(req, userId) {
        try {
            const options = {
                where: {
                    user_id: userId,
                    status: 'open'
                }
            };
            // Ambil shift terakhir yang masih open
            const shift = await BaseRepository.findOneByOptions(req, 'shifts', options);
            return shift;
        } catch (error) {
            LogError(__dirname, 'ShiftService.getCurrentShift', error.message);
            throw error;
        }
    }

    /**
     * Buka Shift Baru (Modal Awal)
     */
    static async openShift(req, userId, startCash) {
        try {
            // 1. Cek apakah sudah ada shift terbuka?
            const activeShift = await this.getCurrentShift(req, userId);
            if (activeShift) {
                throw new Error('Anda masih memiliki shift yang aktif. Harap tutup shift sebelumnya.');
            }

            // 2. Buat Shift Baru
            const payload = {
                user_id: userId,
                start_cash: startCash,
                start_time: new Date(),
                status: 'open'
            };

            const newShift = await BaseRepository.create(req, payload, 'shifts');
            return newShift;

        } catch (error) {
            LogError(__dirname, 'ShiftService.openShift', error.message);
            throw error;
        }
    }

    /**
     * Tutup Shift (Setoran Akhir)
     */
    static async closeShift(req, userId, actualEndCash) {
        try {
            const db = req.app.get('db');
            
            // 1. Ambil shift aktif
            const activeShift = await this.getCurrentShift(req, userId);
            if (!activeShift) {
                throw new Error('Tidak ada shift aktif untuk ditutup.');
            }

            // 2. HITUNG PENDAPATAN SISTEM (Expected Cash)
            // Rumus: Modal Awal + Total Penjualan Cash selama shift ini
            
            // Ambil semua pembayaran CASH yang terjadi antara start_time shift ini sampai sekarang
            const cashIncome = await db.order_payments.sum('amount', {
                where: {
                    payment_method: 'cash',
                    createdAt: {
                        [Op.gte]: activeShift.start_time // Lebih besar dari waktu buka shift
                    }
                    // Catatan: Idealnya difilter juga by user_id jika kasir pegang laci masing-masing
                }
            }) || 0;

            // Kurangi kembalian yang keluar (jika kita mencatat change_amount sebagai pengurang laci)
            // (Dalam desain kita, 'amount' adalah net yang masuk, jadi change tidak perlu dikurang lagi)
            
            const expectedCash = activeShift.start_cash + cashIncome;
            const difference = actualEndCash - expectedCash; // Plus = Lebih, Minus = Kurang

            // 3. Update Shift
            const updatePayload = {
                end_cash: actualEndCash,
                expected_cash: expectedCash,
                end_time: new Date(),
                status: 'closed'
            };

            await BaseRepository.updateOrderByOptions(req, updatePayload, 'shifts', {
                where: { id: activeShift.id }
            });

            return {
                message: 'Shift closed successfully',
                summary: {
                    start_cash: activeShift.start_cash,
                    cash_sales: cashIncome,
                    expected: expectedCash,
                    actual: actualEndCash,
                    difference: difference // Penting untuk laporan selisih
                }
            };

        } catch (error) {
            LogError(__dirname, 'ShiftService.closeShift', error.message);
            throw error;
        }
    }
}

module.exports = ShiftService;