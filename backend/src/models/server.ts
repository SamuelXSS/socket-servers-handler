import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Interface para tipagem de atributos do modelo
interface ServerAttributes {
	id: number;
	name: string;
	subdomain: string;
	port: number;
	status: 'running' | 'stopped';
}

// Tipagem para atributos opcionais na criação
interface ServerCreationAttributes
	extends Optional<ServerAttributes, 'id' | 'status'> {}

// Modelo com tipagem
class Server
	extends Model<ServerAttributes, ServerCreationAttributes>
	implements ServerAttributes
{
	public id!: number;
	public name!: string;
	public subdomain!: string;
	public port!: number;
	public status!: 'running' | 'stopped';
}

Server.init(
	{
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
		},
		subdomain: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
		},
		port: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		status: {
			type: DataTypes.STRING,
			allowNull: false,
			defaultValue: 'running',
		},
	},
	{
		sequelize,
		modelName: 'Server',
	}
);

export default Server;
