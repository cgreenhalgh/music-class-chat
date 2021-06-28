import crypto from 'crypto'
import type {Response} from "express"
import {customAlphabet} from "nanoid"
import nodemailer from 'nodemailer'
import type {ServerRequest} from "../../../_servertypes"
import type {AdminSession, DBAdmin} from "../../../_types"
import {idAlphabet} from "../../../_types";

const emailConfigured = 'SMTP_host' in process.env
const transport = nodemailer.createTransport({
	host: process.env["SMTP_host"],
	port: parseInt(process.env["SMTP_port"]),
	auth: {
		user: process.env["SMTP_user"],
		pass: process.env["SMTP_pass"]
	}
});

export async function post(req: ServerRequest, res: Response) {
	try {
		const {email, password} = req.body
		if (!email || !password) {
			res.status(400).json({error: 'Bad Request'})
			return
		}
		const admin = await req.app.locals.db.collection<DBAdmin>('Admins').findOne({_id: email.toLowerCase()})
		if (admin == null) {
			res.status(404).json({error: 'Admin Doesn\'t Exist'})
			return
		}

		const hashed = crypto
			.createHmac('sha512', admin.salt)
			.update(password)
			.digest('base64')
		if (hashed !== admin.password) {
			res.status(401).json({error: 'Wrong Password'})
			return
		}

		const expires = addHours(new Date(), 1)

		const session: AdminSession = {
			id: customAlphabet(idAlphabet, 8)(),
			email: email,
			password: customAlphabet(idAlphabet, 12)(),
			expires: expires.toISOString()
		}

		// Should
		const sessionUrl = new URL(req.protocol + '://' + req.get('host') + req.baseUrl + '/admin/session?key=' + session.password).toString()
		console.log(sessionUrl)
		await req.app.locals.db.collection('AdminSessions').deleteMany({email: email})
		await req.app.locals.db.collection('AdminSessions').insertOne(session)
		if (emailConfigured) {
			console.log('Sending Email')
			await transport.sendMail({
				from: process.env['SMTP_email'],
				to: email,
				subject: 'Admin Login',
				text: 'Session: ' + sessionUrl,
				html: '<div><a href="' + sessionUrl + '">Complete Login</a></div>'
			});
		} else {
			console.warn('Emails Not Configured')
		}

		res.json({message: 'Check email'});
	} catch (error) {
		console.log('Error (update group)', error);
		res.writeHead(500).end(JSON.stringify({error: error}));
	}
}

function addHours(date: Date, hours: number) {
	let result = new Date(date)
	result.setTime(result.getTime() + hours * 60 * 60 * 1000)
	return result;
}