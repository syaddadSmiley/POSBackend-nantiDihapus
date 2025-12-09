var mysql = require('mysql2');
var migration = require('mysql-migrations');

const env = process.env.NODE_ENV || 'development';
const config = require(`${__dirname}/../config.json`)[env];

var connection = mysql.createPool({
    user: config.username,
    password: config.password,
    database: config.database,
    host: config.host,
    multipleStatements: true,
    connectionLimit: 10
});

migration.init(connection, __dirname + '/', function () {
    console.log("finished running migrations");
});