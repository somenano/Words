var express = require('express');
var router = express.Router();
var block_controller = require('../controllers/block_controller.js');
var config = require('../config/words.js');

/* GET home page. */
router.post('/' + config.new_block, block_controller.new_block);

module.exports = router;
