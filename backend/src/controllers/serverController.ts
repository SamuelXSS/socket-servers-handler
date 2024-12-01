import { Request, Response } from 'express';
import Server from '../models/server';
import { createNginxConfig, removeNginxConfig } from '../config/nginx';
import {
	createSocketServer,
	createRoom,
	stopSocketServer,
	restartSocketServer,
	socketServers,
	startSocketServer,
	sendMessageToRoom as sendMessageToRoomSocket,
} from '../config/socketManager';
import Room from '../models/room';

export const createServer = async (
	req: Request,
	res: Response
): Promise<void> => {
	const { name, subdomain } = req.body;

	if (!name || !subdomain) {
		res.status(400).send('Nome e subdomínio são obrigatórios.');
		return;
	}

	try {
		const existingServer = await Server.findOne({ where: { name } });
		if (existingServer) {
			res.status(400).send('Servidor já existe.');
			return;
		}

		const maxPort = (await Server.max('port')) as number | null;

		const nextPort = (maxPort ?? 5004) + 1;

		const server = await Server.create({ name, subdomain, port: nextPort });

		await createNginxConfig(subdomain, nextPort);
		createSocketServer(nextPort, name);

		res.status(201).send({ message: 'Servidor criado com sucesso.', server });
	} catch (error) {
		console.error(error);
		res.status(500).send('Erro ao criar servidor.');
	}
};

export const createRoomHandler = (req: Request, res: Response): void => {
	const { name } = req.params;
	const { roomName } = req.body;

	try {
		createRoom(name, roomName);
		res
			.status(200)
			.send({ message: `Sala ${roomName} criada no servidor ${name}.` });
	} catch (error: any) {
		res.status(400).send({ error: error.message });
	}
};

export const sendMessageToRoom = async (
	req: Request,
	res: Response
): Promise<void> => {
	const { name } = req.params;
	const { roomName, message } = req.body;

	try {
		await sendMessageToRoomSocket(name, roomName, message);

		res
			.status(200)
			.send({ message: `Mensagem enviada para a sala ${roomName} no servidor ${name}.` });
	} catch (error: any) {
		res.status(400).send({ error: error.message });
	}
};

export const getServerLogs = (req: Request, res: Response): void => {
	const { name } = req.params;

	try {
		const server = socketServers[name];
		if (!server) {
			res.status(404).send({ error: `Servidor ${name} não está rodando.` });
			return;
		}

		res.status(200).send({ logs: server.logs });
	} catch (error) {
		console.error(error);
		res.status(500).send({ error: 'Erro ao obter logs do servidor.' });
	}
};

export const manageServer = async (
	req: Request,
	res: Response
): Promise<void> => {
	const { name } = req.params;
	const { action, port } = req.body;

	try {
		switch (action) {
			case 'start':
				await startSocketServer(name, port);
				break;
			case 'stop':
				await stopSocketServer(name);
				break;
			case 'restart':
				await restartSocketServer(name, port);
				break;
			default:
				throw new Error('Ação inválida.');
		}
		res
			.status(200)
			.send({ message: `Ação ${action} executada no servidor ${name}.` });
	} catch (error: any) {
		res.status(400).send({ error: error.message });
	}
};

export const listServers = async (
	_req: Request,
	res: Response
): Promise<void> => {
	try {
		const servers = await Server.findAll();

		const serverMetrics = servers.map((server) => {
			const socketInfo = socketServers[server.dataValues.name];

			return {
				id: server.dataValues.id,
				name: server.dataValues.name,
				port: server.dataValues.port,
				status: server.dataValues.status,
				metrics: socketInfo
					? {
						rooms: Array.from(socketInfo.rooms),
						connectedUsers: Array.from(socketInfo.connectedUsers),
						messageCount: socketInfo.messageCount,
					}
					: {
						rooms: [],
						connectedUsers: [],
						messageCount: 0,
					},
			};
		});

		res.status(200).json(serverMetrics);
	} catch (error) {
		console.error(error);
		res.status(500).send({ error: 'Erro ao listar servidores.' });
	}
};

export const deleteServer = async (
	req: Request,
	res: Response
): Promise<void> => {
	const { name } = req.params;

	try {
		const server = await Server.findOne({ where: { name } });
		if (!server) {
			res.status(404).send({ error: `Servidor ${name} não encontrado.` });
			return;
		}

		if (socketServers[name]) {
			stopSocketServer(name);
			delete socketServers[name];
		}

		const hasRooms = await Room.findOne({
			where: { serverId: server.dataValues.id },
		});
		if (hasRooms?.dataValues.id) {
			await Room.destroy({ where: { serverId: server.dataValues.id } });
		}

		await removeNginxConfig(server.dataValues.subdomain);

		await Server.destroy({ where: { id: server.dataValues.id } });

		res
			.status(200)
			.send({ message: `Servidor ${name} deletado com sucesso.` });
	} catch (error) {
		console.error(error);
		res.status(500).send({ error: 'Erro ao deletar servidor.' });
	}
};
