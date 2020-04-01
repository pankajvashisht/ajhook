require('dotenv').config();
const stripKey = process.env.STRIP_KEY || 'sk_test_F1R9sLQEv0jqB808xKIZroJE00I0JruSLj';
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
				requested_capabilities: [
					'card_payments',
					'transfers'
				]
			},
			function(err, account) {
				if (err) {
					DB.save('strips_fail_logs', {
						user_id,
						informations: JSON.stringify(err)
					});
				} else {
					DB.save('users', {
						id: user_id,
						strip_id: account.id,
						strip_info: JSON.stringify(account)
					});
					if (bankAccountDetails) {
						createBankAccount(account.id, bankAccountDetails, user_id);
					}
				}
			}
		);
	},
	payoutBalance: async (amount, stripeAccount, userID) =>{  
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
		} catch(err) {
			DB.save('strips_fail_logs', {
				informations: JSON.stringify(err),
				user_id: userID,
				type: 1
			});
			return false;
		}
	},
	getStripBalance: async (stripe_account) => {
		try {
			return await stripe.balance.retrieve({
				stripe_account
			});
		}
		catch(err){
			return false;
		}
	},transfersAmount: async (destination, amount, orderID) => {
		stripe.transfers.create(
			{
				amount,
				currency: 'usd',
				destination,
				transfer_group: orderID,
			},
			function(err, transfer) {
				if(err){
					DB.save('strips_fail_logs', {
						informations: JSON.stringify(err),
						user_id: orderID,
						type: 0
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
	stripe.accounts.createExternalAccount(stripID, {external_account:{...bankAccountDetails}}, function(
		err,
		bank_account
	) {
		if (err) {
			DB.save('strips_fail_logs', {
				informations: JSON.stringify(err),
				user_id: userID,
				type: 1
			});
		} else {
			DB.save('users', {
				id: userID,
				strinp_bank_account_id: bank_account.id,
				bank_account
			});
		}
	});
};
