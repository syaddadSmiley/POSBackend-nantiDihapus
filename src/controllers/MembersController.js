// file: controller/MembersController.js

const _ = require('lodash');
// 1. Import MembersService untuk DIGUNAKAN
const MembersService = require('../services/MembersService'); 
const async = require('async');
const {LogError, LogAny, Currency} = require('../utils');
const email = require('../utils/email');
const { Op, Sequelize } = require('sequelize');
const { jsPDF } = require('jspdf');
const fs = require('fs');
const moment = require('moment');

// 2. HAPUS 'extends MembersService'
class MembersController {
    static async membersGet(req, res, next){
        try {
            const plate = req.params.plat;
            const options = {
                where : {
                    plat_mobil: plate
                }
            }
            // 3. Mendelegasikan ke Service (mengganti 'super.')
            const data = await MembersService.getDataByOptions(req, options)
            
            if (Array.isArray(data)){
                if (data.length <= 0) {
                    res.status(404).json({error: 'data not found'});
                    return;
                }
            }
            res.status(200).json({message: 'success', data})
        } catch (error) {
            LogError(__dirname, 'MembersController.membersGet', error);
            res.status(500).json({ error: error.message });
        }
    }

    static async membersPost(req, res, next){
        try {   
            const payload = req.body;
            
            // 4. HAPUS SEMUA LOGIKA VALIDASI & TRANSFORMASI DARI SINI
            //   
            //    (Sudah dipindah ke MembersService.create)
            
            // 5. Mendelegasikan ke Service (mengganti 'super.')
            const data = await MembersService.create(req, payload);
            res.status(200).json({ message: 'success', data })
        } catch (error) {
            LogError(__dirname, 'MembersController.membersPost', error);
            // 6. Error handling (sudah benar)
            if (error.toString().includes('SequelizeUniqueConstraintError')) {
                res.status(502).json({error : 'Plat telah terdaftar!'});
                return;
            }
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = MembersController;