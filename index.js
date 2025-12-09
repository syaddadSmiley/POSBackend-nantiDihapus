const express = require('express');

const app = express();

app.use(express.json());

app.use('/', (req, res, next) => {
    return res.status(200).json({
        message: 'Hello from the fnb service'
    });
});

app.listen(8002, () => {
    console.log('Fnb service running on port 8002');
});