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
		const longitude =  Request.query.longitude || 0;
		offset = (offset - 1) * limit;
		const condition = {
			conditions: {
				user_type: 2,
				10 : `< ( 6371 * acos( cos( radians(${lalitude}) ) * cos( radians(latitude) ) * cos( radians( longitude ) - radians(${longitude}) ) + sin( radians(${lalitude}) ) * sin(radians(latitude)) ) )`
			},
			join: ['tags on (classes.tag_id = tags.id)'],
			fields:['users.*' ,`IFNULL((select avg(rating) from rating where  user_id=users.id),0) as rating`],
			limit: [ offset, limit ],
			orderBy: [ 'id desc' ]
		};
		if (search) { 
			condition.conditions[`like`] = {
				"name": search,
			};
		}
		const result = await DB.find('users', 'all', condition);
		return {
			message: 'shop list',
			data: {
				pagination: await apis.Paginations('users', condition, offset, limit),
				result: result
			}
		};
	},
	orderHoohuk: async (Request) => { 
		const required = {
			user_id: Request.body.user_id,
			shop_id: Request.body.shop_id,
			product_id: Request.body.product_id,
			quantity : Request.body.quantity || 1,
			order_date: RequestData.body.order_date || app.currentTime();
			status: 1
       };
		const RequestData = await apis.vaildation(required, {});
		const shop = await DB.find('users', 'first', {
			conditions: {
				id: RequestData.shop_id,
			}
		});
		const product = await DB.find('products', 'first', {
			conditions: {
				id: RequestData.product_id,
			}
		})
		if (!product) throw new ApiError('Invaild product id', 422);
		if (!shop) throw new ApiError('Invaild shop id', 422);
		if(product.stock === 0 && product.stock < RequestData.body.quantity) throw new ApiError('Product out of stocks', 422);
		RequestData.product_details = JSON.stringify(product);
		RequestData.price = product.price * RequestData.body.quantity;
		product.stock -= RequestData.body.quantity;
		DB.save('products', product);
		RequestData.address_details = JSON.stringify({
			address: RequestData.body.userInfo.address,
			lalitude: RequestData.body.userInfo.lalitude,
			longitude: RequestData.body.userInfo.longitude,
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
			status: Request.body.status, // 0 -> fail 1-> success 
       };
		const RequestData = await apis.vaildation(required, {});
		const condition = {
			conditions: {
				id: RequestData.order_id,
				status: 1
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
		offset = (offset - 1) * limit;
		const conditions = {};
		if (user_type === 1) {
			conditions = {
				user_id
			}
		} else if (user_type === 2) { 
			conditions = {
				shop_id:user_type
			}
		} else {
			conditions = {
				shop_id:user_type
			}
		}
		const condition = {
			conditions,
			limit: [ offset, limit ],
			orderBy: [ 'id desc' ]
		};
		const result = await DB.find('orders', 'all', condition);
		return {
			message: 'My orders',
			data: {
				pagination: await apis.Paginations('orders', condition, offset, limit),
				result: result
			}
		};
	 }
};

