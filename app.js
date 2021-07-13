const express= require('express') ;
const cluster= require('cluster');
const createError = require('https-error');
const dotenv = require('dotenv').config()

// Count the machine's CPUs
/**
 * The os.cpus() method is an inbuilt application programming interface of the os module which is used to get information
 *  about each logical CPU core of the computer.
 */
 
const numCPUs = require('os').cpus().length;

let router = require('./routes/portfolio');
let app = express();

//This is like using body-parser because now express has already built-in
app.use(express.json());
//connecting to mongodb 

//Atlas user, password : fasial, smallcase 
//Initialize DB from initDB.js

require('./initDB')();

app.use(express.json());
app.use('/', router);

app.use((req, res, next)=>{

  // const err = new Error("Not Found...");
  // err.status = 404;
  // next(err);
  let errSend = new createError(404, "Not Found...") ;
  next(errSend);
});

//Error Handler middleware
app.use((err, req, res, next)=>{
  res.status(err.status || 500)
  res.send({
    error : {
      status : err.status || 500,
      message : err.message
    }
  })
});

// 

//CLUSTER MODULE
/**
 * since node.js process are single threaded i.e whenever you start the application it runs on single therad
 * For multicore CPUs it won't be utilizing the full power of that CPU. Hence for scaling the app we will be using 
 * clustering module
 * Even if we have single core CPU we should use cluster module, because even if one instance goes down we will be having another instances
 * for the backup (which will result in 0 down time) 
 */
// FOR MASTER PROCESS
if (cluster.isMaster) {

  // Create a worker for each CPU
  for (let i = 0; i < numCPUs; i++) cluster.fork();

  // Listen for dying workers, Replace the dead worker
  cluster.on('exit', worker => {
      console.log('Worker %d died', worker.id);
      cluster.fork();
  });

// FOR WORKER PROCESS
} else {

  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`Server starting @ port ${PORT}`);
  });
  console.log('Worker %d running!', cluster.worker.id);

}
/**
 * 1) Instead of direclty running the app.listen()
 * 2) We will use cluster module to check whether the process is Master
 * 3) If it is a Master process we fork() a  worker process and start listening in the worker process and we will create as many number as 
 *    the number of CPUs in the processor
 * 4) Master process will not be listening for any request, master will send it to workers, and all these workers share same port
 * 
 */
