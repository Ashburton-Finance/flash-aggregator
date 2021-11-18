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



  it('take flash loan run test', async () => {

    // ref: use the escrow account as example for building proper request: https://github.com/project-serum/anchor/blob/master/tests/escrow/tests/escrow.ts
    // Use this api as reference: https://github.com/ilmoi/token_lending_cli/blob/master/js/cli/main.ts


    // Add your test here.
    const tx = await program.rpc.flashLoanWrapper(

      {
      }
    );
    console.log("Your transaction signature", tx);
  });


});
