const _ = require('lodash');
const CarwashService = require('../services/carwash-service');
const async = require('async');
const {LogError, LogAny} = require('../utils');
const email = require('../utils/email');
const { Op, Sequelize } = require('sequelize');
const { jsPDF } = require('jspdf');
const fs = require('fs');
const moment = require('moment');

module.exports = (app) => {
    const service = new CarwashService(app);

    app.use(async (req, res, next) => {
        console.log("\n==================================");
        console.log("============= Carwash ================");
        console.log("==================================");
        next();
    });

    app.post('/api/v1/carwash/order', async (req, res, next) => {
        const { payload } = req.body;
        var created = null;
        var orderDb = null;
        try { 
            // Check for existing order with the same order number and date
            orderDb = await service.getAllOrderCarwash({ where: { order_num: payload.order_num, date: payload.date } });
            if (_.isEmpty(orderDb)) {
                created = await service.createOrderCarwash(payload);
            }
        } catch (err) {
            console.log(err);
        }
    
        try {
            if (!_.isEmpty(orderDb)) {
                if (orderDb.status === 'in progress') {
                    // Just update the order
                    created = await service.updateOrderCarwash(payload);
                } else if (orderDb.status === 'paid') {
                    res.status(400).json({ message: 'Order already paid' });
                    return;
                }
            }
        } catch (err) {
            res.status(400).json({ message: err.message });
            return;
        }
    
        if (_.isEmpty(created)) {
            LogError(__dirname, 'carwash/api/v1/carwash/order', 'Failed to create order');
            res.status(400).json({ message: 'Failed to create order' });
            return;
        } else if (created.error) {
            LogError(__dirname, 'carwash/api/v1/carwash/order', created.error.message);
            res.status(400).json({ message: created.error.message });
            return;
        }
        res.json(created);
    });

    app.get('/api/v1/carwash/order', async (req, res, next) => {

        const { date } = req.query;
        // const likeId = 'order-' + "08052024";
        const likeId = 'order-' + date;
        const options = { 
            where: {
                order_id: {
                    [Op.like]: likeId + '%'
                }
            }
        };
        if (date) {
            const data = await service.getAllOrderCarwash(options)
            if (_.isArray(data)) {
                const result = [];
                // ascending order by order_num
                data.sort((a, b) => a.order_num - b.order_num);
                for (const item of data) {
                    result.push(item);
                }
                res.json(result);
                return;
            }
        }

        res.json({ message: 'GET request to the homepage' });

    });

    app.put('/api/v1/carwash/order', async (req, res, next) => {
        console.log("AHLLOOO")
        const { payload } = req.body;
        var updated = null;
        try {
            updated = await service.updateOrderCarwash(payload);
        } catch (err) {
            LogError(__dirname, 'carwash/api/v1/carwash/order', 'Failed to update order \n'+err);
            res.status(400).json({ message: err.message });
            return;
        }
        
        console.log("result", updated);
        res.json({message: "success"});

    });

    app.post('/api/v1/carwash/order/insert-all', async (req, res, next) => {
        const { list_payload } = req.body;
        const created = [];
        try{
            for (const payload of list_payload) {
                const data = await service.createOrderCarwash(payload);
                created.push(data);
            }
        } catch (err) {
            res.status(400).json({ message: err.message });
            return;
        }
        
        if (_.isEmpty(created)) {
            LogError(__dirname, 'carwash/api/v1/carwash/order/insert-all', 'Failed to insert order');
            res.status(400).json({ message: 'Failed to insert order' });
            return;
        }else if (created.error) {
            LogError(__dirname, 'carwash/api/v1/carwash/order/insert-all', created.error.message);
            res.status(400).json({ message: created.error.message });
            return;
        }
        res.json(created);
    });

    app.post('/api/v1/carwash/order/report', async (req, res, next) => {
        const { payload } = req.body;
        if(_.isEmpty(payload)){
            res.status(400).json({ message: 'Data is empty' });
            return;
        }
        const carwash = payload.carwash;
        let data = payload.data;
        const [firstDate] = carwash.date.split(" - ");
        const month = firstDate.split('/')[1];
        const year = firstDate.split('/')[2];
        const orderByMonth = await service.getAllOrderCarwash({ where: {
            date: {
                [Op.and]: [
                    Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('date')), month),
                    Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('date')), year)
                ]
            }
        }})

        const daysInMonth = new Date(year, month, 0).getDate();
        const dailyTotals = {};
        for (let day = 1; day <= daysInMonth; day++) {
            dailyTotals[day] = 0;
        }

        orderByMonth.forEach(order => {
            const orderDate = new Date(order.dataValues.date);
            const orderDay = orderDate.getDate(); // Get the day of the order
            const orderMonth = orderDate.getMonth() + 1; // Get the month of the order (+1 because getMonth is 0-based)
            const orderYear = orderDate.getFullYear(); // Get the year of the order
          
            if (orderMonth === parseInt(month) && orderYear === parseInt(year)) { // Filter for August 2024
              dailyTotals[orderDay] += order.dataValues.total;
            }
          });
          
        // console.log(dailyTotals);
        data.salesMonth = dailyTotals;
        data.month = moment(month).format('MMMM');
        const {htmlContent, chartPath} = await email.reportDailyContent(carwash, data);
        async.parallel([
            function one(callback){
                email.sendEmail(callback, 'claynomercy@gmail.com', `Report of ${payload.carwash.type}-${carwash.date}` , '', htmlContent, chartPath);
            },
        ], (err, results) => {
            if(err){
                LogError(__dirname, 'carwash/api/v1/carwash/order/report', err);
            }else{
                LogAny(__dirname, 'carwash/api/v1/carwash/order/report', 'Email sent', 'warn');
            }
        });

        // var doc = new jsPDF();
        // doc.text(htmlContent, 10, 10);
        // doc.save('./Report'+carwash.type+'-'+date+'.pdf');
        // //check if the file is created
        // if (!fs.existsSync('./Report'+carwash.type+'-'+date+'.pdf')) {
        //     LogError(__dirname, 'carwash/api/v1/carwash/order/report', 'Failed to create pdf');
        //     res.status(400).json({ message: 'Failed to create pdf' });
        //     return;
        // }

        // // res file
        // const path = `./Report${carwash.type}-${date}.pdf`;
        // const file = fs.createReadStream
        // res.download(path, `Report${carwash.type}-${date}.pdf`, (err) => {
        //     if (err) {
        //         LogError(__dirname, 'carwash/api/v1/carwash/order/report', err);
        //     }
        //     fs.unlinkSync(path);
        // });


        res.json({ message: 'Email sent' });
    });

    app.post('/api/v1/carwash/report', async (req, res, next) => {
        const { startDate, endDate } = req.body;
        let reportData;
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
        try {
            reportData = await service.generateReport(startDate, adjustedEndDate.toISOString().split('T')[0]);
        } catch (err) {
            LogError(__dirname, 'carwash/api/v1/carwash/report', 'Failed to generate report \n' + err);
            res.status(400).json({ message: err.message });
            return;
        }
    
        res.json(reportData);
    });
}