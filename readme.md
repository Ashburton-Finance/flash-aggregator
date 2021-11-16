Ashburton Finance brings the cheapest flash loans to Solana. It aggregates all the existing flash loans providers, and returns the flash loan with the lowest possible fee. The platfrom currently accesses the reserves of [Port.finance](https://port.finance/) and [Solend](https://solend.fi/), and more compatible reserves will be added in the future.

With a single api call, any smart contract can flash borrow from the combined holdings of all the flash loan enabled reserves. This allows anyone to borrow up to 2.5 billion USD worth of tokens from the combined holdings of [Port.finance](https://port.finance/) and [Solend](https://solend.fi/). More lending protocols to be added in the future to, making the total value available even larger.



Applications for flash loans are:
1. Arbitrage
2. debt refinancing
3. many more undiscovered applications

# Running tests


Run integration tests

```bash
anchor test
```

Run unittests

```bash
cargo test
```
