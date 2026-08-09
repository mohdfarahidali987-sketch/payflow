import { Router } from "express";
import {signupSchema,signinSchema} from "../validations/user.js"
import { User } from "../models/user.js";
import bcrypt from "bcrypt";
import { Account } from "../models/account.js";
import jwt from "jsonwebtoken"
import {auth} from "../middleware/auth.js"
 
 

const router = Router();

// Signup
router.post("/signup", async (req, res) => {
    const result= await signupSchema.safeParse(req.body)
    if(!result.success){
        return res.status(400).json({
            massage:"Incorrect inputs"
        })
    }
   
    const existingUser=await User.findOne({
        username:req.body.username
    })
    if(existingUser){
        return res.status(409).json({
            massage:"user already exist"
        })
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user=  await User.create({
        firstName:req.body.firstName,
        lastName:req.body.lastName,
        username:req.body.username,
        password:hashedPassword


    });
    await Account.create({
        userId:user._id,
        balance:10000
    });
   const token = jwt.sign(
    {
        userId: user._id
    },
    process.env.JWT_SECRET!,
     {
        expiresIn: "7d"
    }
);
    return res.status(201).json({
    message: "User created successfully",
    token
});
     
     

   
});

// Signin
router.post("/signin", async (req, res) => {

    const result= await signinSchema.safeParse(req.body);
    if(!result.success){
        return res.status(411).json({
            massage:"inCorrecet Input"
        })
    }
    const user = await User.findOne({
    username: req.body.username
});
    if(!user){
        return res.status(411).json({
            massage:"user is not found"
        })
    }
    const isMatch = await bcrypt.compare(
    req.body.password,
    user.password!
);
if(!isMatch){
    return res.status(400).json({
        massage:"incorrect password"
    })
}     
      const token = jwt.sign(
    {
        userId: user._id
    },
    process.env.JWT_SECRET!,
      
);
  return res.status(200).json({
    massage:"sign in successfully ",
    token
  })
         
 
});

// Search users
router.get("/bulk",auth,  async (req, res) => {


     const filter= req.query.filter as string


     const user=await User.find(
        {
            _id:{
                $ne: req.userId
            },
            $or:[
                {
                    firstName:{
                        $regex:filter,
                        $options:"i"
                    }

                },
                {
                    lastName:{
                        $regex:filter,
                        $options:"i"
                    }
                }

            ]    
        }, 
           {
            firstName:1,
            lastName:1,
            _id:1

           });
           return res.json({
            user
           })
    
});

router.get("/me", auth, async (req, res) => {
    try {

        const user = await User.findById(req.userId).select(
            "firstName lastName username"
        );

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.json(user);

    } catch (err) {
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

export default router;