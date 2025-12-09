const Logger = require('./Logger');
const async = require('async'); 
const nodemailer = require('nodemailer');
const moment = require('moment');

const {LogError, Currency} = require('./index');
const logger = new Logger();
const generateChart = require('./generateSalesChart')

module.exports = {
	async otpContent(cleanedName, otpCode){
		const htmlContent = `
				<!DOCTYPE html>
				<html>
				<head>
					<title>Verification Email</title>
				</head>
				<body>
					<h1>Verification Email</h1>
					<p>Hi ${cleanedName},</p>
					<p>Thank you for registering to our application. Please use this password to login to your account:</p>
					<p>Password: <b>${otpCode}</b></p>
					<p>Regards,</p>
					<p>Masbro Team</p>
				</body>
				</html>
				`;

		return htmlContent;
	},

	async notificationContent(cleanedName, message){
		const htmlContent = `
				<!DOCTYPE html>
				<html>
				<head>
					<title>Notification Smart Contract Created!</title>
				</head>
				<body>
					<h1>Notification Email</h1>
					<p>Dear ${cleanedName},</p>
					<p>${message}</p>
					<p>Regards,</p>
					<p>Masbro Team</p>
				</body>
				</html>
				`;

		return htmlContent;
	},

	async reportDailyContent(fnb, data) {
		try {
			const chartPath = await generateChart.generateMonthlySalesChart(data.salesMonth, data.month)
			const htmlContent2 = `
			<!DOCTYPE html>
			<html>
				<head>
					<title>Report ${fnb.type}</title>
				</head>
				<body>
					<h1>Report</h1>
					<hr></hr>
					<p>Dear ${fnb.name},</p>
					<p>Ini adalah ${fnb.type} report untuk tanggal ${fnb.date} dari ${fnb.name}:</p>
					<p>Kamu mendapatkan <b>Penjualan</b> sebesar <b>${Currency(data["Total Sales"])}</b>, belum termasuk service fee ya..</p>
					<p>Untuk <b>Service</b> Fee kamu mendapatkan sebesar <b>${Currency(data["Total Service Fee"])}</b>.</p>
					<p><b>Total Transaksi</b> yang terjadi sebanyak <b>${data["Total Transaction"]}</b>.</p>
					<p><b>Detail Sales</b>:</p>
					${
						data.detailSales.map((val, index) => {
							return `<p style="margin-left: 20px;">${index + 1}. ${val.item_name} x ${val.quantity} = ${Currency(val.sub_total_price)}</p>`;
						}).join('')
					}
					<br></br>
					<p><b>Grafik Penjualan</b>:</p>
					<img src="cid:sales-chart" alt="Sales Chart" />
					<br></br>
					<p>Regards,</p>
					<p>POSKamu >///<</p>
				</body>
			</html>`;
	
			return { htmlContent: htmlContent2, chartPath };
		} catch (error) {
			LogError(__dirname, 'email/reportDailyContent', error.message);
			throw error;
		}
	},

	async reportDailyContentCarwash(carwash, data) {
		try {
			const chartPath = await generateSalesChart(data.detailSales);

			const htmlContent = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Report ${carwash.type}</title>
			</head>
			<body>
				<h1>Report</h1>
				<hr></hr>
				<p>Dear ${carwash.name},</p>
				<p>Ini adalah ${carwash.type} report untuk tanggal ${carwash.date} dari ${carwash.name}:</p>
				<p>Kamu mendapatkan <b>Penjualan</b> sebesar <b>${Currency(data["Total Sales"])}</b>, belum termasuk service fee ya..</p>
				<p>Untuk <b>Service</b> Fee kamu mendapatkan sebesar <b>${Currency(data["Total Service Fee"])}</b>.</p>
				<p><b>Total Transaksi</b> yang terjadi sebanyak <b>${data["Total Transaction"]}</b>.</p>
				<p><b>Detail Sales</b>:</p>
				${
				data.detailSales.map((val, index) => {
					return `<p style="margin-left: 20px;">${index + 1}. ${val.item_name} x ${val.quantity} = ${Currency(val.sub_total_price)}</p>`;
				}).join('')
				}
				<br></br>
				<p><b>Grafik Penjualan</b>:</p>
				<img src="cid:sales-chart" alt="Sales Chart" />
				<br></br>
				<p>Regards,</p>
				<p>POSKamu >///<</p>
			</body>
			</html>`;

			return { htmlContent, chartPath };
		} catch (error) {
			LogError(__dirname, 'email/reportDailyContentCarwash', error.message);
			throw error;
		}
},

	async constructMailOptions(to, subject, textContent, htmlContent, attachments) {
        return {
            from: `aspace@sumatera <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            text: textContent,
            html: htmlContent,
            attachments: attachments,
        };
    },

	async sendEmail(parentCallback, to, subject, textContent, htmlContent, chartPath) {
        const errorEmails = [];
        const successfulEmails = [];
        const mailOptions = await this.constructMailOptions(to, subject, textContent, htmlContent, [{
            filename: `sales-chart-${moment().format('DDMMYYYY')}.png`,
            path: chartPath,
            cid: 'sales-chart'
        }]);

        async.parallel([
            function one(callback) {
                const transporter = nodemailer.createTransport({
                    host: process.env.EMAIL_HOST,
                    port: process.env.EMAIL_PORT,
                    secure: process.env.EMAIL_SECURE === 'true' ? true : false,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                });
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        const stringError = error.toString();
                        logger.log(stringError, 'error');
                    } else {
                        console.log(info)
                        logger.log(`Email sent: ${info.response} |||| and Accepted by => ${info.accepted} | Rejected by => ${info.rejected}`, 'info');
                    }
                });

                callback(null, {
                    successfulEmails: 1,
                    errorEmails: 0,
                });
            },
        ], (err, results) => {
            if (err) {
                logger.log(`error ,Error during processing request at : ${new Date()} details message: ${err.message}`, 'error');
            } else {
                logger.log(`an email has been sent: ${new Date()} with results: SENDING....`, 'info');
            }
        });
        parentCallback(null,
            {
                successfulEmails,
                errorEmails,
            });
    },

};
