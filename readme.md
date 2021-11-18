Ashburton Finance brings the cheapest flash loans to Solana. It aggregates all the existing flash loans providers, and returns the flash loan with the lowest possible fee. The platfrom currently accesses the reserves of [Port.finance](https://port.finance/) and [Solend](https://solend.fi/), and more compatible reserves will be added in the future.

With a single api call, any smart contract can flash borrow from the combined holdings of all the flash loan enabled reserves. This allows anyone to borrow up to 2.5 billion USD worth of tokens from the combined holdings of [Port.finance](https://port.finance/) and [Solend](https://solend.fi/). More lending protocols will added in the future to increase the amount that can be borrowed at once.

Applications for flash loans are:
1. Arbitrage
2. debt refinancing
3. Source of funds for liqudations
4. many more undiscovered applications

# Method of operation
When a borrower requests for a certain amount of funds, the aggregator flash borrows as much as possible from the pool with the lowest fees. If all that can borrowed has been borrowed from this pool and its not enough, funds are flash borrowed from the next cheapest pool. This goes on until the requested amount of funds are flash borrowed. Then this funds are passed on to the borrower. 

The borrower must return the principle along with the fee in order for the transaction to succeed.

# Running tests


Run integration tests

```bash
anchor test
```

Run unittests

```bash
cargo test
```
