import { DataSourceOptions } from "typeorm";
import { envVariables } from "./env.variables";


export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: envVariables.DB_HOST,
  port: parseInt(envVariables.DB_PORT || '5432', 10),
  username: envVariables.DB_USERNAME,
  password: envVariables.DB_PASSWORD,
  database: envVariables.DB_NAME,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: ['dist/migrations/*.js'],
  synchronize: true,
};