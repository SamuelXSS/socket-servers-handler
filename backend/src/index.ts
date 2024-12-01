import express from 'express';
import cors from 'cors';
import { sequelize } from './config/database';
import serverRoutes from './routes/serverRoutes';
import certbotRoutes from './routes/certbotRoutes';
import { startSocketServer } from './config/socketManager';
import Server from './models/server';

const app = express();
app.use(cors());
app.use(express.json());


app.use('/servers', serverRoutes);
app.use('/certbot', certbotRoutes);


const PORT = 3005;
sequelize.sync().then(async () => {
	try {
		const runningServers = await Server.findAll({ where: { status: 'running' } });
		if (runningServers.length > 0) {
			console.log(`Iniciando ${runningServers.length} servidores...`);
			for (const server of runningServers) {
				const { name, port } = server.dataValues;

				try {

					await startSocketServer(name, port, true);
				} catch (err) {
					console.error(`Erro ao iniciar o servidor ${name}:`, err);
				}
			}
		} else {
			console.log('Nenhum servidor com status "running" encontrado.');
		}
		app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
	} catch (error) {
		console.error('Erro ao iniciar o servidor principal:', error);
	}
});
