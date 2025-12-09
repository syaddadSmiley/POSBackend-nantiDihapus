const _ = require('lodash');
const RequestHandler = require('../../utils/RequestHandler');
const Logger = require('../../utils/Logger');

const logger = new Logger();
const errHandler = new RequestHandler(logger);

function LogError(dir, func, msg) {
    logger.log(`\n  Location: ${dir} (${func})\n  Error: ${msg}`, 'error');
}

class BaseRepository {

    static async create(req, data, modelName, options = {}) {
        let obj = data;
        let result;
        if (req.decoded) {
            options.user = req.decoded.payloadToken;
        }
        try {
            const model = req.app.get('db')[modelName].build(obj);
            result = await model.save(options).then(
                errHandler.throwIf(r => !r, 404, 'error', 'Data not found'),
                errHandler.throwError(500, 'error', 'Something went wrong either with the database or schema'),
            );
        } catch (err) {
            LogError(__dirname, 'BaseRepository.create', err);
            return Promise.reject(err);
        }
        return result;
    }
    
    static async getDataById(req, id, modelName) {
        var result;
        try {
            result = await req.app.get('db')[modelName].findByPk(id).then(
                errHandler.throwIf(r => !r, 404, 'not found', 'Resource not found'),
                errHandler.throwError(500, 'sequelize error ,some thing wrong with either the data base connection or schema'),
            );
            return result;
        } catch (error) {
            LogError(__dirname, 'BaseRepository.getDataById', error.message);
            return Promise.reject(error);
        }
    }

    static async getDataByOptions(req, modelName, options) {
        try {
            let result;
            if (options) {
                result = await req.app.get('db')[modelName].findAll(options).then(
                    errHandler.throwIf(r => !r, 404, 'error', 'Data not found'),
                    errHandler.throwError(500, 'error', 'Something went wrong either the database or schema'),
                );
            } else {
                //limit to 100
                result = await req.app.get('db')[modelName].findAll({ limit: 100 }).then(
                    errHandler.throwIf(r => !r, 404, 'error', 'Data not found'),
                    errHandler.throwError(500, 'error', 'Something went wrong either the database or schema'),
                );
            }
            return result;
        } catch (error) {
            LogError(__dirname, 'BaseRepository.getDataByOptions', error.message);
            return Promise.reject(error);
        }
    }

    static async findOneByOptions(req, modelName, options) {
        try {
            // Menggunakan Sequelize 'findOne' untuk mengambil satu objek saja
            const result = await req.app.get('db')[modelName].findOne(options);
            return result;
        } catch (error) {
            LogError(__dirname, 'BaseRepository.findOneByOptions', error.message);
            return Promise.reject(error);
        }
    }

    static async updateOrderFnbById(req, data, modelName) {
        if (!data.id || !data.payload) {
            return errHandler.throwError(400, 'error', 'Invalid data');
        }
        if (req.decoded) {
            options.user = req.decoded.payloadToken;
        }
        try {
            const result = await req.app.get('db')[modelName].update(data.payload, {
                where: { id: data.id },
                individualHooks: true // Add individual hooks for update
            }).then(
                errHandler.throwIf(r => !r, 404, 'not found', 'Resource not found'),
                errHandler.throwError(500, 'sequelize error ,some thing wrong with either the data base connection or schema'),
            ).then(result => Promise.resolve(result));
            return result;
        } catch (error) {
            LogError(__dirname, 'BaseRepository.updateOrderFnbById', error.message);
            return Promise.reject(error);
        }
    }

    static async updateOrderByOptions(req, data, modelName, options) {
        if (!data || !options) {
            return errHandler.throwError(400, 'error', 'Invalid data');
        }
        if (req.decoded) {
            options.user = req.decoded.payloadToken;
        }
        options.individualHooks = true; // Ensure individualHooks is always enabled for update operations
        try {
            const result = await req.app.get('db')[modelName].update(data, options).then(
                errHandler.throwIf(r => !r, 404, 'not found', 'Resource not found'),
                errHandler.throwError(500, 'sequelize error, something wrong with either the database connection or schema')
            );
            return result;
        } catch (error) {
            LogError(__dirname, 'BaseRepository.updateOrderByOptions', error.message);
            return Promise.reject(error);
        }
    }

    static async deleteOrderByOptions(req, modelName, options) {
        if (req.decoded) {
            options.user = req.decoded.payloadToken;
        }
        options.individualHooks = true; // Ensure individualHooks is enabled for delete operations

        try {
            const result = await req.app.get('db')[modelName].destroy(options
            ).then(
                errHandler.throwIf(r => r < 1, 404, 'not found', 'No record matches the Id provided'),
                errHandler.throwError(500, 'sequelize error'),
            ).then(result => Promise.resolve(result));
            return result;
        } catch (error) {
            logger.log(error.message, 'error');
            return Promise.reject(error);
        }
    }

    static async getOrderFnbByOrderNumAndDate(req, order_num, date) {
        return req.app.get('db')['order_fnb'].findOne({ where: { order_num, date } });
    }

    static async customSelectPreparedQuery(req, query, input) {
        let result;
        try {
            //prepared query
            result = await req.app.get('db').sequelize.query(query,
                { replacements: input, type: req.app.get('db').sequelize.QueryTypes.SELECT }
            ).then(
                errHandler.throwIf(r => !r, 500, 'Internal server error', 'something went wrong while fetching data'),
                errHandler.throwError(500, 'sequelize error'),
            ).then(result => Promise.resolve(result));
        } catch (err) {
            LogError(__dirname, 'BaseRepository.customSelectPreparedQuery', err);
            return Promise.reject(err);
        }
        return result;
    }

    static async bulkCreate(req, data, modelName, options = {}) {
        if (req.decoded) {
            options.user = req.decoded.payloadToken;
        }
        options.individualHooks = true;
        try {
            const model = req.app.get('db')[modelName];
            options.individualHooks = true; // Ensure individualHooks is enabled for bulkCreate operations
            const result = await model.bulkCreate(data, options);
            return result;
        } catch (err) {
            LogError(__dirname, 'BaseRepository.bulkCreate', err.message);
            return Promise.reject(err);
        }
    }
}

module.exports = BaseRepository;