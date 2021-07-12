const createError = require('https-error'); 
const express= require('express') ;
const mongoose = require('mongoose');
const router = express.Router();

const portfolio= require('../models/portfolio') ;
const transaction= require('../models/securityTransaction');
const tradeBought = require('../models/tradeBought');
const tradeSold = require('../models/tradeSold');


// ------------------------------------------------ CREATING SECURITY ------------------------------------------------
router.post('/createSecurity', async (req, res, next) => {
try {

  let { ticker, avg_buy_price, shares } = req.body;

  let security = await portfolio.create(req.body);

  //TRANSACTION ENTRY

  await transaction.create({
    transaction_detail : `ADDED NEW ${ticker} SECURITY`,
    ticker,
    shares,
    price : avg_buy_price,
    status : 'SUCCESS'
  });
  
  console.log("New security entered in a portfolio", security);

  res.send(`Success, New security of ${ticker} entered in a portfolio`);
} catch (error) {
  next(error);
  // console.log("error",error);
  // res.status(400).send(error);
}

});

//FETCHING PORTFOLIO AND ITS SECURITIES
router.get('/portfolio', async (req, res, next) => {

  try {
    let result = await fetchPortfolio();
    res.send(result);
  } catch (error) {
  next(error);
    // console.log("The error", error);
    // res.send(error).status(400);
  }
});

const fetchPortfolio = async (data) => {
  if(!data) {
    let response = await portfolio.find();
    return response;

  } else return JSON.parse(data);

};


// ------------------------------------------------PLACING A TRADE------------------------------------------------
router.post('/buyTrade', async (req, res, next) => {

  let { ticker, buy_price, new_shares } = req.body;

  try {
      if(new_shares<0){
        next(new Error(`Quantity of shares should always be Positive, You have provided ${new_shares}`));
      }
      if(buy_price < 0){
        next(new Error(`Buy Price must be always be positive, You have provided ${buy_price}`));
      }
    let trade = await updateTrade({ ticker, buy_price, new_shares });
    if(trade){
      res.send('Successfully placed a trade in the security');
      
      await tradeBought.create({
        ticker : ticker,
        buy_price : buy_price,
        new_shares : new_shares
      });
      db.tradeBought.find({ name: "bar" }).snapshot().forEach((doc) => {
        doc.name = "foo-" + doc.name;
    
        db.test.save(doc);
    });
    } 
    else res.send('Kindly try placing the trade again!');

  } catch (error) {
    // next(error)
    console.log(error.message);

    //TRANSACTION ENTRY
    await transaction.create({
      transaction_detail : `FAILED TO PURCHASE ${ticker} SECURITY`,
      ticker,
      shares : new_shares,
      price : buy_price,
      status : 'FAILED'
    });

    res.send(error).status(400);
  }
});

const updateTrade = async ({ ticker, buy_price, new_shares }) => {

  let data = await portfolio.find({ ticker });
  data = data[0];
  console.log(data);
  if(!data) throw `You don't own any security for ${ticker} company. Kindly buy new security for ${ticker}!`;

  let { avg_buy_price, shares } = data;

  avg_buy_price = +(((avg_buy_price * shares) + (buy_price * new_shares))/(shares + new_shares)).toFixed(2);
  shares += new_shares;

  await portfolio.updateOne({ ticker },  { $set : { avg_buy_price, shares }});


  //TRANSACTION ENTRY
  await transaction.create({
    transaction_detail : `PURCHASED NEW ${ticker} SHARES`,
    ticker,
    shares : new_shares,
    price : buy_price,
    status : 'SUCCESS'
  });

  return true;
};



// ------------------------------------------------ SELLING TRADE ------------------------------------------------
router.post('/sellTrade',async (req, res, next) => {

  let { ticker, selling_shares } = req.body;

  try {
    if(selling_shares<0){
       next(new Error(`You can't sell a Trade having negative shares, You have provided ${selling_shares}`));
    }
    let trade = await sellTrade({ ticker, selling_shares });

    let { shares, result } = trade;

    res.send(`After selling ${selling_shares} shares of ${ticker}, You have ${shares} shares left and your cumulative return of the portfolio is ₹${result}`);
    await tradeSold.create({
      ticker : ticker,
      selling_shares : selling_shares
    });

  } catch (error) {
    // next(error);
    console.log(error.message);

     //TRANSACTION ENTRY
     await transaction.create({
      transaction_detail : `FAILED TO SELL ${ticker} SECURITY.`,
      ticker,
      shares : selling_shares,
      status : 'FAILED'
    });

    res.send(error).status(400);
  }
});

const sellTrade = async ({ ticker, selling_shares }) => {

  let data = await portfolio.find({ ticker });
  data = data[0];
  console.log(`Data fetched is ${data}`);
  if(!data) throw `You don't own any security for ${ticker} company!`;

  let { avg_buy_price, shares } = data;

  shares -= selling_shares;

  if(shares < 0) throw `You don't have enough ${ticker} shares left. The quantity of a stock should always be positive`;

  await portfolio.updateOne({ ticker },  { $set : { shares }});


  //TRANSACTION ENTRY
  await transaction.create({
    transaction_detail : `SOLD ${ticker} SHARES`,
    ticker,
    shares : selling_shares,
    price : avg_buy_price,
    status : 'SUCCESS'
  });

  let portfolio_data = await fetchPortfolio();
  
  let result = await Promise.all(portfolio_data.map(r => cumulativeReturns(r)));

  result = +(result.reduce((sum, result) => sum + result, 0)).toFixed(2);

  return { shares, result };
};

const cumulativeReturns = (final_value) => {
  
  let { avg_buy_price, shares } = final_value;
  let current_price = 100, sum = 0; //SETTING CURRENT PRICE TO RS 100.

  sum += ((current_price - avg_buy_price) * shares);

  return sum;
};

// ------------------------------------------------FETCHING CUMULATIVE RETURNS------------------------------------------------

//NOTE:  Return can be -ve
router.get('/cumulative', async (req, res, next) => {

  try {
    
    let portfolio_data = await fetchPortfolio();

    let data = await Promise.all(portfolio_data.map(r => cumulativeReturns(r)));
    
    data = +(data.reduce((sum, data) => sum + data, 0)).toFixed(2);

    res.send({'Cumulative return ': data});

  } catch (error) {
    // next(error);
    console.log(error);
    res.send(error).status(400);
  }

});

//TODO: Working 
router.get('/holdings', async (req, res, next) => {

  try {
    
    let data = await portfolio.aggregate([{ $match : {}}, { $group : { _id : "Portfolio", total_shares : { $sum : "$shares" }, total_share_value : { $sum : "$avg_buy_price"} }}]);;
    data = data[0];
    
    let { _id, total_shares, total_share_value } = data;

    res.send({
      _id,
      total_shares,
      total_share_value
    });

  } catch (error) {
    // next(error);
    console.log(error);
    res.send(error).status(400);
  }

});


//// ------------------------------------------------DELETING ------------------------------------------------
router.delete('/:id', async (req, res, next) =>{
  // res.send('Deleted...');
  const id = req.params.id;
  try {

    const result = await portfolio.findByIdAndDelete(id);
    // console.log(result);
    if(!result){
      throw (new createError(404, "Security Not Found..."));
    }
    res.send(result);
  } catch (error) {
    console.log(error.message);
    if(error instanceof mongoose.CastError){
      next(new createError(400, "Invalid Product Id..."));
      return ;
    }
    next(error);
  }
});
//// ------------------------------------------------ PATCH(Updating the trade) ------------------------------------------------
  router.patch('/:id',async (req, res, next) =>{
    try {
        const id = req.params.id;
        const updates = req.body;
        const options = {new : true};
        const result = await portfolio.findByIdAndUpdate(id, updates, options);
        res.send(result);
    } catch (error) {
      console.log(error.message); 
    }
  });
// module.exports
module.exports = router;




