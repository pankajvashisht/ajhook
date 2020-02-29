const ApiController = require('./ApiController');
const Db = require('../../../libary/sqlBulider');
const ApiError = require('../../Exceptions/ApiError');
const app = require('../../../libary/CommanMethod');
let apis = new ApiController();
let DB = new Db();

module.exports = {
	CompleteOrders: async (Request) => {
		const required = {
			order_id: Request.body.order_id,
			driver_id: Request.body.user_id,
			order_status: Request.body.order_status
		};
		const requestData = await apis.vaildation(required, {});
		const order_info = await DB.find('orders', 'first', {
			conditions: {
				driver_id: requestData.driver_id,
				id: requestData.order_id
			}
		});
		if (!order_info) throw new ApiError('Invaild Order id', 400);
		const { order_id, order_status } = requestData;
		let message = 'Order on the way';
		if (parseInt(order_status) === 4) {
			DB.save('users', {
				id: requestData.user_id,
				is_free: 1
			});
			message = 'Order has been completed';
		}
		setTimeout(() => {
			apis.sendPush(order_info.user_id, {
				message: message,
				data: order_info,
				notification_code: 5
			});
		}, 100);
		DB.save('orders', {
			id: order_id,
			order_status
		});
		return {
			message,
			data: []
		};
	},
	TrackDriver: async (Request) => {
		const required = {
			user_id: Request.body.user_id,
			shop_id: Request.body.shop_id,
			product_id: Request.body.product_id,
			quantity: Request.body.quantity || 1,
			order_date: RequestData.body.order_date || app.currentTime(),
			status: 1
		};
		const RequestData = await apis.vaildation(required, {});
		return {
			message: 'Order add Successfully',
			data: RequestData
		};
	}
};
