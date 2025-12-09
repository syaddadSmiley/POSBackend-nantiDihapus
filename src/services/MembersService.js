// file: services/MembersService.js

const { BaseRepository } = require('../db'); // <-- 1. Import BaseRepository
const _ = require('lodash');
const { LogError, LogAny } = require('../utils');
const { Op } = require('sequelize');
const { sequelize} = require('../db/models');

// 2. HAPUS 'extends BaseRepository'
class MembersService {

    static async create(req, payload) {
        try {
            // 3. LOGIKA DIPINDAHKAN DARI MembersController
            if (_.isUndefined(payload)) {
                throw new Error('Bad request: Payload is undefined');
            }
            if(_.isEmpty(payload.date_of_birth)){
                payload.date_of_birth = null;
            }
            if(_.isString(payload.warna_mobil)){
                payload.warna_mobil = payload.warna_mobil.toUpperCase();
            }
            payload.merk_mobil = payload.merk_mobil.toUpperCase();
            // -----------------------------------------------------

            // 4. Mengganti 'super.' menjadi 'BaseRepository.'
            const data = await BaseRepository.create(req, payload, 'members');
            return data;
        } catch (error) {
            LogError(__dirname, 'MembersService.create', error);
            return Promise.reject(error);
        }
    }

    static async getDataByOptions(req, options) {
        try {
            // 5. Mengganti 'super.' menjadi 'BaseRepository.'
            const data = await BaseRepository.getDataByOptions(req, 'members', options);
            return data
        } catch (error) {
            LogError(__dirname, 'MembersService.getDataByOptions', error);
            return Promise.reject(error);
        }
    }
}

module.exports = MembersService;