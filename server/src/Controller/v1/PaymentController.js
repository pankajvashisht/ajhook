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
					'transfers',
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
	}
};

const createBankAccount = (stripID, bankAccountDetails, userID) => {
	stripe.customers.createSource('cus_GyvhSbqGLjoeHO', { source: stripID, ...bankAccountDetails }, function(
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
