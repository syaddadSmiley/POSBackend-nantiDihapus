// file: services/MenuService.js

const { BaseRepository } = require('../db');
const _ = require('lodash');
const { LogError, LogAny, myCache } = require('../utils');
const { Op } = require('sequelize');
const { sequelize } = require('../db/models');

/**
 * Helper untuk menemukan semua kunci cache yang berhubungan dengan menu
 */
const getMenuCacheKeys = () => {
    const allKeys = myCache.keys();
    return allKeys.filter(k => k.startsWith('full_menu_'));
};

class MenuService {

    /**
     * FUNGSI HAPUS CACHE
     */
    static async clearMenuCache() {
        const menuKeys = getMenuCacheKeys();
        if (menuKeys.length > 0) {
            myCache.del(menuKeys);
            LogAny(__dirname, 'MenuService.clearMenuCache', `Cache menu dihapus: ${menuKeys.join(', ')}`, 'warn');
        }
        return { message: 'Menu cache cleared' };
    }

    // --- FUNGSI GET (LAZY & EAGER) (FINAL) ---

    static async getCategories(req) {
        try {
            const { menu_type_id } = req.query; 

            // 1. Buat options dinamis
            const options = {};

            // 2. Cek apakah ada request filter 'menu_type_id' (Misal dari Android)
            if (menu_type_id) {
                options.where = { menu_type_id: menu_type_id };
            }
            // JIKA TIDAK ADA 'menu_type_id' (Request dari Admin), 
            // 'options.where' akan kosong, sehingga BaseRepository akan mengambil SEMUA data.

            // 3. Panggil BaseRepository
            // Pastikan BaseRepository.getDataByOptions bisa menerima options kosong/tanpa where
            const categories = await BaseRepository.getDataByOptions(req, 'categories', options);
            
            // 4. Return hasil (BaseRepository biasanya mengembalikan array model Sequelize)
            return categories.map(model => model.toJSON());

        } catch (error) {
            LogError(__dirname, 'MenuService.getCategories', error);
            throw error;
        }
    }

    /**
     * FUNGSI LAZY LOADING (FINAL)
     * Menggunakan 'item_variations' dan 'modifier_lists' -> 'modifiers'
     */
    static async getItemsByCategory(req) {
        try {
            const db = req.app.get('db');
            const { category_id } = req.query;

            if (!category_id) {
                throw new Error('category_id query parameter is required');
            }

            const options = {
                where: { category_id: category_id },
                include: [
                    { // <-- Ubah 'db.item_variations' menjadi objek
                        model: db.item_variations,
                        as: 'item_variations',
                        include: [
                            {
                                model: db.taxes,
                                as: 'taxes' // <--- WAJIB DITAMBAHKAN (FIX ERROR)
                            }
                        ]
                        
                    },
                    db.item_tags,
                    {
                        model: db.modifier_lists,
                        as: 'modifierLists',
                        include: [ db.modifiers ]
                    }
                ],
                order: [['name', 'ASC']]
            };
            
            const items = await BaseRepository.getDataByOptions(req, 'items', options);
            return items.map(model => model.toJSON());

        } catch (error) {
            LogError(__dirname, 'MenuService.getItemsByCategory', error);
            throw error;
        }
    }

    /**
     * FUNGSI EAGER LOADING (FINAL)
     * Menggunakan 'item_variations' dan 'modifier_lists' -> 'modifiers'
     */
    static async getFullMenu(req) {
        const cacheKey = req.query.menu_type ? `full_menu_${req.query.menu_type}` : 'full_menu_all';

        try {
            let cachedData = myCache.get(cacheKey);
            if (cachedData) {
                LogAny(__dirname, 'MenuService.getFullMenu', `Mengambil dari CACHE: ${cacheKey}`, 'info');
                return cachedData;
            }

            LogAny(__dirname, 'MenuService.getFullMenu', `Mengambil dari DATABASE: ${cacheKey}`, 'warn');
            const db = req.app.get('db');
            const { menu_type } = req.query;
    
            const options = {
                include: [{
                    model: db.categories,
                    include: [{
                        model: db.items,
                        // === PERUBAHAN FINAL: Ganti 'item_options' dengan 'modifier_lists' ===
                        include: [
                            {
                                model: db.item_variations,
                                as: 'item_variations',
                                include: [ db.taxes ]
                            },
                            db.item_tags,
                            { // Include 'modifier_lists' (grup)
                                model: db.modifier_lists,
                                as: 'modifierLists',
                                include: [ db.modifiers ] // Include 'modifiers' (opsi) di dalam grup
                            }
                        ]
                    }]
                }]
            };
    
            if (menu_type) {
                options.where = { name: menu_type };
            }
    
            const menuInfo = await db.menu_types.findAll(options);
            let data = menuInfo.map(model => model.toJSON()); 

            if (req.query.menu_type) {
                // ... (Logika reduce Anda)
                const categories = data.length > 0 ? data[0].categories : [];
                const categoriesObj = categories.reduce((acc, category) => {
                    acc[category.name] = category;
                    return acc;
                }, {});
                myCache.set(cacheKey, categoriesObj);
                return categoriesObj;
          _ }
            
            myCache.set(cacheKey, data);
            return data;

        } catch (error) {
            LogError(__dirname, 'MenuService.getFullMenu', error);
            return Promise.reject(error);
        }
    }

    static async getAllItems(req) {
        try {
            const db = req.app.get('db');
            const { page = 1, limit = 10, search = '', sort = 'name' } = req.query; // Tambah default 'sort'

            const offset = (page - 1) * limit;
            
            // --- LOGIKA SORTING BARU ---
            let orderQuery = [['name', 'ASC'], ['id', 'ASC']]; // Default A-Z

            if (sort === 'latest') {
                // Urutkan berdasarkan waktu update terakhir (Stok Berubah / Edit Produk)
                orderQuery = [['updatedAt', 'DESC'], ['id', 'DESC']];
            }
            // ---------------------------

            // Bangun Query Options
            const options = {
                where: {}, // Tambahkan logika search di sini jika ada
                include: [
                    { 
                        model: db.categories, 
                        as: 'category',
                        attributes: ['id', 'name']
                    },
                    {
                        model: db.item_variations,
                        as: 'item_variations', // Sesuaikan alias
                        // include taxes jika perlu
                    }
                ],
                order: orderQuery, // <--- GUNAKAN VARIABEL ORDER INI
                limit: parseInt(limit),
                offset: parseInt(offset),
                distinct: true // Penting agar count pagination akurat dengan include
            };

            if (search) {
                options.where.name = { [db.Sequelize.Op.like]: `%${search}%` };
            }

            const data = await db.items.findAndCountAll(options);

            return {
                data: data.rows,
                meta: {
                    totalItems: data.count,
                    totalPages: Math.ceil(data.count / limit),
                    currentPage: parseInt(page),
                    itemsPerPage: parseInt(limit)
                }
            };

        } catch (error) {
            LogError(__dirname, 'MenuService.getAllItems', error.message);
            return Promise.reject(error);
        }
    }

    static async deleteItem(req) {
        const db = req.app.get('db');
        const { id } = req.params;

        try {
            // Karena kita sudah set ON DELETE CASCADE di database,
            // menghapus Item akan otomatis menghapus Variasi & Relasi-nya.
            const deleted = await db.items.destroy({
                where: { id }
            });

            if (!deleted) {
                throw { status: 404, message: 'Produk tidak ditemukan atau sudah dihapus' };
            }

            return { message: 'Produk berhasil dihapus permanen' };
        } catch (error) {
            LogError(__dirname, 'MenuService.deleteItem', error);
            throw error;
        }
    }

    // --- FUNGSI CUD (CREATE, UPDATE, DELETE) ---
    // --- DIPERBARUI UNTUK 'modifier_lists' ---

    /**
     * Fungsi CREATE (FINAL)
     * Payload API sekarang:
     * { ...itemData, item_variations: [], modifier_list_ids: [], item_tags: [] }
     */
    static async createMenu(req, payload) {
        const transaction = await sequelize.transaction();
        try {
            // 1. Ekstrak data
            const { item_variations, modifier_list_ids, item_tags, ...itemData } = payload;

            // 2. Validasi
            if (!itemData.id || !itemData.name || !itemData.category_id) {
                throw new Error('Item ID, Name, and Category ID are required.');
            }
            if (!item_variations || item_variations.length === 0) {
                throw new Error('Item must have at least one variation (e.g., "Regular").');
            }

            // 3. Buat item induk
            const newItem = await BaseRepository.create(req, itemData, 'items', { transaction });
            const newItemId = newItem.id;
            
            // 4. Buat variasinya
            const validatedVariations = item_variations.map(v => ({
                ...v,
                item_id: newItemId,
                price: parseInt(v.price, 10) || 0
            }));
            await BaseRepository.bulkCreate(req, validatedVariations, 'item_variations', { transaction });

            // 5. Tautkan ke Modifier Lists (BARU)
            if (modifier_list_ids && modifier_list_ids.length > 0) {
                // 'newItem' adalah instance Sequelize, ia memiliki metode helper
                await newItem.setModifier_lists(modifier_list_ids, { transaction });
            }

            // 6. Buat tag
            if (item_tags && item_tags.length > 0) {
                const updatedTags = item_tags.map(t => ({ ...t, item_id: newItemId }));
                await BaseRepository.bulkCreate(req, updatedTags, 'item_tags', { transaction });
            }

            await transaction.commit();
            await this.clearMenuCache();
            
            return newItem;
        } catch (error) {
            if (!transaction.finished) await transaction.rollback();
            LogError(__dirname, 'MenuService.createMenu', error);
            return Promise.reject(error);
        }
    }

    /**
     * Fungsi DELETE (FINAL)
     * 'ON DELETE CASCADE' akan menangani 'variations', 'tags', dan 'item_modifier_lists'
     */
    static async deleteMenuByItemId(req, id) {
        try {
            const options = { where: { id: id } };
            
            let row = await BaseRepository.getDataByOptions(req, 'items', options);

            if (!row || row.length == 0) {
                return Promise.reject(`Item with ID ${id} not found`);
            }
            if(Array.isArray(row)) { row = row[0]; }

            let optionsDelete = {};
            if (req.decoded) {
                optionsDelete.user = req.decoded.payloadToken;
            }
            optionsDelete.individualHooks = true;
            
            await row.destroy(optionsDelete); 

            await this.clearMenuCache();
            
            return row;
        } catch (error) {
            LogError(__dirname, 'MenuService.deleteMenuByItemId', error);
            return Promise.reject(error);
        }
    }

    /**
     * Fungsi UPDATE (FINAL)
     * Payload API:
     * { ...itemData, item_variations: [], modifier_list_ids: [], item_tags: [] }
     */
    static async updateMenu(req, payload) {
        const transaction = await sequelize.transaction();
    
        try {
            const { id, item_variations, modifier_list_ids, item_tags, ...itemData } = payload;

            if (!id) {
                throw new Error('Item ID is required for update.');
            }
            
            // Ambil item induk untuk menautkan relasi
            const itemInstance = await BaseRepository.getDataById(req, id, 'items');
            if (!itemInstance) {
                throw new Error('Item not found');
            }
    
            // 1. Update item induk
            const updatedRows = await BaseRepository.updateOrderByOptions(
                req, itemData, 'items', 
                { where: { id }, user: req.decoded.payloadToken.id, transaction } 
            );
    
            if (updatedRows[0] === 0) {
                 LogAny(__dirname, 'MenuService.updateMenu', `Item ${id} not found or data unchanged.`, 'info');
            }
    
            // 2. Hapus dan Buat Ulang Variasi
            await BaseRepository.deleteOrderByOptions(req, 'item_variations', { where: { item_id: id }, transaction });
            if (item_variations && item_variations.length > 0) {
                const validatedVariations = item_variations.map(v => ({
                    ...v, id: undefined, item_id: id, price: parseInt(v.price, 10) || 0
                }));
                await BaseRepository.bulkCreate(req, validatedVariations, 'item_variations', { transaction });
            } else {
                throw new Error('Item must have at least one variation.');
            }
    
            // 3. Set Ulang Tautan Modifier List (Sequelize akan menangani hapus/tambah)
            if (modifier_list_ids) { // Cek jika ada (bisa jadi array kosong)
                await itemInstance.setModifier_lists(modifier_list_ids, { transaction });
            }
    
            // 4. Hapus dan Buat Ulang Tag
            try {
                await BaseRepository.deleteOrderByOptions(req, 'item_tags', { where: { item_id: id }, transaction });
            } catch (error) {
                if (error.status !== 404 && error.message !== 'No record matches the Id provided') { throw error; }
            }
            if (item_tags && item_tags.length > 0) {
                const updatedTags = item_tags.map(tag => ({ ...tag, id: undefined, item_id: id }));
                await BaseRepository.bulkCreate(req, updatedTags, 'item_tags', { transaction });
            }
    
            await transaction.commit();
            await this.clearMenuCache();
            
            return updatedRows;
    
        } catch (error) {
            if (!transaction.finished) {
                await transaction.rollback();
            }
            console.error('Failed to update item:', error);
            throw error;
        }
    }

    static async createItem(req) {
        const db = req.app.get('db');
        const transaction = await db.sequelize.transaction();

        try {
            const { 
                name, 
                category_id, 
                description, 
                variations, 
                modifier_list_ids,
                tax_ids
            } = req.body;

            // 1. Buat Item
            const newItem = await db.items.create({
                name,
                category_id,
                description,
                image: req.file ? `/uploads/${req.file.filename}` : null,
                is_active: true
            }, { transaction });

            // 2. Buat Variasi
            if (variations && variations.length > 0) {
                const variationPayload = variations.map(v => ({
                    item_id: newItem.id,
                    name: v.name,
                    price: v.price,
                    stock_level: v.stock_level,
                    sku: v.sku || null
                }));

                const createdVariations = await db.item_variations.bulkCreate(variationPayload, { 
                    transaction,
                    returning: true 
                });

                if (tax_ids && tax_ids.length > 0) {
                    // Loop setiap variasi yang baru jadi
                    for (const variant of createdVariations) {
                        // Tempelkan pajak ke variasi ini
                        if (variant.setTaxes) {
                            await variant.setTaxes(tax_ids, { transaction });
                        }
                    }
                }
            }

            // 3. Hubungkan Modifier Lists (PASTI)
            if (modifier_list_ids && modifier_list_ids.length > 0) {
                // Langsung panggil method magic yang digenerate oleh alias "as: 'modifier_lists'"
                await newItem.setModifierLists(modifier_list_ids, { transaction });
            }

            await transaction.commit();
            return newItem;

        } catch (error) {
            await transaction.rollback();
            LogError(__dirname, 'MenuService.createItem', error);
            throw error;
        }
    }

    static async getItemDetail(req) {
        const db = req.app.get('db');
        const { id } = req.params;

        try {
            const item = await db.items.findOne({
                where: { id },
                include: [
                    // Ambil Variasi
                    { 
                        model: db.item_variations,
                        as: 'item_variations', // Pastikan alias sesuai model (default biasanya nama tabel jika tidak diset)
                        include: [
                             { model: db.taxes, as: 'taxes' } // Ambil Pajak per variasi
                        ]
                    },
                    // Ambil Modifier Lists (Gunakan alias yang baru kita fix tadi)
                    { 
                        model: db.modifier_lists, 
                        as: 'modifierLists',
                        through: { attributes: [] } // Jangan ambil data tabel junction
                    }
                ]
            });

            if (!item) throw { status: 404, message: 'Produk tidak ditemukan' };

            // --- DATA TRANSFORMATION ---
            // Kita ubah format Sequelize menjadi format JSON yang siap untuk Form Frontend
            
            const plainItem = item.toJSON();

            // 1. Ambil Array ID Modifier Lists: [1, 2]
            const modifierListIds = plainItem.modifierLists ? plainItem.modifierLists.map(m => m.id) : [];

            // 2. Ambil Array ID Tax (Kita ambil dari variasi pertama saja sebagai representasi global produk, 
            // karena di form Create kita set global)
            let taxIds = [];
            if (plainItem.item_variations && plainItem.item_variations.length > 0) {
                 const firstVar = plainItem.item_variations[0];
                 if (firstVar.taxes) {
                     taxIds = firstVar.taxes.map(t => t.id);
                 }
            }

            // Kembalikan data yang sudah dirapikan
            return {
                ...plainItem,
                modifier_list_ids: modifierListIds,
                tax_ids: taxIds
            };

        } catch (error) {
            LogError(__dirname, 'MenuService.getItemDetail', error);
            throw error;
        }
    }

    static async updateItem(req) {
        const db = req.app.get('db');
        const transaction = await db.sequelize.transaction();
        const { id } = req.params;

        try {
            const { 
                name, category_id, description, 
                variations, modifier_list_ids, tax_ids 
            } = req.body;

            // 1. Update Info Dasar Item
            await db.items.update({
                name, category_id, description
            }, { where: { id }, transaction });

            const item = await db.items.findByPk(id, { transaction });

            // 2. Update Relasi Modifier Lists (Overwrite)
            if (modifier_list_ids) {
                await item.setModifierLists(modifier_list_ids, { transaction });
            }

            // 3. Handle Variasi (Metode: SAFE SYNC) 🧠
            if (variations && variations.length > 0) {
                
                // A. Ambil SEMUA variasi lama di database
                const existingVariations = await db.item_variations.findAll({ 
                    where: { item_id: id },
                    transaction 
                });

                // B. Loop payload dari Frontend
                for (const v of variations) {
                    // Cari kecocokan: Cek ID dulu, kalau tidak ada cek Nama
                    const match = existingVariations.find(ev => 
                        (v.id && ev.id === v.id) || (ev.name === v.name)
                    );

                    let variationInstance;

                    if (match) {
                        // KASUS UPDATE: Ditemukan variasi lama yang cocok
                        match._processed = true; // Tandai agar tidak dihapus nanti
                        
                        await match.update({
                            name: v.name,
                            price: v.price,
                            stock_level: v.stock_level,
                            sku: v.sku,
                            // Pastikan track_inventory diupdate (default true jika undefined)
                            track_inventory: (v.track_inventory !== undefined) ? v.track_inventory : true
                        }, { transaction });
                        
                        variationInstance = match;
                    } else {
                        // KASUS CREATE: Tidak ada yang cocok, buat baru
                        variationInstance = await db.item_variations.create({
                            item_id: id,
                            name: v.name,
                            price: v.price,
                            stock_level: v.stock_level,
                            sku: v.sku,
                            track_inventory: (v.track_inventory !== undefined) ? v.track_inventory : true
                        }, { transaction });
                    }

                    // C. Update Pajak per Variasi (Jika ada tax_ids)
                    if (tax_ids && variationInstance) {
                        await variationInstance.setTaxes(tax_ids, { transaction });
                    }
                }

                // D. Hapus Variasi Lama yang TIDAK ada di payload (Safe Delete)
                for (const oldVar of existingVariations) {
                    if (!oldVar._processed) {
                        try {
                            // Coba hapus satu per satu
                            await oldVar.destroy({ transaction });
                        } catch (err) {
                            // Jika gagal hapus (karena pernah laku), BIARKAN SAJA.
                            // Jangan throw error, cukup log warning di console server.
                            console.log(`⚠️ Safe Delete: Tidak bisa menghapus variasi "${oldVar.name}" (ID: ${oldVar.id}) karena ada riwayat transaksi.`);
                        }
                    }
                }
            }

            await transaction.commit();
            return { message: "Update success" };

        } catch (error) {
            await transaction.rollback();
            LogError(__dirname, 'MenuService.updateItem', error.message);
            throw error;
        }
    }

    static async getModifierLists(req) {
        const db = req.app.get('db');
        // Ambil semua grup (misal: "Topping", "Sugar Level")
        // Sertakan modifiers-nya juga agar kita bisa lihat isinya (opsional)
        return await db.modifier_lists.findAll({
            include: [{ model: db.modifiers }],
            order: [['name', 'ASC']]
        });
    }
}

module.exports = MenuService;