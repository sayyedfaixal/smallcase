// import mongoose from 'mongoose';
const mongoose = require('mongoose');
let tradeBoughtSchema = new mongoose.Schema({
  ticker : {
    type : String,
    // required : true,
    // minlength : 1,
    // unique : true,
  },

  //Price at which shares were bought
  buy_price : {
    type : Number,
    // required : true,

  },
  //Number of shares bought
  new_shares : {
    type : Number,
    // required : true,

  }

});

module.exports =  mongoose.model('tradeBought', tradeBoughtSchema);