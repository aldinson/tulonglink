import type { NextFunction, Request, Response } from "express";

/** Express 4 does not forward rejected promises to error middleware on its own. */
export function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res).catch(next);
  };
}
