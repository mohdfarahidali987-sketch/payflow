import {Request, Response, NextFunction} from "express"
import jwt from "jsonwebtoken"
 

export function auth(
    req:Request,
    res:Response,
    next:NextFunction
)
{
    const authHeader=req.headers.authorization;
    if(!authHeader){
        return res.status(401).json({
            massage:"authorization missing"
        })
    }
    const token = authHeader.split(" ")[1]!;
  try{
    
       const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET!
    ) as jwt.JwtPayload;
      console.log(decoded)
     
     req.userId=decoded.userId;
     
      
      next();
       
  }
  catch{
    return res.status(401).json({
        massage:"Invalid token"
    })
  }
     
}
