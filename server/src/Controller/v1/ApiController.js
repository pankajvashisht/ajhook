const crypto = require('crypto');
const Db = require('../../../libary/sqlBulider');
const ApiError = require('../../Exceptions/ApiError');
const { lang } = require('../../../config');
const App = require('../../../libary/CommanMethod');
const PaymentController = require('./PaymentController');
const DB = new Db();

class ApiController {
	async vaildation(required, non_required) {
		try {
			let message = '';
			let empty = [];
			let table_name = required.hasOwnProperty('table_name')
				? required.table_name
				: 'users';
			for (let key in required) {
				if (required.hasOwnProperty(key)) {
					if (required[key] === undefined || required[key] === '') {
						empty.push(key);
					}
				}
			}
			if (empty.length !== 0) {
				message = empty.toString();
				if (empty.length > 1) {
					message += ' ' + lang[_Lang].fieldsRequired;
				} else {
					message += ' ' + lang[_Lang].fieldsRequired;
				}
				throw new ApiError(message, 400);
			}

			if (required.hasOwnProperty('checkexist') && required.checkexist === 1) {
				if (required.hasOwnProperty('email')) {
					if (
						await this.checkingAvailability('email', required.email, table_name)
					) {
						throw new ApiError(lang[_Lang].emailRegister);
					}
				}
				if (required.hasOwnProperty('phone')) {
					if (
						await this.checkingAvailability('phone', required.phone, table_name)
					) {
						throw new ApiError(lang[_Lang].emailRegister);
					}
				}
				if (required.hasOwnProperty('username')) {
					if (
						await this.checkingAvailability(
							'username',
							required.username,
							table_name
						)
					) {
						throw new ApiError('username already exits');
					}
				}
			}

			let final_data = Object.assign(required, non_required);

			if (final_data.hasOwnProperty('password')) {
				final_data.password = crypto
					.createHash('sha1')
					.update(final_data.password)
					.digest('hex');
			}

			if (final_data.hasOwnProperty('old_password')) {
				final_data.old_password = crypto
					.createHash('sha1')
					.update(final_data.old_password)
					.digest('hex');
			}
			if (final_data.hasOwnProperty('new_password')) {
				final_data.new_password = crypto
					.createHash('sha1')
					.update(final_data.new_password)
					.digest('hex');
			}

			for (let data in final_data) {
				if (final_data[data] === undefined) {
					delete final_data[data];
				} else {
					if (typeof final_data[data] == 'string') {
						final_data[data] = final_data[data].trim();
					}
				}
			}
			return final_data;
		} catch (err) {
			throw err;
		}
	}

	async checkingAvailability(key, value, table_name) {
		let query =
			'select * from ' +
			table_name +
			' where `' +
			key +
			"` = '" +
			value +
			"' limit 1";
		let data = await DB.first(query);
		if (data.length) {
			return true;
		} else {
			return false;
		}
	}
	async Paginations(table, condition, page, limit) {
		delete condition.limit;
		delete condition.orderBy;
		const totalRecord = await DB.find(table, 'count', condition);
		let totalPage = Math.round(totalRecord[0].totalRecord / limit, 0);
		if (totalPage === 0) {
			totalPage = 1;
		}
		return {
			currentPage: page + 1,
			totalPage,
			totalRecord: totalRecord[0].totalRecord,
			limit,
		};
	}

	async sendPush(user_id, pushObject) {
		const User = await DB.find('users', 'first', {
			conditions: {
				id: user_id,
			},
		});
		if (User.device_token) {
			pushObject['token'] = User.device_token;
			App.send_push(pushObject);
		}
	}
	async tranferMoney(amount, orderDetails, user_type) {
		const { shop_id, driver_id, id } = orderDetails;
		const user_id = user_type === 2 ? shop_id : driver_id;
		const userInfo = DB.find('users', 'first', {
			conditions: {
				user_type,
				id: user_id,
			},
			fields: ['strip_id'],
		});
		console.log(userInfo.strip_id);
		PaymentController.transfersAmount(userInfo.strip_id, amount, id)
			.then((data) => {
				const updateOrder = {
					id,
				};
				if (user_type === 2) {
					updateOrder['shop_money'] = amount;
				} else {
					updateOrder['driver_money'] = amount;
				}
				DB.save('orders', {
					id,
					updateOrder,
				});
				DB.save('amount_transfers', {
					user_id,
					amount,
					checkout_details: JSON.stringify(data),
					order_id: id,
					user_type,
					checkout_status: 1,
				});
			})
			.catch((err) => {
				DB.save('amount_transfers', {
					user_id,
					amount,
					order_id: id,
					user_type,
					checkout_details: JSON.stringify(err),
					checkout_status: 0,
				});
			});
	}

	async userDetails(id) {
		const result = await DB.find('users', 'first', {
			conditions: {
				id: id,
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
				'authorization_key',
				'dob',
				'address',
				'user_type',
				'licence',
				'latitude',
				'longitude',
				'service_fees',
				'taxes',
				'card_informations',
				'strip_id',
				'strip_info',
				'stripe_connect',
				'stripe_bank_account_id',
			],
		});
		if (result.card_informations) {
			result.card_informations = JSON.parse(result.card_informations);
		}
		if (result.strip_info) {
			result.strip_info = JSON.parse(result.strip_info);
		}
		return result;
	}
}

module.exports = ApiController;
