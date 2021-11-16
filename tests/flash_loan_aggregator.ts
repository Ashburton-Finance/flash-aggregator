import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Flashaggregator } from '../target/types/flashaggregator';
import { assert, expect, use as chaiUse } from "chai";

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

  it('maxflashloan', async () => {
    // Add your test here.
    const tx = await program.rpc.maxflashloan({});
    console.log("Your transaction signature", tx);
  });



});
