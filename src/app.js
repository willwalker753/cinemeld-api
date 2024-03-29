require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const { NODE_ENV } = require('./config');
const TMDB_KEY = process.env.TMDB_KEY;
const { Pool } = require('pg')
const app = express()

const morganOption = (NODE_ENV === 'production') ? 'tiny' : 'common';

const pool = new Pool({  
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DB,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json({limit: '20mb'}));
app.use(express.urlencoded({ extended: false, limit: '20mb' }));
app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

let sql;
let params;
let pgResponse;

app.get('/testing/wait', async (req, res) => {
    setTimeout(() => {
        res.status(200).send('All Done');
    }, 1000 * 5);
});

app.get('/home', async (req, res) => {
    let tempRes = [];
    await axios.get('https://api.themoviedb.org/3/discover/movie?api_key='+TMDB_KEY+'&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page='+req.query.page)
    .then((data) => {
        tempRes = data.data.results;
    })
    .catch(error => {
        console.log(error);
    });
    res.status(200).send(tempRes);
});

app.get('/search', async (req, res) => {
    let tempRes = [];
    await axios.get('https://api.themoviedb.org/3/search/multi?api_key='+TMDB_KEY+'&language=en-US&page='+req.query.page+'&include_adult=false&query='+req.query.term)
    .then((data) => {
        tempRes = data.data.results;
    })
    .catch(error => {
        console.log(error);
    });
    res.status(200).send(tempRes);
});

app.get('/genre', async (req, res) => {
    let tempRes = [];
    await axios.get('https://api.themoviedb.org/3/discover/'+req.query.type+'?api_key='+TMDB_KEY+'&page='+req.query.page+'&include_adult=false&with_genres='+req.query.id)
    .then((data) => {
        tempRes = data.data.results;
    })
    .catch(error => {
        console.log(error);
    });
    res.status(200).send(tempRes);
});

app.get('/details', async (req, res) => {
    let tempRes = [];
    await axios.get('https://api.themoviedb.org/3/'+req.query.type+'/'+req.query.id+'?api_key='+TMDB_KEY+'&language=en-US')
    .then((data) => {
        tempRes = data.data;
    })
    .catch(error => {
        console.log(error);
    });
    res.status(200).send(tempRes);
});

app.get('/similar', async (req, res) => {
    let tempRes = [];
    await axios.get('https://api.themoviedb.org/3/'+req.query.type+'/'+req.query.id+'/similar?api_key='+TMDB_KEY+'&language=en-US&page='+req.query.page)
    .then((data) => {
        tempRes = data.data;
    })
    .catch(error => {
        console.log(error);
    });
    res.status(200).send(tempRes);
});

app.post('/user/signup', async (req, res) => {
    try {
        let responseArr = [];
        let username = req.body.username;
        let password = req.body.password;
        let email = req.body.email;
        if(username.length === 0) {
            responseArr.push('username_empty');
        } if(password.length === 0) {
            responseArr.push('password_empty');
        } else if(password.length < 6) {
            responseArr.push('password_short');
        } if(email.length === 0) {
            responseArr.push('email_empty');
        }
        sql = 'SELECT * FROM users WHERE username = ($1)';
        params = [ username ];
        pgResponse = await pool.query(sql, params);
        if(pgResponse.rows.length !== 0) {
            responseArr.push('username_taken')
        }
        sql = 'SELECT * FROM users WHERE email = ($1)';
        params = [ email ];
        pgResponse = await pool.query(sql, params);
        if(pgResponse.rows.length !== 0) {
            responseArr.push('email_taken')
        }
        if(responseArr.length === 0) {
            let uid = uuidv4();
            let options = {
                timeZone: 'America/Chicago',
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
            }, formatter = new Intl.DateTimeFormat([], options);
            let ts = formatter.format(new Date());
            bcrypt.hash(password, 10, async function (err, hash) {   
                sql = 'INSERT INTO users(user_id, username, password, email, ts) VALUES ($1, $2, $3, $4, $5) RETURNING *';
                params = [ uid, username, hash, email, ts ];
                pgResponse = await pool.query(sql, params);
                // sql = 'CREATE TABLE '+uid+'(serial_id serial PRIMARY KEY, id VARCHAR ( 40 ) NOT NULL, poster_path VARCHAR( 100 ), type VARCHAR ( 20 ) NOT NULL, title VARCHAR ( 255 ) NOT NULL, tagline VARCHAR ( 100 ), runtime VARCHAR (50) )';
                // await pool.query(sql);

                // let transporter = nodemailer.createTransport({
                //     service: 'gmail',
                //     auth: {
                //         user: process.env.EM_EMAIL,
                //         pass: process.env.EM_PASSWORD
                //     }
                // })
                // let mailOptions = {
                //     from: process.env.EMAIL,
                //     to: email,
                //     subject: 'Verify your email',
                //     text: "Almost done, "+username+" To complete your Cinemeld sign up, we just need to verify your email address: "+email+". Once verified, you can start using all of Cinemeld's features and recover your password. Paste the following link into your browser: https://cinemeld.vercel.app/email/verify/cmiowqf8j901n3190 You’re receiving this email because you recently created a new Cinemeld account. If this wasn’t you, please ignore this email.",
                //     html: '<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8"> <meta http-equiv="Content-Type" content="text/html charset=UTF-8" /> <link rel="preconnect" href="https://fonts.gstatic.com"> <link href="https://fonts.googleapis.com/css2?family=Lato&family=Roboto&display=swap" rel="stylesheet"> <style> body { background-color: #454545; font-family: "Lato", sans-serif; text-align: center; margin: 0; } #header-row { text-align:center; color: #E50914; background-color: #222222; width: 100%; margin-top: 0; } #logo { width: 35px; display: inline-block; } #title { display: inline-block; } #body { margin-top: 30px; margin-left:auto; margin-right:auto; color: #ffffff; background-color: #222222; width: 650px; padding-bottom: 30px; padding-top: 18px; } #body > a {text-align:center; align: center;} #body > a > button { background-color: #222222; margin-left: 210px; align: center; border: 2px solid #E50914; color: white; border-radius: 6px; padding: 4px 10px; font-size: 24px; margin-bottom: 15px; } #body > a > button:hover { cursor: pointer; background-color: #E50914; color: white; } #body > p { padding-left: 40px; padding-right: 40px; } #body-main { font-size: 18px; } .subtext { font-size: 14px; margin: 7px 0px 11px 0px } </style> </head> <body> <div id="header-row"> <img id="logo" src="https://github.com/willwalker753/cinemeld/blob/main/public/android-chrome-512x512.png?raw=true" alt="cinemeld logo"> <h1 id="title"> Cinemeld </h1> </div> <div id="body"> <p id="body-main">Almost done, <strong>'+username+'</strong> To complete your Cinemeld sign up, we just need to verify your email address: <strong>'+email+'</strong>.</p> <a href="https://cinemeld.vercel.app/email/verify/cmiowqf8j901n3190" target="_blank"> <button>Verify email address</button> </a> <p class="subtext">Once verified, you can start using all of Cinemeld&#39;s features and recover your password.</p> <p class="subtext">Button not working? Paste the following link into your browser: https://cinemeld.vercel.app/email/verify/cmiowqf8j901n3190</p> <p class="subtext">You&#39;re receiving this email because you recently created a new Cinemeld account. If this wasn&#39;t you, please ignore this email.</p> </div> </body> </html>'
                // }
                // transporter.sendMail(mailOptions, function(err, data){
                //     if(err) {
                //         console.log(err)
                //     } else {
                //         console.log('Verification email sent!')
                //     }
                // })
                res.status(201).send({
                    type: 'success', 
                    data: pgResponse.rows
                })
            });
        } else {
            res.status(200).send({type:'fail', data:responseArr});
        }
    }
    catch(error) {
        console.error(error)
        res.status(500).send()
    }
});

app.post('/user/login', async (req, res) => {
    let responseArr = [];
    let userInfo;
    let username = req.body.username;
    let password = req.body.password;
    let hashedPassword;
    if(username.length === 0) {
        responseArr.push('username_empty');
    } else {
        sql = 'SELECT password FROM users WHERE username = ($1)';
        params = [ username ];
        let pgResponseUsername = await pool.query(sql, params);
        sql = 'SELECT password FROM users WHERE email = ($1)';
        params = [ username ];
        let pgResponseEmail = await pool.query(sql, params);
        if(pgResponseUsername.rows === 0 && pgResponseEmail.rows === 0) {
            responseArr.push('username_no_results');
        } else if(pgResponseUsername.rows.length > 0) {
            hashedPassword = pgResponseUsername.rows[0].password;
            sql = 'SELECT * FROM users WHERE username = ($1)';
            params = [ username ];
            userInfo = await pool.query(sql, params);    
        } else if(pgResponseEmail.rows.length > 0) {
            hashedPassword = pgResponseEmail.rows[0].password;
            sql = 'SELECT * FROM users WHERE email = ($1)';
            params = [ username ];
            userInfo = await pool.query(sql, params);    
        }
    } 
    if(password.length === 0) {
        responseArr.push('password_empty');
    }
    if(responseArr.length === 0) {
        bcrypt.compare(password, hashedPassword, function(err, result) {
            if(result === true) {     
                res.status(200).send({
                    type: 'pass',
                    data: userInfo.rows[0]
                });
            } else {
                res.status(200).send({
                    type: 'fail',
                    data: ['no_match']
                });
            }
        });
    } else {
        res.status(200).send({
            type: 'fail',
            data: responseArr
        });
    }
});

app.post('/user/favorites', async (req, res) => {
    sql = 'INSERT INTO favorites(user_id, moshow_id, poster_path, type, title, tagline, runtime) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
    params = [req.body.user_id, req.body.moshow_id, req.body.poster_path, req.body.type, req.body.title, req.body.tagline, req.body.runtime];
    pgResponse = await pool.query(sql, params);
    res.status(200).send(pgResponse.rows);
});

app.delete('/user/favorites/:user_id/:moshow_id', async (req, res) => {
    sql = 'DELETE FROM favorites WHERE user_id = ($1) AND moshow_id = ($2)';
    params = [req.params.user_id, req.params.moshow_id];
    pgResponse = await pool.query(sql, params);
    res.status(200).send(pgResponse.rows);
});

app.get('/user/favorites/:user_id', async (req, res) => {
    try {
        sql = 'SELECT * FROM favorites WHERE user_id = ($1)';
        params = [req.params.user_id];
        pgResponse = await pool.query(sql, params);
        let favoritesData = pgResponse.rows;
        for(let i=0; i<favoritesData.length; i++) {
            favoritesData[i].loading = false
        }
        res.status(200).send(favoritesData);
    }
    catch(error) {
        console.log(error)
        res.status(500).send()
    }
    
});

app.use(function errorHandler(error, req, res, next) {
    let response
    if (NODE_ENV === 'production') {
        response = { error: { message: 'server error' } }
    } else {
        console.error(error)
        response = { message: error.message, error }
    }
    res.status(500).json(response)
});

module.exports = app;