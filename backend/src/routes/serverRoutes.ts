import { Router } from 'express';
import {
	createRoomHandler,
	createServer,
	deleteServer,
	getServerLogs,
	listServers,
	manageServer,
	sendMessageToRoom,
} from '../controllers/serverController';

const router = Router();

router.post('/create', createServer);
router.get('/list', listServers);
router.post('/:name/room', createRoomHandler);
router.post('/:name/room/message', sendMessageToRoom);
router.get('/:name/logs', getServerLogs);
router.post('/:name/manage', manageServer);
router.delete('/:name', deleteServer);

export default router;
