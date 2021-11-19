import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, SYSVAR_CLOCK_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import { struct, u8 } from 'buffer-layout';
import { LENDING_PROGRAM_ID } from '../constants';
import { u64 } from '../util';
import { LendingInstruction } from './instruction';

interface Data {
    instruction: number;
    collateralAmount: bigint;
}

const DataLayout = struct<Data>([u8('instruction'), u64('collateralAmount')]);

export const redeemReserveCollateralInstruction = (
    collateralAmount: number | bigint,
    sourceCollateral: PublicKey,
    destinationLiquidity: PublicKey,
    reserve: PublicKey,
    reserveCollateralMint: PublicKey,
    reserveLiquiditySupply: PublicKey,
    lendingMarket: PublicKey,
    lendingMarketAuthority: PublicKey,
    transferAuthority: PublicKey
): TransactionInstruction => {
    const data = Buffer.alloc(DataLayout.span);
    DataLayout.encode(
        {
            instruction: LendingInstruction.RedeemReserveCollateral,
            collateralAmount: BigInt(collateralAmount),
        },
        data
    );

    const keys = [
        { pubkey: sourceCollateral, isSigner: false, isWritable: true },
        { pubkey: destinationLiquidity, isSigner: false, isWritable: true },
        { pubkey: reserve, isSigner: false, isWritable: true },
        { pubkey: reserveCollateralMint, isSigner: false, isWritable: true },
        { pubkey: reserveLiquiditySupply, isSigner: false, isWritable: true },
        { pubkey: lendingMarket, isSigner: false, isWritable: false },
        { pubkey: lendingMarketAuthority, isSigner: false, isWritable: false },
        { pubkey: transferAuthority, isSigner: true, isWritable: false },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
        keys,
        programId: LENDING_PROGRAM_ID,
        data,
    });
};
