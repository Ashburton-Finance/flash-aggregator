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
    use cpi::{deposit_reserve_liquidity, DepositReserveLiquidity};

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
    pub fn flash_loan<'info>(ctx: Context<FlashLoan>, amount: u64, nonce: u8) -> ProgramResult {
        // ref: https://github.com/solana-labs/solana-program-library/blob/master/token-lending/program/tests/flash_loan.rs
        // Use this api as reference: https://github.com/ilmoi/token_lending_cli/blob/master/js/cli/main.ts

        // Make deposit into lending program
        let cpi_accounts = DepositReserveLiquidity {
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
        deposit_reserve_liquidity(cpi_ctx, amount)?;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(nonce: u8, liquidity_amount: u64, _bump: u8)]
pub struct FlashLoan<'info> {
    // Deposit state account
    #[account(init, payer = user_authority)]
    pub deposit: Account<'info, DepositState>,

    // AccountInfo of the account that calls the ix
    #[account(signer)]
    pub user_authority: AccountInfo<'info>,

    // Solend, Jet, or Port program
    pub lending_program: AccountInfo<'info>,

    // Token mint of DCA receiving asset
    pub dca_mint: Account<'info, Mint>,

    // Solend CPI accounts
    // Token account for asset to deposit into reserve and make sure account owner is transfer authority PDA
    #[account(
        constraint = source_liquidity.amount >= liquidity_amount,
        constraint = source_liquidity.owner == *transfer_authority.key
    )]
    pub source_liquidity: Account<'info, TokenAccount>,
    // Token account for reserve collateral token
    // Make sure it has a 0 balance to ensure empty account and make sure account owner is transfer authority PDA
    #[account(
        constraint = destination_collateral.amount == 0,
        constraint = destination_collateral.owner == *transfer_authority.key,
    )]
    pub destination_collateral: Account<'info, TokenAccount>,
    // Reserve state account
    pub reserve: AccountInfo<'info>,
    // Token mint for reserve collateral token
    pub reserve_collateral_mint: AccountInfo<'info>,
    // Reserve liquidity supply SPL token account
    pub reserve_liquidity_supply: AccountInfo<'info>,
    // Lending market account
    pub lending_market: AccountInfo<'info>,
    // Lending market authority (PDA)
    pub lending_market_authority: AccountInfo<'info>,
    // Transfer authority for source_liquidity and desitnation_collateral accounts
    #[account(seeds = [&user_authority.key.to_bytes()[..32], &reserve.key.to_bytes()[..32], &[nonce]], bump = _bump)]
    pub transfer_authority: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    // Clock
    pub clock: Sysvar<'info, Clock>,
    // Token program
    pub token_program: Program<'info, Token>,
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
