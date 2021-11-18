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

  const Amount = 500;

  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);



  const program = anchor.workspace.Flashaggregator as Program<Flashaggregator>;
  // Create an account keypair for our program to use.
  const baseAccount = anchor.web3.Keypair.generate();



  // Provide some sols for the program to initilise space
  provider.connection.requestAirdrop(baseAccount.publicKey, 5000000000);

  it('initialise and check current flash fee', async () => {
    // Add your test here.

    // Call start_stuff_off, pass it the params it needs!
    let tx = await program.rpc.initialize({
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [baseAccount],
    });

    console.log("📝 Your transaction signature", tx);


    // Fetch data from the account
    let account = await program.account.baseAccount.fetch(baseAccount.publicKey);

    const current_flash_fee = account.flashFee;
    console.log('👀 Current flash fee', current_flash_fee.toString());

    // TODO: do we do a string comparison or integer comparison for a test like this?
    // Are there rounding errors to watch out for?
    assert.equal(23, current_flash_fee);

  });

  it('maxflashloan run test', async () => {
    // Add your test here.
    const tx = await program.rpc.maxflashloan({});
    console.log("Your transaction signature", tx);
  });

  it('old @ilmoi run test', async () => {

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


  it('take flash loan run test', async () => {

    // ref: use the escrow account as example for building proper request: https://github.com/project-serum/anchor/blob/master/tests/escrow/tests/escrow.ts
    // Use this api as reference: https://github.com/ilmoi/token_lending_cli/blob/master/js/cli/main.ts


    // Reference values
    //
    // borrow a flash loan for amount 10
    // liquidityAmount (10)
    // token.protocolKp.publicKey (AymV6E6B9gPGvZAUAB9oGjMX3vMfkT1xc2H1hhyvMX3s)
    // token.userPk (4GHHy8SPhbWYRdn3pWZ9cicawUE7he7L2HbPkyE2qtGs)
    // token.reserveKp.publicKey (BJm1JzdcwBmD1XgN4pSUHW1FPDqxrGSjs65p4DQTAsPH)
    // token.protocolFeeKp.publicKey (48bKZ4DLy9nHPJsgSseiw8w8DQK4ULTu4Pdr1s1aGu5x)
    // token.hostPk (BBNqBhrMJmixfzZie21Li3p7SJFUgw9RYqhDZ8vkJAKi)
    // this.lendingMarketKp.publicKey (EF2b7tUe8SWAidRLwbCWtnSrfZkBqPZ3GxrCg1Rnu2FN)
    // this.lendingMarketAuthority (2G66s9pmDwrgKzrbfiK485uUoN6nHNigZmcbC7NMfAvM)
    // this.FLASH_LOAN_PROGRAM_ID (Eiy9gzpAcjQiav3q4QQNLFxRqCVFXiPboVwLSDS19UFc)
    // this.ownerKp.publicKey (CvUrTtQsprpvM2aX9XUQU1ZiHpvHHHC6NParVpny9JkE)
    // PrUWRhjv41oBB4kD5AQmjq3sQg6amT8286R7gCHje6NJsWW8ZQjfswoeahtQLBiprWXgmMrkhLTn69PjKUN4kDP
    // // ---------------------------------------
    // A token (ETH) balances:
    //   user account (4GHHy8SPhbWYRdn3pWZ9cicawUE7he7L2HbPkyE2qtGs): 48
    //   host account (BBNqBhrMJmixfzZie21Li3p7SJFUgw9RYqhDZ8vkJAKi): 1
    //   protocol account (AymV6E6B9gPGvZAUAB9oGjMX3vMfkT1xc2H1hhyvMX3s): 50
    //   protocol fee account (48bKZ4DLy9nHPJsgSseiw8w8DQK4ULTu4Pdr1s1aGu5x): 1
    //   user LP account (D75wf2b4W5hJH52feAGWwx33AJSb5r5H2oUN9JAXfDsJ): 50
    //   protocol LP account (BZvqsZrHK1TBhmRu1DzPjaUXgcs8N2U3JCj3hS8mEpZ4): 0
    // B token (BTC) balances:
    //   user account (65FCP1s4gLvg5USSR4JFcvyYWtJPLGTwg4ij7frjYAY6): 5
    //   host account (3P1Tja2rmUJQi111uMaW9F3doQvoQLmJ8RBA6FhTzNPE): 0
    //   protocol account (8WpDzZtZ92amz1e51fQo4yYAMobErnLyH1jQh81DUY8q): 5
    //   protocol fee account (6Ds1aR8tJfmQcoft85pueCM77JsJrZZEw9bpSBzmxaVh): 0
    //   user LP account (9NAdBs6KLT95i4BYTxmPQJaru6ke7Rih59oahNjrwJZT): 5
    //   protocol LP account (AHwuiTSTEc4ocTTKWpk9JL5bmnVhnLcfoBSDrBAAkV6N): 0
    // Obligation state:
    //   total deposited value ($): 0
    //   total borrowed value ($): 0
    //   allowed to borrow value ($): 0
    //   unhealthy borrow value ($): 0
    // A reserve (ETH) state:
    //   available liquidity 50n
    //   borrowed liquidity 0
    //   cumulative borrow rate 1.000000014269406443
    //   market price 4183.6181
    // B reserve (BTC) state:
    //   available liquidity 5n
    //   borrowed liquidity 0
    //   cumulative borrow rate 1.000000005390664633
    //   market price 59224.608
    // // ---------------------------------------


    // Add your test here.
    let FLASH_LOAN_PROGRAM_ID = new anchor.web3.PublicKey("4Hz4EjqhCeeHdx2u36NnuWC83tXidzrrwr1858VFJN8s");

    console.log(`baseAccount.publicKey (${baseAccount.publicKey})`);

    const tx = await program.rpc.flashLoanWrapper(
      {
        accounts: {
          lendingProgram: new anchor.web3.PublicKey("8qdJZwaeDUPFGdbriVhhHhyNPFvE8tYjvYL7pBWS9pmM"),//
          sourceLiquidity: new anchor.web3.PublicKey("AymV6E6B9gPGvZAUAB9oGjMX3vMfkT1xc2H1hhyvMX3s"),//
          destinationLiquidity: new anchor.web3.PublicKey("4GHHy8SPhbWYRdn3pWZ9cicawUE7he7L2HbPkyE2qtGs"),//
          reserve: new anchor.web3.PublicKey("BJm1JzdcwBmD1XgN4pSUHW1FPDqxrGSjs65p4DQTAsPH"),//
          flashLoanFeeReceiver: new anchor.web3.PublicKey("48bKZ4DLy9nHPJsgSseiw8w8DQK4ULTu4Pdr1s1aGu5x"),
          hostFeeReceiver: new anchor.web3.PublicKey("BBNqBhrMJmixfzZie21Li3p7SJFUgw9RYqhDZ8vkJAKi"),
          lendingMarket: new anchor.web3.PublicKey("EF2b7tUe8SWAidRLwbCWtnSrfZkBqPZ3GxrCg1Rnu2FN"),
          derivedLendingMarketAuthority: new anchor.web3.PublicKey("2G66s9pmDwrgKzrbfiK485uUoN6nHNigZmcbC7NMfAvM"),
          tokenProgramId: new anchor.web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),//
          flaskLoanReceiver: FLASH_LOAN_PROGRAM_ID,//
          transferAuthority: baseAccount.publicKey,//
        },
        signers: [baseAccount],
      },

    );
    console.log("Your transaction signature", tx);
  });


});
