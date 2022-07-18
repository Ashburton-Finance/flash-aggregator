import {
  Connection,
  Keypair, LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction, Signer,
  SystemProgram,
  Transaction, TransactionInstruction,
} from '@solana/web3.js';
import {
  depositObligationCollateralInstruction,
  withdrawObligationCollateralInstruction,
  depositReserveLiquidityInstruction,
  initLendingMarketInstruction,
  initObligationInstruction,
  initReserveInstruction,
  LENDING_MARKET_SIZE,
  LENDING_PROGRAM_ID,
  OBLIGATION_SIZE,
  parseReserve,
  redeemReserveCollateralInstruction,
  refreshObligationInstruction,
  refreshReserveInstruction,
  RESERVE_SIZE,
  ReserveConfig,
  ReserveFees,
  WAD_BigInt,
  parseObligation,
  borrowObligationLiquidityInstruction,
  repayObligationLiquidityInstruction, liquidateObligationInstruction,
} from './src';
import {
  AccountLayout,
  MintLayout,
  Token,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { borrowFlashLoanInstruction } from './src/instructions/borrowFlashLoan';
import { newAccountWithLamports } from './util';

import { Program, BN, IdlAccounts } from "@project-serum/anchor";

import { Flashaggregator } from '../target/types/flashaggregator';
import * as anchor from '@project-serum/anchor';


// ============================================================================= bc class

interface IToken {
  currency: string,
  //mint & accounts
  mint: Token,
  userPk: PublicKey,
  hostPk: PublicKey,
  protocolKp: Keypair,
  protocolFeeKp: Keypair,
  //LP token
  lpMintKp: Keypair,
  lpUserKp: Keypair,
  lpProtocolKp: Keypair
  //pyth,
  pythProductPk: PublicKey,
  pythPricePk: PublicKey,
  //reserve
  reserveKp: Keypair,
}

export class Blockchain {
  connection: Connection;

  FLASH_LOAN_PROGRAM_ID = new PublicKey("4Hz4EjqhCeeHdx2u36NnuWC83tXidzrrwr1858VFJN8s");

  ownerKp: Keypair = null;
  lendingMarketKp: Keypair = new Keypair();
  lendingMarketAuthority: PublicKey;
  obligationKp: Keypair = new Keypair();
  obligationDeposits: PublicKey[] = [];
  obligationBorrows: PublicKey[] = [];

  tokenA: IToken = {
    currency: 'ETH',
    mint: null,
    userPk: null,
    hostPk: null,
    protocolKp: new Keypair(),
    protocolFeeKp: new Keypair(),
    lpMintKp: new Keypair(),
    lpUserKp: new Keypair(),
    lpProtocolKp: new Keypair(),
    pythProductPk: new PublicKey('2ciUuGZiee5macAMeQ7bHGTJtwcYTgnt6jdmQnnKZrfu'),
    pythPricePk: new PublicKey('EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw'),
    reserveKp: new Keypair(),
  };

  tokenB: IToken = {
    currency: 'BTC',
    mint: null,
    userPk: null,
    hostPk: null,
    protocolKp: new Keypair(),
    protocolFeeKp: new Keypair(),
    lpMintKp: new Keypair(),
    lpUserKp: new Keypair(),
    lpProtocolKp: new Keypair(),
    pythProductPk: new PublicKey('3m1y5h2uv7EQL3KaJZehvAJa4yDNvgc5yAdL9KPMKwvk'),
    pythPricePk: new PublicKey('HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J'),
    reserveKp: new Keypair(),
  };

  //these are needed for printing and testing
  metrics = {
    //token A
    tokenAUserBalance: null,
    tokenAHostBalance: null,
    tokenAProtocolBalance: null,
    tokenAProtocolFeeBalance: null,
    tokenALPUserBalance: null,
    tokenALPProtocolBalance: null,
    //token B
    tokenBUserBalance: null,
    tokenBHostBalance: null,
    tokenBProtocolBalance: null,
    tokenBProtocolFeeBalance: null,
    tokenBLPUserBalance: null,
    tokenBLPProtocolBalance: null,
    //obligation
    obligState: null,
    //reserve A
    reserveAState: null,
    //reserve B
    reserveBState: null,
  }

  // --------------------------------------- connection

  async getConnection() {
    const url = 'https://api.devnet.solana.com';
    this.connection = new Connection(url, 'recent');
    const version = await this.connection.getVersion();
    console.log('connection to cluster established:', url, version);
  }

  // --------------------------------------- init lending market

  async initLendingMarket() {
    this.ownerKp = await newAccountWithLamports(this.connection, LAMPORTS_PER_SOL * 10);

    console.log('create & initiate lending market');
    const createLendingMarketAccIx = await this._generateCreateStateAccIx(
      this.lendingMarketKp.publicKey,
      LENDING_MARKET_SIZE,
    );

    const quoteCurrency = Buffer.alloc(32);
    quoteCurrency.write('USD');
    const initLendingMarketIx = initLendingMarketInstruction(
      this.ownerKp.publicKey,
      quoteCurrency,
      this.lendingMarketKp.publicKey,
    );

    await this._prepareAndSendTx(
      [createLendingMarketAccIx, initLendingMarketIx],
      [this.ownerKp, this.lendingMarketKp],
    );
  }

  // ======================================= RESERVE (SUPPLY SIDE)
  // --------------------------------------- init reserve

  async initReserve(token: IToken, mintAmount: number, initAmount: number) {
    console.log(`prepare ${token.currency} accounts`);
    //init'ed client-side
    token.mint = await this._createMintAccount();
    token.userPk = await this._createAndFundUserAccount(token.mint, mintAmount);
    token.hostPk = await this._createAndFundUserAccount(token.mint, 0); //will need later

    //init'ed program-side, hence we only create the raw accounts
    const createProtocolAccIx = await this._generateCreateTokenAccIx(token.protocolKp.publicKey);
    const createProtocolFeeAccIx = await this._generateCreateTokenAccIx(token.protocolFeeKp.publicKey);
    const createLpMintAccIx = await this._generateCreateTokenMintIx(token.lpMintKp.publicKey);
    const createLpUserAccIx = await this._generateCreateTokenAccIx(token.lpUserKp.publicKey);
    const createLpProtocolAccIx = await this._generateCreateTokenAccIx(token.lpProtocolKp.publicKey);

    const ix = [
      createProtocolAccIx,
      createProtocolFeeAccIx,
      createLpMintAccIx,
      createLpUserAccIx,
      createLpProtocolAccIx,
    ];
    const signers = [
      this.ownerKp,
      token.protocolKp,
      token.protocolFeeKp,
      token.lpMintKp,
      token.lpUserKp,
      token.lpProtocolKp,
    ];
    await this._prepareAndSendTx(ix, signers);

    console.log(`create & initiate ${token.currency} reserve`);
    const createReserveAccIx = await this._generateCreateStateAccIx(
      token.reserveKp.publicKey,
      RESERVE_SIZE,
    );
    const reserveConfig = Blockchain._generateStandardReserveConfig();

    //when we FIND the pda, we only pass OUR seed, not the bump seed
    let nonce;
    [this.lendingMarketAuthority, nonce] = await PublicKey.findProgramAddress(
      [this.lendingMarketKp.publicKey.toBuffer()],
      LENDING_PROGRAM_ID,
    );

    const initReserveIx = initReserveInstruction(
      initAmount,
      reserveConfig,
      token.userPk,
      token.lpUserKp.publicKey,
      token.reserveKp.publicKey,
      token.mint.publicKey,
      token.protocolKp.publicKey,
      token.protocolFeeKp.publicKey,
      token.pythProductPk,
      token.pythPricePk,
      token.lpMintKp.publicKey,
      token.lpProtocolKp.publicKey,
      this.lendingMarketKp.publicKey,
      this.lendingMarketAuthority,
      this.ownerKp.publicKey,
      this.ownerKp.publicKey,
    );

    await this._prepareAndSendTx(
      [createReserveAccIx, initReserveIx],
      [this.ownerKp, token.reserveKp],
    );
  }

  // --------------------------------------- deposit liquidity

  async depositReserveLiquidity(token: IToken, depositLiquidityAmount: number) {
    console.log(`deposit liquidity for ${token.currency}`);
    const refreshReserveIx = refreshReserveInstruction(
      token.reserveKp.publicKey,
      token.pythPricePk,
    );
    const depositReserveLiqIx = depositReserveLiquidityInstruction(
      depositLiquidityAmount,
      token.userPk,
      token.lpUserKp.publicKey,
      token.reserveKp.publicKey,
      token.protocolKp.publicKey,
      token.lpMintKp.publicKey,
      this.lendingMarketKp.publicKey,
      this.lendingMarketAuthority,
      this.ownerKp.publicKey,
    );
    await this._prepareAndSendTx(
      [refreshReserveIx, depositReserveLiqIx],
      [this.ownerKp],
    );
  }

  // --------------------------------------- redeem collateral

  async redeemReserveCollateral(token: IToken, redeemCollateralAmount: number) {
    console.log(`redeem collateral for ${token.currency}`);
    const refreshReserveIx = refreshReserveInstruction(
      token.reserveKp.publicKey,
      token.pythPricePk,
    );
    const redeemReserveColIx = redeemReserveCollateralInstruction(
      redeemCollateralAmount,
      token.lpUserKp.publicKey,
      token.userPk,
      token.reserveKp.publicKey,
      token.lpMintKp.publicKey,
      token.protocolKp.publicKey,
      this.lendingMarketKp.publicKey,
      this.lendingMarketAuthority,
      this.ownerKp.publicKey,
    );
    await this._prepareAndSendTx(
      [refreshReserveIx, redeemReserveColIx],
      [this.ownerKp],
    );
  }

  // ======================================= OBLIGATION (BORROW SIDE)
  // --------------------------------------- init obligation

  async initObligation() {
    console.log('create & initiate obligation');
    const createObligAccIx = await this._generateCreateStateAccIx(
      this.obligationKp.publicKey,
      OBLIGATION_SIZE,
    );
    const initObligIx = initObligationInstruction(
      this.obligationKp.publicKey,
      this.lendingMarketKp.publicKey,
      this.ownerKp.publicKey,
    );
    await this._prepareAndSendTx(
      [createObligAccIx, initObligIx],
      [this.ownerKp, this.obligationKp],
    );
  }

  // --------------------------------------- deposit collateral into obligation

  async depositObligationCollateral(token: IToken, depositCollateralAmount: number) {
    console.log(`deposit ${token.currency} collateral into obligation`);
    await this._refreshObligDepositsAndBorrows();
    const refreshReserveIx = refreshReserveInstruction(
      token.reserveKp.publicKey,
      token.pythPricePk,
    );
    const refreshObligIx = refreshObligationInstruction(
      this.obligationKp.publicKey,
      this.obligationDeposits,
      this.obligationBorrows,
    );
    const depositObligColIx = depositObligationCollateralInstruction(
      depositCollateralAmount,
      token.lpUserKp.publicKey,
      token.lpProtocolKp.publicKey,
      token.reserveKp.publicKey,
      this.obligationKp.publicKey,
      this.lendingMarketKp.publicKey,
      this.ownerKp.publicKey,
      this.ownerKp.publicKey,
    );
    await this._prepareAndSendTx(
      [refreshReserveIx, refreshObligIx, depositObligColIx],
      [this.ownerKp],
    );
  }

  // --------------------------------------- refresh oblig
  async refreshOblig() {
    await this._refreshObligDepositsAndBorrows();
    const refreshReserveAIx = refreshReserveInstruction(
      this.tokenA.reserveKp.publicKey,
      this.tokenA.pythPricePk,
    );
    const refreshReserveBIx = refreshReserveInstruction(
      this.tokenB.reserveKp.publicKey,
      this.tokenB.pythPricePk,
    );
    const refreshObligIx = refreshObligationInstruction(
      this.obligationKp.publicKey,
      this.obligationDeposits,
      this.obligationBorrows,
    );
    await this._prepareAndSendTx(
      [refreshReserveAIx, refreshReserveBIx, refreshObligIx],
      [this.ownerKp],
    );
  }

  // --------------------------------------- withdraw obligation collateral

  async withdrawObligationCollateral(token: IToken, withdrawCollateralAmount: number) {
    console.log(`withdraw ${token.currency} collateral from obligatin`);
    await this._refreshObligDepositsAndBorrows();
    const refreshReserveIx = refreshReserveInstruction(
      token.reserveKp.publicKey,
      token.pythPricePk,
    );
    const refreshObligIx = refreshObligationInstruction(
      this.obligationKp.publicKey,
      this.obligationDeposits,
      this.obligationBorrows,
    );
    const withdrawObligColIx = withdrawObligationCollateralInstruction(
      withdrawCollateralAmount,
      token.lpProtocolKp.publicKey,
      token.lpUserKp.publicKey,
      token.reserveKp.publicKey,
      this.obligationKp.publicKey,
      this.lendingMarketKp.publicKey,
      this.lendingMarketAuthority,
      this.ownerKp.publicKey,
    );
    await this._prepareAndSendTx(
      [refreshReserveIx, refreshObligIx, withdrawObligColIx],
      [this.ownerKp],
    );
  }

  // --------------------------------------- borrow obligation liquidity

  async borrowObligationLiquidity(liquidityToken: IToken, collateralToken: IToken, borrowLiquidityAmount: number) {
    console.log(`borrow ${liquidityToken.currency} liquidity against ${collateralToken.currency} collateral`);
    await this._refreshObligDepositsAndBorrows();
    const refreshReserveLiqIx = refreshReserveInstruction(
      liquidityToken.reserveKp.publicKey,
      liquidityToken.pythPricePk,
    );
    const refreshReserveColIx = refreshReserveInstruction(
      collateralToken.reserveKp.publicKey,
      collateralToken.pythPricePk,
    );
    const refreshObligIx = refreshObligationInstruction(
      this.obligationKp.publicKey,
      this.obligationDeposits,
      this.obligationBorrows,
    );
    const borrowObligLiqIx = borrowObligationLiquidityInstruction(
      borrowLiquidityAmount,
      liquidityToken.protocolKp.publicKey,
      liquidityToken.userPk,
      liquidityToken.reserveKp.publicKey,
      liquidityToken.protocolFeeKp.publicKey,
      this.obligationKp.publicKey,
      this.lendingMarketKp.publicKey,
      this.lendingMarketAuthority,
      this.ownerKp.publicKey,
      liquidityToken.hostPk,
    );
    await this._prepareAndSendTx(
      [refreshReserveLiqIx, refreshReserveColIx, refreshObligIx, borrowObligLiqIx],
      [this.ownerKp],
    );
  }

  // --------------------------------------- repay obligation liquidity

  async repayObligationLiquidity(liquidityToken: IToken, collateralToken: IToken, repayLiquidityAmount: number) {
    console.log(`repay ${liquidityToken.currency} borrowed liquidity`);
    await this._refreshObligDepositsAndBorrows();
    const refreshReserveLiqIx = refreshReserveInstruction(
      liquidityToken.reserveKp.publicKey,
      liquidityToken.pythPricePk,
    );
    const refreshReserveColIx = refreshReserveInstruction(
      collateralToken.reserveKp.publicKey,
      collateralToken.pythPricePk,
    );
    const refreshObligIx = refreshObligationInstruction(
      this.obligationKp.publicKey,
      this.obligationDeposits,
      this.obligationBorrows,
    );
    const repayObligLiqIx = repayObligationLiquidityInstruction(
      repayLiquidityAmount,
      liquidityToken.userPk,
      liquidityToken.protocolKp.publicKey,
      liquidityToken.reserveKp.publicKey,
      this.obligationKp.publicKey,
      this.lendingMarketKp.publicKey,
      this.ownerKp.publicKey,
    );
    await this._prepareAndSendTx(
      [refreshReserveLiqIx, refreshReserveColIx, refreshObligIx, repayObligLiqIx],
      [this.ownerKp],
    );
  }

  // --------------------------------------- liquidate a position

  async liquidateObligation(liquidityToken: IToken, collateralToken: IToken, liquidityAmount: number) {
    console.log(`liquidate ${liquidityToken.currency} position`);
    await this._refreshObligDepositsAndBorrows();
    const refreshReserveLiqIx = refreshReserveInstruction(
      liquidityToken.reserveKp.publicKey,
      liquidityToken.pythPricePk,
    );
    const refreshReserveColIx = refreshReserveInstruction(
      collateralToken.reserveKp.publicKey,
      collateralToken.pythPricePk,
    );
    const refreshObligIx = refreshObligationInstruction(
      this.obligationKp.publicKey,
      this.obligationDeposits,
      this.obligationBorrows,
    );
    const liquidateIx = liquidateObligationInstruction(
      liquidityAmount,
      liquidityToken.userPk,
      collateralToken.lpUserKp.publicKey, //get back LP tokens
      liquidityToken.reserveKp.publicKey,
      liquidityToken.protocolKp.publicKey,
      collateralToken.reserveKp.publicKey,
      collateralToken.lpProtocolKp.publicKey, //get back LP tokens
      this.obligationKp.publicKey,
      this.lendingMarketKp.publicKey,
      this.lendingMarketAuthority,
      this.ownerKp.publicKey,
    );
    await this._prepareAndSendTx(
      [refreshReserveLiqIx, refreshReserveColIx, refreshObligIx, liquidateIx],
      [this.ownerKp],
    );
  }

  // --------------------------------------- flash loan

  async borrowFlashLoan(token: IToken, liquidityAmount: number) {
    console.log(`borrow a flash loan for amount ${liquidityAmount}`);
    const refreshReserveIx = refreshReserveInstruction(
      token.reserveKp.publicKey,
      token.pythPricePk,
    );
    await this._prepareAndSendTx(
      [refreshReserveIx],
      [this.ownerKp],
    );

    /**
     * Take flash loan using the CPI
     */
    const program = anchor.workspace.Flashaggregator as Program<Flashaggregator>;
    const tx = await program.rpc.flashLoanWrapper(
      {
        accounts: {
          lendingProgram: LENDING_PROGRAM_ID,
          sourceLiquidity: token.protocolKp.publicKey,
          destinationLiquidity: token.userPk,
          reserve: token.reserveKp.publicKey,
          flashLoanFeeReceiver: token.protocolFeeKp.publicKey,
          hostFeeReceiver: token.hostPk,
          lendingMarket: this.lendingMarketKp.publicKey,
          derivedLendingMarketAuthority: this.lendingMarketAuthority,
          tokenProgramId: TOKEN_PROGRAM_ID,
          flaskLoanReceiver: this.FLASH_LOAN_PROGRAM_ID,
          transferAuthority: this.ownerKp.publicKey,
        },
        signers: [this.ownerKp],
      },

    );
    console.log("Your transaction signature", tx);
  }

  // --------------------------------------- helpers

  async _prepareAndSendTx(instructions: TransactionInstruction[], signers: Signer[]) {
    const tx = new Transaction().add(...instructions);
    const sig = await sendAndConfirmTransaction(this.connection, tx, signers);
    console.log(sig);
  }

  async _createMintAccount(): Promise<Token> {
    return Token.createMint(
      this.connection,
      this.ownerKp,
      this.ownerKp.publicKey,
      null,
      0,
      TOKEN_PROGRAM_ID,
    );
  }

  async _createAndFundUserAccount(mint: Token, mintAmount: number): Promise<PublicKey> {
    const tokenUserPk = await mint.createAccount(this.ownerKp.publicKey);
    await mint.mintTo(tokenUserPk, this.ownerKp.publicKey, [], mintAmount);
    return tokenUserPk;
  }

  async _generateCreateTokenAccIx(newAccountPubkey: PublicKey): Promise<TransactionInstruction> {
    return SystemProgram.createAccount({
      programId: TOKEN_PROGRAM_ID,
      fromPubkey: this.ownerKp.publicKey,
      newAccountPubkey,
      space: AccountLayout.span,
      lamports: await this.connection.getMinimumBalanceForRentExemption(AccountLayout.span),
    });
  }

  async _generateCreateTokenMintIx(newAccountPubkey: PublicKey): Promise<TransactionInstruction> {
    return SystemProgram.createAccount({
      programId: TOKEN_PROGRAM_ID,
      fromPubkey: this.ownerKp.publicKey,
      newAccountPubkey,
      space: MintLayout.span,
      lamports: await this.connection.getMinimumBalanceForRentExemption(MintLayout.span),
    });
  }

  async _generateCreateStateAccIx(newAccountPubkey: PublicKey, space: number): Promise<TransactionInstruction> {
    return SystemProgram.createAccount({
      programId: LENDING_PROGRAM_ID,
      fromPubkey: this.ownerKp.publicKey,
      newAccountPubkey,
      space,
      lamports: await this.connection.getMinimumBalanceForRentExemption(space),
    });
  }

  static _generateStandardReserveConfig(): ReserveConfig {
    const reserveFees: ReserveFees = {
      // @ts-ignore
      borrowFeeWad: WAD_BigInt / 20n,
      // @ts-ignore
      flashLoanFeeWad: WAD_BigInt / 20n,
      hostFeePercentage: 20,
    };
    return {
      optimalUtilizationRate: 80,
      loanToValueRatio: 50,
      liquidationBonus: 3,
      liquidationThreshold: 80,
      minBorrowRate: 2,
      optimalBorrowRate: 8,
      maxBorrowRate: 15,
      fees: reserveFees,
    };
  }

  async _refreshObligDepositsAndBorrows() {
    const obligInfo = await this.connection.getAccountInfo(this.obligationKp.publicKey);
    const obligState = parseObligation(this.obligationKp.publicKey, obligInfo);
    this.obligationDeposits = obligState.data.deposits.map(d => d.depositReserve);
    this.obligationBorrows = obligState.data.borrows.map(d => d.borrowReserve);
  }

  async calcAndPrintMetrics() {
    console.log('// ---------------------------------------');
    // --------------------------------------- A token
    this.metrics.tokenAUserBalance = await this.connection.getTokenAccountBalance(this.tokenA.userPk);
    this.metrics.tokenAHostBalance = await this.connection.getTokenAccountBalance(this.tokenA.hostPk);
    this.metrics.tokenAProtocolBalance = await this.connection.getTokenAccountBalance(this.tokenA.protocolKp.publicKey);
    this.metrics.tokenAProtocolFeeBalance = await this.connection.getTokenAccountBalance(this.tokenA.protocolFeeKp.publicKey);
    this.metrics.tokenALPUserBalance = await this.connection.getTokenAccountBalance(this.tokenA.lpUserKp.publicKey);
    this.metrics.tokenALPProtocolBalance = await this.connection.getTokenAccountBalance(this.tokenA.lpProtocolKp.publicKey);
    console.log(`A token (${this.tokenA.currency}) balances:`);
    console.log(`  user account (${this.tokenA.userPk.toBase58()}):`, this.metrics.tokenAUserBalance.value.uiAmount);
    console.log(`  host account (${this.tokenA.hostPk.toBase58()}):`, this.metrics.tokenAHostBalance.value.uiAmount);
    console.log(`  protocol account (${this.tokenA.protocolKp.publicKey.toBase58()}):`, this.metrics.tokenAProtocolBalance.value.uiAmount);
    console.log(`  protocol fee account (${this.tokenA.protocolFeeKp.publicKey.toBase58()}):`, this.metrics.tokenAProtocolFeeBalance.value.uiAmount);
    console.log(`  user LP account (${this.tokenA.lpUserKp.publicKey.toBase58()}):`, this.metrics.tokenALPUserBalance.value.uiAmount);
    console.log(`  protocol LP account (${this.tokenA.lpProtocolKp.publicKey.toBase58()}):`, this.metrics.tokenALPProtocolBalance.value.uiAmount);

    // --------------------------------------- obligation state
    const obligInfo = await this.connection.getAccountInfo(this.obligationKp.publicKey);
    this.metrics.obligState = parseObligation(this.obligationKp.publicKey, obligInfo);
    console.log('Obligation state:');
    console.log('  total deposited value ($):', this.metrics.obligState.data.depositedValue.toNumber());
    console.log('  total borrowed value ($):', this.metrics.obligState.data.borrowedValue.toNumber());
    console.log('  allowed to borrow value ($):', this.metrics.obligState.data.allowedBorrowValue.toNumber());
    console.log('  unhealthy borrow value ($):', this.metrics.obligState.data.unhealthyBorrowValue.toNumber());

    // --------------------------------------- A reserve state
    const reserveAInfo = await this.connection.getAccountInfo(this.tokenA.reserveKp.publicKey);
    this.metrics.reserveAState = parseReserve(this.tokenA.reserveKp.publicKey, reserveAInfo);
    console.log(`A reserve (${this.tokenA.currency}) state:`);
    console.log('  available liquidity', this.metrics.reserveAState.data.liquidity.availableAmount);
    console.log('  borrowed liquidity', this.metrics.reserveAState.data.liquidity.borrowedAmountWads.toString());
    console.log('  cumulative borrow rate', this.metrics.reserveAState.data.liquidity.cumulativeBorrowRateWads.toString());
    console.log('  market price', this.metrics.reserveAState.data.liquidity.marketPrice.toString());


  }
}
