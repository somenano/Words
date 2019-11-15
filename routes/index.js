var express = require('express');
var router = express.Router();
var index_controller = require('../controllers/index_controller.js');

/* GET home page. */
router.get('/', index_controller.index);
router.get('/game_data', index_controller.game_data);
router.get('/game_data/:game_id', index_controller.game_data);
router.get('/archive', index_controller.archive);
router.get('/archive/:game_id', index_controller.index);
router.get('/whatisgoingon', index_controller.what);

module.exports = router;
