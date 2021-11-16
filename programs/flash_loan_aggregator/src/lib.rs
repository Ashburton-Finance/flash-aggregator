use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod flash_loan_aggregator {
    use super::*;

    // /**
    //  * @dev The amount of currency available to be lent.
    //  * @param token The loan currency.
    //  * @return The amount of `token` that can be borrowed.
    //  */
    pub fn maxflashloan(ctx: Context<MaxFlashLoan>) -> ProgramResult {
        Ok(())
    }

    // /**
    //  * @dev The fee to be charged for a given loan.
    //  * @param token The loan currency.
    //  * @param amount The amount of tokens lent.
    //  * @return The amount of `token` to be charged for the loan, on top of the returned principal.
    //  */
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

#[derive(Accounts)]
pub struct MaxFlashLoan {}

#[derive(Accounts)]
pub struct FlashFee {}

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
