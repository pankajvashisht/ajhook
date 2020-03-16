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
		let pushMessage = 'driver is on the way please keep your id proof ready';
		if (parseInt(order_status) === 4) {
			DB.save('users', {
				id: requestData.user_id,
				is_free: 1
			});
			message = 'Order has been completed';
			pushMessage = message;
		}
		setTimeout(() => {
			apis.sendPush(order_info.user_id, {
				message: pushMessage,
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
			order_id: Request.body.order_id,
		};
		const RequestData = await apis.vaildation(required, {});
		const orderDetails = await DB.find('orders', 'first', {
			conditions: {
				id: RequestData.order_id,
				user_id: RequestData.user_id
			}
		});
		if (!orderDetails) throw new ApiError('Invaild order id', 404);
		const driverInfo = await DB.find('users', 'first', {
			conditions: {
				id: orderDetails.driver_id,
			}, fields: ['latitude', 'longitude']
		})
		return {
			message: 'Driver location',
			data: driverInfo
		};
	}
};
