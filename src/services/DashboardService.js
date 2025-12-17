// file: src/services/DashboardService.js

const { BaseRepository } = require('../db');
const { Op, Sequelize } = require('sequelize');
const moment = require('moment');

class DashboardService {

    /**
     * Ambil Statistik Utama Dashboard dalam satu tarikan efisien
     */
    static async getDashboardStats(req, startDate, endDate) {
        const db = req.app.get('db');
        
        // 1. Filter Tanggal Global (WIB)
        const dateFilter = {
            date: {
                [Op.between]: [startDate, endDate]
            },
            status: {
                [Op.not]: 'cancelled' // Abaikan order batal
            },
            order_type: 'fnb' // Filter FNB only
        };

        // 2. Query Agregat Utama (Revenue, Transaksi, AOV)
        const mainStats = await db.orders.findOne({
            where: dateFilter,
            attributes: [
                [Sequelize.fn('SUM', Sequelize.col('total')), 'revenue'],
                [Sequelize.fn('SUM', Sequelize.col('subtotal')), 'gross_sales'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'transactions'],
                [Sequelize.fn('SUM', Sequelize.col('discount_amount')), 'total_discount']
            ],
            raw: true
        });

        // 3. Query Grafik Tren (Harian/Jam)
        const isSingleDay = moment(startDate).isSame(endDate, 'day');
        let chartData = [];
        
        if (isSingleDay) {
            // Hourly Chart Logic
            const hourlyResults = await db.orders.findAll({
                where: dateFilter,
                attributes: [
                    [Sequelize.fn('HOUR', Sequelize.fn('CONVERT_TZ', Sequelize.col('date'), '+00:00', '+07:00')), 'time'],
                    [Sequelize.fn('SUM', Sequelize.col('total')), 'sales']
                ],
                group: ['time'],
                order: [['time', 'ASC']],
                raw: true
            });
            // Fill missing hours with 0
            for (let i = 0; i < 24; i++) {
                const hour = hourlyResults.find(r => r.time === i);
                chartData.push({
                    time: `${String(i).padStart(2, '0')}:00`,
                    sales: hour ? parseInt(hour.sales) : 0
                });
            }
        } else {
            // Daily Chart Logic
            chartData = await db.orders.findAll({
                where: dateFilter,
                attributes: [
                    [Sequelize.fn('DATE', Sequelize.fn('CONVERT_TZ', Sequelize.col('date'), '+00:00', '+07:00')), 'dateLabel'],
                    [Sequelize.fn('SUM', Sequelize.col('total')), 'sales']
                ],
                group: ['dateLabel'],
                order: [['dateLabel', 'ASC']],
                raw: true
            });
            chartData = chartData.map(d => ({
                time: moment(d.dateLabel).format('DD MMM'),
                sales: parseInt(d.sales)
            }));
        }

        // 4. Query Top Product
        const topProductsRaw = await db.order_items.findAll({
            attributes: [
                'item_name',
                [Sequelize.fn('SUM', Sequelize.col('quantity')), 'total_qty'],
                [Sequelize.fn('SUM', Sequelize.col('order_items.sub_total_price')), 'total_value']
            ],
            include: [{
                model: db.orders,
                as: 'order',
                where: dateFilter,
                attributes: []
            }],
            group: ['item_name'],
            order: [[Sequelize.literal('total_qty'), 'DESC']],
            limit: 10, // Ambil 10 teratas
            raw: true
        });

        // Format data
        const topProducts = topProductsRaw.map(p => ({
            name: p.item_name,
            qty: parseInt(p.total_qty),
            value: parseInt(p.total_value)
        }));
        
        // 5. Query Active Shift (Generik FNB)
        let activeShiftCount = 0;
        // Cek apakah tabel shifts tersedia di model DB Anda
        if (db.shifts) { 
             activeShiftCount = await db.shifts.count({ where: { status: 'open' } });
        }

        // 6. Query Kategori (Pie Chart) - SEDERHANA
        let categoryStats = [];
        try {
            categoryStats = await db.order_items.findAll({
                attributes: [
                    // Mengambil nama kategori lewat jalur: Variation -> Item -> Category
                    [Sequelize.col('variation.item.category.name'), 'name'], 
                    [Sequelize.fn('SUM', Sequelize.col('order_items.sub_total_price')), 'value']
                ],
                include: [{
                    model: db.orders,
                    as: 'order',
                    where: dateFilter,
                    attributes: []
                }, {
                    model: db.item_variations,
                    as: 'variation',
                    attributes: [],
                    include: [{
                        model: db.items,    // Relasi ke Items
                        as: 'item',         // Pastikan alias di ItemVariations.js adalah 'item'
                        attributes: [],
                        include: [{
                            model: db.categories, // Relasi ke Categories
                            as: 'category',       // Pastikan alias di Items.js adalah 'category'
                            attributes: []
                        }]
                    }]
                }],
                group: [Sequelize.col('variation.item.category.name')],
                raw: true
            });
            
            // Handle null (jika item terhapus atau tanpa kategori)
            categoryStats = categoryStats.map(c => ({
                name: c.name || 'Tanpa Kategori',
                value: parseInt(c.value || 0)
            }));

        } catch (err) {
            console.error("Gagal mengambil Category Stats:", err.message);
            categoryStats = [];
        }

        // 7. Query Payment Methods
        const paymentStats = await db.orders.findAll({
            where: dateFilter,
            attributes: [
                ['metode_pembayaran', 'method'],
                [Sequelize.fn('SUM', Sequelize.col('total')), 'total'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            group: ['metode_pembayaran'],
            raw: true
        });

        return {
            revenue: parseInt(mainStats?.revenue || 0),
            gross_sales: parseInt(mainStats?.gross_sales || 0),
            transactions: parseInt(mainStats?.transactions || 0),
            total_discount: parseInt(mainStats?.total_discount || 0),
            active_shift: activeShiftCount,
            top_products: topProducts,
            chart: chartData,
            category_sales: categoryStats,
            payment_summary: paymentStats.map(p => ({
                method: p.method ? p.method.toUpperCase() : 'LAINNYA',
                total: parseInt(p.total),
                count: parseInt(p.count)
            }))
        };
    }
}

module.exports = DashboardService;