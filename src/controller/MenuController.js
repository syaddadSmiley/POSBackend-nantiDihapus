// file: controller/MenuController.js

const _ = require('lodash');
// 1. Import MenuService untuk DIGUNAKAN
const MenuService = require('../services/MenuService'); 
const async = require('async');
// 2. Hapus import yang tidak perlu (Currency, Sequelize, jsPDF, fs)
const { LogError, LogAny } = require('../utils');
const email = require('../utils/email');
const { Op } = require('sequelize');
const moment = require('moment');

// 3. HAPUS 'extends MenuService'
class MenuController {
    
    static async categoriesGet(req, res, next) {
        try {
            // Validasi di controller
            // if (!req.query.menu_type_id) {
            //     return res.status(400).json({ error: 'menu_type_id query parameter is required' });
            // }
            // Cukup delegasikan ke service
            const categories = await MenuService.getCategories(req);
            res.status(200).json(categories);
        } catch (error) {
            LogError(__dirname, 'MenuController.categoriesGet', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    static async itemsGet(req, res, next) {
        try {
            // SKENARIO 1: Request dari Android (POS)
            // Ciri: Mengirim parameter ?category_id=...
            if (req.query.category_id) {
                const items = await MenuService.getItemsByCategory(req);
                return res.status(200).json(items);
            }

            // SKENARIO 2: Request dari Admin Dashboard (SaaS)
            // Ciri: Tidak kirim category_id, tapi mungkin kirim page/limit/search
            // Kita panggil fungsi baru yang mendukung Pagination
            const result = await MenuService.getAllItems(req);
            return res.status(200).json(result);

        } catch (error) {
            LogError(__dirname, 'MenuController.itemsGet', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    static async itemCreate(req, res) {
        try {
            const newItem = await MenuService.createItem(req);
            res.status(201).json({ message: 'Item created successfully', data: newItem });
        } catch (error) {
            // LogError sudah di service
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    static async itemDetail(req, res) {
        try {
            const data = await MenuService.getItemDetail(req);
            res.status(200).json(data);
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    static async itemUpdate(req, res) {
        try {
            await MenuService.updateItem(req);
            res.status(200).json({ message: 'Produk berhasil diperbarui' });
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    static async itemDelete(req, res) {
        try {
            await MenuService.deleteItem(req);
            res.status(200).json({ message: 'Produk berhasil dihapus' });
        } catch (error) {
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    static async modifierListsGet(req, res) {
        try {
            const data = await MenuService.getModifierLists(req);
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // --- ENDPOINT CACHE ANDA ---
    
    static async clearCache(req, res, next) {
        try {
            const result = await MenuService.clearMenuCache();
            res.status(200).json(result);
        } catch (error) {
            LogError(__dirname, 'MenuController.clearCache', error);
            res.status(500).json({ error: error.message });
        }
    }

    static async menuGet(req, res, next) {
        try {
            
            const menuData = await MenuService.getFullMenu(req);
            
            res.status(200).json(menuData);
        } catch (error) {
            LogError(__dirname, 'MenuController.menuGet', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    /**
     * Mengganti 'super.' dengan 'MenuService.'
     */
    static async menuDelete(req, res, next) {
        try {
            const id = req.params.id;
            // 6. Mendelegasikan tugas ke MenuService
            const rowAffected = await MenuService.deleteMenuByItemId(req, id);
            
            if (rowAffected <= 0) {
                res.status(500).json({error: 'failed to delete'});
            } else {
                res.status(200).json({message: 'success to delete'});
            }
        } catch (error) {
            LogError(__dirname, 'MenuController.menuDelete', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    /**
     * Memanggil MenuService secara statis (sudah benar)
     */
    static async menuPut(req, res, next) {
        try {
            const payload = req.body;
            // 7. Mendelegasikan tugas ke MenuService
            const updatedRow = await MenuService.updateMenu(req, payload);
            
            if(updatedRow[0] = 1) { // Error? Seharusnya '==' atau '==='
                res.status(200).json({message: 'success'});
            } else {
                res.status(500).json({ error: 'failed' });
            }
        } catch (error) {
            LogError(__dirname, 'MenuController.menuPut', error);
            res.status(error.status || 500).json({ error: error.message });
        }
    }

    /**
     * Memanggil MenuService secara statis (sudah benar)
     */
    static async menuPost(req, res, next) {
        try {
            const payload = req.body;
            // 8. Mendelegasikan tugas ke MenuService
            const createdMenu = await MenuService.createMenu(req, payload);
            
            console.log("Created Menu", createdMenu);
            res.status(200).json({ message: 'success'});
        } catch (error) {
            LogError(__dirname, 'MenuController.menupost', error);
            if (error.toString().includes('SequelizeUniqueConstraintError')) {
                res.status(502).json({error : 'ID might has been used'});
                return;
            }
            res.status(error.status || 500).json({ error : error.message });
        }
    }
}

module.exports = MenuController;