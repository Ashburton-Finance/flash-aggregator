import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { FlashLoanAggregator } from '../target/types/flash_loan_aggregator';

describe('flash_loan_aggregator', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.FlashLoanAggregator as Program<FlashLoanAggregator>;

  it('maxflashloan', async () => {
    // Add your test here.
    const tx = await program.rpc.maxflashloan({});
    console.log("Your transaction signature", tx);
  });
});
