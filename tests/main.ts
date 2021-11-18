import { Blockchain } from './blockchain';
import { assert } from './util';

async function main() {
  // --------------------------------------- init

  const bc = new Blockchain();
  await bc.getConnection();
  await bc.initLendingMarket();
  await bc.initReserve(bc.tokenA, 100, 40);
  await bc.initObligation();
  await bc.calcAndPrintMetrics();

  // check user lost tokens
  assert(bc.metrics.tokenAUserBalance.value.uiAmount == 100 - 40);
  // check protocol gained tokens
  assert(bc.metrics.tokenAProtocolBalance.value.uiAmount == 40);
  // check user was issued LP tokens in return
  assert(bc.metrics.tokenALPUserBalance.value.uiAmount == 40);
  // check total liquidity available
  // @ts-ignore
  assert(bc.metrics.reserveAState.data.liquidity.availableAmount == 40n);

  // --------------------------------------- depositing / withdrawing liquidity

  await bc.depositReserveLiquidity(bc.tokenA, 20);
  await bc.redeemReserveCollateral(bc.tokenA, 10);
  await bc.calcAndPrintMetrics();

  // check changes in balances add up
  assert(bc.metrics.tokenAUserBalance.value.uiAmount == 100 - 40 - 20 + 10);
  assert(bc.metrics.tokenAProtocolBalance.value.uiAmount == 40 + 20 - 10);


  // --------------------------------------- flash loan

  const oldBorrowedAmount = bc.metrics.obligState.data.borrowedValue.toNumber();
  const oldProtocolFee = bc.metrics.tokenAProtocolFeeBalance.value.uiAmount;
  const oldHostFee = bc.metrics.tokenAHostBalance.value.uiAmount;

  await bc.borrowFlashLoan(bc.tokenA, 10);
  await bc.calcAndPrintMetrics();

  //check that fees went up, but the borrowed amount stayed the same
  assert(bc.metrics.obligState.data.borrowedValue.toNumber() == oldBorrowedAmount);
  assert(bc.metrics.tokenAProtocolFeeBalance.value.uiAmount > oldProtocolFee);
  assert(bc.metrics.tokenAHostBalance.value.uiAmount > oldHostFee);

  console.log('All tests passed!');
}

main()
  .catch(err => {
    console.error(err);
    process.exit(-1);
  })
  .then(() => process.exit());
