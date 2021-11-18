/**
 * We use a EIP-3156 style interface to borrow via this program. Refer to EIP-3234 for more
 * ideas for batch flash loans
 */
pub mod cpi;

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use anchor_lang::prelude::*;

declare_id!("BnN9NvW3EBScQpxvVa6yVBSjWhiu7XamZbLPVuyY9WnQ");

#[program]
pub mod flashaggregator {
    use super::*;
    use cpi::{flash_loan, FlashLoan};

    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        let base_account = &mut ctx.accounts.base_account;
        base_account.flash_fee = 23;
        base_account.max_flash_loan = 2342;
        Ok(())
    }

    /**
     * @dev The amount of currency available to be lent.
     * @param token The loan currency.
     * @return The amount of `token` that can be borrowed.
     */
    pub fn maxflashloan(ctx: Context<MaxFlashLoan>) -> ProgramResult {
        Ok(())
    }

    /**
     * @dev The fee to be charged for a given loan.
     * @param token The loan currency.
     * @param amount The amount of tokens lent.
     * @return The amount of `token` to be charged for the loan, on top of the returned principal.
     */
    pub fn flashfee(ctx: Context<FlashFee>, amount: u64) -> ProgramResult {
        Ok(())
    }

    /**
     * @dev Initiate a flash loan.
     * @param receiver The receiver of the tokens in the loan, and the receiver of the callback.
     * @param token The loan currency.
     * @param amount The amount of tokens lent.
     * @param data Arbitrary data structure, intended to contain user-defined parameters.
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
    pub lending_program: AccountInfo<'info>,
    // Source liquidity token account
    #[account(mut)]
    pub source_liquidity: AccountInfo<'info>,
    // Destination liquidity token account - same mint as source liquidity
    #[account(mut)]
    pub destination_liquidity: AccountInfo<'info>,
    // Reserve account
    #[account(mut)]
    pub reserve: AccountInfo<'info>,
    // Flash loan fee receiver account
    #[account(mut)]
    pub flash_loan_fee_receiver: AccountInfo<'info>,
    // Host fee receiver
    #[account(mut)]
    pub host_fee_receiver: AccountInfo<'info>,
    // Lending market account
    pub lending_market: AccountInfo<'info>,
    // Derived lending market authority - PDA
    pub derived_lending_market_authority: AccountInfo<'info>,
    // Token program ID
    pub token_program_id: AccountInfo<'info>,
    // Flash loan program receiver ID
    pub flask_loan_receiver: AccountInfo<'info>,
    // ADD ANY ADDITIONAL ACCOUNTS THAT MAY BE EXPECTED BY THE
    // RECEIVER'S FLASHLOAN INSTRUCTION

    // transfer_authority
    #[account(signer)]
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
#[derive(Default)] // todo: is this necessary?
pub struct BaseAccount {
    pub flash_fee: u64,
    pub max_flash_loan: u64,
}

#[derive(Accounts)]
pub struct MaxFlashLoan {}

#[derive(Accounts)]
pub struct FlashFee {}

fn sqrt(number: f64) -> Result<f64, String> {
    if number >= 0.0 {
        Ok(number.powf(0.5))
    } else {
        Err("negative floats don't have square roots".to_owned())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sqrt() -> Result<(), String> {
        let x = 4.0;
        assert_eq!(sqrt(x)?.powf(2.0), x);
        Ok(())
    }
}
