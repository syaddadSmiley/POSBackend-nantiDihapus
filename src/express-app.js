const express = require('express');
const cors = require('cors');
const { fnb, carwash } = require('./api');
const { LogAny  } = require('./utils');
const router = require('./api');
const config = require('./config');

module.exports = async (app) => {
    app.set('config', config);
    app.use(express.json());
    const corsOptions = {
        origin: ["http://203.175.11.217", "http://localhost:3000", "http://pos-aspace.xyz", "http://localhost:5173", "*", "https://1632ghkl-5173.asse.devtunnels.ms"], // Allow requests from the same IP
        credentials: true, // Necessary for cookies
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization", "Access-Control-Allow-Credentials"],
        exposedHeaders: ["Set-Cookie"]
    };
    app.use(cors(corsOptions));
    app.use(express.static(__dirname + '/public'))
    app.use((req, res, next) => {
        LogAny(__dirname, 'index', `a request has been made with the following info | ${req.method} | ${req.ip} | ${req.url} | ${req.headers['user-agent']} ${JSON.stringify(req.body)} ${JSON.stringify(req.query)}`, 'info');
        next();
    });
    app.get(/.*config.*|.*env.*/, (req, res) => {
        res.status(403).json({ type: 'error', message: 'Nahhh hayolooo, the frick are u doing here boy' });
    });

    app.use(router)
    
    
}
