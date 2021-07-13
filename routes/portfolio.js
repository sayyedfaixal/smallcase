const createError = require('https-error'); 
const express= require('express') ;
const mongoose = require('mongoose');
const router = express.Router();

const portfolio= require('../models/portfolio') ;
const transaction= require('../models/securityTransaction');
const tradeBought = require('../models/tradeBought');
const tradeSold = require('../models/tradeSold');


//TODO: Create you own error format
/**
 *  error = {
    "error": {
      "code": "BAD REQUEST"
      "error_reason": "the request param xyz is missing",
    }
  }

//---------------------------------------------------------
  Fetching trades and its securities
   router.get('/fetch', async (req, res)=>{
       try {
         const result = await portfolio.find();
         res.send(result);
       } catch (error) {
         console.log('Error', error);
       }
   });
 */

//  TODO: Working
//  NOTE: FIXED
//  FIXME: Validation, Parse response in JSON
// ------------------------------------------------ CREATING SECURITY ------------------------------------------------
router.post('/createSecurity', async (req, res, next) => {
try {

  let { ticker, avg_buy_price, shares } = req.body;
  if(shares<0){
    next(new Error(`Quantity of shares should always be Positive, You have provided ${shares}`));
    return ;
  }
  if(avg_buy_price < 0){
    next(new Error(`Buy Price must be always be positive, You have provided ${avg_buy_price}`));
    return ;
  }
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

//FIXME: Response is empty body 
//NOTE: Fixed
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

//TODO: Working
//NOTE: Fixed
//FIXME: Validation if string is passed instead of NUM etc

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
          let found = await tradeBought.findOne({ticker})
          if(found!= undefined){
            let updateShare = trade[0].new_shares + new_shares;
            await tradeBought.updateOne({ticker}, {buy_price: buy_price, new_shares : updateShare});
          }
          else{
            const doc_buy = new tradeBought({
              ticker : ticker,
              buy_price : buy_price,
              new_shares : new_shares
            });
            await doc_buy.save();
        }
      }
      else res.send('Kindly try placing the trade again!'); 
    } 

   catch (error) {
    // next(error)
    console.log(error.message);
    // res.send('Kindly try placing the trade again!');
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

//FIXME: Validation if string is passed instead of NUM etc NOTE: FIXED 

//FIXME: If user doesn't hold share that part is working but the else part neeed to be FIXED NOTE: Fixed 
// ------------------------------------------------ SELLING TRADE ------------------------------------------------
router.post('/sellTrade',async (req, res, next) => {

  let { ticker, selling_shares } = req.body;

  try {
    if(selling_shares<0){
       next(new Error(`You can't sell a Trade having negative shares, You have provided ${selling_shares}`));
    }
    let trade = await sellTrade({ ticker, selling_shares });

    let { shares, result } = trade;
    let found = await tradeSold.findOne({ticker}) 
    if(found!= undefined){
      console.log(found);
      let updateShare = found.selling_shares + selling_shares;
      await tradeSold.updateOne({ticker}, { selling_shares : updateShare });
      res.send(`After selling ${selling_shares} shares of ${ticker}, You have ${shares} shares left and your cumulative return of the portfolio is ₹${result}`);
      }
      else{
        // console.log('Inside else...')
        const doc_sell = new tradeSold({
          ticker : ticker,
          selling_shares : selling_shares
        });
        await doc_sell.save();
      res.send(`After selling ${selling_shares} shares of ${ticker}, You have ${shares} shares left and your cumulative return of the portfolio is ₹${result}`);
      }

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
  
  let result = await (portfolio_data.map(r => cumulativeReturns(r)));

  result = +(result.reduce((sum, result) => sum + result, 0)).toFixed(2);

  return { shares, result };
};

const cumulativeReturns = (final_value) => {
  // console.log(final_value);
  let { avg_buy_price, shares } = final_value;
  // console.log(avg_buy_price, shares);
  let current_price = 100, sum = 0; //SETTING CURRENT PRICE TO RS 100.

  sum += ((current_price - avg_buy_price) * shares);

  return sum;
};

// ------------------------------------------------FETCHING CUMULATIVE RETURNS------------------------------------------------

//FIXME: Return is -ve
//NOTE:  Return can be -ve
router.get('/cumulative', async (req, res, next) => {

  try {
    
    let portfolio_data = await fetchPortfolio();

    let data = await (portfolio_data.map(r => cumulativeReturns(r)));
    
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
    console.log(id)
    const result = await portfolio.findOneAndDelete({ticker: id});
    console.log(result);
    if(!result){
      throw (new createError(404, "Security Not Found..."));
    }
    console.log(result);
    res.send(`Successfully Deleted ${result} from Portfolio`);
  } catch (error) {
    console.log(error.message);
    if(error instanceof mongoose.CastError){
      next(new createError(400, "Invalid Product Id..."));
      return ;
    }
    next(error);
  }
});
// ------------------------------------------------ PATCH(Updating the trade) ------------------------------------------------
// Going from BOUGHT to SOLD
  router.patch('/update/sell',async (req, res, next) =>{
    try {
      console.log(req.body);
      // let { ticker, sellShare } = req.body;
      let ticker = req.body.ticker;
      let sellShare = req.body.new_shares;
      
      let found = await tradeBought.find({ticker});
      // console.log(found);
      if(sellShare<0){
        return next(new createError(400, `Shares cannot be Negative. You have provided ${sellShare}`));
      }
      if(found[0] === undefined){
        res.status(400).send(`You don't have ${ticker} securities to sell`); 
        throw Error(`You don't have ${ticker} securities to sell`);
      }
      else{
        // res.send(found);
        // console.log(found[0].new_shares);
        let updateShare = found[0].new_shares -  sellShare;
        // console.log(updateShare);
        await tradeBought.updateOne({ticker}, {new_shares : updateShare});
        let sold = await tradeSold.find({ticker});
        if(sold){
              let num_shares = sold[0].selling_shares;
              num_shares+=sellShare
              await tradeSold.updateOne({ticker}, {selling_shares : num_shares});
              res.send(`Successfully Updated Trade of ${ticker} from BUY to SELL`);
        }
        else{
          const updateSellShareDoc = new tradeSold({
            ticker: ticker,
            selling_shares : sellShare
          });
          console.log('Inside else of if')
          await updateSellShareDoc.save();
          res.send(`Successfully Updated Trade of ${ticker} from BUY to SELL`);

        }
      }
    } catch (error) {
      console.log(error.message); 
    }
  });
// Going from SOLD to BOUGHT

  router.patch('/update/buy',async (req, res, next) =>{
    try {
      let ticker= req.body.ticker;
      let  boughtShare  = req.body.selling_shares;
      let found = await tradeSold.find({ticker});
      if(boughtShare<0){
        return next(new createError(400, `Shares cannot be Negative. You have provided ${boughtShare}`));
      }
      if(found[0] === undefined){
        res.status(400).send(`You don't have ${ticker} securities to sell`); 
        throw Error(`You don't have ${ticker} securities to Buy`);
      }
      else{
        
      let updateShare = found[0].selling_shares - boughtShare;

      await tradeSold.updateOne({ticker}, {selling_shares: updateShare});
      let buy = await tradeBought.find({ticker});
      if(buy){
        let numNewShare = buy[0].new_shares; 
        numNewShare+=boughtShare;
        await tradeBought.updateOne({ticker}, {new_shares: numNewShare});
        res.send(`Successfully Updated Trade of ${ticker} from SELL to BUY`);

      }
      else{
        const updateBuyShareDoc = new tradeBought({
          ticker: ticker,
          new_shares : boughtShare
        });
        await updateBuyShareDoc.save();
        console.log('Inside else of if....')
        res.send(`Successfully Updated Trade of ${ticker} from SELL to BUY`);
      } 
      }
    } catch (error) {
      console.log(error.message); 
    }
  });

// ------------------------------------------------  TICKER ------------------------------------------------

  // router.get('/:id',async (req, res, next)=>{
  //   try{
  //     const id = req.params.id;
  //     const tick = await tradeBought.findOne({ticker:id});
  //     res.send(tick);
  //     console.log(tick);
  //   }catch(error){
  //     console.log(error.message);
  //   }
  // });
// module.exports
module.exports = router;
