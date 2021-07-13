const mongoose= require('mongoose') ;
const cluster= require('cluster');

module.exports= ()=>{
    mongoose.connect(process.env.MONGODB_URI, 
{
  dbName: process.env.DB_NAME,
  user : process.env.DB_USER,
  pass: process.env.DB_PASS,
  useUnifiedTopology: true,  
  useNewUrlParser: true ,
   useCreateIndex: true,
   useFindAndModify: false
}).then(()=>{
  console.log(`MongoDB Connected by worker ${cluster.worker.id}`);
}).catch((err)=>{
  console.log(err.message);
});

mongoose.connection.on('connected', ()=>{
  console.log('Mongoose Connected to DB...');
})

mongoose.connection.on('error', (error)=>{
  console.log(error.message);
})

mongoose.connection.on('disconnected', ()=>{
  console.log('Mongoose Connection is Disconnected...');
})
//If app termination is done => Ctrl+C
process.on('SIGINT', ()=>{
    mongoose.connection.close(()=>{
      console.log('Mongoose connection disconnected due to APP Termination...');
      process.exit(0);
    })
}); 

}