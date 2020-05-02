require('dotenv').config();
const ApiController = require('./ApiController');
const ApiError = require('../../Exceptions/ApiError');
const stripKey =
	process.env.STRIP_KEY || 'sk_test_F1R9sLQEv0jqB808xKIZroJE00I0JruSLj';
const stripe = require('stripe')(stripKey);
const Db = require('../../../libary/sqlBulider');
const DB = new Db();
let apis = new ApiController();
module.exports = {
	createAccount: async (user_id, email, bankAccountDetails = null) => {
		stripe.account.create(
			{
				type: 'custom',
				country: 'US',
				email: email,
				business_type: 'individual',
				requested_capabilities: ['card_payments', 'transfers'],
			},
			function (err, account) {
				if (err) {
					DB.save('strips_fail_logs', {
						user_id,
						informations: JSON.stringify(err),
					});
				} else {
					DB.save('users', {
						id: user_id,
						strip_id: account.id,
						strip_info: JSON.stringify(account),
					});
					if (bankAccountDetails) {
						createBankAccount(account.id, bankAccountDetails, user_id);
					}
				}
			}
		);
	},
	payoutBalance: async (amount, stripeAccount, userID) => {
		try {
			const result = await stripe.payouts.create(
				{
					amount: amount,
					currency: 'usd',
					method: 'instant',
				},
				{ stripeAccount }
			);
			return result;
		} catch (err) {
			DB.save('strips_fail_logs', {
				informations: JSON.stringify(err),
				user_id: userID,
				type: 1,
			});
			return false;
		}
	},
	stripeHook: async (Request) => {
		const {
			query,
			body,
			params: { user_id },
		} = Request;
		if (query.type === 'success') {
			await DB.save('users', {
				id: user_id,
				stripe_connect: 1,
			});
			apis.sendPush(user_id, {
				message:
					'Your account successfully link with stripe now you will add your product',
				data: [],
				notification_code: 10,
			});
		}
		await DB.save('strips_fail_logs', {
			informations: JSON.stringify({ query, body }),
			user_id: user_id,
			type: 5, // strinp hook log
		});
		return {
			message: 'Account linked Successfully done',
			data: [],
		};
	},
	stripeAccountLink: async (Request) => {
		const {
			user_id,
			userInfo: { strip_id = 0 },
		} = Request.body;
		console.log(strip_id);
		if (strip_id === 0)
			throw new ApiError(
				'Your have not register in the stripe. First create a strip account',
				400
			);
		const Links = await new Promise((Resolve) => {
			stripe.accountLinks.create(
				{
					account: strip_id,
					failure_url: `${appURL}apis/v1/stripe-success/${user_id}?type=fail`,
					success_url: `${appURL}apis/v1/stripe-success/${user_id}?type=success`,
					type: 'custom_account_verification',
				},
				function (err, accountLink) {
					if (err) throw new ApiError(err);
					Resolve(accountLink);
				}
			);
		});
		return {
			message: 'Account link url',
			data: Links,
		};
	},
	getStripBalance: async (stripe_account) => {
		try {
			return await stripe.balance.retrieve({
				stripe_account,
			});
		} catch (err) {
			return false;
		}
	},
	transfersAmount: async (destination, amount, orderID) => {
		stripe.transfers.create(
			{
				amount,
				currency: 'usd',
				destination,
				transfer_group: orderID,
			},
			function (err, transfer) {
				if (err) {
					DB.save('strips_fail_logs', {
						informations: JSON.stringify(err),
						user_id: orderID,
						type: 0,
					});
					return false;
				} else {
					return transfer;
				}
			}
		);
	},
};

const createBankAccount = (stripID, bankAccountDetails, userID) => {
	stripe.accounts.createExternalAccount(
		stripID,
		{ external_account: { ...bankAccountDetails } },
		function (err, bank_account) {
			if (err) {
				DB.save('strips_fail_logs', {
					informations: JSON.stringify(err),
					user_id: userID,
					type: 1,
				});
			} else {
				DB.save('users', {
					id: userID,
					strinp_bank_account_id: bank_account.id,
					bank_account,
				});
			}
		}
	);
};
