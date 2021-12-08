# Flashgator
Flashgator brings the cheapest flash loans to Solana. It aggregates all the existing flash loans providers, and returns the flash loan with the lowest possible fee. The platfrom currently accesses the reserves of [Port.finance](https://port.finance/) and [Solend](https://solend.fi/), and more compatible reserves will be added in the future.

With a single api call, any smart contract can flash borrow from the combined holdings of all the flash loan enabled reserves. This allows anyone to borrow up to 2.5 billion USD worth of tokens from the combined holdings of [Port.finance](https://port.finance/) and [Solend](https://solend.fi/). More lending protocols will added in the future to increase the amount that can be borrowed at once.

Applications for flash loans are:
1. Arbitrage
2. debt refinancing
3. Source of funds for liquidations
4. many more undiscovered applications

# Method of operation
When a borrower requests for a certain amount of funds, the aggregator flash borrows as much as possible from the pool with the lowest fees. If all that can borrowed has been borrowed from this pool and its not enough, funds are flash borrowed from the next cheapest pool. This goes on until the requested amount of funds are flash borrowed. Then this funds are passed on to the borrower. 

The borrower must return the principle along with the fee in order for the transaction to succeed.

# Getting a unique id for your program

run `anchor test` first. This will generate a key pair for you. Then run:
```
solana address -k target/deploy/flashaggregator-keypair.json 

# BnN9NvW3EBScQpxvVa6yVBSjWhiu7XamZbLPVuyY9WnQ
```

Now in `programs/flashaggregator/src/lib.rs` and `Anchor.toml` change `your-program-id` to the address you got in the previous step.
```
// programs/flashaggregator/src/lib.rs

declare_id!("your-program-id");
```

```
# Anchor.toml

[programs.devnet]
flashaggregator = "your-program-id"
```


# Running tests


Run integration tests directly on devnet, in order to interact with the existing on chain programs.

```bash
anchor test
```

Run unittests

```bash
cargo test
```


### Useful debugging tools

Find program data length
```shell

solana program show GT2jZnYzjMkv4uufjPHpRStKmQKQEt5oJYHmCAcFXb4M

# Program Id: GT2jZnYzjMkv4uufjPHpRStKmQKQEt5oJYHmCAcFXb4M
# Owner: BPFLoaderUpgradeab1e11111111111111111111111
# ProgramData Address: 6VxqZdhHGQqs8eBEjdCgc4H8M4HUQxWtdSHcnt1HMa65
# Authority: 711gc5iRvrUCjd17VeDdJkcqm7wbe71fMfNGRNCWFukt
# Last Deployed In Slot: 95293605
# Data Length: 437280 (0x6ac20) bytes
# Balance: 3.04467288 SOL
```

Calculate rent
```shell

solana rent 437280

# Rent per byte-year: 0.00000348 SOL
# Rent per epoch: 0.00833518 SOL
# Rent-exempt minimum: 3.04435968 SOL

```


Do a dump of the elf file
```shell
cargo build-bpf --dump
```
