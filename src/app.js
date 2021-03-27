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

app.get('/', async (req, res) => {
    let tempRes = [];
    await axios.get('https://api.themoviedb.org/3/discover/movie?api_key='+TMDB_KEY+'&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page=1')
    .then((data) => {
        tempRes.push(data.data.results);
    });
    await axios.get('https://api.themoviedb.org/3/discover/movie?api_key='+TMDB_KEY+'&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page=2')
    .then((data) => {
        tempRes.push(data.data.results);
    });
    tempRes = tempRes[0].concat(tempRes[1]);
    res.send(tempRes);
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