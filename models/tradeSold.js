
// import mongoose from 'mongoose';
const mongoose = require('mongoose');
let tradeSoldSchema = new mongoose.Schema({
  ticker : {
    type : String,
    required : true,
    minlength : 1,
    // unique : true,
  },
  //price at which shares were sold
  selling_shares : {
    type : Number,
    required : true,

  }

});

module.exports =  mongoose.model('tradeSold', tradeSoldSchema);