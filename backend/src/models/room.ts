import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Server from './server';

interface RoomAttributes {
	id: number;
	name: string;
	serverId: number;
}

interface RoomCreationAttributes extends Optional<RoomAttributes, 'id'> {}

class Room
	extends Model<RoomAttributes, RoomCreationAttributes>
	implements RoomAttributes
{
	public id!: number;
	public name!: string;
	public serverId!: number;
}

Room.init(
	{
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		serverId: {
			type: DataTypes.INTEGER,
			allowNull: false,
			references: {
				model: Server,
				key: 'id',
			},
		},
	},
	{
		sequelize,
		modelName: 'Room',
	}
);

export default Room;
