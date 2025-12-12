const { BaseRepository } = require('../db');
const { LogError } = require('../utils');

class InventoryService {

    // --- GET HISTORY ---
    static async getHistory(req, variationId) {
        try {
            const db = req.app.get('db');
            const options = {
                where: {},
                include: [
                    { model: db.users, as: 'actor', attributes: ['name'] }
                ],
                order: [['createdAt', 'DESC']]
            };

            if (variationId) {
                options.where.variation_id = variationId;
            }

            return await BaseRepository.getDataByOptions(req, 'inventory_logs', options);
        } catch (error) {
            LogError(__dirname, 'InventoryService.getHistory', error.message);
            throw error;
        }
    }

    // --- UPDATE STOCK (Clean Version) ---
    static async updateStock(req, payload, externalTransaction = null) {
        const db = req.app.get('db');
        const transaction = externalTransaction || await db.sequelize.transaction();
        const isExternal = !!externalTransaction;

        try {
            const { variation_id, type, amount, notes } = payload;
            const userId = req.decoded?.payloadToken?.id || null; 

            // 1. Lock Data
            const variation = await db.item_variations.findByPk(variation_id, { 
                lock: transaction.LOCK.UPDATE, 
                transaction 
            });

            if (!variation) throw new Error(`Variation ID ${variation_id} not found`);

            // 2. Validasi Track Inventory
            if (!variation.track_inventory) {
                if (!isExternal) await transaction.commit();
                return { message: 'Item does not track inventory', current_stock: variation.stock_level };
            }

            const oldStock = variation.stock_level || 0;
            let newStock = 0;
            let finalAmount = parseInt(amount);

            // 3. Hitung Stok
            if (type === 'IN' || type === 'ADJUSTMENT') {
                newStock = oldStock + finalAmount;
            } else {
                if (oldStock < finalAmount) throw new Error(`Stok ${variation.name} tidak mencukupi`);
                newStock = oldStock - finalAmount;
                finalAmount = -finalAmount;
            }

            // 4. Update Stok Variasi
            await variation.update({ stock_level: newStock }, { transaction });

            // ❌ [HAPUS BAGIAN TOUCH PARENT DI SINI]
            // Kita biarkan tabel 'items' tidak tersentuh.

            // 5. Catat Log
            await db.inventory_logs.create({
                variation_id,
                user_id: userId,
                type,
                amount: finalAmount, 
                previous_stock: oldStock,
                current_stock: newStock,
                notes: notes || 'System Update'
            }, { transaction });

            if (!isExternal) await transaction.commit();
            return { message: 'Stock updated successfully', current_stock: newStock };

        } catch (error) {
            if (!isExternal) await transaction.rollback();
            if (!error.message.includes('tidak mencukupi')) {
                LogError(__dirname, 'InventoryService.updateStock', error.message);
            }
            throw error;
        }
    }
}

module.exports = InventoryService;