import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface EventAttributes {
	id: number;
	serverName: string;
	eventType: string;
	data: string;
	timestamp: Date;
}

interface EventCreationAttributes
	extends Optional<EventAttributes, 'id' | 'timestamp'> {}

class Event
	extends Model<EventAttributes, EventCreationAttributes>
	implements EventAttributes
{
	public id!: number;
	public serverName!: string;
	public eventType!: string;
	public data!: string;
	public timestamp!: Date;
}

Event.init(
	{
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		serverName: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		eventType: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		data: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		timestamp: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: DataTypes.NOW,
		},
	},
	{
		sequelize,
		modelName: 'Event',
	}
);

export default Event;
