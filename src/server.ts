import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import https from 'https';
import http from 'http';
import morgan from 'morgan';

import helmet from 'helmet';
import compression from 'compression';
import methodOverride from 'method-override';

import {routes, pubRoutes} from './routes/v1/index';
import errorHandler from './middlewares/ErrorHandler';
import serveStatic from 'serve-static';
import path from 'path';
import { Authentication } from './middlewares/AuthorizateUser';

import swaggerUI from "swagger-ui-express";
import swaggerDocument from "./swagger.json"

export default class Server {
  public express: express.Application;

  constructor() {
    this.express = express();
    this.middlewares();
    this.routeTest();
    this.routes();
  }

  public startHttps(port: number): void {
    const httpsOptions = {
      cert: '',
      key: '',
    };
    const server = https.createServer(httpsOptions, this.express);
    server.listen(port, () => {
      console.log('Servidor iniciado na porta ' + port);
    });
  }

  public async connectDB(): Promise<any> {
    console.log('Iniciando a Conexão com o banco de dados');
  }

  public startHttp(port: number): void {
    const server = http.createServer(this.express);
    server.listen(port, () => {
      console.log('Server is running :', port);
    });
  }

  private middlewares(): void {
    this.express.use(helmet());
    this.express.use(express.json({ limit: '10mb' }));
    this.express.use(express.urlencoded({ extended: true }));
    this.express.use(compression());
    this.express.use(methodOverride('X-HTTP-Method-Override'));
    this.express.use(morgan('tiny'));
    this.express.use(
      cors({
        allowedHeaders: '*',
        methods: '*',
        origin: '*',
      }),
    );
this.express.use('/image', express.static(path.join(process.cwd(), 'assets', 'img')));
    dotenv.config();
  }

  private routes(): void {
    this.express.use('/v1', Authentication, routes);
    this.express.use('/pub', pubRoutes);
    this.express.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));
    this.express.use(errorHandler);
  }

  private routeTest(): void {
    this.express.get('/', (req, res) => {
      res.send('Hello World');
    });
  }
}
