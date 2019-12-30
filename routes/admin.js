const express = require('express');
const router = express.Router();
const { adminController } = require('../src/Controller/admin/index');
const { cross, AdminAuth } = require('../src/middleware/index');
const response = require('../libary/Response');
const { login } = require('../src/Request/adminRequest');
let admin = new adminController();

router.use([ cross, AdminAuth ]);
router.get('/', function(req, res) {
	res.json(' APi workings ');
});
router.post('/login', login, admin.login);
router.post('/send-push', response(admin.Notification));
router.get('/dashboard', response(admin.dashboard));
router
	.route('/users/:offset([0-9]+)?/:limit([0-9]+)?')
	.get(response(admin.allUser))
	.post(response(admin.addUser))
	.put(response(admin.updateData))
	.delete(response(admin.deleteData));
router
	.route('/tags/:offset([0-9]+)?/:limit([0-9]+)?')
	.get(response(admin.getTags))
	.post(response(admin.addTag))
	.put(response(admin.updateData))
	.delete(response(admin.deleteData));
router
	.route('/events/:offset([0-9]+)?/:limit([0-9]+)?')
	.get(response(admin.getEvent))
	.post(response(admin.addEvent))
	.put(response(admin.updateData))
	.delete(response(admin.deleteData));
router
	.route('/classes/:offset([0-9]+)?/:limit([0-9]+)?')
	.get(response(admin.getClasses))
	.post(response(admin.addClass))
	.put(response(admin.updateData))
	.delete(response(admin.deleteData));
router
	.route('/locations/:offset([0-9]+)?/:limit([0-9]+)?')
	.get(response(admin.getLocation))
	.post(response(admin.addLocation))
	.put(response(admin.updateData))
	.delete(response(admin.deleteData));
router.route('/appInfo/').get(response(admin.appInfo)).put(response(admin.updateData));

module.exports = router;
