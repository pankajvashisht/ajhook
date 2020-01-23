const ApiController = require('./ApiController');
const Db = require('../../../libary/sqlBulider');
const ApiError = require('../../Exceptions/ApiError');
const app = require('../../../libary/CommanMethod');
const { lang } = require('../../../config');
let apis = new ApiController();
let DB = new Db();

module.exports = {
	getShop: async (Request) => {
		let offset = Request.params.offset || 1;
		const limit = Request.query.limit || 10;
		const search = Request.query.search || '';
		const lalitude = Request.query.lalitude || 0;
		const longitude = Request.query.longitude || 0;
		offset = (offset - 1) * limit;
		const condition = {
			conditions: {
				user_type: 2,
				status: 1
			},
			fields: [
				'id',
				'name',
				'status',
				'is_free',
				'is_online',
				'email',
				'phone',
				'phone_code',
				'profile',
				'address',
				'user_type',
				'latitude',
				'longitude',
				`IFNULL((select avg(rating) from ratings where  user_id=users.id),0) as rating`,
				`round(( 6371 * acos( cos( radians(${lalitude}) ) * cos( radians(latitude) ) * cos( radians( longitude ) - radians(${longitude}) ) + sin( radians(${lalitude}) ) * sin(radians(latitude)) ) ),0) as total_distance`
			],
			having: [ 'total_distance <= 10' ],
			limit: [ offset, limit ],
			orderBy: [ 'id desc' ]
		};
		if (search) {
			condition.conditions[`like`] = {
				name: search
			};
		}
		const result = await DB.find('users', 'all', condition);
		return {
			message: 'shop list',
			data: app.addUrl(result, 'profile')
		};
	},
	orderHoohuk: async (Request) => {
		const required = {
			user_id: Request.body.user_id,
			product_id: Request.body.product_id,
			quantity: Request.body.quantity || 1,
			order_date: Request.body.order_date || app.currentTime,
			status: 1
		};
		const RequestData = await apis.vaildation(required, {});
		const product = await DB.find('products', 'first', {
			conditions: {
				id: RequestData.product_id
			}
		});
		if (!product) throw new ApiError('Invaild product id', 422);
		RequestData.shop_id = product.user_id;
		if (product.stock === 0 && product.stock < RequestData.quantity)
			throw new ApiError('Product out of stocks', 422);
		RequestData.product_details = JSON.stringify(product);
		RequestData.price = product.price * RequestData.quantity;
		product.stock -= RequestData.quantity;
		DB.save('products', product);
		RequestData.address_details = JSON.stringify({
			address: Request.body.userInfo.address,
			lalitude: Request.body.userInfo.lalitude,
			longitude: Request.body.userInfo.longitude
		});
		RequestData.order_id = await DB.save('orders', RequestData);
		return {
			message: 'Order add Successfully',
			data: RequestData
		};
	},
	doPayment: async (Request) => {
		const required = {
			user_id: Request.body.user_id,
			order_id: Request.body.order_id,
			payment_datials: Request.body.payment_datials,
			status: Request.body.status // 0 -> fail 1-> success
		};
		const RequestData = await apis.vaildation(required, {});
		const condition = {
			conditions: {
				id: RequestData.order_id
			}
		};
		const result = await DB.find('orders', 'first', condition);
		if (!result) throw new ApiError('Invaild order id', 422);
		RequestData.booking_id = await DB.save('payments', RequestData);
		return {
			message: 'Payment Successfully',
			data: RequestData
		};
	},
	myOrders: async (Request) => {
		const user_id = Request.body.user_id;
		const user_type = Request.body.userInfo.user_type;
		let offset = Request.params.offset || 1;
		const limit = Request.query.limit || 10;
		const order_status = Request.query.order_status || 1;
		offset = (offset - 1) * limit;
		const conditions = {};
		if (user_type === 1) {
			conditions['user_id'] = user_id;
		} else if (user_type === 2) {
			conditions['shop_id'] = user_id;
			conditions['order_status'] = order_status;
		} else {
			conditions['driver_id'] = user_id;
		}
		const condition = {
			conditions,
			join: [ 'users on (users.id =  orders.user_id)' ],
			limit: [ offset, limit ],
			fields: [
				'orders.*',
				'users.name',
				'users.email',
				'users.phone',
				'users.phone_code',
				'users.address',
				'users.latitude',
				'users.longitude',
				'users.profile'
			],
			orderBy: [ 'orders.id desc' ]
		};
		const result = await DB.find('orders', 'all', condition);
		const final = result.map((value) => {
			if (value.product_details) {
				value.product_details = JSON.parse(value.product_details);
			}
			if (value.address_details) {
				value.address_details = JSON.parse(value.address_details);
			}
			return value;
		});
		return {
			message: 'My orders',
			data: {
				pagination: await apis.Paginations('orders', condition, offset, limit),
				result: app.addUrl(final, 'profile')
			}
		};
	}
};
