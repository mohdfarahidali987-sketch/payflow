import "express";
/// just exptend the type of typescript it will not run it tell that now in typescript thre is a property too named as userId

declare global {
    namespace Express {
        interface Request {
            userId: string;
        }
    }
}

export {};