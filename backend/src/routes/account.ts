import {Router} from "express"
import {auth} from "../middleware/auth.js"
import {Account} from "../models/account.js";
import mongoose from "mongoose";
import { transferSchema } from "../validations/user.js";
const router=Router();

router.get("/balance", auth, async (req, res) => {

    const account = await Account.findOne({
        userId: req.userId
    });

    return res.json({
        balance: account?.balance
    });

});
router.post("/transfer", auth, async (req, res)=>{

    const result=transferSchema.safeParse(req.body);
    if(!result.success){
        return res.status(400).json({
            massage:"Invalid transfer request"
        })
    }
    const {to, amount}=req.body
    const session= await mongoose.startSession();
    try{
    session.startTransaction();
     const account = await Account.findOne({
    userId: req.userId
      }).session(session);
      if(!account||account.balance<amount){
        await session.abortTransaction();
        return res.status(400).json({
            massage:"Insufficient balance"
        })
      }
      const toAccount =await Account.findOne({
        userId:to
      }).session(session);
      if(!toAccount){
        await session.abortTransaction();
        return res.status(400).json({
            massage:"recier not found"
        })
      }
      await Account.updateOne({
        userId:req.userId

      },
      {
             $inc: {
                  balance: -amount
                }
      }
  
    ).session(session);
    await Account.updateOne({
        userId:to
    },{
        $inc:{
            balance:amount
        }

    }
)

      await session.commitTransaction();
        res.json({
             message: "Transfer successful"
          });
        }
        catch(err){
            await session.abortTransaction();
            return res.status(500).json({
                massage:"transaction failed"
            })

        }
        finally{
            session.endSession();
        }




     
})
export default router