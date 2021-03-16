import * as sapper from '@sapper/server';
import express from "express";
import fileupload from 'express-fileupload'
import * as http from "http";
import logger from "morgan";
import {MongoClient} from "mongodb";
import cors from "cors";
import session from 'express-session';
import SessionFileStore from 'session-file-store';
import type * as t from './_types';
import type { ServerRequest } from './_servertypes';

const {PORT,MONGODB,BASEPATH} = process.env;
const app = express();

app.set('view engine', 'ejs');
app.set('views', __dirname + '/templates');

let FileStore = (SessionFileStore)(session);
let fileStoreOptions = {};

console.log(`base path: ${BASEPATH}`);
app.use(BASEPATH,express.static('static'));
app.use(logger('dev'));
app.use(cors());
app.use(express.json());
app.use(fileupload({
  limits: { fileSize: 2 * 1024 * 1024 },
  //useTempFiles : true,
  //tempFileDir : '/tmp/'
}));
app.use(session({
	secret: process.env.SESSION_SECRET ? process.env.SESSION_SECRET : 'notverysecret',
	resave: false,
	saveUninitialized: true,
	/* cookie: { secure: true }, */
	/* mainly for dev (restartable) */
	store: new FileStore(fileStoreOptions),
}));
app.use(BASEPATH, sapper.middleware({
	session: (req:ServerRequest, res:sapper.SapperResponse) => ({
		//userid: req.session.userid,
	})
}));

let delay = 1000;
const attemptConnection = function () {
	MongoClient.connect(MONGODB ? MONGODB : 'mongodb://mongo:27017', {useUnifiedTopology: true})
		.then((client) => {
			console.log("Connected to DB");
			app.locals.db = client.db('music-class-chat');

			const server = http.createServer(app);
			server.listen(PORT);
			server.on('error', (error) => {
				throw error;
			});
		})
		.catch((err) => {
			console.log(err.message);
			setTimeout(attemptConnection, delay);
		});
};

attemptConnection();
