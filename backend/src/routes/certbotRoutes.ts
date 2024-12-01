import { Request, Response, Router } from 'express';
import { runCertbot } from '../services/certbotService';

const certbotRoutes = Router();

certbotRoutes.post('/run', async (req: Request, res: Response): Promise<void> => {
	const { subdomain } = req.body;

	if (!subdomain) {
		res.status(400).send('Subdomínio é obrigatório.');
		return;
	}

	try {
		await runCertbot(subdomain);
		res.status(200).send({ message: `Certbot executado para ${subdomain}` });
	} catch (error) {
		console.error(error);
		res.status(500).send('Erro ao rodar o Certbot.');
	}
});

export default certbotRoutes;
