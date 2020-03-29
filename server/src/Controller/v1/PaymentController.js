require('dotenv').config();
const stripKey = process.env.STRIP_KEY || 'sk_test_F1R9sLQEv0jqB808xKIZroJE00I0JruSLj';
const stripe = require('stripe')(stripKey);
const DB = require('../../../libary/sqlBulider');

module.exports = {
	createAccount: async (user_id, email, bankAccountDetails = null) => {
		stripe.accounts.create(
			{
				type: 'custom',
				country: 'US',
				email: email,
				business_type: 'individual',
				requested_capabilities: [ 'card_payments', 'transfers', '' ]
			},
			function(err, account) {
				if (err) {
					DB.save('strips_fail_logs', {
						informations: err
					});
				} else {
					DB.save('users', {
						id: user_id,
						strip_id: account.id,
						strip_info: account
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
				informations: err,
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
