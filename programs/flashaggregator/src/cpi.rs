// use anchor_lang::solana_program;
use anchor_lang::solana_program::account_info::AccountInfo;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use anchor_lang::{Accounts, CpiContext, ToAccountInfos};
use solana_program::instruction::AccountMeta;

pub fn flash_loan<'info>(
    ctx: CpiContext<'_, '_, '_, 'info, FlashLoan<'info>>,
    amount: u64,
) -> ProgramResult {
    let mut receiver_accounts: Vec<AccountMeta> = Vec::new();

    let meta = account_info_to_meta(ctx.accounts.transfer_authority.clone(), true, false);

    receiver_accounts.push(meta);

    // Write logic to form AccountMeta for all receiver accounts and
    // push into receiver_accounts,

    let ix = spl_token_lending::instruction::flash_loan(
        *ctx.accounts.lending_program.key,
        amount,
        *ctx.accounts.source_liquidity.key,
        *ctx.accounts.destination_liquidity.key, // needs to be owned by transfer_authority
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
    pub destination_liquidity: AccountInfo<'info>, // must be owned by transfer authority
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

    // transfer_authority
    pub transfer_authority: AccountInfo<'info>,
}

// Helper function to convert AccountInfo to AccountMeta
pub fn account_info_to_meta<'info>(
    acct: AccountInfo<'info>,
    is_signer: bool,
    is_writable: bool,
) -> AccountMeta {
    AccountMeta {
        pubkey: *acct.key,
        is_signer: is_signer,
        is_writable: is_writable,
    }
}
