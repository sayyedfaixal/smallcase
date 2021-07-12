const express = require('express');
const app = express();
const cluster= require('cluster');
const numCPUs = require('os').cpus().length;

app.get('/', (req, res)=>{
    for (let i =0; i<=1e8; i++){

    } 
    res.send(`Connected by process ${process.pid}...`);
    /**
     * cluster.worker.kill();
     * this line was to test if the workers died is our system still running...
     */


});
if(cluster.isMaster){
    for(let i=0;i<numCPUs;i++){
        cluster.fork();
    }
    cluster.on('exit', (worker, code, signal)=>{
        console.log(`Worker ${worker.process.pid} died`);
        //IF something goes wrong there will be fork() which will create a new worker and our system wont go down
        cluster.fork();
    })
}else{
    app.listen(3000, ()=>{
        console.log(`Server running by ${process.pid} @http:localhost:3000`);
    });
}
