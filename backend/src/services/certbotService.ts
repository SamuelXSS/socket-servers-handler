import { exec } from 'child_process';

export const runCertbot = async (subdomain: string): Promise<void> => {
	const command = `certbot --nginx -d ${subdomain} -d www.${subdomain}`;
	exec(command, (error, stdout, stderr) => {
		if (error) {
			console.error(`Erro ao rodar o Certbot: ${stderr}`);
			throw error;
		}
		console.log(`Certbot executado: ${stdout}`);
	});
};
