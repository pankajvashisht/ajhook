const express = require('express');
const router = express.Router();
const { UserController, DriverController, ProductController, ShopController } = require('../src/Controller/v1/index');
const { userSignup } = require('../src/Request');
const { UserAuth, cross, Language } = require('../src/middleware/index');
const Apiresponse = require('../libary/ApiResponse');
let user = new UserController();
const chat = new ChatController();

router.use([ cross, Language, UserAuth ]);
router.get('/', function(req, res) {
	res.send(' APi workings ');
});

router.post('/user', userSignup, Apiresponse(user.addUser));
router.post('/user/login/', Apiresponse(user.loginUser));
router.post('/user/verify', Apiresponse(user.verifyOtp));
router.post('/user/edit/', Apiresponse(user.updateProfile));
router.post('/change_password', Apiresponse(user.changePassword));
router.post('/forgot-password', Apiresponse(user.forgotPassword));
router.post('/logout', Apiresponse(user.logout));
router.get('/app-information', Apiresponse(user.appInfo));
router.get('/shops/:offset([0-9]+)', Apiresponse(ShopController.getShop));
router.post('/order', Apiresponse(ShopController.orderHoohuk));
router.get('/order/:offset([0-9]+)', Apiresponse(ShopController.myOrders));
router.post('/do-payment', Apiresponse(ShopController.doPayment));
router.post('/accept-order', Apiresponse(ProductController.OrderAccept));
router.post('/complete-order', Apiresponse(DriverController.CompleteOrders));
router.post('/track-driver', Apiresponse(DriverController.TrackDriver));
router
	.route('/products/:offset([0-9]+)?/')
	.get(response(ProductController.getProduct))
	.post(response(ProductController.addProduct))
	.put(response(ProductController.updateProduct))
	.delete(response(ProductController.deleteProduct));


module.exports = router;
