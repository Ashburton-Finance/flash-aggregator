import { PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';

export const LENDING_PROGRAM_ID = new PublicKey('8qdJZwaeDUPFGdbriVhhHhyNPFvE8tYjvYL7pBWS9pmM');

/** @internal */
export const ORACLE_PROGRAM_ID = new PublicKey('gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s');

/** @internal */
export const WAD = new BigNumber('1e+18');

/** @internal */
export const WAD_BigInt = BigInt(WAD.toString());
