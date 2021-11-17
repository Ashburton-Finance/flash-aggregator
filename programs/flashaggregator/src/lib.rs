/**
 * We use a EIP-3156 style interface to borrow via this program. Refer to EIP-3234 for more
 * ideas for batch flash loans
 */
pub mod cpi;

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod flashaggregator_module {
    use super::*;
    use cpi::{deposit_reserve_liquidity, flash_loan, DepositReserveLiquidity, FlashLoan};

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
    pub fn flash_loan_wrapper<'info>(
        ctx: Context<FlashLoanWrapper>,
        amount: u64,
        nonce: u8,
    ) -> ProgramResult {
        // ref: https://github.com/solana-labs/solana-program-library/blob/master/token-lending/program/tests/flash_loan.rs
        // Use this api as reference: https://github.com/ilmoi/token_lending_cli/blob/master/js/cli/main.ts

        // take a flash loan
        let cpi_accounts = FlashLoan {
            lending_program: ctx.accounts.lending_program.clone(),
            source_liquidity: ctx.accounts.source_liquidity.to_account_info().clone(),
            destination_collateral_account: ctx
                .accounts
                .destination_collateral
                .to_account_info()
                .clone(),
            reserve_account: ctx.accounts.reserve.clone(),
            reserve_collateral_mint: ctx.accounts.reserve_collateral_mint.clone(),
            reserve_liquidity_supply: ctx.accounts.reserve_liquidity_supply.clone(),
            lending_market_account: ctx.accounts.lending_market.clone(),
            lending_market_authority: ctx.accounts.lending_market_authority.clone(),
            transfer_authority: ctx.accounts.transfer_authority.clone(),
            clock: ctx.accounts.clock.to_account_info().clone(),
            token_program_id: ctx.accounts.token_program.to_account_info(),
        };

        let user_authority = ctx.accounts.user_authority.clone();
        let reserve = ctx.accounts.reserve.clone();

        let pda_seeds = &[
            &user_authority.key.to_bytes()[..32],
            &reserve.key.to_bytes()[..32],
            &[nonce],
        ];
        let pda_signer = &[&pda_seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.lending_program.clone(),
            cpi_accounts,
            pda_signer,
        );
        flash_loan(cpi_ctx, amount)?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(nonce: u8, liquidity_amount: u64, _bump: u8)]
pub struct FlashLoanWrapper<'info> {
    // Lending program
    pub lending_program: AccountInfo<'info>,
    // Source liquidity token account
    pub source_liquidity: AccountInfo<'info>,
    // Destination liquidity token account - same mint as source liquidity
    pub destination_liquidity: AccountInfo<'info>,
    // Reserve account
    pub reserve: AccountInfo<'info>,
    // Flash loan fee receiver account
    pub flash_loan_fee_receiver: AccountInfo<'info>,
    // Host fee receiver
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
}

#[account]
#[derive(Default)]
pub struct DepositState {
    // Pubkey of depositor that called ix
    pub user_authority: Pubkey,
    // Pubkey of account holding the reserve collateral token
    // Used for AddToDeposit context struct constraints
    pub collateral_account_key: Pubkey,
    // Current amount of liquidity tokens deposited
    // Update on withdraw or modification
    pub liquidity_amount: u64,
    // Current amount of reserve collateral tokens being controlled by PDA
    // Update on withdraw or modification
    pub collateral_amount: u64,

    // Pubkey of reserve account of pool where liquidity is deposited
    pub reserve_account: Pubkey,
    // Token mint of token to run dca strategy on
    pub dca_mint: Pubkey,
    // Set this as ATA of signer
    pub dca_recipient: Pubkey,
    // OOA Pubkey
    pub ooa: Option<Pubkey>,

    // Unix timestamp of deposit
    pub created_at: i64,
    // Integer representing the amount of times a DCA has executed
    pub counter: u16,
    // Nonce
    pub nonce: u8,
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
