/**
 * We use a EIP-3156 style interface to borrow via this program. Refer to EIP-3234 for more
 * ideas for batch flash loans
 */
pub mod cpi;

use anchor_lang::prelude::*;
use solana_program::entrypoint::ProgramResult;

declare_id!("BnN9NvW3EBScQpxvVa6yVBSjWhiu7XamZbLPVuyY9WnQ");

#[program]
pub mod flashaggregator {
    use super::*;
    use cpi::{flash_loan, FlashLoan};

    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        Ok(())
    }

    /**
     * @dev The amount of currency available to be lent.
     * @param token The loan currency.
     * @return The amount of `token` that can be borrowed.
     */
    pub fn maxflashloan(ctx: Context<MaxFlashLoan>) -> ProgramResult {
        unimplemented!("Get Max flash loan not implemented");
    }

    /**
     * Take a flash loan on behalf of the caller, drawing from Solend, Port Finance, starting with the cheapest flash loan fee
     * until the requested amount has been borrowed. Then pass it to the caller's account.
     */
    pub fn flash_loan_wrapper<'info>(ctx: Context<FlashLoanWrapper>) -> ProgramResult {
        // ref: https://github.com/solana-labs/solana-program-library/blob/master/token-lending/program/tests/flash_loan.rs

        // take a flash loan
        let cpi_accounts = FlashLoan {
            lending_program: ctx.accounts.lending_program.clone(),
            source_liquidity: ctx.accounts.source_liquidity.to_account_info().clone(),
            destination_liquidity: ctx.accounts.destination_liquidity.clone(),
            reserve: ctx.accounts.reserve.clone(),
            flash_loan_fee_receiver: ctx.accounts.flash_loan_fee_receiver.clone(),
            host_fee_receiver: ctx.accounts.host_fee_receiver.clone(),
            lending_market: ctx.accounts.lending_market.clone(),
            derived_lending_market_authority: ctx.accounts.derived_lending_market_authority.clone(),
            token_program_id: ctx.accounts.token_program_id.clone(),
            flask_loan_receiver: ctx.accounts.flask_loan_receiver.clone(),
            transfer_authority: ctx.accounts.transfer_authority.clone(),
        };

        let (_, seed) = Pubkey::find_program_address(
            &[&ctx.accounts.flask_loan_receiver.key.to_bytes()], // TODO: find if its safe to use this key for the seed
            &ctx.program_id,
        );
        let seeds = &[ctx.accounts.flask_loan_receiver.key.as_ref(), &[seed]];
        let signer = &[&seeds[..]];

        let cpi_ctx =
            CpiContext::new_with_signer(ctx.accounts.lending_program.clone(), cpi_accounts, signer);

        flash_loan(cpi_ctx, 5)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct FlashLoanWrapper<'info> {
    // Lending program
    /// CHECK:
    pub lending_program: AccountInfo<'info>,
    // Source liquidity token account
    #[account(mut)]
    /// CHECK:
    pub source_liquidity: AccountInfo<'info>,
    // Destination liquidity token account - same mint as source liquidity
    #[account(mut)]
    /// CHECK:
    pub destination_liquidity: AccountInfo<'info>,
    // Reserve account
    #[account(mut)]
    /// CHECK:
    pub reserve: AccountInfo<'info>,
    // Flash loan fee receiver account
    #[account(mut)]
    /// CHECK:
    pub flash_loan_fee_receiver: AccountInfo<'info>,
    // Host fee receiver
    #[account(mut)]
    /// CHECK:
    pub host_fee_receiver: AccountInfo<'info>,
    // Lending market account
    /// CHECK:
    pub lending_market: AccountInfo<'info>,
    // Derived lending market authority - PDA
    /// CHECK:
    pub derived_lending_market_authority: AccountInfo<'info>,
    // Token program ID
    /// CHECK:
    pub token_program_id: AccountInfo<'info>,
    // Flash loan program receiver ID
    /// CHECK:
    pub flask_loan_receiver: AccountInfo<'info>,
    // ADD ANY ADDITIONAL ACCOUNTS THAT MAY BE EXPECTED BY THE
    // RECEIVER'S FLASHLOAN INSTRUCTION

    // transfer_authority
    #[account(signer)]
    /// CHECK:
    pub transfer_authority: AccountInfo<'info>,
}

// ref: https://github.com/patriciobcs/solask/blob/master/programs/solask/src/lib.rs
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 9000)]
    pub base_account: Account<'info, BaseAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct BaseAccount {}

#[derive(Accounts)]
pub struct MaxFlashLoan {}
