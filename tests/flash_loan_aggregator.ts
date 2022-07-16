import * as anchor from '@project-serum/anchor';
import { Program, BN, IdlAccounts } from "@project-serum/anchor";
import { Flashaggregator } from '../target/types/flashaggregator';
import { assert, expect, use as chaiUse } from "chai";
import {
  AccountLayout,
  MintLayout,
  Token,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';


import { Blockchain } from './blockchain';


// Need the system program, will talk about this soon.
const { SystemProgram } = anchor.web3;

describe('flashaggregator', () => {

  console.log("🚀 Starting test...")

  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);



  const program = anchor.workspace.Flashaggregator as Program<Flashaggregator>;
  // Create an account keypair for our program to use.
  const baseAccount = anchor.web3.Keypair.generate();



  // // Provide some sols for the program to initilise space
  // provider.connection.requestAirdrop(baseAccount.publicKey, 5000000000);

  it.skip('get maxflashloan run test', async () => {
    // Not implemented yet
    const tx = await program.rpc.maxflashloan({});
    console.log("Your transaction signature", tx);

  });

  it('Borrow flash loan from Solend on behalf of caller', async () => {

    const bc = new Blockchain();
    await bc.getConnection();
    await bc.initLendingMarket();
    await bc.initReserve(bc.tokenA, 100, 40);
    await bc.initObligation();
    await bc.calcAndPrintMetrics();

    // check user lost tokens
    assert.equal(bc.metrics.tokenAUserBalance.value.uiAmount, 100 - 40);
    // check protocol gained tokens
    assert.equal(bc.metrics.tokenAProtocolBalance.value.uiAmount, 40);
    // check user was issued LP tokens in return
    assert.equal(bc.metrics.tokenALPUserBalance.value.uiAmount, 40);
    // check total liquidity available
    // @ts-ignore
    assert.equal(bc.metrics.reserveAState.data.liquidity.availableAmount, 40n);

    // --------------------------------------- depositing / withdrawing liquidity

    await bc.depositReserveLiquidity(bc.tokenA, 20);
    await bc.redeemReserveCollateral(bc.tokenA, 10);
    await bc.calcAndPrintMetrics();

    // check changes in balances add up
    assert.equal(bc.metrics.tokenAUserBalance.value.uiAmount, 100 - 40 - 20 + 10);
    assert.equal(bc.metrics.tokenAProtocolBalance.value.uiAmount, 40 + 20 - 10);


    // --------------------------------------- flash loan

    const oldBorrowedAmount = bc.metrics.obligState.data.borrowedValue.toNumber();
    const oldProtocolFee = bc.metrics.tokenAProtocolFeeBalance.value.uiAmount;
    const oldHostFee = bc.metrics.tokenAHostBalance.value.uiAmount;

    await bc.borrowFlashLoan(bc.tokenA, 10);
    await bc.calcAndPrintMetrics();

    //check that fees went up, but the borrowed amount stayed the same
    assert.equal(bc.metrics.obligState.data.borrowedValue.toNumber(), oldBorrowedAmount);
    assert.isAbove(bc.metrics.tokenAProtocolFeeBalance.value.uiAmount, oldProtocolFee);
    assert.isAbove(bc.metrics.tokenAHostBalance.value.uiAmount, oldHostFee);

    console.log('All tests passed!');
  });


});
