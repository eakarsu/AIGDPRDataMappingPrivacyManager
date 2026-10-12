const router = require('express').Router();
const { handlersFor } = require('../privacyPlanning');
const handlers = handlersFor('decisions');
router.get('/', handlers.list);
router.post('/', handlers.mutate);
router.put('/:id', handlers.mutate);
router.delete('/:id', handlers.mutate);
module.exports = router;
