import http from 'http';
import { Server as SocketServer, Namespace } from 'socket.io';
import Event from '../models/event';
import Server from '../models/server';
import Room from '../models/room';

interface SocketInfo {
	io: SocketServer;
	server: http.Server;
	rooms: Set<string>;
	connectedUsers: Set<string>;
	messageCount: number;
	logs: string[];
	adminNamespace: Namespace;
}

const socketServers: Record<string, SocketInfo> = {};

export const createSocketServer = (port: number, name: string): void => {
	const server = http.createServer();
	const io = new SocketServer(server, {
		cors: { origin: '*', methods: ['GET', 'POST'] },
	});

	const adminNamespace = io.of(`/admin/${name}`);

	const serverInfo: SocketInfo = {
		io,
		server,
		rooms: new Set(),
		connectedUsers: new Set(),
		messageCount: 0,
		logs: [],
		adminNamespace,
	};

	io.on('connection', (socket) => {
		serverInfo.connectedUsers.add(socket.id);

		serverInfo.rooms.forEach((roomName) => {
			socket.join(roomName);
		});

		const logMessage = `User connected: ${socket.id}`;
		serverInfo.logs.push(logMessage);
		adminNamespace.emit('log', logMessage);

		Event.create({
			serverName: name,
			eventType: 'USER_CONNECTED',
			data: JSON.stringify({ userId: socket.id }),
		});

		socket.on('message', (msg) => {
			serverInfo.messageCount++;

			const logMessage = `Message received from ${socket.id}: ${msg}`;
			serverInfo.logs.push(logMessage);
			adminNamespace.emit('log', logMessage);

			Event.create({
				serverName: name,
				eventType: 'MESSAGE_SENT',
				data: JSON.stringify({ message: msg }),
			});
		});

		socket.on('disconnect', () => {
			serverInfo.connectedUsers.delete(socket.id);

			const logMessage = `User disconnected: ${socket.id}`;
			serverInfo.logs.push(logMessage);
			adminNamespace.emit('log', logMessage);

			Event.create({
				serverName: name,
				eventType: 'USER_DISCONNECTED',
				data: JSON.stringify({ userId: socket.id }),
			});
		});
	});

	server.listen(port, () =>
		console.log(`Servidor Socket.IO [${name}] rodando na porta ${port}`)
	);

	socketServers[name] = serverInfo;
};

export const createRoom = async (
	serverName: string,
	roomName: string
): Promise<void> => {
	const server = socketServers[serverName];
	if (!server) throw new Error(`Servidor ${serverName} não está rodando.`);

	server.rooms.add(roomName);

	const dbServer = await Server.findOne({ where: { name: serverName } });
	if (!dbServer)
		throw new Error(`Servidor ${serverName} não encontrado no banco.`);

	await Room.create({
		name: roomName,
		serverId: dbServer.dataValues.id,
	});

	// Emitir log para o adminNamespace
	const logMessage = `Sala criada: ${roomName}`;
	server.logs.push(logMessage);
	server.adminNamespace.emit('log', logMessage);

	Event.create({
		serverName,
		eventType: 'ROOM_CREATED',
		data: JSON.stringify({ roomName }),
	});
};

export const sendMessageToRoom = async (
	serverName: string,
	roomName: string,
	message: string
): Promise<void> => {
	const server = socketServers[serverName];
	if (!server) throw new Error(`Servidor ${serverName} não está rodando.`);

	if (!server.rooms.has(roomName))
		throw new Error(`Sala ${roomName} não existe no servidor ${serverName}.`);

	server.io.to(roomName).emit('message', message);

	server.messageCount++;

	// Emitir log para o adminNamespace
	const logMessage = `Mensagem enviada para sala ${roomName}: ${message}`;
	server.logs.push(logMessage);
	server.adminNamespace.emit('log', logMessage);
};

export const stopSocketServer = async (serverName: string): Promise<void> => {
	const server = socketServers[serverName];
	if (server) {
		await Server.update({ status: 'stopped' }, { where: { name: serverName } });
		socketServers[serverName] && delete socketServers[serverName];
		server.server.close(async () => {
			await Event.create({
				serverName,
				eventType: 'SERVER_STOPPED',
				data: '{}',
			});
		});
		console.log(`Servidor ${serverName} foi desligado.`);
	} else {
		socketServers[serverName] && delete socketServers[serverName];
		await Server.update({ status: 'stopped' }, { where: { name: serverName } });
		console.log(`Servidor ${serverName} foi desligado.`);
		await Event.create({
			serverName,
			eventType: 'SERVER_STOPPED',
			data: '{}',
		});
	}
};

export const restartSocketServer = async (
	serverName: string,
	port: number
): Promise<void> => {
	await stopSocketServer(serverName);
	createSocketServer(port, serverName);
};

export const startSocketServer = async (
	serverName: string,
	port: number,
	isStartup: boolean = false
): Promise<void> => {
	const dbServer = await Server.findOne({ where: { name: serverName } });
	if (!dbServer)
		throw new Error(`Servidor ${serverName} não encontrado no banco.`);

	if (dbServer.dataValues.status === 'stopped' || isStartup) {
		if (!socketServers[serverName]) {
			createSocketServer(port, serverName);

			const rooms = await Room.findAll({
				where: { serverId: dbServer.dataValues.id },
			});
			
			if (
				dbServer.dataValues.status === 'stopped'
			) {
				for (const room of rooms) {
					await createRoom(serverName, room.dataValues.name);
				}

			}

			await dbServer.update({ status: 'running' });

			console.log(`Servidor ${serverName} iniciado com ${rooms.length} salas.`);
		} else {
			throw new Error(
				`Servidor ${serverName} já está registrado e rodando no sistema.`
			);
		}
	} else {
		throw new Error(`Servidor ${serverName} já está online.`);
	}
};

export { socketServers };
