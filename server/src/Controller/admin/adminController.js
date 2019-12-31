const Db = require('../../../libary/sqlBulider');
const app = require('../../../libary/CommanMethod');
const ApiError = require('../../Exceptions/ApiError');
let DB = new Db();
const ApiController = require('./ApiController');
class adminController extends ApiController {
	constructor() {
		super();
		this.limit = 20;
		this.offset = 1;
		this.login = this.login.bind(this);
		this.allUser = this.allUser.bind(this);
	}
	async login(req, res) {
		const { body } = req;
		try {
			let login_details = await DB.find('admins', 'first', {
				conditions: {
					email: body.email,
					status: 1
				}
			});
			if (login_details) {
				if (app.createHash(body.password) !== login_details.password)
					throw new ApiError('Wrong Email or password');
				delete login_details.password;
				let token = await app.UserToken(login_details.id, req);
				await DB.save('admins', {
					id: login_details.id,
					token: token
				});
				login_details.token = token;
				if (login_details.profile) {
					login_details.profile = app.ImageUrl(login_details.profile);
				}
				return app.success(res, {
					message: 'User login successfully',
					data: login_details
				});
			}
			throw new ApiError('Wrong Email or password');
		} catch (err) {
			app.error(res, err);
		}
	}
	async allUser(req) {
		let offset = req.params.offset || 1;
		const limit = req.params.limit || 20;
		offset = (offset - 1) * limit;
		let conditions = 'where user_type = 1';
		if (req.query.q && req.query.q !== 'undefined') {
			const { q } = req.query;
			conditions += ` and name like '%${q}%' or email like '%${q}%' or phone like '%${q}%'`;
		}
		const query = `select * from users ${conditions} order by id desc limit ${offset}, ${limit}`;
		const total = `select count(*) as total from users ${conditions}`;
		const result = {
			pagination: await super.Paginations(total, offset, limit),
			result: app.addUrl(await DB.first(query), 'profile')
		};
		return result;
	}

	async allShops(req) {
		let offset = req.params.offset || 1;
		const limit = req.params.limit || 20;
		offset = (offset - 1) * limit;
		let conditions = 'where user_type = 2';
		if (req.query.q && req.query.q !== 'undefined') {
			const { q } = req.query;
			conditions += ` and name like '%${q}%' or email like '%${q}%' or phone like '%${q}%'`;
		}
		const query = `select * from users ${conditions} order by id desc limit ${offset}, ${limit}`;
		const total = `select count(*) as total from users ${conditions}`;
		const result = {
			pagination: await super.Paginations(total, offset, limit),
			result: app.addUrl(await DB.first(query), ['profile','licence'])
		};
		return result;
	}

	async allDrivers(req) {
		let offset = req.params.offset || 1;
		const limit = req.params.limit || 20;
		offset = (offset - 1) * limit;
		let conditions = 'where user_type = 3';
		if (req.query.q && req.query.q !== 'undefined') {
			const { q } = req.query;
			conditions += ` and name like '%${q}%' or email like '%${q}%' or phone like '%${q}%'`;
		}
		const query = `select * from users ${conditions} order by id desc limit ${offset}, ${limit}`;
		const total = `select count(*) as total from users ${conditions}`;
		const result = {
			pagination: await super.Paginations(total, offset, limit),
			result: app.addUrl(await DB.first(query), ['profile','licence'])
		};
		return result;
	}

	async getProducts(Request) {
		let offset = Request.params.offset || 1;
		const limit = Request.params.limit || 20;
		const orderStatus = Request.query.order_status || 1;
		const shop_id = Request.query.shop_id || 0;
		offset = (offset - 1) * limit;
		let conditions = `where user_id = ${shop_id} `;
		if (Request.query.q && Request.query.q !== 'undefined') {
			const { q } = Request.query;
			conditions += `and  name like '%${q}%' or flavour like '%${q}%'`;
		}
		const query = `select * from products ${conditions} order by id desc limit ${offset}, ${limit}`;
		const total = `select count(*) as total from products ${conditions}`;
		const result = {
			pagination: await super.Paginations(total, offset, limit),
			result: app.addUrl(await DB.first(query),'image')
		};
		return result;
	}

	async getOrders(Request) {
		let offset = Request.params.offset || 1;
		const limit = Request.params.limit || 20;
		const orderStatus = Request.query.order_status || 2;
		offset = (offset - 1) * limit;
		let conditions = `where order_status = ${orderStatus}`;
		
		const query = `select * from orders ${conditions} order by id desc limit ${offset}, ${limit}`;
		const total = `select count(*) as total from orders ${conditions}`;
		const result = {
			pagination: await super.Paginations(total, offset, limit),
			result: await DB.first(query)
		};
		return result;
	}


	async addUser(Request) {
		const { body } = Request;
		delete body.profile;
		if (Request.files && Request.files.profile) {
			body.profile = await app.upload_pic_with_await(Request.files.profile);
		}
		return await DB.save('users', body);
	}

	async updateData(req) {
		const { body } = req;
		if (body.id === undefined) {
			throw new ApiError('id is missing', 400);
		}
		if (req.files && req.files.picture) {
			body.picture = await app.upload_pic_with_await(req.files.picture);
		}
		if (req.files && req.files.profile) {
			body.profile = await app.upload_pic_with_await(req.files.profile);
		}
		return await DB.save(body.table, body);
	}

	async deleteData(req) {
		const { body } = req;
		if (body.id === undefined) {
			throw new ApiError('id is missing', 400);
		}
		return await DB.first(`delete from ${body.table} where id = ${body.id}`);
	}

	async Notification(Request) {
		const { message, tag_id } = Request.body;
		return [
			{
				message: message,
				tag_id
			}
		];
	}

	async dashboard() {
		const users = await DB.first('select count(*) as total from users where user_type = 1');
		const shops = await DB.first('select count(id) as total from users where user_type = 2');
		const drivers = await DB.first('select count(id) as total from users where user_type = 3');
		const orders = await DB.first('select count(id) as total from orders where order_status =1');
		return {
			total_shops: shops[0].total,
			total_users: users[0].total,
			total_drivers: drivers[0].total,
			total_orders: orders[0].total
		};
	}

	async appInfo() {
		return await DB.first('select * from app_informations');
	}
}

module.exports = adminController;
