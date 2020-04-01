const ApiController = require('./ApiController');
const Db = require('../../../libary/sqlBulider');
const ApiError = require('../../Exceptions/ApiError');
const app = require('../../../libary/CommanMethod');
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
				`IFNULL((select avg(rating) from ratings where  shop_id=users.id),0) as rating`,
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
	getReview: async (Request) => {
		let offset = Request.params.offset || 1;
		const limit = Request.query.limit || 10;
		const shop_id = Request.query.shop_id;
		offset = (offset - 1) * limit;
		const condition = {
			conditions: {
				shop_id
			},
			join: [ 'users on (ratings.user_id = users.id)' ],
			fields: [
				'ratings.*',
				'name',
				'status',
				'is_free',
				'is_online',
				'email',
				'phone',
				'phone_code',
				'profile'
			],
			limit: [ offset, limit ],
			orderBy: [ 'ratings.id desc' ]
		};
		const result = await DB.find('ratings', 'all', condition);
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
			service_fees: Request.body.quantity || 0,
			taxes: Request.body.quantity || 0,
			order_date: Request.body.order_date || app.currentTime,
			address: Request.body.address || '',
			latitude: Request.body.latitude || 0,
			longitude: Request.body.longitude || 0,
			appartment_street_number: Request.body.appartment_street_number || '',
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
			address: RequestData.address,
			latitude: RequestData.latitude,
			longitude: RequestData.longitude,
			appartment_street_number: RequestData.appartment_street_number
		});
		RequestData.order_id = await DB.save('orders', RequestData);
		product.order_id = RequestData.order_id;
		setTimeout(() => {
			apis.sendPush(RequestData.shop_id, {
				message: 'You have new order',
				data: product,
				notification_code: 1
			});
		}, 100);
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
	giveRating: async (Request) => {
		const required = {
			user_id: Request.body.user_id,
			shop_id: Request.body.shop_id,
			rating: Request.body.rating,
			comment: Request.body.comment
		};
		const RequestData = await apis.vaildation(required, {});
		const condition = {
			conditions: {
				id: RequestData.shop_id,
				user_type: 2
			}
		};
		const result = await DB.find('users', 'first', condition);
		if (!result) throw new ApiError('Invaild shop id', 422);
		RequestData.rating_id = await DB.save('ratings', RequestData);
		setTimeout(() => {
			apis.sendPush(RequestData.shop_id, {
				message: `${Request.body.userInfo.name} give you rating ${RequestData.rating}`,
				data: RequestData,
				notification_code: 2
			});
		}, 100);
		return {
			message: 'Rating Successfully',
			data: RequestData
		};
	},
	myOrders: async (Request) => {
		const user_id = Request.body.user_id;
		const user_type = Request.body.userInfo.user_type;
		let offset = Request.params.offset || 1;
		const limit = Request.query.limit || 10;
		const order_status = Request.query.order_status || 0;
		offset = (offset - 1) * limit;
		const conditions = {};
		if (parseInt(order_status) === 0) {
			conditions['NotEqual'] = {
				order_status: 4
			};
		} else {
			conditions['order_status'] = 4;
		}
		if (user_type === 1) {
			conditions['user_id'] = user_id;
		} else if (user_type === 2) {
			conditions['shop_id'] = user_id;
		} else {
			conditions['driver_id'] = user_id;
		}
		const condition = {
			conditions,
			join: [ 'users on (users.id =  orders.user_id)', 'users as shops on (shops.id = orders.shop_id)' ],
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
				'users.profile',
				'shops.name as shop_name',
				'shops.email as shop_email',
				'shops.phone as shop_phone',
				'shops.phone_code as shop_phone_code',
				'shops.address as shop_address',
				'shops.latitude as shop_lat',
				'shops.longitude as shop_lng',
				'shops.profile as shop_profile'
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
				result: app.addUrl(final, [ 'profile', 'shop_profile' ])
			}
		};
	},
	orderDetails: async (Request) => {
		const user_id = Request.body.user_id;
		const user_type = Request.body.userInfo.user_type;
		const order_id = Request.params.order_id;
		const conditions = {
			'orders.id': order_id
		};
		if (user_type === 1) {
			conditions['user_id'] = user_id;
		} else if (user_type === 2) {
			conditions['shop_id'] = user_id;
		} else {
			conditions['driver_id'] = user_id;
		}
		const condition = {
			conditions,
			join: [ 'users on (users.id =  orders.user_id)', 'users as shops on (shops.id = orders.shop_id)' ],
			fields: [
				'orders.*',
				'users.name',
				'users.email',
				'users.phone',
				'users.phone_code',
				'users.address',
				'users.latitude',
				'users.longitude',
				'users.profile',
				'shops.name as shop_name',
				'shops.email as shop_email',
				'shops.phone as shop_phone',
				'shops.phone_code as shop_phone_code',
				'shops.address as shop_address',
				'shops.latitude as shop_lat',
				'shops.longitude as shop_lng',
				'shops.profile as shop_profile'
			],
			orderBy: [ 'orders.id desc' ]
		};
		const result = await DB.find('orders', 'all', condition);
		if (result.length === 0) throw new ApiError('Invaild order id', 403);
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
			message: 'orders Details',
			data: app.addUrl(final, [ 'profile', 'shop_profile' ])[0]
		};
	}
};
