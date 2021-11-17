/**
 * We use a EIP-3156 style interface to borrow via this program. Refer to EIP-3234 for more
 * ideas for batch flash loans
 */
use anchor_lang::prelude::*;
use anchor_lang::solana_program::account_info::AccountInfo;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use solana_program::instruction::AccountMeta;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod flashaggregator_module {
    use super::*;

    use anchor_lang::{Accounts, CpiContext, ToAccountInfos};

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
    pub fn flash_loan<'info>(
        ctx: CpiContext<'_, '_, '_, 'info, FlashLoan<'info>>,
        amount: u64,
    ) -> ProgramResult {
        let receiver_accounts: Vec<AccountMeta> = Vec::new();
        // Write logic to form AccountMeta for all receiver accounts and
        // push into receiver_accounts,
        let ix = spl_token_lending::instruction::flash_loan(
            *ctx.accounts.lending_program.key,
            amount,
            *ctx.accounts.source_liquidity.key,
            *ctx.accounts.destination_liquidity.key,
            *ctx.accounts.reserve.key,
            *ctx.accounts.flash_loan_fee_receiver.key,
            *ctx.accounts.host_fee_receiver.key,
            *ctx.accounts.lending_market.key,
            *ctx.accounts.flask_loan_receiver.key,
            receiver_accounts,
        );
        solana_program::program::invoke_signed(
            &ix,
            &ToAccountInfos::to_account_infos(&ctx),
            ctx.signer_seeds,
        )?;
        Ok(())
    }
}

/// Accounts expected by this instruction:
///
///   0. `[writable]` Source liquidity token account.
///                     Minted by reserve liquidity mint.
///                     Must match the reserve liquidity supply.
///   1. `[writable]` Destination liquidity token account.
///                     Minted by reserve liquidity mint.
///   2. `[writable]` Reserve account.
///   3. `[writable]` Flash loan fee receiver account.
///                     Must match the reserve liquidity fee receiver.
///   4. `[writable]` Host fee receiver.
///   5. `[]` Lending market account.
///   6. `[]` Derived lending market authority.
///   7. `[]` Token program id.
///   8. `[]` Flash loan receiver program id.
///             Must implement an instruction that has tag of 0 and a signature of `(amount: u64)`
///             This instruction must return the amount to the source liquidity account.
///   .. `[any]` Additional accounts expected by the receiving program's `ReceiveFlashLoan` instruction.
///
///   The flash loan receiver program that is to be invoked should contain an instruction with
///   tag `0` and accept the total amount (including fee) that needs to be returned back after
///   its execution has completed.
///
///   Flash loan receiver should have an instruction with the following signature:
///
///   0. `[writable]` Source liquidity (matching the destination from above).
///   1. `[writable]` Destination liquidity (matching the source from above).
///   2. `[]` Token program id
///   .. `[any]` Additional accounts provided to the lending program's `FlashLoan` instruction above.
///   ReceiveFlashLoan {
///       // Amount that must be repaid by the receiver program
///       amount: u64
///   }
#[derive(Accounts)]
pub struct FlashLoan<'info> {
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
