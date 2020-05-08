require('dotenv').config();
const ApiError = require('../../Exceptions/ApiError');
const stripKey =
	process.env.STRIP_KEY || 'sk_test_F1R9sLQEv0jqB808xKIZroJE00I0JruSLj';
const stripe = require('stripe')(stripKey);
const Db = require('../../../libary/sqlBulider');
const DB = new Db();
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
						createBankAccount(
							account.id,
							JSON.parse(bankAccountDetails),
							user_id
						);
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
	stripeHook: async (Request, Response) => {
		const {
			query,
			body,
			params: { user_id, stripe_id },
		} = Request;
		if (query.type === 'success') {
			const accountInfo = await stripe.accounts.retrieve(stripe_id);
			const {
				capabilities: { card_payments, transfers },
			} = accountInfo;
			if (card_payments === 'active' && transfers === 'active') {
				await DB.save('users', {
					id: user_id,
					stripe_connect: 1,
				});
			}
			// apis.sendPush(user_id, {
			// 	message:
			// 		'Your account successfully link with stripe now you will add your product',
			// 	data: [],
			// 	notification_code: 10,
			// });
			return Response.render('AddBankDetails', { user_id });
		}
		await DB.save('strips_fail_logs', {
			informations: JSON.stringify({ query, body }),
			user_id: user_id,
			type: 5, // strinp hook log
		});
		return Response.render('error', {
			message: 'Something went wrong try later',
			error: {
				status: 400,
			},
		});
	},
	stripeAccountLink: async (Request) => {
		const {
			user_id,
			userInfo: { strip_id = '' },
		} = Request.body;
		if (!strip_id)
			throw new ApiError(
				'Your have not register in the stripe. First create a strip account',
				400
			);
		try {
			const Links = await new Promise((Resolve, Reject) => {
				stripe.accountLinks.create(
					{
						account: strip_id,
						failure_url: `${appURL}apis/v1/stripe-integration/${user_id}/${strip_id}?type=fail`,
						success_url: `${appURL}apis/v1/stripe-integration/${user_id}/${strip_id}?type=success`,
						type: 'custom_account_verification',
					},
					function (err, accountLink) {
						if (err) Reject(err);
						Resolve(accountLink);
					}
				);
			});
			return {
				message: 'Account link url',
				data: Links,
			};
		} catch (error) {
			throw new ApiError(error);
		}
	},
	createStripeSecert: async (Request) => {
		const {
			amount = 0,
			order_id,
			shop_stripe_id,
			application_fee_amount = 10,
		} = Request.body;
		if (amount === 0) throw new ApiError('Amount field is required', 400);
		try {
			const paymentIntent = await stripe.paymentIntents.create({
				amount,
				currency: 'usd',
				transfer_group: order_id,
				application_fee_amount,
				transfer_data: {
					destination: shop_stripe_id,
				},
			});
			const clientSecret = paymentIntent.client_secret;
			return {
				message: 'Stripe Secert Key',
				data: {
					secret: clientSecret,
				},
			};
		} catch (err) {
			throw new ApiError(err);
		}
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
	updateBank: async ({
		bankDetails,
		strip_id,
		stripe_bank_account_id,
		userID,
	}) => {
		try {
			await createBankAccount(strip_id, bankDetails, userID);
			if (stripe_bank_account_id) {
				await new Promise((Resolve, Reject) => {
					stripe.accounts.deleteExternalAccount(
						strip_id,
						stripe_bank_account_id,
						function (err, confirmation) {
							if (err) {
								Reject(err);
							} else {
								Resolve(confirmation);
							}
						}
					);
				});
			}
			return true;
		} catch (err) {
			throw new ApiError(err, 400);
		}
	},
	transfersAmount: (destination, amount, orderID) => {
		return new Promise((Resolved, Reject) => {
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
							type: 6,
						});
						Reject(err);
					} else {
						Resolved(transfer);
					}
				}
			);
		});
	},
};
const createBankAccount = async (stripID, bankAccountDetails, userID) => {
	const bank_account = {
		country: 'US',
		currency: 'usd',
		account_holder_type: 'individual',
		...bankAccountDetails,
	};
	return new Promise((Resolve, reject) => {
		stripe.tokens.create(
			{
				bank_account,
			},
			function (err, token) {
				if (err) {
					DB.save('strips_fail_logs', {
						informations: JSON.stringify(err),
						user_id: userID,
						type: 3,
					});
					reject(err);
				} else {
					stripe.accounts.createExternalAccount(
						stripID,
						{ external_account: token.id },
						function (err, bank_account) {
							if (err) {
								DB.save('strips_fail_logs', {
									informations: JSON.stringify(err),
									user_id: userID,
									type: 1,
								});
								reject(err);
							} else {
								DB.save('users', {
									id: userID,
									stripe_bank_account_id: bank_account.id,
									bank_account: JSON.stringify(bank_account),
								});
								Resolve(true);
							}
						}
					);
				}
			}
		);
	});
};
