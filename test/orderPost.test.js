const request = require('supertest');   
const assert = require('assert');
const sinon = require('sinon');
const app = require('../src/index.js'); // Adjust the path to your Express app
const FnbService = require('../src/services/FnbService.js')
const service = new FnbService;
const moment = require('moment')
const BaseController = require('../src/db/repository/base-repository.js')
const { Op, fn, col } = require('sequelize');

describe('POST /order', () => {
    let createOrderStub;
    let getOrderStub;
    let updateOrderStub;
    let req
    

    beforeEach(() => {
        // Stub the service methods
        // createOrderStub = sinon.stub(service, 'createOrderFnb');
        // getOrderStub = sinon.stub(service, 'getAllOrderFnb');
        // updateOrderStub = sinon.stub(service, 'updateOrderFnb');
    });

    afterEach( async () => {
        // Restore the original methods after each test
        // sinon.restore();
          const res = await request(app)
            .delete('/api/v1/fnb/order')
            .send({
                ambatukam: true
            }).timeout(10000);
        // console.log(app)
    });

    it('should create a new order if no existing order is found', async () => {
        const res = await request(app)
            .post('/api/v1/fnb/order')
            .send({
                payload: {
                    order_num: 1,
                    date: moment().format(),
                    order_items: [],
                    status: 'in progress',
                    total: 100,
                    notes: 'Test note',
                },
            });
        console.log(res.info)
        // Using Node's built-in assert instead of expect
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.order_num, 1);
        assert.strictEqual(res.body.status, 'in progress');
        assert.strictEqual(res.body.total, 100);
    });

    // it('should update an existing order if the status is "in progress"', async () => {
    //     getOrderStub.resolves([{ order_num: 1, status: 'in progress' }]);
    //     updateOrderStub.resolves({ order_num: 1, status: 'in progress', total: 150 });

    //     const res = await request(app)
    //         .post('/api/v1/fnb/order')
    //         .send({
    //             payload: {
    //                 order_num: 1,
    //                 date: '20230819',
    //                 order_items: [],
    //                 status: 'in progress',
    //                 total: 150,
    //                 notes: 'Updated note',
    //             },
    //         });

    //     // Using assert for verification
    //     assert.strictEqual(res.status, 200);
    //     assert.strictEqual(res.body.order_num, 1);
    //     assert.strictEqual(res.body.status, 'in progress');
    //     assert.strictEqual(res.body.total, 150);
    // });

    // it('should return 400 if the order is already paid', async () => {
    //     getOrderStub.resolves([{ order_num: 1, status: 'paid' }]);

    //     const res = await request(app)
    //         .post('/api/v1/fnb/order')
    //         .send({
    //             payload: {
    //                 order_num: 1,
    //                 date: '20230819',
    //                 order_items: [],
    //                 status: 'in progress',
    //                 total: 100,
    //                 notes: 'Test note',
    //             },
    //         });

    //     // Using assert for verification
    //     assert.strictEqual(res.status, 400);
    //     assert.strictEqual(res.body.message, 'Order already paid');
    // });

    // it('should handle errors and return 400 with the error message', async () => {
    //     getOrderStub.rejects(new Error('Database error'));

    //     const res = await request(app)
    //         .post('/api/v1/fnb/order')
    //         .send({
    //             payload: {
    //                 order_num: 1,
    //                 date: '20230819',
    //                 order_items: [],
    //                 status: 'in progress',
    //                 total: 100,
    //                 notes: 'Test note',
    //             },
    //         });

    //     // Using assert for verification
    //     assert.strictEqual(res.status, 400);
    //     assert.strictEqual(res.body.message, 'Database error');
    // });
});