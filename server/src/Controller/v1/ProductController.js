const ApiController = require('./ApiController');
const Db = require('../../../libary/sqlBulider');
const app = require('../../../libary/CommanMethod');
const ApiError = require('../../Exceptions/ApiError');
let apis = new ApiController();
let DB = new Db();

module.exports = {
	getProduct: async (Request) => {
		let offset = Request.params.offset || 1;
		const limit = Request.query.limit || 10;
		const search = Request.query.search || '';
		const user_id = Request.query.shop_id || Request.body.user_id;
		offset = (offset - 1) * limit;
		const condition = {
			conditions: {
				'products.status': 1,
				user_id
			},
			join: [ 'users on (users.id = products.user_id)' ],
			fields: [
				'products.*',
				'users.name as shop_name',
				'users.address',
				'users.profile',
				'users.service_fees',
				'users.taxes'
			],
			limit: [ offset, limit ],
			orderBy: [ 'id desc' ]
		};
		if (search) {
			condition.conditions[`like`] = {
				name: search,
				location: search
			};
		}
		const result = await DB.find('products', 'all', condition);
		return {
			message: 'products list',
			data: {
				pagination: await apis.Paginations('products', condition, offset, limit),
				result: app.addUrl(result, [ 'image', 'profile' ])
			}
		};
	},

	addProduct: async (Request) => {
		const required = {
			name: Request.body.name,
			flavour: Request.body.flavour,
			price: Request.body.price,
			stock: Request.body.stock,
			description: Request.body.description,
			hookah_type: Request.body.hookah_type,
			user_id: Request.body.user_id,
			is_request: 1
		};
		const requestData = await apis.vaildation(required, {});
		if (Request.files && Request.files.image) {
			requestData.image = await app.upload_pic_with_await(Request.files.image);
		} else {
			throw new ApiError('image field is required', 422);
		}
		requestData.id = await DB.save('products', requestData);
		return {
			message: 'Product add successfully',
			data: requestData
		};
	},
	productDetails: async (Request) => {
		const product_id = Request.params.product_id;
		const product_info = await DB.find('products', 'first', {
			conditions: {
				'products.id': product_id
			},
			join: [ 'users on (users.id = products.user_id)' ],
			fields: [
				'products.*',
				'users.name as shop_name',
				'users.address',
				'users.profile',
				'users.service_fees',
				'users.taxes'
			]
		});
		if (!product_info) throw new ApiError('Invaild Product id', 400);
		if (product_info.image) {
			product_info.image = app.ImageUrl(product_info.image);
		}
		if (product_info.profile) {
			product_info.profile = app.ImageUrl(product_info.profile);
		}
		return {
			message: 'Product detail',
			data: product_info
		};
	},
	updateProduct: async (Request) => {
		const required = {
			product_id: Request.body.product_id
		};
		const nonRequired = {
			name: Request.body.name,
			flavour: Request.body.flavour,
			price: Request.body.price,
			stock: Request.body.stock,
			description: Request.body.description,
			hookah_type: Request.body.hookah_type,
			user_id: Request.body.user_id
		};
		const requestData = await apis.vaildation(required, nonRequired);
		const product_info = await DB.find('products', 'first', {
			conditions: {
				user_id: requestData.user_id,
				id: requestData.product_id
			}
		});
		if (!product_info) throw new ApiError('Invaild Product id', 400);
		requestData.id = requestData.product_id;
		if (Request.files && Request.files.image) {
			requestData.image = await app.upload_pic_with_await(Request.files.image);
		}
		requestData.id = await DB.save('products', requestData);
		return {
			message: 'Product update successfully',
			data: requestData
		};
	},
	deleteProduct: async (Request) => {
		const required = {
			product_id: Request.body.product_id,
			user_id: Request.body.user_id
		};
		const requestData = await apis.vaildation(required, {});
		const product_info = await DB.find('products', 'first', {
			conditions: {
				user_id: requestData.user_id,
				id: requestData.product_id
			}
		});
		if (!product_info) throw new ApiError('Invaild Product id', 400);
		await DB.first(`delete from products where id = ${requestData.product_id}`);
		return {
			message: 'Product delete successfully',
			data: []
		};
	},
	OrderAccept: async (Request) => {
		const required = {
			order_id: Request.body.order_id,
			shop_id: Request.body.user_id,
			order_status: Request.body.order_status
		};
		const requestData = await apis.vaildation(required, {});
		const order_info = await DB.find('orders', 'first', {
			conditions: {
				shop_id: requestData.shop_id,
				id: requestData.order_id
			}
		});
		if (!order_info) throw new ApiError('Invaild Order id', 400);
		const { order_id, shop_id, order_status } = requestData;
		let message = 'Order Accepted Successfully';
		let pushMessage = `order accepted by shop`;
		const updateOrderStatus = {
			id: order_id
		};
		const data = {};
		if (parseInt(order_status) === 1) {
			const { latitude, longitude } = Request.body.userInfo;
			const driver = await findDriver(latitude, longitude);
			if (!driver) throw new ApiError('No Driver Found', 400);
			updateOrderStatus.order_status = 1;
			updateOrderStatus.driver_id = driver.id;
			if (driver.profile) {
				driver.profile = appURL + 'uploads/' + driver.profile;
			}
			updateOrderStatus.driver_info = JSON.stringify(driver);
			DB.save('users', {
				id: driver.id,
				is_free: 0
			});
			data.driver_info = driver;
			data.order_info = order_info;
		} else {
			updateOrderStatus.order_status = 2;
			pushMessage = `order rejected by shop`;
			message = 'Order Rejeted';
		}
		DB.save('orders', updateOrderStatus);
		setTimeout(() => {
			apis.sendPush(order_info.user_id, {
				message: pushMessage,
				data: order_info,
				notification_code: 3
			});
			if (requestData.driver_id) {
				apis.sendPush(requestData.driver_id, {
					message: `you have new order to deliver`,
					data: order_info,
					notification_code: 4
				});
			}
		}, 100);
		return {
			message,
			data
		};
	}
};

const findDriver = async (latitude, longitude) => {
	const driver = `select id,name,email,phone,phone_code,profile from users where user_type = 3 and ( 6371 * acos( cos( radians(${latitude}) ) * cos( radians(latitude) ) * cos( radians( longitude ) - radians(${longitude}) ) + sin( radians(${latitude}) ) * sin(radians(latitude)) ) ) < 10
	and is_online = 1 and is_free=1 limit 1`;
	const result = await DB.first(driver);
	if (result.length > 0) return result[0];
	return null;
};
