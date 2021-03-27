require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const { NODE_ENV } = require('./config');
const TMDB_KEY = process.env.TMDB_KEY;
const app = express()

const morganOption = (NODE_ENV === 'production') ? 'tiny' : 'common';

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

app.get('/something', (req, res) => {
    axios.get('https://api.themoviedb.org/3/movie/76341?api_key='+TMDB_KEY)
    .then((data) => {
        data = data.data;
        console.log(data);
        res.send(data);
    });
    
   
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