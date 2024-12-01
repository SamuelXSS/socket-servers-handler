import fs from 'fs-extra';
import { exec } from 'child_process';

const NGINX_AVAILABLE = '/etc/nginx/sites-available';
const NGINX_ENABLED = '/etc/nginx/sites-enabled';

export const createNginxConfig = async (
	subdomain: string,
	port: number
): Promise<void> => {
	const config = `
server {
    listen 80;
    server_name ${subdomain} www.${subdomain};

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}`;
	const configPath = `${NGINX_AVAILABLE}/${subdomain}`;
	await fs.writeFile(configPath, config);

	await fs.symlink(configPath, `${NGINX_ENABLED}/${subdomain}`);

	exec('sudo nginx -s reload', (error, stdout, stderr) => {
		if (error) {
			console.error(`Erro ao recarregar o NGINX: ${stderr}`);
			throw error;
		}
		console.log(`NGINX recarregado: ${stdout}`);
	});
};

export const removeNginxConfig = async (subdomain: string): Promise<void> => {
	const configPath = `${NGINX_AVAILABLE}/${subdomain}`;
	const enabledPath = `${NGINX_ENABLED}/${subdomain}`;

	await fs.unlink(enabledPath);
	await fs.unlink(configPath);

	exec('sudo nginx -s reload', (error, stdout, stderr) => {
		if (error) {
			console.error(`Erro ao recarregar o NGINX: ${stderr}`);
			throw error;
		}
		console.log(`NGINX recarregado: ${stdout}`);
	});
};
