require('dotenv').config();

const path = require('path');
const config = {
	App_name: process.env.APP_NAME || 'Aj Hookhu',
	port: process.env.PORT || 4001,
	root_path: path.resolve(__dirname),
	GOOGLE_KEY:
		'AAAAhSql7lE:APA91bETmhShzQ-_pgQIoajEzd5XHLKZrQv4uD1_QckZuYRiY0nlCUlX-kPMZnh9EtgFB8GJEg_HLcWsXbT0E3JzcrFg979XUEhrDieysYE7Sl43Y-ipfq2fUdN-7wwMo6zDKbqU5dne'
};

module.exports = config;
