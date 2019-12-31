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
		const date = Request.query.date || 0;
		const search = Request.query.search || '';
		const user_id = Request.query.shop_id || Request.body.user_id;
		offset = (offset - 1) * limit;
		const condition = {
			conditions: {
				status: 1,
				user_id
			},
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
				result: app.addUrl(result, 'image')
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
			user_id: Request.body.user_id,
			is_request: 1
		};
		const requestData = await apis.vaildation(required, {});
		if (Request.files && Request.files.image) {
			requestData.image = await app.upload_pic_with_await(Request.files.image);
		} else { 
			throw new ApiError('image field is required',422);
		}
		requestData.id = await DB.save('products', requestData);
		return {
			message:"Product add successfully",
			data: requestData
		};
	},
	updateProduct: async (Request) => {
		const required = {
			product_id: Request.body.product_id,
		};
		const nonRequired = {
			name: Request.body.name,
			flavour: Request.body.flavour,
			price: Request.body.price,
			stock: Request.body.stock,
			description: Request.body.description,
			user_id: Request.body.user_id
		};
		const requestData = await apis.vaildation(required, nonRequired);
		const product_info = await DB.find('products', 'first', {
			conditions: {
				user_id: requestData.user_id,
				id:requestData.product_id
			}
		})
		if (!product_info) throw new ApiError('Invaild Product id', 400);
		requestData.id= requestData.product_id
		if (Request.files && Request.files.image) {
			requestData.image = await app.upload_pic_with_await(Request.files.image);
		}
		requestData.id = await DB.save('products', requestData);
		return {
			message:"Product update successfully",
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
				user_id: requestData.product_id,
				id:requestData.product_id
			}
		})
		if (!product_info) throw new ApiError('Invaild Product id', 400);
		await DB.first(`delete from products where id = ${requestData.product_id}`);
		return {
			message:"Product delete successfully",
			data: []
		};
	},OrderAccept :async (Request) => {
		const required = {
			order_id: Request.body.order_id,
			shop_id: Request.body.user_id,
			order_status: Request.body.order_status,
		};
		const requestData = await apis.vaildation(required, {});
		const order_info = await DB.find('orders', 'first', {
			conditions: {
				shop_id:requestData.shop_id,
				id:requestData.order_id
			}
		})
		if (!order_info) throw new ApiError('Invaild Order id', 400);
		const {order_id, shop_id, order_status} = requestData;
		let message = "Order Accepted Successfully";
		const updateOrderStatus = {
			id: order_id
		};
		const data = {}
		if (order_id === 1) {
			const {latitude, longitude} = Request.body.userInfo;
			const driver = findDriver(latitude, longitude);
			if(!driver) throw new ApiError('No Driver Found', 400);
			const notification = {};
			updateOrderStatus.order_status = 1;
			updateOrderStatus.driver_id = driver.id;
			DB.save('users', {
				id:driver.id,
				is_free:0
			});
			data.driver_info = driver;
			data.order_info = order_info;

		} else {
			updateOrderStatus.order_status = 2;
			message = "Order Rejeted";
		}
		DB.save('orders', updateOrderStatus);
		
		return {
			message,
			data
		};
	}
};

const findDriver = async (latitude, longitude) => {
	const driver = `select * from users where ( 6371 * acos( cos( radians(${latitude}) ) * cos( radians(latitude) ) * cos( radians( longitude ) - radians(${longitude}) ) + sin( radians(${latitude}) ) * sin(radians(latitude)) ) ) < 10
	and is_online = 1 and is_free=1 limit 1`
	const result = await DB.first(driver);
	if(result.length > 0) return result;
	return {};
};
