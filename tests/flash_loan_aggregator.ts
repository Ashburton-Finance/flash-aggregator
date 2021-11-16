import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Flashaggregator } from '../target/types/flashaggregator';

describe('flashaggregator', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Flashaggregator as Program<Flashaggregator>;

  it('maxflashloan', async () => {
    // Add your test here.
    const tx = await program.rpc.maxflashloan({});
    console.log("Your transaction signature", tx);
  });


  it('initialise and check max flash loan', async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);
  });
});
