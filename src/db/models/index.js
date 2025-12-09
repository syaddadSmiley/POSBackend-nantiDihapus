'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);

// IMPORT CONFIG YANG BARU KITA BUAT
const config = require('../../config'); // Pastikan path-nya benar ke folder config
const dbConfig = config.db; // Ambil bagian 'db' saja

const db = {};
let sequelize;

// Inisialisasi Sequelize langsung pakai object dari config
// Tidak perlu logika if-else rumit lagi di sini
console.log(`Connecting to database: ${dbConfig.database} at ${dbConfig.host}`);

sequelize = new Sequelize(
    dbConfig.database, 
    dbConfig.username, 
    dbConfig.password, 
    dbConfig // Ini sudah mengandung dialectOptions SSL dari file config tadi
);

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Logging function for changes
async function logChanges(actionType, tableName, recordId, oldValues, newValues, user, transaction) {
    // Prevent logging changes to the 'db_logs' table to avoid recursion
    if (tableName === 'db_logs') {
        return;
    }

    // Debugging logs for tracing user object
    console.log('User object before logging change:', tableName, JSON.stringify(user), actionType);

    // Handle INSERT action: assign a placeholder recordId if not provided
    if (actionType === 'INSERT') {
        recordId = recordId || 'new';
    }

    // Prevent logging if recordId is still missing
    if (!recordId) {
        console.log('Skipping log creation due to missing recordId.');
        return;
    }

    // Ensure the user and user.id_user are valid
    const changedBy = (user && user.id_user) ? user.id_user : 'system';  // Fallback to 'system' if user.id_user is missing
    const ipAddress = (user && user.ip_address) ? user.ip_address : 'unknown';  // Fallback to 'unknown' if IP is missing

    console.log('Logging change:', actionType, tableName, recordId, 'Changed by:', changedBy);

    console.log({
        action_type: actionType,
        table_name: tableName,
        record_id: recordId,
        old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null,
        changed_by: changedBy,
        transaction_id: transaction ? transaction.id : null,
        ip_address: ipAddress,
    });

    try {
        // Only stringify old and new values if they are objects, skip if they are already strings
        const oldVal = typeof oldValues === 'object' ? JSON.stringify(oldValues) : oldValues;
        const newVal = typeof newValues === 'object' ? JSON.stringify(newValues) : newValues;

        // Insert the log entry into the db_logs table
        await dbModel.db_logs.create({
            action_type: actionType,
            table_name: tableName,
            record_id: recordId,
            old_values: oldVal ? oldVal : null,  // Ensure null for empty values
            new_values: newVal ? newVal : null,
            changed_by: changedBy,  // Never allow null for changed_by
            transaction_id: transaction ? transaction.id : null,  // Log the transaction ID if available
            ip_address: ipAddress,  // Log the IP address
            reason: null,  // Optional: log the reason for the change
            created_at: new Date(),  // Log the timestamp of the change
        });

        // Log the success of the log creation
        LogAny(__dirname, 'index', `Log successfully created with id ${recordId}`);
    } catch (error) {
        // Log errors related to the log creation
        console.log('tableName', tableName);
        console.error('Failed to create log:', error);
    }
}

// Global hooks for logging before and after database actions
// sequelize.addHook('beforeUpdate', async (instance, options) => {
//     const oldValues = instance._previousDataValues;
//     const newValues = instance.dataValues;
//     const user = options.user;
//     await logChanges('UPDATE', instance.constructor.name, instance.id, oldValues, newValues, user, options.transaction);
// });

// sequelize.addHook('afterCreate', async (instance, options) => {
//     const newValues = instance.dataValues;
//     const user = options.user;
//     await logChanges('INSERT', instance.constructor.name, instance.id, null, newValues, user, options.transaction);
// });

// sequelize.addHook('afterDestroy', async (instance, options) => {
//     const oldValues = instance.dataValues;
//     const user = options.user;
//     await logChanges('DELETE', instance.constructor.name, instance.id, oldValues, null, user, options.transaction);
// });


module.exports = db;
