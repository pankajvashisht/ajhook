var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/welcome', function (req, res) {
	res.render('index', { title: 'Express' });
});
router.get('/support', function (req, res) {
	res.render('support', { title: 'Express' });
});

module.exports = router;
