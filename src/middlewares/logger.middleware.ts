

// middlewares.ts
import { RequestHandler } from "express";

export const loggerMiddleware: RequestHandler = (req, res, next) => {
    console.log("Request logged:", req.method, req.path);
    next();
};