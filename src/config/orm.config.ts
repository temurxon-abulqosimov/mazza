import { DataSourceOptions } from "typeorm";
import { envVariables } from "./env.variables";

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: envVariables.DATABASE_URL,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: ['dist/migrations/*.js'],
  synchronize: true,
};