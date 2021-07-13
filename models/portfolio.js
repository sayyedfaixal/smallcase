// import mongoose from 'mongoose';
const mongoose = require('mongoose');
let portfolioSchema = new mongoose.Schema({
  
  ticker : {
    type : String,
    required : true,
    minlength : 1,
    unique : true,
  },
  avg_buy_price : {
    type : Number,
    required : true,
  },
  shares : {
    type : Number,
    required : true,
  }

});

module.exports =  mongoose.model('portfolio', portfolioSchema);