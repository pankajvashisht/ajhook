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
		let conditions = '';
		if (req.query.q && req.query.q !== 'undefined') {
			const { q } = req.query;
			conditions = `where username like '%${q}%' or email like '%${q}%' or phone like '%${q}%'`;
		}
		const query = `select * from users ${conditions} order by id desc limit ${offset}, ${limit}`;
		const total = `select count(*) as total from users ${conditions}`;
		const result = {
			pagination: await super.Paginations(total, offset, limit),
			result: app.addUrl(await DB.first(query), 'profile')
		};
		return result;
	}

	async getTags(req) {
		let offset = req.params.offset || 1;
		const limit = req.params.limit || 20;
		offset = (offset - 1) * limit;
		let conditions = '';
		if (req.query.q && req.query.q !== 'undefined') {
			const { q } = req.query;
			conditions += `where name like '%${q}%'`;
		}
		const query = `select * from tags ${conditions} order by id desc limit ${offset}, ${limit}`;
		const total = `select count(*) as total from tags ${conditions}`;
		const result = {
			pagination: await super.Paginations(total, offset, limit),
			result: await DB.first(query)
		};
		return result;
	}

	async getClasses(Request) {
		let offset = Request.params.offset || 1;
		const limit = Request.params.limit || 20;
		offset = (offset - 1) * limit;
		let conditions = '';
		if (Request.query.q && Request.query.q !== 'undefined') {
			const { q } = Request.query;
			conditions += `where name like '%${q}%' or description like '%${q}%' or location like '%${q}%'`;
		}
		const query = `select * from classes ${conditions} order by id desc limit ${offset}, ${limit}`;
		const total = `select count(*) as total from classes ${conditions}`;
		const result = {
			pagination: await super.Paginations(total, offset, limit),
			result: await DB.first(query)
		};
		return result;
	}

	async getEvent(Request) {
		let offset = Request.params.offset || 1;
		const limit = Request.params.limit || 20;
		offset = (offset - 1) * limit;
		let conditions = '';
		if (Request.query.q && Request.query.q !== 'undefined') {
			const { q } = Request.query;
			conditions += `where name like '%${q}%' or description like '%${q}%' or location like '%${q}%'`;
		}
		const query = `select * from events ${conditions} order by id desc limit ${offset}, ${limit}`;
		const total = `select count(*) as total from events ${conditions}`;
		const result = {
			pagination: await super.Paginations(total, offset, limit),
			result: app.addUrl(await DB.first(query), 'picture')
		};
		return result;
	}

	async getLocation(Request) {
		let offset = Request.params.offset || 1;
		const limit = Request.params.limit || 20;
		offset = (offset - 1) * limit;
		let conditions = '';
		if (Request.query.q && Request.query.q !== 'undefined') {
			const { q } = Request.query;
			conditions += `where location like '%${q}%'`;
		}
		const query = `select * from locations ${conditions} order by id desc limit ${offset}, ${limit}`;
		const total = `select count(*) as total from locations ${conditions}`;
		const result = {
			pagination: await super.Paginations(total, offset, limit),
			result: await DB.first(query)
		};
		return result;
	}

	async addLocation(Request) {
		const { body } = Request;
		return await DB.save('locations', body);
	}

	async addUser(Request) {
		const { body } = Request;
		delete body.profile;
		if (Request.files && Request.files.profile) {
			body.profile = await app.upload_pic_with_await(Request.files.profile);
		}
		return await DB.save('users', body);
	}

	async addTag(Request) {
		const { body } = Request;
		return await DB.save('tags', body);
	}

	async addClass(Request) {
		const { body } = Request;
		return await DB.save('classes', body);
	}

	async addEvent(Request) {
		const { body } = Request;
		delete body.picture;
		if (Request.files && Request.files.picture) {
			body.picture = await app.upload_pic_with_await(Request.files.picture);
		}
		return await DB.save('events', body);
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
		const users = await DB.first('select count(*) as total from users');
		const events = await DB.first('select count(id) as total from events');
		const classes = await DB.first('select count(id) as total from classes');
		const tags = await DB.first('select count(id) as total from tags');
		return {
			total_events: events[0].total,
			total_users: users[0].total,
			total_classes: classes[0].total,
			total_tags: tags[0].total
		};
	}

	async appInfo() {
		return await DB.first('select * from app_informations');
	}
}

module.exports = adminController;
