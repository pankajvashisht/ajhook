const { vaildation } = require('../../utils/DataValidation');
const app = require('../../libary/CommanMethod');
module.exports = async (Request, res, next) => {
	const requried = {
		name: Request.body.name,
		email: Request.body.email,
		phone: Request.body.phone,
		phone_code: Request.body.phone_code,
		password: Request.body.password,
		latitude: Request.body.latitude,
		longitude: Request.body.longitude,
		address: Request.body.address,
		user_type: Request.body.user_type,
		checkexist: 1
	};
	const non_required = {
		device_type: Request.body.device_type,
		taxes: Request.body.taxes,
		service_fees: Request.body.service_fees,
		device_token: Request.body.device_token,
		card_informations: Request.body.card_informations,
		dob: Request.body.dob,
		authorization_key: app.createToken(),
		otp: 1111 //app.randomNumber(),
	};
	try {
		Request.RequestData = await vaildation(requried, non_required);
		next();
	} catch (err) {
		return app.error(res, err);
	}
};
