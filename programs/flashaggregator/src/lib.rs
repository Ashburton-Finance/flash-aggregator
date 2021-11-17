use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod flashaggregator_module {
    use super::*;

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
    pub fn flash_loan<'info>(ctx: Context<FlashLoan>, amount: u64) -> ProgramResult {
        Ok(())
    }
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

#[derive(Accounts)]
pub struct FlashLoan<'info> {
    // Flash loan fee receiver account
    pub flash_loan_fee_receiver: AccountInfo<'info>,
    // Token program ID
    pub token_program_id: AccountInfo<'info>,
}

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
